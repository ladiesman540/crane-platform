"""Schemas for customer-facing API endpoints."""

import uuid
from datetime import datetime, date

from pydantic import BaseModel


# ── Health Override ──

class HealthOverrideIn(BaseModel):
    status: str  # good | fair | needs_attention
    note: str | None = None


class HealthOverrideOut(BaseModel):
    status: str
    note: str | None
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── PM Schedule ──

class PMScheduleCreate(BaseModel):
    title: str
    due_date: date
    description: str | None = None
    assigned_to: str | None = None


class PMScheduleUpdate(BaseModel):
    title: str | None = None
    due_date: date | None = None
    description: str | None = None
    assigned_to: str | None = None
    status: str | None = None  # pending | completed


class PMScheduleOut(BaseModel):
    id: uuid.UUID
    crane_id: uuid.UUID
    title: str
    description: str | None
    due_date: date
    assigned_to: str | None
    status: str
    completed_at: datetime | None
    created_at: datetime
    overdue: bool

    model_config = {"from_attributes": True}


# ── Log Entry ──

class LogEntryCreate(BaseModel):
    title: str
    description: str | None = None


class LogEntryUpdate(BaseModel):
    title: str | None = None
    description: str | None = None


class LogEntryOut(BaseModel):
    id: uuid.UUID
    crane_id: uuid.UUID
    title: str
    description: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Service Call ──

class ServiceCallCreate(BaseModel):
    title: str
    description: str | None = None
    priority: str | None = None  # low | medium | high | critical
    assigned_to: str | None = None


class ServiceCallUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    priority: str | None = None
    status: str | None = None  # open | in_progress | resolved
    assigned_to: str | None = None


class ServiceCallOut(BaseModel):
    id: uuid.UUID
    crane_id: uuid.UUID
    title: str
    description: str | None
    priority: str
    status: str
    assigned_to: str | None
    resolved_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Sensor summary for fleet/detail ──

class SensorSummary(BaseModel):
    id: uuid.UUID
    label: str | None
    sensor_type: int
    health: str
    last_reading_at: datetime | None


# ── Crane Fleet ──

class CraneFleetItem(BaseModel):
    id: uuid.UUID
    name: str
    crane_type: str | None
    capacity_tons: float | None
    facility_id: uuid.UUID
    facility_name: str
    health: str
    health_override: HealthOverrideOut | None
    sensor_count: int
    last_reading_at: datetime | None
    next_pm_due: date | None


class FleetResponse(BaseModel):
    cranes: list[CraneFleetItem]


# ── Crane Detail ──

class CraneDetailResponse(BaseModel):
    id: uuid.UUID
    name: str
    crane_type: str | None
    capacity_tons: float | None
    facility_id: uuid.UUID
    facility_name: str
    health: str
    health_override: HealthOverrideOut | None
    sensors: list[SensorSummary]
    pm_schedules: list[PMScheduleOut]
    log_entries: list[LogEntryOut]
    service_calls: list[ServiceCallOut]
