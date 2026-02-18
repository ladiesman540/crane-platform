import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.db import get_db
from app.models.user import User
from app.models.reading import Reading
from app.models.sensor import Sensor
from app.models.component import Component
from app.models.crane import Crane
from app.models.facility import Facility
from app.schemas.readings import ReadingOut

router = APIRouter(prefix="/api/v1", tags=["readings"])


@router.get("/readings", response_model=list[ReadingOut])
async def list_readings(
    sensor_id: uuid.UUID,
    start: datetime | None = None,
    end: datetime | None = None,
    limit: int = Query(default=100, le=1000),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify sensor belongs to user's org
    result = await db.execute(
        select(Sensor).join(Component).join(Crane).join(Facility)
        .where(Sensor.id == sensor_id, Facility.org_id == user.org_id)
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Sensor not found")

    query = select(Reading).where(Reading.sensor_id == sensor_id)
    if start:
        query = query.where(Reading.timestamp >= start)
    if end:
        query = query.where(Reading.timestamp <= end)
    query = query.order_by(Reading.timestamp.desc()).limit(limit)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/readings/{sensor_id}/latest", response_model=ReadingOut)
async def latest_reading(
    sensor_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify sensor belongs to user's org
    result = await db.execute(
        select(Sensor).join(Component).join(Crane).join(Facility)
        .where(Sensor.id == sensor_id, Facility.org_id == user.org_id)
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Sensor not found")

    result = await db.execute(
        select(Reading).where(Reading.sensor_id == sensor_id)
        .order_by(Reading.timestamp.desc()).limit(1)
    )
    reading = result.scalar_one_or_none()
    if reading is None:
        raise HTTPException(status_code=404, detail="No readings found")
    return reading
