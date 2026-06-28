from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timedelta

from app.database.db import get_db
from app.database.models import Device, TrafficHistory
from app.schemas.traffic import TrafficSnapshot, TrafficHistoryResponse, TrafficHistoryPoint, DeviceTraffic
from app.services import traffic_monitor

router = APIRouter(prefix="/traffic", tags=["traffic"])


@router.get("", response_model=TrafficSnapshot)
def get_traffic_snapshot(db: Session = Depends(get_db)):
    """Current traffic rates for all devices."""
    all_traffic = traffic_monitor.get_all_traffic()
    devices_traffic = {}
    for ip, stats in all_traffic.items():
        devices_traffic[ip] = DeviceTraffic(
            download=stats["download"],
            upload=stats["upload"],
            download_total=stats["download_total"],
            upload_total=stats["upload_total"],
        )
    return TrafficSnapshot(timestamp=datetime.utcnow(), devices=devices_traffic)


@router.get("/{device_id}/history", response_model=TrafficHistoryResponse)
def get_device_history(
    device_id: int,
    limit: int = Query(60, ge=1, le=300),
    db: Session = Depends(get_db),
):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    # Prefer in-memory recent history for low latency
    mem_history = traffic_monitor.get_device_history(device.ip, limit)
    if mem_history:
        points = [
            TrafficHistoryPoint(
                timestamp=datetime.fromisoformat(p["timestamp"]),
                download_mbps=p["download_mbps"],
                upload_mbps=p["upload_mbps"],
            )
            for p in mem_history
        ]
    else:
        # Fall back to database history
        rows = (
            db.query(TrafficHistory)
            .filter(TrafficHistory.device_id == device_id)
            .order_by(TrafficHistory.timestamp.desc())
            .limit(limit)
            .all()
        )
        points = [
            TrafficHistoryPoint(
                timestamp=r.timestamp,
                download_mbps=r.download_mbps,
                upload_mbps=r.upload_mbps,
            )
            for r in reversed(rows)
        ]

    return TrafficHistoryResponse(device_id=device_id, ip=device.ip, points=points)
