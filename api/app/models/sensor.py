import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Sensor(Base):
    __tablename__ = "sensors"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    component_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("components.id", ondelete="CASCADE"), nullable=False)
    mac_address: Mapped[str] = mapped_column(String(23), unique=True, nullable=False)
    sensor_type: Mapped[int] = mapped_column(Integer, default=114)
    label: Mapped[str | None] = mapped_column(String(255))
    installed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    component = relationship("Component", back_populates="sensors")
    readings = relationship("Reading", back_populates="sensor", cascade="all, delete-orphan")
    fft_captures = relationship("FFTCapture", back_populates="sensor", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="sensor", cascade="all, delete-orphan")
