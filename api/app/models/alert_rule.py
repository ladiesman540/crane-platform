import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, ForeignKey, Integer, Boolean, ARRAY
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class AlertRule(Base):
    __tablename__ = "alert_rules"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id"), nullable=False)
    sensor_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("sensors.id"))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    conditions: Mapped[dict] = mapped_column(JSONB, nullable=False)
    channels: Mapped[list] = mapped_column(ARRAY(String), nullable=False)
    recipients: Mapped[dict] = mapped_column(JSONB, nullable=False)
    cooldown_minutes: Mapped[int] = mapped_column(Integer, default=60)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    organization = relationship("Organization", back_populates="alert_rules")
    alerts = relationship("Alert", back_populates="rule", cascade="all, delete-orphan")
