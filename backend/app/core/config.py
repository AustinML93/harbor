from __future__ import annotations

import secrets
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Auth
    secret_key: str = secrets.token_urlsafe(32)
    password_hash: str = ""
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7  # 7 days

    # Docker
    docker_socket: str = "unix:///var/run/docker.sock"

    # Database
    database_url: str = "sqlite:///./data/harbor.db"

    # Services config file
    services_config_path: str = "./services.yml"

    # CORS (dev only — nginx handles same-origin in production)
    cors_origins: List[str] = ["http://localhost:3000", "http://localhost:5173"]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors(cls, v: str | List[str]) -> List[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v


settings = Settings()
