from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class NotificationRule(Base):
    __tablename__ = "notification_rules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    container_id: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    container_name: Mapped[str] = mapped_column(String, nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    down_threshold_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    webhook_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    logs: Mapped[list["NotificationLog"]] = relationship(
        "NotificationLog", back_populates="rule", cascade="all, delete-orphan"
    )


class NotificationLog(Base):
    __tablename__ = "notification_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    rule_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("notification_rules.id", ondelete="SET NULL"), nullable=True
    )
    container_name: Mapped[str] = mapped_column(String, nullable=False)
    message: Mapped[str] = mapped_column(String, nullable=False)
    sent_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    rule: Mapped[Optional["NotificationRule"]] = relationship(
        "NotificationRule", back_populates="logs"
    )
