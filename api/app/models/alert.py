import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    rule_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("alert_rules.id"))
    sensor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("sensors.id"), nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="open")
    message: Mapped[str] = mapped_column(Text, nullable=False)
    reading_id: Mapped[int | None] = mapped_column(Integer)
    acknowledged_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    resolved_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    rule = relationship("AlertRule", back_populates="alerts")
    sensor = relationship("Sensor", back_populates="alerts")
