import uuid
from datetime import datetime, timedelta

from fastapi import Depends, HTTPException, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db import get_db
from app.models.user import User
from app.models.api_key import ApiKey

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_token(data: dict, expires_delta: timedelta) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + expires_delta
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_access_token(user_id: uuid.UUID, org_id: uuid.UUID) -> str:
    return create_token(
        {"sub": str(user_id), "org_id": str(org_id), "type": "access"},
        timedelta(minutes=settings.access_token_expire_minutes),
    )


def create_refresh_token(user_id: uuid.UUID, org_id: uuid.UUID) -> str:
    return create_token(
        {"sub": str(user_id), "org_id": str(org_id), "type": "refresh"},
        timedelta(days=settings.refresh_token_expire_days),
    )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    try:
        payload = jwt.decode(credentials.credentials, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def verify_api_key(
    x_api_key: str = Header(...),
    db: AsyncSession = Depends(get_db),
) -> ApiKey:
    result = await db.execute(select(ApiKey).where(ApiKey.revoked_at.is_(None)))
    keys = result.scalars().all()
    for key in keys:
        if pwd_context.verify(x_api_key, key.key_hash):
            return key
    raise HTTPException(status_code=401, detail="Invalid API key")
