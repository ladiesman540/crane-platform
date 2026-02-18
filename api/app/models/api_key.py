import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class ApiKey(Base):
    __tablename__ = "api_keys"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id"), nullable=False)
    key_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    label: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    organization = relationship("Organization", back_populates="api_keys")
