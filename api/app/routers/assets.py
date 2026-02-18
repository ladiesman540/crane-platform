import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.db import get_db
from app.models.user import User
from app.models.facility import Facility
from app.models.crane import Crane
from app.models.component import Component
from app.models.sensor import Sensor
from app.models.bearing_spec import BearingSpec
from app.schemas.assets import (
    FacilityCreate, FacilityUpdate, FacilityOut,
    CraneCreate, CraneUpdate, CraneOut,
    ComponentCreate, ComponentUpdate, ComponentOut,
    SensorCreate, SensorUpdate, SensorOut,
    BearingSpecCreate, BearingSpecOut,
)

router = APIRouter(prefix="/api/v1", tags=["assets"])


# ── Facilities ──────────────────────────────────────────

@router.get("/facilities", response_model=list[FacilityOut])
async def list_facilities(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Facility).where(Facility.org_id == user.org_id))
    return result.scalars().all()


@router.post("/facilities", response_model=FacilityOut, status_code=201)
async def create_facility(body: FacilityCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    facility = Facility(org_id=user.org_id, name=body.name, location=body.location)
    db.add(facility)
    await db.commit()
    await db.refresh(facility)
    return facility


@router.get("/facilities/{facility_id}", response_model=FacilityOut)
async def get_facility(facility_id: uuid.UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Facility).where(Facility.id == facility_id, Facility.org_id == user.org_id))
    facility = result.scalar_one_or_none()
    if facility is None:
        raise HTTPException(status_code=404, detail="Facility not found")
    return facility


@router.put("/facilities/{facility_id}", response_model=FacilityOut)
async def update_facility(facility_id: uuid.UUID, body: FacilityUpdate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Facility).where(Facility.id == facility_id, Facility.org_id == user.org_id))
    facility = result.scalar_one_or_none()
    if facility is None:
        raise HTTPException(status_code=404, detail="Facility not found")
    if body.name is not None:
        facility.name = body.name
    if body.location is not None:
        facility.location = body.location
    await db.commit()
    await db.refresh(facility)
    return facility


@router.delete("/facilities/{facility_id}", status_code=204)
async def delete_facility(facility_id: uuid.UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Facility).where(Facility.id == facility_id, Facility.org_id == user.org_id))
    facility = result.scalar_one_or_none()
    if facility is None:
        raise HTTPException(status_code=404, detail="Facility not found")
    await db.delete(facility)
    await db.commit()


# ── Cranes ──────────────────────────────────────────────

@router.get("/cranes", response_model=list[CraneOut])
async def list_cranes(facility_id: uuid.UUID | None = None, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    query = select(Crane).join(Facility).where(Facility.org_id == user.org_id)
    if facility_id:
        query = query.where(Crane.facility_id == facility_id)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/cranes", response_model=CraneOut, status_code=201)
async def create_crane(body: CraneCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # Verify facility belongs to user's org
    result = await db.execute(select(Facility).where(Facility.id == body.facility_id, Facility.org_id == user.org_id))
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Facility not found")
    crane = Crane(facility_id=body.facility_id, name=body.name, crane_type=body.crane_type, capacity_tons=body.capacity_tons)
    db.add(crane)
    await db.commit()
    await db.refresh(crane)
    return crane


@router.get("/cranes/{crane_id}", response_model=CraneOut)
async def get_crane(crane_id: uuid.UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Crane).join(Facility).where(Crane.id == crane_id, Facility.org_id == user.org_id))
    crane = result.scalar_one_or_none()
    if crane is None:
        raise HTTPException(status_code=404, detail="Crane not found")
    return crane


@router.put("/cranes/{crane_id}", response_model=CraneOut)
async def update_crane(crane_id: uuid.UUID, body: CraneUpdate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Crane).join(Facility).where(Crane.id == crane_id, Facility.org_id == user.org_id))
    crane = result.scalar_one_or_none()
    if crane is None:
        raise HTTPException(status_code=404, detail="Crane not found")
    if body.name is not None:
        crane.name = body.name
    if body.crane_type is not None:
        crane.crane_type = body.crane_type
    if body.capacity_tons is not None:
        crane.capacity_tons = body.capacity_tons
    await db.commit()
    await db.refresh(crane)
    return crane


@router.delete("/cranes/{crane_id}", status_code=204)
async def delete_crane(crane_id: uuid.UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Crane).join(Facility).where(Crane.id == crane_id, Facility.org_id == user.org_id))
    crane = result.scalar_one_or_none()
    if crane is None:
        raise HTTPException(status_code=404, detail="Crane not found")
    await db.delete(crane)
    await db.commit()


# ── Components ──────────────────────────────────────────

@router.get("/components", response_model=list[ComponentOut])
async def list_components(crane_id: uuid.UUID | None = None, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    query = select(Component).join(Crane).join(Facility).where(Facility.org_id == user.org_id)
    if crane_id:
        query = query.where(Component.crane_id == crane_id)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/components", response_model=ComponentOut, status_code=201)
async def create_component(body: ComponentCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Crane).join(Facility).where(Crane.id == body.crane_id, Facility.org_id == user.org_id))
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Crane not found")
    component = Component(crane_id=body.crane_id, name=body.name, component_type=body.component_type)
    db.add(component)
    await db.commit()
    await db.refresh(component)
    return component


@router.delete("/components/{component_id}", status_code=204)
async def delete_component(component_id: uuid.UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Component).join(Crane).join(Facility).where(Component.id == component_id, Facility.org_id == user.org_id))
    component = result.scalar_one_or_none()
    if component is None:
        raise HTTPException(status_code=404, detail="Component not found")
    await db.delete(component)
    await db.commit()


# ── Sensors ─────────────────────────────────────────────

@router.get("/sensors", response_model=list[SensorOut])
async def list_sensors(component_id: uuid.UUID | None = None, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    query = select(Sensor).join(Component).join(Crane).join(Facility).where(Facility.org_id == user.org_id)
    if component_id:
        query = query.where(Sensor.component_id == component_id)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/sensors", response_model=SensorOut, status_code=201)
async def create_sensor(body: SensorCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Component).join(Crane).join(Facility).where(Component.id == body.component_id, Facility.org_id == user.org_id))
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Component not found")
    sensor = Sensor(component_id=body.component_id, mac_address=body.mac_address, sensor_type=body.sensor_type, label=body.label)
    db.add(sensor)
    await db.commit()
    await db.refresh(sensor)
    return sensor


@router.get("/sensors/{sensor_id}", response_model=SensorOut)
async def get_sensor(sensor_id: uuid.UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Sensor).join(Component).join(Crane).join(Facility).where(Sensor.id == sensor_id, Facility.org_id == user.org_id))
    sensor = result.scalar_one_or_none()
    if sensor is None:
        raise HTTPException(status_code=404, detail="Sensor not found")
    return sensor


@router.put("/sensors/{sensor_id}", response_model=SensorOut)
async def update_sensor(sensor_id: uuid.UUID, body: SensorUpdate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Sensor).join(Component).join(Crane).join(Facility).where(Sensor.id == sensor_id, Facility.org_id == user.org_id))
    sensor = result.scalar_one_or_none()
    if sensor is None:
        raise HTTPException(status_code=404, detail="Sensor not found")
    if body.label is not None:
        sensor.label = body.label
    if body.component_id is not None:
        sensor.component_id = body.component_id
    await db.commit()
    await db.refresh(sensor)
    return sensor


@router.delete("/sensors/{sensor_id}", status_code=204)
async def delete_sensor(sensor_id: uuid.UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Sensor).join(Component).join(Crane).join(Facility).where(Sensor.id == sensor_id, Facility.org_id == user.org_id))
    sensor = result.scalar_one_or_none()
    if sensor is None:
        raise HTTPException(status_code=404, detail="Sensor not found")
    await db.delete(sensor)
    await db.commit()


# ── Bearing Specs ───────────────────────────────────────

@router.post("/bearing-specs", response_model=BearingSpecOut, status_code=201)
async def create_bearing_spec(body: BearingSpecCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Component).join(Crane).join(Facility).where(Component.id == body.component_id, Facility.org_id == user.org_id))
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Component not found")
    spec = BearingSpec(**body.model_dump())
    db.add(spec)
    await db.commit()
    await db.refresh(spec)
    return spec
