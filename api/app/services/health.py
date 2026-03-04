"""Health scoring service for sensors and cranes."""

from datetime import datetime, timedelta, timezone


STALE_MINUTES = 60


def sensor_health(sensor_type: int, reading) -> str:
    """Compute health status from a single reading. Returns good/fair/needs_attention/offline."""
    if reading is None:
        return "offline"

    ts = reading.timestamp
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) - ts > timedelta(minutes=STALE_MINUTES):
        return "offline"

    if sensor_type == 114:
        # Vibration — max velocity across axes
        vels = [
            v for v in [
                reading.x_velocity_mm_sec,
                reading.y_velocity_mm_sec,
                reading.z_velocity_mm_sec,
            ] if v is not None
        ]
        if not vels:
            return "offline"
        max_vel = max(vels)
        if max_vel >= 1.12:
            return "needs_attention"
        if max_vel >= 0.71:
            return "fair"
        return "good"

    if sensor_type == 39:
        # Temperature
        temp = reading.temperature
        if temp is None:
            return "offline"
        if temp >= 80:
            return "needs_attention"
        if temp >= 60:
            return "fair"
        return "good"

    if sensor_type == 47:
        # Tilt
        roll = abs(reading.roll) if reading.roll is not None else None
        pitch = abs(reading.pitch) if reading.pitch is not None else None
        vals = [v for v in [roll, pitch] if v is not None]
        if not vals:
            return "offline"
        worst = max(vals)
        if worst >= 5:
            return "needs_attention"
        if worst >= 2:
            return "fair"
        return "good"

    if sensor_type == 52:
        # 4-20mA
        ma1 = reading.mA1
        if ma1 is None:
            return "offline"
        if 4.0 <= ma1 <= 20.0:
            return "good"
        return "needs_attention"

    if sensor_type == 28:
        # 3-channel current monitor
        channels = [reading.channel_1, reading.channel_2, reading.channel_3]
        if any(c is None or c == 0 for c in channels):
            return "needs_attention"
        return "good"

    # Unknown sensor type — default good if reading exists
    return "good"


_SEVERITY = {"good": 0, "fair": 1, "needs_attention": 2}


def crane_health(sensor_statuses: list[str], override_status: str | None = None) -> str:
    """Compute crane-level health. Override wins if set. Otherwise worst-case-wins."""
    if override_status:
        return override_status

    # Filter out offline sensors — they don't contribute
    active = [s for s in sensor_statuses if s != "offline"]
    if not active:
        return "offline"

    return max(active, key=lambda s: _SEVERITY.get(s, 0))
