import uuid
from datetime import datetime

from pydantic import BaseModel


# --- Organization ---

class OrganizationCreate(BaseModel):
    name: str


class OrganizationOut(BaseModel):
    id: uuid.UUID
    name: str
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Facility ---

class FacilityCreate(BaseModel):
    name: str
    location: str | None = None


class FacilityUpdate(BaseModel):
    name: str | None = None
    location: str | None = None


class FacilityOut(BaseModel):
    id: uuid.UUID
    org_id: uuid.UUID
    name: str
    location: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Crane ---

class CraneCreate(BaseModel):
    facility_id: uuid.UUID
    name: str
    crane_type: str | None = None
    capacity_tons: float | None = None


class CraneUpdate(BaseModel):
    name: str | None = None
    crane_type: str | None = None
    capacity_tons: float | None = None


class CraneOut(BaseModel):
    id: uuid.UUID
    facility_id: uuid.UUID
    name: str
    crane_type: str | None
    capacity_tons: float | None
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Component ---

class ComponentCreate(BaseModel):
    crane_id: uuid.UUID
    name: str
    component_type: str | None = None


class ComponentUpdate(BaseModel):
    name: str | None = None
    component_type: str | None = None


class ComponentOut(BaseModel):
    id: uuid.UUID
    crane_id: uuid.UUID
    name: str
    component_type: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Sensor ---

class SensorCreate(BaseModel):
    component_id: uuid.UUID
    mac_address: str
    sensor_type: int = 114
    label: str | None = None


class SensorUpdate(BaseModel):
    label: str | None = None
    component_id: uuid.UUID | None = None


class SensorOut(BaseModel):
    id: uuid.UUID
    component_id: uuid.UUID
    mac_address: str
    sensor_type: int
    label: str | None
    installed_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


# --- BearingSpec ---

class BearingSpecCreate(BaseModel):
    component_id: uuid.UUID
    manufacturer: str | None = None
    model: str | None = None
    num_rolling_elements: int | None = None
    rolling_element_diameter_mm: float | None = None
    pitch_diameter_mm: float | None = None
    contact_angle_degrees: float | None = None
    bpfo: float | None = None
    bpfi: float | None = None
    bsf: float | None = None
    ftf: float | None = None


class BearingSpecOut(BaseModel):
    id: uuid.UUID
    component_id: uuid.UUID
    manufacturer: str | None
    model: str | None
    bpfo: float | None
    bpfi: float | None
    bsf: float | None
    ftf: float | None

    model_config = {"from_attributes": True}
