"""Customer-facing API endpoints — fleet view, crane detail, health overrides, PM schedules."""

import uuid
from datetime import datetime, date, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.db import get_db
from app.models.user import User
from app.models.facility import Facility
from app.models.crane import Crane
from app.models.component import Component
from app.models.sensor import Sensor
from app.models.reading import Reading
from app.models.crane_health_override import CraneHealthOverride
from app.models.pm_schedule import PMSchedule
from app.services.health import sensor_health, crane_health
from app.schemas.customer import (
    FleetResponse, CraneFleetItem, CraneDetailResponse,
    SensorSummary, HealthOverrideIn, HealthOverrideOut,
    PMScheduleCreate, PMScheduleUpdate, PMScheduleOut,
)

router = APIRouter(prefix="/api/v1/cranes", tags=["customer"])


# ── Helpers ──

async def _get_crane_or_404(crane_id: uuid.UUID, user: User, db: AsyncSession) -> Crane:
    result = await db.execute(
        select(Crane)
        .join(Facility)
        .where(Crane.id == crane_id, Facility.org_id == user.org_id)
    )
    crane = result.scalar_one_or_none()
    if crane is None:
        raise HTTPException(status_code=404, detail="Crane not found")
    return crane


async def _latest_reading_for_sensor(sensor_id: uuid.UUID, db: AsyncSession) -> Reading | None:
    result = await db.execute(
        select(Reading)
        .where(Reading.sensor_id == str(sensor_id))
        .order_by(Reading.timestamp.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def _sensors_for_crane(crane_id: uuid.UUID, org_id: uuid.UUID, db: AsyncSession) -> list[Sensor]:
    result = await db.execute(
        select(Sensor)
        .join(Component)
        .join(Crane)
        .join(Facility)
        .where(Crane.id == crane_id, Facility.org_id == org_id)
    )
    return list(result.scalars().all())


async def _next_pm_due(crane_id: uuid.UUID, db: AsyncSession) -> date | None:
    result = await db.execute(
        select(func.min(PMSchedule.due_date))
        .where(PMSchedule.crane_id == crane_id, PMSchedule.status == "pending")
    )
    return result.scalar_one_or_none()


async def _override_for_crane(crane_id: uuid.UUID, db: AsyncSession) -> CraneHealthOverride | None:
    result = await db.execute(
        select(CraneHealthOverride).where(CraneHealthOverride.crane_id == crane_id)
    )
    return result.scalar_one_or_none()


# ── Fleet ──

@router.get("/fleet", response_model=FleetResponse)
async def get_fleet(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # Get all cranes for user's org with facility info
    result = await db.execute(
        select(Crane, Facility.name.label("facility_name"))
        .join(Facility)
        .where(Facility.org_id == user.org_id)
        .order_by(Facility.name, Crane.name)
    )
    rows = result.all()

    items = []
    for crane, facility_name in rows:
        sensors = await _sensors_for_crane(crane.id, user.org_id, db)
        override = await _override_for_crane(crane.id, db)
        next_pm = await _next_pm_due(crane.id, db)

        sensor_statuses = []
        last_reading_at = None
        for s in sensors:
            reading = await _latest_reading_for_sensor(s.id, db)
            status = sensor_health(s.sensor_type, reading)
            sensor_statuses.append(status)
            if reading and (last_reading_at is None or reading.timestamp > last_reading_at):
                last_reading_at = reading.timestamp

        health = crane_health(sensor_statuses, override.status if override else None)

        items.append(CraneFleetItem(
            id=crane.id,
            name=crane.name,
            crane_type=crane.crane_type,
            capacity_tons=float(crane.capacity_tons) if crane.capacity_tons else None,
            facility_id=crane.facility_id,
            facility_name=facility_name,
            health=health,
            health_override=HealthOverrideOut(
                status=override.status, note=override.note, updated_at=override.updated_at
            ) if override else None,
            sensor_count=len(sensors),
            last_reading_at=last_reading_at,
            next_pm_due=next_pm,
        ))

    return FleetResponse(cranes=items)


# ── Crane Detail ──

@router.get("/{crane_id}/detail", response_model=CraneDetailResponse)
async def get_crane_detail(crane_id: uuid.UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    crane = await _get_crane_or_404(crane_id, user, db)

    # Facility name
    fac_result = await db.execute(select(Facility.name).where(Facility.id == crane.facility_id))
    facility_name = fac_result.scalar_one()

    sensors = await _sensors_for_crane(crane.id, user.org_id, db)
    override = await _override_for_crane(crane.id, db)

    sensor_summaries = []
    sensor_statuses = []
    for s in sensors:
        reading = await _latest_reading_for_sensor(s.id, db)
        status = sensor_health(s.sensor_type, reading)
        sensor_statuses.append(status)
        sensor_summaries.append(SensorSummary(
            id=s.id,
            label=s.label,
            sensor_type=s.sensor_type,
            health=status,
            last_reading_at=reading.timestamp if reading else None,
        ))

    health = crane_health(sensor_statuses, override.status if override else None)

    # PM schedules
    pm_result = await db.execute(
        select(PMSchedule)
        .where(PMSchedule.crane_id == crane_id)
        .order_by(PMSchedule.due_date)
    )
    pm_rows = pm_result.scalars().all()
    today = date.today()
    pm_schedules = [
        PMScheduleOut(
            id=pm.id,
            crane_id=pm.crane_id,
            title=pm.title,
            description=pm.description,
            due_date=pm.due_date,
            assigned_to=pm.assigned_to,
            status=pm.status,
            completed_at=pm.completed_at,
            created_at=pm.created_at,
            overdue=pm.status == "pending" and pm.due_date < today,
        )
        for pm in pm_rows
    ]

    return CraneDetailResponse(
        id=crane.id,
        name=crane.name,
        crane_type=crane.crane_type,
        capacity_tons=float(crane.capacity_tons) if crane.capacity_tons else None,
        facility_id=crane.facility_id,
        facility_name=facility_name,
        health=health,
        health_override=HealthOverrideOut(
            status=override.status, note=override.note, updated_at=override.updated_at
        ) if override else None,
        sensors=sensor_summaries,
        pm_schedules=pm_schedules,
    )


# ── Health Override ──

@router.put("/{crane_id}/health-override", response_model=HealthOverrideOut)
async def set_health_override(
    crane_id: uuid.UUID,
    body: HealthOverrideIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_crane_or_404(crane_id, user, db)

    if body.status not in ("good", "fair", "needs_attention"):
        raise HTTPException(status_code=422, detail="Status must be good, fair, or needs_attention")

    override = await _override_for_crane(crane_id, db)
    now = datetime.now(timezone.utc)
    if override:
        override.status = body.status
        override.note = body.note
        override.set_by = user.id
        override.updated_at = now
    else:
        override = CraneHealthOverride(
            crane_id=crane_id,
            status=body.status,
            note=body.note,
            set_by=user.id,
            created_at=now,
            updated_at=now,
        )
        db.add(override)
    await db.commit()
    await db.refresh(override)
    return HealthOverrideOut(status=override.status, note=override.note, updated_at=override.updated_at)


@router.delete("/{crane_id}/health-override", status_code=204)
async def delete_health_override(
    crane_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_crane_or_404(crane_id, user, db)
    override = await _override_for_crane(crane_id, db)
    if override:
        await db.delete(override)
        await db.commit()


# ── PM Schedules ──

@router.get("/{crane_id}/pm-schedules", response_model=list[PMScheduleOut])
async def list_pm_schedules(
    crane_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_crane_or_404(crane_id, user, db)
    result = await db.execute(
        select(PMSchedule)
        .where(PMSchedule.crane_id == crane_id)
        .order_by(PMSchedule.due_date)
    )
    today = date.today()
    return [
        PMScheduleOut(
            id=pm.id,
            crane_id=pm.crane_id,
            title=pm.title,
            description=pm.description,
            due_date=pm.due_date,
            assigned_to=pm.assigned_to,
            status=pm.status,
            completed_at=pm.completed_at,
            created_at=pm.created_at,
            overdue=pm.status == "pending" and pm.due_date < today,
        )
        for pm in result.scalars().all()
    ]


@router.post("/{crane_id}/pm-schedules", response_model=PMScheduleOut, status_code=201)
async def create_pm_schedule(
    crane_id: uuid.UUID,
    body: PMScheduleCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_crane_or_404(crane_id, user, db)
    pm = PMSchedule(
        crane_id=crane_id,
        title=body.title,
        description=body.description,
        due_date=body.due_date,
        assigned_to=body.assigned_to,
        created_by=user.id,
    )
    db.add(pm)
    await db.commit()
    await db.refresh(pm)
    today = date.today()
    return PMScheduleOut(
        id=pm.id,
        crane_id=pm.crane_id,
        title=pm.title,
        description=pm.description,
        due_date=pm.due_date,
        assigned_to=pm.assigned_to,
        status=pm.status,
        completed_at=pm.completed_at,
        created_at=pm.created_at,
        overdue=pm.status == "pending" and pm.due_date < today,
    )


@router.put("/{crane_id}/pm-schedules/{pm_id}", response_model=PMScheduleOut)
async def update_pm_schedule(
    crane_id: uuid.UUID,
    pm_id: uuid.UUID,
    body: PMScheduleUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_crane_or_404(crane_id, user, db)
    result = await db.execute(
        select(PMSchedule).where(PMSchedule.id == pm_id, PMSchedule.crane_id == crane_id)
    )
    pm = result.scalar_one_or_none()
    if pm is None:
        raise HTTPException(status_code=404, detail="PM schedule not found")

    if body.title is not None:
        pm.title = body.title
    if body.due_date is not None:
        pm.due_date = body.due_date
    if body.description is not None:
        pm.description = body.description
    if body.assigned_to is not None:
        pm.assigned_to = body.assigned_to
    if body.status is not None:
        pm.status = body.status
        if body.status == "completed" and pm.completed_at is None:
            pm.completed_at = datetime.now(timezone.utc)
        elif body.status == "pending":
            pm.completed_at = None

    await db.commit()
    await db.refresh(pm)
    today = date.today()
    return PMScheduleOut(
        id=pm.id,
        crane_id=pm.crane_id,
        title=pm.title,
        description=pm.description,
        due_date=pm.due_date,
        assigned_to=pm.assigned_to,
        status=pm.status,
        completed_at=pm.completed_at,
        created_at=pm.created_at,
        overdue=pm.status == "pending" and pm.due_date < today,
    )


@router.delete("/{crane_id}/pm-schedules/{pm_id}", status_code=204)
async def delete_pm_schedule(
    crane_id: uuid.UUID,
    pm_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_crane_or_404(crane_id, user, db)
    result = await db.execute(
        select(PMSchedule).where(PMSchedule.id == pm_id, PMSchedule.crane_id == crane_id)
    )
    pm = result.scalar_one_or_none()
    if pm is None:
        raise HTTPException(status_code=404, detail="PM schedule not found")
    await db.delete(pm)
    await db.commit()
