from datetime import datetime
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


class ContainerStatPoint(BaseModel):
    timestamp: datetime
    container_id: str
    container_name: str
    cpu_percent: float
    memory_usage_bytes: int
    memory_limit_bytes: int
    memory_percent: float
    net_rx_bytes: Optional[int] = None
    net_tx_bytes: Optional[int] = None
    block_read_bytes: Optional[int] = None
    block_write_bytes: Optional[int] = None


class ContainerRecentStat(ContainerStatPoint):
    pass


class ContainerTopStat(BaseModel):
    container_id: str
    container_name: str
    sample_count: int
    first_sample_at: datetime
    last_sample_at: datetime
    avg_cpu_percent: float
    peak_cpu_percent: float
    avg_memory_percent: float
    peak_memory_percent: float
    latest_memory_usage_bytes: int
    latest_memory_limit_bytes: int
