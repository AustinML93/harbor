from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.notification import NotificationLog
from app.models.uptime import UptimeEvent
from app.schemas.operation import OperationEvent

router = APIRouter()


def _container_event(event: UptimeEvent) -> OperationEvent:
    labels = {
        "start": ("success", "Container started", "started"),
        "stop": ("warning", "Container stopped", "stopped"),
        "die": ("danger", "Container exited", "exited"),
        "restart": ("info", "Container restarted", "restarted"),
    }
    severity, title, action = labels.get(event.event_type, ("info", "Container changed", event.event_type))
    return OperationEvent(
        id=f"uptime-{event.id}",
        kind="container",
        severity=severity,
        title=title,
        message=f"{event.container_name} {action}.",
        container_id=event.container_id,
        container_name=event.container_name,
        timestamp=event.timestamp,
    )


def _notification_event(log: NotificationLog) -> OperationEvent:
    recovered = "recovered" in log.message.lower()
    return OperationEvent(
        id=f"notification-{log.id}",
        kind="notification",
        severity="success" if recovered else "danger",
        title="Container recovered" if recovered else "Alert sent",
        message=log.message,
        container_id=None,
        container_name=log.container_name,
        timestamp=log.sent_at,
    )


@router.get("/timeline", response_model=list[OperationEvent])
async def get_timeline(
    limit: int = Query(default=50, ge=1, le=200),
    kind: Annotated[list[Literal["container", "notification"]] | None, Query()] = None,
    severity: Annotated[list[Literal["success", "warning", "danger", "info"]] | None, Query()] = None,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    uptime_events = (
        db.query(UptimeEvent)
        .order_by(UptimeEvent.timestamp.desc())
        .limit(limit)
        .all()
    )
    notification_events = (
        db.query(NotificationLog)
        .order_by(NotificationLog.sent_at.desc())
        .limit(limit)
        .all()
    )

    events = [_container_event(event) for event in uptime_events]
    events.extend(_notification_event(log) for log in notification_events)
    if kind:
        events = [event for event in events if event.kind in kind]
    if severity:
        events = [event for event in events if event.severity in severity]
    return sorted(events, key=lambda event: event.timestamp, reverse=True)[:limit]
