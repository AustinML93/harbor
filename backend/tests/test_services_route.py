import asyncio
import os
import tempfile
import unittest
from unittest.mock import patch

from fastapi import Request

from app.api.routes.services import discover_services
from app.services.services_service import ServicesService


class ServiceDiscoveryRouteTests(unittest.TestCase):
    def test_discover_services_uses_request_host(self) -> None:
        scope = {
            "type": "http",
            "method": "GET",
            "path": "/api/services/discover",
            "headers": [],
            "query_string": b"",
            "scheme": "http",
            "server": ("192.168.1.200", 3113),
            "client": ("127.0.0.1", 12345),
        }
        request = Request(scope)

        with patch("app.services.docker_service.docker_service.discover_services", return_value=[]) as mock_discover:
            result = asyncio.run(discover_services(request, "harbor-admin"))

        self.assertEqual(result, [])
        mock_discover.assert_called_once_with(host="192.168.1.200", scheme="http")


class ServicesServiceStartupCheckTests(unittest.TestCase):
    def test_check_config_writable_accepts_existing_writable_file(self) -> None:
        service = ServicesService()
        with tempfile.NamedTemporaryFile() as config_file:
            with patch("app.services.services_service.settings.services_config_path", config_file.name):
                self.assertTrue(service.check_config_writable())

    def test_check_config_writable_accepts_missing_file_in_writable_directory(self) -> None:
        service = ServicesService()
        with tempfile.TemporaryDirectory() as temp_dir:
            config_path = os.path.join(temp_dir, "services.yml")

            with patch("app.services.services_service.settings.services_config_path", config_path):
                self.assertTrue(service.check_config_writable())

    def test_check_config_writable_warns_for_missing_file_in_missing_directory(self) -> None:
        service = ServicesService()
        with tempfile.TemporaryDirectory() as temp_dir:
            config_path = os.path.join(temp_dir, "missing", "services.yml")

            with patch("app.services.services_service.settings.services_config_path", config_path):
                with self.assertLogs("app.services.services_service", level="WARNING") as logs:
                    self.assertFalse(service.check_config_writable())

        self.assertIn("cannot be created", "\n".join(logs.output))


if __name__ == "__main__":
    unittest.main()
