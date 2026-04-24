from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class OperationEvent(BaseModel):
    id: str
    kind: str
    severity: str
    title: str
    message: str
    container_id: Optional[str] = None
    container_name: str
    timestamp: datetime
