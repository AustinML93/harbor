from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class NotificationRuleCreate(BaseModel):
    container_id: str
    container_name: str
    enabled: bool = True
    down_threshold_minutes: int = 5
    webhook_url: Optional[str] = None


class NotificationRuleUpdate(BaseModel):
    enabled: Optional[bool] = None
    down_threshold_minutes: Optional[int] = None
    webhook_url: Optional[str] = None


class NotificationRuleItem(BaseModel):
    id: int
    container_id: str
    container_name: str
    enabled: bool
    down_threshold_minutes: int
    webhook_url: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationLogItem(BaseModel):
    id: int
    rule_id: Optional[int]
    container_name: str
    message: str
    sent_at: datetime

    model_config = {"from_attributes": True}
