from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Float, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ContainerStat(Base):
    __tablename__ = "container_stats"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), index=True
    )
    container_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    container_name: Mapped[str] = mapped_column(String, nullable=False)
    cpu_percent: Mapped[float] = mapped_column(Float, nullable=False)
    memory_usage_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    memory_limit_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    memory_percent: Mapped[float] = mapped_column(Float, nullable=False)
    net_rx_bytes: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    net_tx_bytes: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    block_read_bytes: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    block_write_bytes: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
