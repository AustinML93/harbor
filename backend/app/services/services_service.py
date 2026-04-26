from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any

import yaml

from app.core.config import settings
from app.schemas.service import ServiceItem

logger = logging.getLogger(__name__)


class ServicesService:
    def _config_path(self) -> Path:
        return Path(settings.services_config_path)

    def check_config_writable(self) -> bool:
        path = self._config_path()
        if path.exists():
            if path.is_file() and os.access(path, os.W_OK):
                return True
            logger.warning("services.yml is not writable at %s; service tile edits will fail", path)
            return False

        parent = path.parent if str(path.parent) else Path(".")
        if parent.exists() and os.access(parent, os.W_OK):
            return True

        logger.warning(
            "services.yml does not exist and cannot be created at %s; service tile edits will fail",
            path,
        )
        return False

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
