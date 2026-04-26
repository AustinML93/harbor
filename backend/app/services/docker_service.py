from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

import docker
from docker.errors import DockerException, NotFound
from fastapi import HTTPException

from app.core.config import settings
from app.schemas.container import (
    ContainerDetail,
    ContainerRecentStat,
    ContainerStatPoint,
    ContainerSummary,
    PortMapping,
)

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


def _cpu_percent(stats: dict) -> float:
    cpu_stats = stats.get("cpu_stats", {})
    precpu_stats = stats.get("precpu_stats", {})
    cpu_usage = cpu_stats.get("cpu_usage", {})
    precpu_usage = precpu_stats.get("cpu_usage", {})

    cpu_delta = cpu_usage.get("total_usage", 0) - precpu_usage.get("total_usage", 0)
    system_delta = cpu_stats.get("system_cpu_usage", 0) - precpu_stats.get("system_cpu_usage", 0)
    online_cpus = cpu_stats.get("online_cpus") or len(cpu_usage.get("percpu_usage") or []) or 1

    if cpu_delta <= 0 or system_delta <= 0:
        return 0.0
    return round((cpu_delta / system_delta) * online_cpus * 100.0, 2)


def _memory_usage_bytes(stats: dict) -> int:
    memory = stats.get("memory_stats", {})
    usage = int(memory.get("usage") or 0)
    stats_detail = memory.get("stats", {})
    cache = int(stats_detail.get("inactive_file") or stats_detail.get("cache") or 0)
    return max(usage - cache, 0)


def _network_totals(stats: dict) -> tuple[int | None, int | None]:
    networks = stats.get("networks")
    if not networks:
        return None, None
    rx = sum(int(iface.get("rx_bytes") or 0) for iface in networks.values())
    tx = sum(int(iface.get("tx_bytes") or 0) for iface in networks.values())
    return rx, tx


def _block_io_totals(stats: dict) -> tuple[int | None, int | None]:
    entries = stats.get("blkio_stats", {}).get("io_service_bytes_recursive") or []
    if not entries:
        return None, None
    read = 0
    write = 0
    for entry in entries:
        operation = str(entry.get("op", "")).lower()
        value = int(entry.get("value") or 0)
        if operation == "read":
            read += value
        elif operation == "write":
            write += value
    return read, write


def _normalize_container_stats(container, stats: dict) -> dict:
    memory_usage = _memory_usage_bytes(stats)
    memory_limit = int(stats.get("memory_stats", {}).get("limit") or 0)
    memory_percent = (
        round((memory_usage / memory_limit) * 100.0, 2)
        if memory_limit > 0
        else 0.0
    )
    net_rx, net_tx = _network_totals(stats)
    block_read, block_write = _block_io_totals(stats)

    return {
        "container_id": container.id,
        "container_name": container.name.lstrip("/"),
        "cpu_percent": _cpu_percent(stats),
        "memory_usage_bytes": memory_usage,
        "memory_limit_bytes": memory_limit,
        "memory_percent": memory_percent,
        "net_rx_bytes": net_rx,
        "net_tx_bytes": net_tx,
        "block_read_bytes": block_read,
        "block_write_bytes": block_write,
    }


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
    def save_container_stats_history(self) -> None:
        """Sample running container resource usage and prune old stat rows."""
        try:
            client = _get_client()
            containers = client.containers.list()
        except DockerException as e:
            _reset_client()
            logger.debug("Docker unavailable while sampling container stats: %s", e)
            return

        samples = []
        for container in containers:
            try:
                stats = container.stats(stream=False)
                samples.append(_normalize_container_stats(container, stats))
            except DockerException as e:
                logger.debug(
                    "Skipping container stats for %s: %s",
                    getattr(container, "name", "?"),
                    e,
                )

        if not samples:
            return

        from datetime import timedelta

        from app.core.database import SessionLocal
        from app.models.container_stat import ContainerStat

        cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(hours=24)
        db = SessionLocal()
        try:
            for sample in samples:
                db.add(ContainerStat(**sample))
            db.query(ContainerStat).filter(ContainerStat.timestamp < cutoff).delete()
            db.commit()
        except Exception as e:
            logger.error("Failed to write container stats: %s", e)
            db.rollback()
        finally:
            db.close()

    def get_container_stats_history(
        self,
        container_id: str,
        hours: int = 24,
    ) -> list[ContainerStatPoint]:
        from datetime import timedelta

        from app.core.database import SessionLocal
        from app.models.container_stat import ContainerStat

        cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(hours=hours)
        db = SessionLocal()
        try:
            records = (
                db.query(ContainerStat)
                .filter(ContainerStat.container_id == container_id)
                .filter(ContainerStat.timestamp >= cutoff)
                .order_by(ContainerStat.timestamp.asc())
                .all()
            )
            return [
                ContainerStatPoint.model_validate(record, from_attributes=True)
                for record in records
            ]
        finally:
            db.close()

    def get_recent_container_stats(self, limit: int = 50) -> list[ContainerRecentStat]:
        from sqlalchemy import func

        from app.core.database import SessionLocal
        from app.models.container_stat import ContainerStat

        db = SessionLocal()
        try:
            latest_by_container = (
                db.query(
                    ContainerStat.container_id.label("container_id"),
                    func.max(ContainerStat.timestamp).label("timestamp"),
                )
                .group_by(ContainerStat.container_id)
                .subquery()
            )
            records = (
                db.query(ContainerStat)
                .join(
                    latest_by_container,
                    (ContainerStat.container_id == latest_by_container.c.container_id)
                    & (ContainerStat.timestamp == latest_by_container.c.timestamp),
                )
                .order_by(ContainerStat.cpu_percent.desc(), ContainerStat.memory_percent.desc())
                .limit(limit)
                .all()
            )
            return [
                ContainerRecentStat.model_validate(record, from_attributes=True)
                for record in records
            ]
        finally:
            db.close()

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

    def remove(self, container_id: str) -> None:
        try:
            _get_client().containers.get(container_id).remove(force=False)
        except NotFound:
            raise HTTPException(status_code=404, detail="Container not found")
        except docker.errors.APIError as e:
            raise HTTPException(status_code=409, detail=str(e))
        except DockerException as e:
            _reset_client()
            raise HTTPException(status_code=503, detail=str(e))

    def get_states(self) -> Optional[dict[str, str]]:
        """Lightweight clean-state poll for the notifier. Returns None on Docker failure."""
        try:
            client = _get_client()
            return {
                c.id: c.attrs.get("State", {}).get("Status", c.status)
                for c in client.containers.list(all=True)
            }
        except DockerException:
            _reset_client()
            return None

    def discover_services(self, host: str, scheme: str = "http") -> list[dict]:
        """Return running containers that expose host ports, formatted as service candidates."""
        try:
            client = _get_client()
            containers = client.containers.list()
        except DockerException as e:
            _reset_client()
            logger.warning("Docker unavailable during service discovery: %s", e)
            return []

        discovered = []
        for c in containers:
            name = c.name.lstrip("/")
            ports = c.attrs.get("NetworkSettings", {}).get("Ports", {})
            public_port = None
            for _container_port, bindings in ports.items():
                if bindings:
                    public_port = bindings[0].get("HostPort")
                    break

            if public_port:
                slug = name.lower().replace(" ", "-")
                discovered.append({
                    "name": name.capitalize(),
                    "url": f"{scheme}://{host}:{public_port}",
                    "icon": slug,
                    "description": "Auto-discovered service",
                    "category": "Discovered",
                })

        return discovered


docker_service = DockerService()
