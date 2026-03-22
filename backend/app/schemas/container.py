from typing import Optional
from pydantic import BaseModel


class PortMapping(BaseModel):
    host_port: Optional[str]
    container_port: str
    protocol: str


class ContainerSummary(BaseModel):
    id: str
    short_id: str
    name: str
    image: str
    state: str      # running | exited | paused | restarting | dead
    status: str     # human-readable e.g. "Up 2 hours"
    created: str
    uptime_24h_pct: Optional[float] = None


class ContainerDetail(ContainerSummary):
    ports: list[PortMapping]
    labels: dict[str, str]
    env: list[str]
    mounts: list[str]
    restart_policy: str
    exit_code: Optional[int]
    started_at: Optional[str]
    finished_at: Optional[str]
