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


def _get_client() -> docker.DockerClient:
    return docker.DockerClient(base_url=settings.docker_socket)


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


def _uptime_pct(container_id: str) -> Optional[float]:
    """Calculate 24h uptime percentage from uptime_events table."""
    try:
        from app.core.database import SessionLocal
        from app.models.uptime import UptimeEvent
        from datetime import timedelta
        from sqlalchemy import and_

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
            up_seconds = 0
            now = datetime.now(timezone.utc)

            # Walk through events to calculate cumulative uptime
            prev_time = cutoff
            prev_state = "unknown"

            for event in events:
                ts = event.timestamp.replace(tzinfo=timezone.utc) if event.timestamp.tzinfo is None else event.timestamp
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
    def _client(self) -> docker.DockerClient:
        return _get_client()

    def list_containers(self) -> list[ContainerSummary]:
        try:
            client = self._client()
            containers = client.containers.list(all=True)
            result = []
            for c in containers:
                result.append(
                    ContainerSummary(
                        id=c.id,
                        short_id=c.short_id,
                        name=c.name.lstrip("/"),
                        image=c.image.tags[0] if c.image.tags else c.image.short_id,
                        state=c.status,
                        status=c.attrs.get("State", {}).get("Status", c.status),
                        created=c.attrs.get("Created", ""),
                        uptime_24h_pct=_uptime_pct(c.id),
                    )
                )
            return result
        except DockerException as e:
            logger.error("Docker error listing containers: %s", e)
            raise HTTPException(status_code=503, detail=f"Docker unavailable: {e}")

    def get_container(self, container_id: str) -> Optional[ContainerDetail]:
        try:
            client = self._client()
            c = client.containers.get(container_id)
            attrs = c.attrs
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
                state=c.status,
                status=state.get("Status", c.status),
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
            raise HTTPException(status_code=503, detail=f"Docker unavailable: {e}")

    def start(self, container_id: str) -> None:
        try:
            self._client().containers.get(container_id).start()
        except NotFound:
            raise HTTPException(status_code=404, detail="Container not found")
        except DockerException as e:
            raise HTTPException(status_code=503, detail=str(e))

    def stop(self, container_id: str) -> None:
        try:
            self._client().containers.get(container_id).stop()
        except NotFound:
            raise HTTPException(status_code=404, detail="Container not found")
        except DockerException as e:
            raise HTTPException(status_code=503, detail=str(e))

    def restart(self, container_id: str) -> None:
        try:
            self._client().containers.get(container_id).restart()
        except NotFound:
            raise HTTPException(status_code=404, detail="Container not found")
        except DockerException as e:
            raise HTTPException(status_code=503, detail=str(e))

    def get_logs(self, container_id: str, tail: int = 100) -> list[str]:
        try:
            c = self._client().containers.get(container_id)
            raw = c.logs(tail=tail, timestamps=True).decode("utf-8", errors="replace")
            return [line for line in raw.splitlines() if line]
        except NotFound:
            raise HTTPException(status_code=404, detail="Container not found")
        except DockerException as e:
            raise HTTPException(status_code=503, detail=str(e))

    def get_states(self) -> dict[str, str]:
        """Lightweight state poll for the WS broadcast loop. Returns {id: state}."""
        try:
            client = self._client()
            return {c.id: c.status for c in client.containers.list(all=True)}
        except DockerException:
            return {}


docker_service = DockerService()
