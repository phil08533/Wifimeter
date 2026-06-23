import asyncio
import logging
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.config import settings
from app.database.db import init_db, SessionLocal
from app.database.models import Device, TrafficHistory
from app.routers import devices, traffic, ws, settings as settings_router
from app.services import discovery, traffic_monitor

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)


async def _scan_loop():
    """Periodically discover devices and upsert them into the database."""
    while True:
        try:
            found = await discovery.discover_devices(settings.subnet)
            db: Session = SessionLocal()
            try:
                now = datetime.utcnow()
                found_ips = {d["ip"] for d in found}

                # Mark offline devices
                db.query(Device).filter(Device.ip.notin_(found_ips)).update(
                    {"is_online": False}, synchronize_session=False
                )

                for dev in found:
                    existing = db.query(Device).filter(Device.ip == dev["ip"]).first()
                    if existing:
                        existing.is_online = True
                        existing.last_seen = now
                        if dev["hostname"] and dev["hostname"] != dev["ip"]:
                            existing.hostname = dev["hostname"]
                        if dev["vendor"] != "Unknown":
                            existing.vendor = dev["vendor"]
                    else:
                        db_dev = Device(
                            ip=dev["ip"],
                            mac=dev["mac"],
                            hostname=dev["hostname"],
                            vendor=dev["vendor"],
                            is_online=True,
                            last_seen=now,
                        )
                        db.add(db_dev)
                        db.flush()

                    traffic_monitor.register_device(dev["ip"])

                db.commit()
                logger.info("Scan complete: %d device(s) found", len(found))
            finally:
                db.close()
        except Exception as exc:
            logger.error("Scan error: %s", exc)

        await asyncio.sleep(settings.scan_interval)


async def _persist_traffic_loop():
    """Write traffic snapshots to the DB every 60 seconds for long-term history."""
    await asyncio.sleep(60)
    while True:
        db: Session = SessionLocal()
        try:
            devices = db.query(Device).filter(Device.is_online == True).all()  # noqa: E712
            all_traffic = traffic_monitor.get_all_traffic()
            for dev in devices:
                stats = all_traffic.get(dev.ip)
                if stats:
                    row = TrafficHistory(
                        device_id=dev.id,
                        download_mbps=stats["download"],
                        upload_mbps=stats["upload"],
                        download_bytes_total=stats["download_total"] * 1_000_000,
                        upload_bytes_total=stats["upload_total"] * 1_000_000,
                    )
                    db.add(row)
            db.commit()
        except Exception as exc:
            logger.error("Traffic persist error: %s", exc)
        finally:
            db.close()
        await asyncio.sleep(60)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    logger.info("Database initialized")

    loop = asyncio.get_event_loop()
    tasks = [
        loop.create_task(traffic_monitor.run_traffic_monitor(settings.traffic_interval)),
        loop.create_task(_scan_loop()),
        loop.create_task(_persist_traffic_loop()),
    ]
    yield
    for t in tasks:
        t.cancel()


app = FastAPI(
    title="Wifimeter API",
    description="Network management dashboard – device discovery, live traffic, QoS controls",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(devices.router)
app.include_router(traffic.router)
app.include_router(ws.router)
app.include_router(settings_router.router)


@app.get("/health")
def health():
    return {"status": "ok", "version": "1.0.0"}
