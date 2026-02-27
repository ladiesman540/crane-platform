from pydantic import BaseModel, field_validator


class FFTPayload(BaseModel):
    axis: str
    odr: int
    num_bins: int
    data: list[float]


class SensorReading(BaseModel):
    addr: str
    firmware: int | None = None
    battery_percent: int | None = None
    counter: int | None = None
    sensor_type: int = 114
    mode: int | None = None
    odr: int | None = None
    temperature: float | None = None
    x_rms_ACC_G: float | None = None
    x_max_ACC_G: float | None = None
    x_velocity_mm_sec: float | None = None
    x_displacement_mm: float | None = None
    x_peak_one_Hz: float | None = None
    x_peak_two_Hz: float | None = None
    x_peak_three_Hz: float | None = None
    y_rms_ACC_G: float | None = None
    y_max_ACC_G: float | None = None
    y_velocity_mm_sec: float | None = None
    y_displacement_mm: float | None = None
    y_peak_one_Hz: float | None = None
    y_peak_two_Hz: float | None = None
    y_peak_three_Hz: float | None = None
    z_rms_ACC_G: float | None = None
    z_max_ACC_G: float | None = None
    z_velocity_mm_sec: float | None = None
    z_displacement_mm: float | None = None
    z_peak_one_Hz: float | None = None
    z_peak_two_Hz: float | None = None
    z_peak_three_Hz: float | None = None
    rpm: int | None = None
    rssi: int | None = None
    mA1: float | None = None
    mA2: float | None = None
    roll: float | None = None
    pitch: float | None = None
    sensor_data: dict | None = None
    fft: FFTPayload | None = None

    @field_validator("battery_percent", mode="before")
    @classmethod
    def coerce_battery_percent(cls, v):
        if v is None:
            return None
        return int(float(v))


class IngestResponse(BaseModel):
    status: str
    reading_id: int
