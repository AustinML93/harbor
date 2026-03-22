from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import yaml

from app.core.config import settings
from app.schemas.service import ServiceItem

logger = logging.getLogger(__name__)


class ServicesService:
    def _config_path(self) -> Path:
        return Path(settings.services_config_path)

    def list_services(self) -> list[ServiceItem]:
        path = self._config_path()
        if not path.exists():
            logger.warning("services.yml not found at %s", path)
            return []
        try:
            with open(path) as f:
                data: Any = yaml.safe_load(f)
            items = (data or {}).get("services", [])
            return [ServiceItem(**item) for item in items]
        except Exception as e:
            logger.error("Failed to parse services.yml: %s", e)
            return []

    def save_services(self, services: list[ServiceItem]) -> None:
        path = self._config_path()
        data = {"services": [s.model_dump() for s in services]}
        with open(path, "w") as f:
            yaml.dump(data, f, default_flow_style=False, allow_unicode=True, sort_keys=False)


services_service = ServicesService()
