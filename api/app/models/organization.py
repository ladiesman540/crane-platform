import uuid
from datetime import datetime

from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    users = relationship("User", back_populates="organization", cascade="all, delete-orphan")
    facilities = relationship("Facility", back_populates="organization", cascade="all, delete-orphan")
    api_keys = relationship("ApiKey", back_populates="organization", cascade="all, delete-orphan")
    alert_rules = relationship("AlertRule", back_populates="organization", cascade="all, delete-orphan")
