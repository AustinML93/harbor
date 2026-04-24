import asyncio
import unittest
from unittest.mock import patch

from fastapi import Request

from app.api.routes.services import discover_services


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


if __name__ == "__main__":
    unittest.main()
