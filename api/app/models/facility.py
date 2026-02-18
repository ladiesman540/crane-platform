import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Facility(Base):
    __tablename__ = "facilities"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    location: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    organization = relationship("Organization", back_populates="facilities")
    cranes = relationship("Crane", back_populates="facility", cascade="all, delete-orphan")
