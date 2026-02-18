"""Seed script: creates a test org, user, API key, and sample asset hierarchy."""
import asyncio
import secrets
import uuid

from app.auth import hash_password, pwd_context
from app.db import async_session
from app.models.organization import Organization
from app.models.user import User
from app.models.api_key import ApiKey
from app.models.facility import Facility
from app.models.crane import Crane
from app.models.component import Component
from app.models.sensor import Sensor


async def seed():
    async with async_session() as db:
        # Organization
        org = Organization(name="Acme Manufacturing")
        db.add(org)
        await db.flush()

        # User (admin@acme.com / password123)
        user = User(
            org_id=org.id,
            email="admin@acme.com",
            password_hash=hash_password("password123"),
            role="admin",
        )
        db.add(user)

        # API key for gateway
        raw_key = "crane_" + secrets.token_urlsafe(32)
        api_key = ApiKey(
            org_id=org.id,
            key_hash=pwd_context.hash(raw_key),
            label="Dev Gateway",
        )
        db.add(api_key)

        # Facility
        facility = Facility(org_id=org.id, name="Plant A", location="Houston, TX")
        db.add(facility)
        await db.flush()

        # Crane
        crane = Crane(facility_id=facility.id, name="Overhead Crane #1", crane_type="overhead", capacity_tons=20)
        db.add(crane)
        await db.flush()

        # Components
        hoist = Component(crane_id=crane.id, name="Hoist Motor", component_type="hoist_motor")
        bridge = Component(crane_id=crane.id, name="Bridge Motor", component_type="bridge_motor")
        gearbox = Component(crane_id=crane.id, name="Gearbox", component_type="gearbox")
        db.add_all([hoist, bridge, gearbox])
        await db.flush()

        # Sensors
        sensor1 = Sensor(component_id=hoist.id, mac_address="00:13:A2:00:41:AB:CD:01", label="Hoist Vibration")
        sensor2 = Sensor(component_id=bridge.id, mac_address="00:13:A2:00:41:AB:CD:02", label="Bridge Vibration")
        sensor3 = Sensor(component_id=gearbox.id, mac_address="00:13:A2:00:41:AB:CD:03", label="Gearbox Vibration")
        db.add_all([sensor1, sensor2, sensor3])

        await db.commit()

        print("Seed complete!")
        print(f"  Org:      {org.name} ({org.id})")
        print(f"  User:     admin@acme.com / password123")
        print(f"  API Key:  {raw_key}")
        print(f"  Facility: {facility.name} ({facility.id})")
        print(f"  Crane:    {crane.name} ({crane.id})")
        print(f"  Sensors:  {sensor1.mac_address}, {sensor2.mac_address}, {sensor3.mac_address}")


if __name__ == "__main__":
    asyncio.run(seed())
