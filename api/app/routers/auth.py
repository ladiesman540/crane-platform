import uuid

from fastapi import APIRouter, Depends, HTTPException
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import (
    verify_password, hash_password,
    create_access_token, create_refresh_token,
)
from app.config import settings
from app.db import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse, RefreshRequest, AccessTokenResponse

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return TokenResponse(
        access_token=create_access_token(user.id, user.org_id),
        refresh_token=create_refresh_token(user.id, user.org_id),
    )


@router.post("/refresh", response_model=AccessTokenResponse)
async def refresh(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    try:
        payload = jwt.decode(body.refresh_token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user_id = payload.get("sub")
        org_id = payload.get("org_id")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")

    return AccessTokenResponse(
        access_token=create_access_token(user.id, user.org_id),
    )
