import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, ForeignKey, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Crane(Base):
    __tablename__ = "cranes"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    facility_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("facilities.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    crane_type: Mapped[str | None] = mapped_column(String(100))
    capacity_tons: Mapped[float | None] = mapped_column(Numeric)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    facility = relationship("Facility", back_populates="cranes")
    components = relationship("Component", back_populates="crane", cascade="all, delete-orphan")
