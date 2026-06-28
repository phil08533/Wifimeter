"""
QoS controller: orchestrates bandwidth limits and priority rules
across the router adapter and the local database.
"""
import logging
from sqlalchemy.orm import Session
from app.database.models import Device
from app.services.router_adapter import get_adapter
from app.config import settings

logger = logging.getLogger(__name__)


def apply_bandwidth_limit(db: Session, device_id: int, download_mbps: float, upload_mbps: float) -> bool:
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        return False

    device.download_limit = download_mbps
    device.upload_limit = upload_mbps
    db.commit()

    adapter = get_adapter(settings.openwrt_host, settings.openwrt_user, settings.openwrt_password, settings.openwrt_port)
    if download_mbps == 0 and upload_mbps == 0:
        return adapter.remove_bandwidth_limit(device.ip)
    return adapter.set_bandwidth_limit(device.ip, download_mbps, upload_mbps)


def apply_priority(db: Session, device_id: int, priority: str) -> bool:
    valid = {"critical", "high", "normal", "low", "guest"}
    if priority not in valid:
        return False

    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        return False

    device.priority = priority
    db.commit()

    adapter = get_adapter(settings.openwrt_host, settings.openwrt_user, settings.openwrt_password, settings.openwrt_port)
    return adapter.set_priority(device.ip, priority)
