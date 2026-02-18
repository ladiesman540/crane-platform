import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Component(Base):
    __tablename__ = "components"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    crane_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cranes.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    component_type: Mapped[str | None] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    crane = relationship("Crane", back_populates="components")
    sensors = relationship("Sensor", back_populates="component", cascade="all, delete-orphan")
    bearing_specs = relationship("BearingSpec", back_populates="component", cascade="all, delete-orphan")
