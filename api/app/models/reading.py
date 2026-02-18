from datetime import datetime

from sqlalchemy import Integer, Float, SmallInteger, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Reading(Base):
    __tablename__ = "readings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    sensor_id: Mapped[str] = mapped_column(ForeignKey("sensors.id"), nullable=False, index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, index=True)
    counter: Mapped[int | None] = mapped_column(Integer)
    firmware: Mapped[int | None] = mapped_column(Integer)
    battery_percent: Mapped[int | None] = mapped_column(SmallInteger)
    odr: Mapped[int | None] = mapped_column(Integer)
    temperature: Mapped[float | None] = mapped_column(Float)
    x_rms_ACC_G: Mapped[float | None] = mapped_column(Float)
    x_max_ACC_G: Mapped[float | None] = mapped_column(Float)
    x_velocity_mm_sec: Mapped[float | None] = mapped_column(Float)
    x_displacement_mm: Mapped[float | None] = mapped_column(Float)
    x_peak_one_Hz: Mapped[float | None] = mapped_column(Float)
    x_peak_two_Hz: Mapped[float | None] = mapped_column(Float)
    x_peak_three_Hz: Mapped[float | None] = mapped_column(Float)
    y_rms_ACC_G: Mapped[float | None] = mapped_column(Float)
    y_max_ACC_G: Mapped[float | None] = mapped_column(Float)
    y_velocity_mm_sec: Mapped[float | None] = mapped_column(Float)
    y_displacement_mm: Mapped[float | None] = mapped_column(Float)
    y_peak_one_Hz: Mapped[float | None] = mapped_column(Float)
    y_peak_two_Hz: Mapped[float | None] = mapped_column(Float)
    y_peak_three_Hz: Mapped[float | None] = mapped_column(Float)
    z_rms_ACC_G: Mapped[float | None] = mapped_column(Float)
    z_max_ACC_G: Mapped[float | None] = mapped_column(Float)
    z_velocity_mm_sec: Mapped[float | None] = mapped_column(Float)
    z_displacement_mm: Mapped[float | None] = mapped_column(Float)
    z_peak_one_Hz: Mapped[float | None] = mapped_column(Float)
    z_peak_two_Hz: Mapped[float | None] = mapped_column(Float)
    z_peak_three_Hz: Mapped[float | None] = mapped_column(Float)
    rpm: Mapped[int | None] = mapped_column(Integer)
    rssi: Mapped[int | None] = mapped_column(SmallInteger)

    sensor = relationship("Sensor", back_populates="readings")
