from typing import Optional
from pydantic import BaseModel, HttpUrl


class ServiceItem(BaseModel):
    name: str
    url: str
    icon: str = ""
    description: Optional[str] = None
    category: str = "General"


class ServiceConfig(BaseModel):
    services: list[ServiceItem]
