from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

import docker
from docker.errors import DockerException, NotFound
from fastapi import HTTPException

from app.core.config import settings
from app.schemas.container import ContainerDetail, ContainerSummary, PortMapping

logger = logging.getLogger(__name__)

# Cached singleton Docker client — reset on connection failure so the next
# call creates a fresh one rather than retrying a broken connection.
_docker_client: Optional[docker.DockerClient] = None

# Previous container states — used to detect transitions for uptime recording.
# Persists for the lifetime of the process; resets to {} on restart.
_prev_states: dict[str, str] = {}  # {container_id: clean_state}


def _get_client() -> docker.DockerClient:
    global _docker_client
    if _docker_client is None:
        _docker_client = docker.DockerClient(base_url=settings.docker_socket)
    return _docker_client


def _reset_client() -> None:
    """Discard the cached client. Forces a fresh connection on next call."""
    global _docker_client
    _docker_client = None


def _parse_ports(ports: dict) -> list[PortMapping]:
    result = []
    for container_port, bindings in (ports or {}).items():
        port, proto = container_port.split("/") if "/" in container_port else (container_port, "tcp")
        if bindings:
            for binding in bindings:
                result.append(
                    PortMapping(
                        host_port=binding.get("HostPort"),
                        container_port=port,
                        protocol=proto,
                    )
                )
        else:
            result.append(PortMapping(host_port=None, container_port=port, protocol=proto))
    return result


def _record_state_transitions(containers: list[tuple[str, str, str]]) -> None:
    """
    Detect state changes vs _prev_states and write UptimeEvent records.

    Args:
        containers: list of (container_id, container_name, current_clean_state)

    Runs silently — never raises, never blocks the caller on DB failure.
    On first sight of a running container, records a 'start' event so uptime
    tracking begins immediately. Uptime % reflects time observed by Harbor,
    not container lifetime.
    """
    global _prev_states

    new_events: list[tuple[str, str, str]] = []  # (id, name, event_type)

    for container_id, name, state in containers:
        prev = _prev_states.get(container_id)
        if prev == state:
            continue
        if state == "running":
            event_type = "start"
        elif state in ("exited", "dead"):
            event_type = "die"
        else:
            event_type = "stop"
        new_events.append((container_id, name, event_type))

    _prev_states = {cid: s for cid, _, s in containers}

    if not new_events:
        return

    from app.core.database import SessionLocal
    from app.models.uptime import UptimeEvent

    db = SessionLocal()
    try:
        for container_id, name, event_type in new_events:
            db.add(UptimeEvent(
                container_id=container_id,
                container_name=name,
                event_type=event_type,
            ))
        db.commit()
        logger.debug("Recorded %d uptime event(s)", len(new_events))
    except Exception as e:
        logger.error("Failed to write uptime events: %s", e)
        db.rollback()
    finally:
        db.close()


def _uptime_pct(container_id: str) -> Optional[float]:
    """Calculate 24h uptime percentage from uptime_events table."""
    try:
        from datetime import timedelta

        from sqlalchemy import and_

        from app.core.database import SessionLocal
        from app.models.uptime import UptimeEvent

        db = SessionLocal()
        try:
            cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
            events = (
                db.query(UptimeEvent)
                .filter(
                    and_(
                        UptimeEvent.container_id == container_id,
                        UptimeEvent.timestamp >= cutoff,
                    )
                )
                .order_by(UptimeEvent.timestamp)
                .all()
            )
            if not events:
                return None

            window = 24 * 3600
            up_seconds = 0.0
            now = datetime.now(timezone.utc)

            prev_time = cutoff
            prev_state = "unknown"

            for event in events:
                ts = (
                    event.timestamp.replace(tzinfo=timezone.utc)
                    if event.timestamp.tzinfo is None
                    else event.timestamp
                )
                if prev_state == "running" and event.event_type in ("stop", "die"):
                    up_seconds += (ts - prev_time).total_seconds()
                prev_time = ts
                prev_state = "running" if event.event_type == "start" else "stopped"

            if prev_state == "running":
                up_seconds += (now - prev_time).total_seconds()

            return round(min(up_seconds / window * 100, 100), 1)
        finally:
            db.close()
    except Exception:
        return None


class DockerService:
    def list_containers(self) -> list[ContainerSummary]:
        try:
            client = _get_client()
            raw = client.containers.list(all=True)
            result = []
            transitions: list[tuple[str, str, str]] = []

            for c in raw:
                clean_state = c.attrs.get("State", {}).get("Status", c.status)
                result.append(
                    ContainerSummary(
                        id=c.id,
                        short_id=c.short_id,
                        name=c.name.lstrip("/"),
                        image=c.image.tags[0] if c.image.tags else c.image.short_id,
                        state=clean_state,   # clean enum: "running", "exited", etc.
                        status=c.status,     # human-readable: "Up 2 hours", etc.
                        created=c.attrs.get("Created", ""),
                        uptime_24h_pct=_uptime_pct(c.id),
                    )
                )
                transitions.append((c.id, c.name.lstrip("/"), clean_state))

            _record_state_transitions(transitions)
            return result
        except DockerException as e:
            _reset_client()
            logger.error("Docker error listing containers: %s", e)
            raise HTTPException(status_code=503, detail=f"Docker unavailable: {e}")

    def get_container(self, container_id: str) -> Optional[ContainerDetail]:
        try:
            client = _get_client()
            c = client.containers.get(container_id)
            attrs = c.attrs
            # Local var 'state' = the Docker State dict, distinct from the schema field.
            state = attrs.get("State", {})
            host_config = attrs.get("HostConfig", {})
            restart_policy = host_config.get("RestartPolicy", {}).get("Name", "no")

            mounts = [
                f"{m.get('Source', '?')}:{m.get('Destination', '?')}"
                for m in attrs.get("Mounts", [])
            ]

            return ContainerDetail(
                id=c.id,
                short_id=c.short_id,
                name=c.name.lstrip("/"),
                image=c.image.tags[0] if c.image.tags else c.image.short_id,
                state=state.get("Status", c.status),  # clean enum
                status=c.status,                       # human-readable
                created=attrs.get("Created", ""),
                uptime_24h_pct=_uptime_pct(c.id),
                ports=_parse_ports(attrs.get("NetworkSettings", {}).get("Ports", {})),
                labels=attrs.get("Config", {}).get("Labels", {}),
                env=attrs.get("Config", {}).get("Env", []),
                mounts=mounts,
                restart_policy=restart_policy,
                exit_code=state.get("ExitCode"),
                started_at=state.get("StartedAt"),
                finished_at=state.get("FinishedAt"),
            )
        except NotFound:
            return None
        except DockerException as e:
            _reset_client()
            raise HTTPException(status_code=503, detail=f"Docker unavailable: {e}")

    def start(self, container_id: str) -> None:
        try:
            _get_client().containers.get(container_id).start()
        except NotFound:
            raise HTTPException(status_code=404, detail="Container not found")
        except DockerException as e:
            _reset_client()
            raise HTTPException(status_code=503, detail=str(e))

    def stop(self, container_id: str) -> None:
        try:
            _get_client().containers.get(container_id).stop()
        except NotFound:
            raise HTTPException(status_code=404, detail="Container not found")
        except DockerException as e:
            _reset_client()
            raise HTTPException(status_code=503, detail=str(e))

    def restart(self, container_id: str) -> None:
        try:
            _get_client().containers.get(container_id).restart()
        except NotFound:
            raise HTTPException(status_code=404, detail="Container not found")
        except DockerException as e:
            _reset_client()
            raise HTTPException(status_code=503, detail=str(e))

    def get_logs(self, container_id: str, tail: int = 100) -> list[str]:
        try:
            c = _get_client().containers.get(container_id)
            raw = c.logs(tail=tail, timestamps=True).decode("utf-8", errors="replace")
            return [line for line in raw.splitlines() if line]
        except NotFound:
            raise HTTPException(status_code=404, detail="Container not found")
        except DockerException as e:
            _reset_client()
            raise HTTPException(status_code=503, detail=str(e))

    def get_states(self) -> dict[str, str]:
        """Lightweight clean-state poll for the notifier. Returns {id: clean_state}."""
        try:
            client = _get_client()
            return {
                c.id: c.attrs.get("State", {}).get("Status", c.status)
                for c in client.containers.list(all=True)
            }
        except DockerException:
            _reset_client()
            return {}


docker_service = DockerService()
