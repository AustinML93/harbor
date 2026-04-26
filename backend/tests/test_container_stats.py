import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models.container_stat import ContainerStat
from app.services.docker_service import DockerService, _normalize_container_stats


class FakeContainer:
    id = "container-123"
    name = "/Harbor Test"

    def __init__(self, stats: dict | None = None) -> None:
        self._stats = stats or sample_stats()

    def stats(self, stream: bool = False) -> dict:
        return self._stats


class FakeContainerCollection:
    def __init__(self, containers: list[FakeContainer]) -> None:
        self._containers = containers

    def list(self, all: bool = False) -> list[FakeContainer]:
        return self._containers


class FakeDockerClient:
    def __init__(self, containers: list[FakeContainer]) -> None:
        self.containers = FakeContainerCollection(containers)


def sample_stats() -> dict:
    return {
        "cpu_stats": {
            "cpu_usage": {
                "total_usage": 300_000_000,
                "percpu_usage": [150_000_000, 150_000_000],
            },
            "system_cpu_usage": 2_000_000_000,
            "online_cpus": 2,
        },
        "precpu_stats": {
            "cpu_usage": {"total_usage": 100_000_000},
            "system_cpu_usage": 1_000_000_000,
        },
        "memory_stats": {
            "usage": 512_000_000,
            "limit": 2_048_000_000,
            "stats": {"inactive_file": 12_000_000},
        },
        "networks": {
            "eth0": {"rx_bytes": 100, "tx_bytes": 200},
            "eth1": {"rx_bytes": 300, "tx_bytes": 400},
        },
        "blkio_stats": {
            "io_service_bytes_recursive": [
                {"op": "Read", "value": 1024},
                {"op": "Write", "value": 2048},
            ]
        },
    }


class ContainerStatsTests(unittest.TestCase):
    def setUp(self) -> None:
        engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
        Base.metadata.create_all(bind=engine)
        self.session_factory = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    def test_normalize_container_stats_calculates_resource_fields(self) -> None:
        result = _normalize_container_stats(FakeContainer(), sample_stats())

        self.assertEqual(result["container_id"], "container-123")
        self.assertEqual(result["container_name"], "Harbor Test")
        self.assertEqual(result["cpu_percent"], 40.0)
        self.assertEqual(result["memory_usage_bytes"], 500_000_000)
        self.assertEqual(result["memory_percent"], 24.41)
        self.assertEqual(result["net_rx_bytes"], 400)
        self.assertEqual(result["net_tx_bytes"], 600)
        self.assertEqual(result["block_read_bytes"], 1024)
        self.assertEqual(result["block_write_bytes"], 2048)

    def test_save_container_stats_history_writes_sample_and_prunes_old_rows(self) -> None:
        old_timestamp = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(hours=25)
        with self.session_factory() as db:
            db.add(
                ContainerStat(
                    timestamp=old_timestamp,
                    container_id="old-container",
                    container_name="Old Container",
                    cpu_percent=1,
                    memory_usage_bytes=1,
                    memory_limit_bytes=1,
                    memory_percent=1,
                )
            )
            db.commit()

        service = DockerService()
        client = FakeDockerClient([FakeContainer()])

        with patch("app.services.docker_service._get_client", return_value=client):
            with patch("app.core.database.SessionLocal", self.session_factory):
                service.save_container_stats_history()

        with self.session_factory() as db:
            records = db.query(ContainerStat).order_by(ContainerStat.container_name).all()

        self.assertEqual(len(records), 1)
        self.assertEqual(records[0].container_id, "container-123")
        self.assertEqual(records[0].cpu_percent, 40.0)

    def test_recent_container_stats_returns_latest_row_per_container(self) -> None:
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        with self.session_factory() as db:
            db.add(
                ContainerStat(
                    timestamp=now - timedelta(minutes=5),
                    container_id="container-123",
                    container_name="Harbor Test",
                    cpu_percent=1,
                    memory_usage_bytes=100,
                    memory_limit_bytes=1000,
                    memory_percent=10,
                )
            )
            db.add(
                ContainerStat(
                    timestamp=now,
                    container_id="container-123",
                    container_name="Harbor Test",
                    cpu_percent=12,
                    memory_usage_bytes=200,
                    memory_limit_bytes=1000,
                    memory_percent=20,
                )
            )
            db.commit()

        service = DockerService()
        with patch("app.core.database.SessionLocal", self.session_factory):
            result = service.get_recent_container_stats()

        self.assertEqual(len(result), 1)
        self.assertEqual(result[0].cpu_percent, 12)
        self.assertEqual(result[0].memory_percent, 20)


if __name__ == "__main__":
    unittest.main()
