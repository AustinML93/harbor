import os
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models.notification import NotificationLog, NotificationRule
from app.models.uptime import UptimeEvent
from app.services.notifier import _cooldown, notifier


class NotifierTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        db_path = os.path.join(self.temp_dir.name, "test.db")
        engine = create_engine(
            f"sqlite:///{db_path}",
            connect_args={"check_same_thread": False},
        )
        Base.metadata.create_all(bind=engine)
        self.session_factory = sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=engine,
        )
        _cooldown.clear()

    def tearDown(self) -> None:
        _cooldown.clear()
        self.temp_dir.cleanup()

    def _seed_rule_and_event(self, *, threshold_minutes: int, down_minutes_ago: int) -> int:
        with self.session_factory() as db:
            rule = NotificationRule(
                container_id="container-123",
                container_name="Harbor Test",
                enabled=True,
                down_threshold_minutes=threshold_minutes,
                webhook_url=None,
            )
            db.add(rule)
            db.flush()
            db.add(
                UptimeEvent(
                    container_id="container-123",
                    container_name="Harbor Test",
                    event_type="die",
                    timestamp=datetime.now(timezone.utc) - timedelta(minutes=down_minutes_ago),
                )
            )
            db.commit()
            return rule.id

    def _log_count(self) -> int:
        with self.session_factory() as db:
            return db.query(NotificationLog).count()

    def test_notifier_respects_down_threshold(self) -> None:
        self._seed_rule_and_event(threshold_minutes=5, down_minutes_ago=1)

        with patch("app.services.notifier.SessionLocal", new=self.session_factory):
            with patch("app.services.notifier.docker_service.get_states", return_value={"container-123": "exited"}):
                notifier.check_and_fire()

        self.assertEqual(self._log_count(), 0)

    def test_notifier_skips_cycle_when_docker_poll_fails(self) -> None:
        self._seed_rule_and_event(threshold_minutes=5, down_minutes_ago=10)

        with patch("app.services.notifier.SessionLocal", new=self.session_factory):
            with patch("app.services.notifier.docker_service.get_states", return_value=None):
                notifier.check_and_fire()

        self.assertEqual(self._log_count(), 0)


if __name__ == "__main__":
    unittest.main()
