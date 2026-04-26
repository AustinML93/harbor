import asyncio
import os
import tempfile
import unittest
from datetime import datetime, timedelta, timezone

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.api.routes.operations import get_timeline
from app.core.database import Base
from app.models.notification import NotificationLog, NotificationRule
from app.models.uptime import UptimeEvent


class OperationsRouteTests(unittest.TestCase):
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

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def test_timeline_merges_uptime_and_notification_events(self) -> None:
        now = datetime.now(timezone.utc)
        with self.session_factory() as db:
            rule = NotificationRule(
                container_id="container-123",
                container_name="Harbor Test",
                enabled=True,
                down_threshold_minutes=5,
            )
            db.add(rule)
            db.flush()
            db.add(
                UptimeEvent(
                    container_id="container-123",
                    container_name="Harbor Test",
                    event_type="start",
                    timestamp=now - timedelta(minutes=2),
                )
            )
            db.add(
                NotificationLog(
                    rule_id=rule.id,
                    container_name="Harbor Test",
                    message="Container 'Harbor Test' is exited.",
                    sent_at=now - timedelta(minutes=1),
                )
            )
            db.commit()

        with self.session_factory() as db:
            result = asyncio.run(get_timeline(limit=10, db=db, _="harbor-admin"))

        self.assertEqual([event.kind for event in result], ["notification", "container"])
        self.assertEqual(result[0].severity, "danger")
        self.assertEqual(result[1].title, "Container started")

    def test_timeline_filters_by_kind_and_severity(self) -> None:
        now = datetime.now(timezone.utc)
        with self.session_factory() as db:
            rule = NotificationRule(
                container_id="container-123",
                container_name="Harbor Test",
                enabled=True,
                down_threshold_minutes=5,
            )
            db.add(rule)
            db.flush()
            db.add(
                UptimeEvent(
                    container_id="container-123",
                    container_name="Harbor Test",
                    event_type="start",
                    timestamp=now - timedelta(minutes=3),
                )
            )
            db.add(
                UptimeEvent(
                    container_id="container-123",
                    container_name="Harbor Test",
                    event_type="die",
                    timestamp=now - timedelta(minutes=2),
                )
            )
            db.add(
                NotificationLog(
                    rule_id=rule.id,
                    container_name="Harbor Test",
                    message="Container 'Harbor Test' recovered and is running again.",
                    sent_at=now - timedelta(minutes=1),
                )
            )
            db.commit()

        with self.session_factory() as db:
            result = asyncio.run(
                get_timeline(
                    limit=10,
                    kind=["container"],
                    severity=["danger"],
                    db=db,
                    _="harbor-admin",
                )
            )

        self.assertEqual(len(result), 1)
        self.assertEqual(result[0].kind, "container")
        self.assertEqual(result[0].severity, "danger")
        self.assertEqual(result[0].title, "Container exited")


if __name__ == "__main__":
    unittest.main()
