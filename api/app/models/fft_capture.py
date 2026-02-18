from datetime import datetime

from sqlalchemy import Integer, String, DateTime, ForeignKey, LargeBinary
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class FFTCapture(Base):
    __tablename__ = "fft_captures"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    sensor_id: Mapped[str] = mapped_column(ForeignKey("sensors.id"), nullable=False, index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, index=True)
    axis: Mapped[str] = mapped_column(String(1), nullable=False)
    odr: Mapped[int] = mapped_column(Integer, nullable=False)
    num_bins: Mapped[int] = mapped_column(Integer, nullable=False)
    spectrum_data: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)

    sensor = relationship("Sensor", back_populates="fft_captures")
