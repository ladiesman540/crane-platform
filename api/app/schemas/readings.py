import uuid
from datetime import datetime

from pydantic import BaseModel


class ReadingOut(BaseModel):
    id: int
    sensor_id: uuid.UUID
    timestamp: datetime
    battery_percent: int | None
    temperature: float | None
    x_rms_ACC_G: float | None
    x_max_ACC_G: float | None
    x_velocity_mm_sec: float | None
    x_displacement_mm: float | None
    x_peak_one_Hz: float | None
    x_peak_two_Hz: float | None
    x_peak_three_Hz: float | None
    y_rms_ACC_G: float | None
    y_max_ACC_G: float | None
    y_velocity_mm_sec: float | None
    y_displacement_mm: float | None
    y_peak_one_Hz: float | None
    y_peak_two_Hz: float | None
    y_peak_three_Hz: float | None
    z_rms_ACC_G: float | None
    z_max_ACC_G: float | None
    z_velocity_mm_sec: float | None
    z_displacement_mm: float | None
    z_peak_one_Hz: float | None
    z_peak_two_Hz: float | None
    z_peak_three_Hz: float | None
    rpm: int | None
    rssi: int | None

    model_config = {"from_attributes": True}
