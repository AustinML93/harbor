import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.notification import NotificationLog, NotificationRule
from app.schemas.notification import (
    NotificationLogItem,
    NotificationRuleCreate,
    NotificationRuleItem,
    NotificationRuleUpdate,
    TestWebhookRequest,
)

router = APIRouter()


@router.get("/rules", response_model=list[NotificationRuleItem])
async def list_rules(db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    return db.query(NotificationRule).all()


@router.post("/rules", response_model=NotificationRuleItem, status_code=201)
async def create_rule(
    body: NotificationRuleCreate,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    rule = NotificationRule(**body.model_dump())
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


@router.put("/rules/{rule_id}", response_model=NotificationRuleItem)
async def update_rule(
    rule_id: int,
    body: NotificationRuleUpdate,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    rule = db.query(NotificationRule).filter(NotificationRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(rule, field, value)
    db.commit()
    db.refresh(rule)
    return rule


@router.delete("/rules/{rule_id}", status_code=204)
async def delete_rule(
    rule_id: int,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    rule = db.query(NotificationRule).filter(NotificationRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    db.delete(rule)
    db.commit()


@router.get("/log", response_model=list[NotificationLogItem])
async def get_log(db: Session = Depends(get_db), _: str = Depends(get_current_user)):
    return (
        db.query(NotificationLog)
        .order_by(NotificationLog.sent_at.desc())
        .limit(50)
        .all()
    )


@router.post("/test-webhook")
async def test_webhook(body: TestWebhookRequest, _: str = Depends(get_current_user)):
    """Send a test POST to a webhook URL to verify it is reachable."""
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                body.url,
                json={"text": "Test notification from Harbor", "container": "harbor-test"},
                timeout=10,
            )
        return {"status": resp.status_code, "ok": resp.is_success}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Webhook unreachable: {e}")
