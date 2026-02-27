import struct
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import verify_api_key
from app.db import get_db
from app.models.api_key import ApiKey
from app.models.sensor import Sensor
from app.models.reading import Reading
from app.models.fft_capture import FFTCapture
from app.schemas.ingest import SensorReading, IngestResponse
from app.websocket import manager

router = APIRouter(prefix="/api/v1", tags=["ingest"])


@router.post("/ingest", response_model=IngestResponse)
async def ingest(
    body: SensorReading,
    api_key: ApiKey = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db),
):
    # Look up sensor by MAC address
    result = await db.execute(select(Sensor).where(Sensor.mac_address == body.addr))
    sensor = result.scalar_one_or_none()
    if sensor is None:
        raise HTTPException(status_code=404, detail=f"Sensor with addr {body.addr} not registered")

    # Check for duplicate (same sensor + counter within last 10 minutes)
    if body.counter is not None:
        recent_cutoff = datetime.now(timezone.utc) - timedelta(minutes=10)
        dup = await db.execute(
            select(Reading.id).where(
                Reading.sensor_id == sensor.id,
                Reading.counter == body.counter,
                Reading.timestamp >= recent_cutoff,
            )
        )
        if dup.scalar_one_or_none() is not None:
            raise HTTPException(status_code=409, detail="Duplicate reading")

    # Extract fields from nested sensor_data if present
    sd = body.sensor_data or {}
    mA1 = body.mA1 or sd.get("mA1")
    mA2 = body.mA2 or sd.get("mA2")
    roll = body.roll or sd.get("Roll") or sd.get("roll")
    pitch = body.pitch or sd.get("Pitch") or sd.get("pitch")
    temperature = body.temperature or sd.get("temperature")

    # Store summary reading
    reading = Reading(
        sensor_id=sensor.id,
        counter=body.counter,
        firmware=body.firmware,
        battery_percent=body.battery_percent,
        odr=body.odr,
        temperature=temperature,
        x_rms_ACC_G=body.x_rms_ACC_G,
        x_max_ACC_G=body.x_max_ACC_G,
        x_velocity_mm_sec=body.x_velocity_mm_sec,
        x_displacement_mm=body.x_displacement_mm,
        x_peak_one_Hz=body.x_peak_one_Hz,
        x_peak_two_Hz=body.x_peak_two_Hz,
        x_peak_three_Hz=body.x_peak_three_Hz,
        y_rms_ACC_G=body.y_rms_ACC_G,
        y_max_ACC_G=body.y_max_ACC_G,
        y_velocity_mm_sec=body.y_velocity_mm_sec,
        y_displacement_mm=body.y_displacement_mm,
        y_peak_one_Hz=body.y_peak_one_Hz,
        y_peak_two_Hz=body.y_peak_two_Hz,
        y_peak_three_Hz=body.y_peak_three_Hz,
        z_rms_ACC_G=body.z_rms_ACC_G,
        z_max_ACC_G=body.z_max_ACC_G,
        z_velocity_mm_sec=body.z_velocity_mm_sec,
        z_displacement_mm=body.z_displacement_mm,
        z_peak_one_Hz=body.z_peak_one_Hz,
        z_peak_two_Hz=body.z_peak_two_Hz,
        z_peak_three_Hz=body.z_peak_three_Hz,
        rpm=body.rpm,
        rssi=body.rssi,
        mA1=mA1,
        mA2=mA2,
        roll=roll,
        pitch=pitch,
    )
    db.add(reading)
    await db.flush()

    # Store FFT if present
    if body.fft is not None:
        spectrum_bytes = struct.pack(f"{len(body.fft.data)}f", *body.fft.data)
        fft = FFTCapture(
            sensor_id=sensor.id,
            axis=body.fft.axis,
            odr=body.fft.odr,
            num_bins=body.fft.num_bins,
            spectrum_data=spectrum_bytes,
        )
        db.add(fft)

    await db.commit()
    await db.refresh(reading)

    # Broadcast via WebSocket
    await manager.broadcast({
        "event": "sensor.reading",
        "sensor_id": str(sensor.id),
        "reading_id": reading.id,
        "temperature": temperature,
        "x_velocity_mm_sec": body.x_velocity_mm_sec,
        "y_velocity_mm_sec": body.y_velocity_mm_sec,
        "z_velocity_mm_sec": body.z_velocity_mm_sec,
        "battery_percent": body.battery_percent,
        "mA1": mA1,
        "mA2": mA2,
        "roll": roll,
        "pitch": pitch,
    })

    return IngestResponse(status="ok", reading_id=reading.id)
