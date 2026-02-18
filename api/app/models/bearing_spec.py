import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, ForeignKey, Integer, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class BearingSpec(Base):
    __tablename__ = "bearing_specs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    component_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("components.id", ondelete="CASCADE"), nullable=False)
    manufacturer: Mapped[str | None] = mapped_column(String(255))
    model: Mapped[str | None] = mapped_column(String(100))
    num_rolling_elements: Mapped[int | None] = mapped_column(Integer)
    rolling_element_diameter_mm: Mapped[float | None] = mapped_column(Numeric)
    pitch_diameter_mm: Mapped[float | None] = mapped_column(Numeric)
    contact_angle_degrees: Mapped[float | None] = mapped_column(Numeric)
    bpfo: Mapped[float | None] = mapped_column(Numeric)
    bpfi: Mapped[float | None] = mapped_column(Numeric)
    bsf: Mapped[float | None] = mapped_column(Numeric)
    ftf: Mapped[float | None] = mapped_column(Numeric)

    component = relationship("Component", back_populates="bearing_specs")
