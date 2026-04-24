from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

import httpx

from app.core.database import SessionLocal
from app.models.notification import NotificationLog, NotificationRule
from app.models.uptime import UptimeEvent
from app.services.docker_service import docker_service

logger = logging.getLogger(__name__)

# In-memory cooldown tracker: {rule_id: last_sent_at}
_cooldown: dict[int, datetime] = {}
COOLDOWN_MINUTES = 60


class Notifier:
    def _down_since(self, container_id: str, db) -> Optional[datetime]:
        latest_event = (
            db.query(UptimeEvent)
            .filter(UptimeEvent.container_id == container_id)
            .order_by(UptimeEvent.timestamp.desc())
            .first()
        )
        if latest_event is None or latest_event.event_type == "start":
            return None

        timestamp = latest_event.timestamp
        if timestamp.tzinfo is None:
            return timestamp.replace(tzinfo=timezone.utc)
        return timestamp

    def check_and_fire(self) -> None:
        """
        Called by the WS broadcast loop every ~30s.
        Checks all enabled notification rules against current container states.
        """
        db = SessionLocal()
        try:
            rules = db.query(NotificationRule).filter(NotificationRule.enabled == True).all()  # noqa: E712
            if not rules:
                return

            states = docker_service.get_states()
            if states is None:
                logger.warning("Skipping notification check because Docker state polling failed")
                return

            for rule in rules:
                state = states.get(rule.container_id, "missing")
                if state in ("running", "restarting"):
                    continue

                down_since = self._down_since(rule.container_id, db)
                if down_since is None:
                    continue

                down_minutes = (datetime.now(timezone.utc) - down_since).total_seconds() / 60
                if down_minutes < rule.down_threshold_minutes:
                    continue

                # Container is down — check cooldown
                last_sent = _cooldown.get(rule.id)
                if last_sent:
                    since = (datetime.now(timezone.utc) - last_sent).total_seconds() / 60
                    if since < COOLDOWN_MINUTES:
                        continue

                message = (
                    f"Container '{rule.container_name}' is {state}. "
                    f"Expected running (rule threshold: {rule.down_threshold_minutes}m)."
                )
                self._send(rule, message, db)
        finally:
            db.close()

    def _send(self, rule: NotificationRule, message: str, db) -> None:
        logger.warning("ALERT: %s", message)

        if rule.webhook_url:
            try:
                httpx.post(
                    rule.webhook_url,
                    json={"text": message, "container": rule.container_name},
                    timeout=10,
                )
            except Exception as e:
                logger.error("Webhook delivery failed for rule %d: %s", rule.id, e)

        log_entry = NotificationLog(
            rule_id=rule.id,
            container_name=rule.container_name,
            message=message,
        )
        db.add(log_entry)
        db.commit()
        _cooldown[rule.id] = datetime.now(timezone.utc)


notifier = Notifier()
