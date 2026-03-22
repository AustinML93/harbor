from datetime import datetime

from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class UptimeEvent(Base):
    __tablename__ = "uptime_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    container_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    container_name: Mapped[str] = mapped_column(String, nullable=False)
    # event_type: 'start' | 'stop' | 'die' | 'restart'
    event_type: Mapped[str] = mapped_column(String, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
