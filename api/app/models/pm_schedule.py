import uuid
from datetime import datetime, date

from sqlalchemy import String, DateTime, Date, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class PMSchedule(Base):
    __tablename__ = "pm_schedules"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    crane_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cranes.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    assigned_to: Mapped[str | None] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)  # pending | completed
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
