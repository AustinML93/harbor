from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token, verify_password, get_password_hash
from app.schemas.auth import LoginRequest, TokenResponse, ChangePasswordRequest
from app.models.setting import Setting
from app.api.deps import get_current_user

router = APIRouter()

def get_current_password_hash(db: Session) -> str:
    db_setting = db.query(Setting).filter(Setting.key == "password_hash").first()
    if db_setting and db_setting.value:
        return db_setting.value
    return settings.password_hash

@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: Session = Depends(get_db)):
    """Exchange password for a JWT access token."""
    pwd_hash = get_current_password_hash(db)
    
    if not pwd_hash:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server is not configured (password hash not set)",
        )
    if not verify_password(body.password, pwd_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password",
        )
    token = create_access_token({"sub": "harbor-admin"})
    return TokenResponse(access_token=token, token_type="bearer")

@router.put("/password")
async def change_password(
    body: ChangePasswordRequest, 
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user)
):
    """Change the admin password."""
    current_hash = get_current_password_hash(db)
    
    if not verify_password(body.current_password, current_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password",
        )
        
    new_hash = get_password_hash(body.new_password)
    
    db_setting = db.query(Setting).filter(Setting.key == "password_hash").first()
    if not db_setting:
        db_setting = Setting(key="password_hash", value=new_hash)
        db.add(db_setting)
    else:
        db_setting.value = new_hash
        
    db.commit()
    
    return {"message": "Password updated successfully"}
