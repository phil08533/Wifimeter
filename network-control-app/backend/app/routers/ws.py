"""WebSocket endpoint – broadcasts live traffic + device state every second."""
import asyncio
import json
import logging
from datetime import datetime
from typing import Set

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.database.db import SessionLocal
from app.database.models import Device
from app.services import traffic_monitor

router = APIRouter(tags=["websocket"])
logger = logging.getLogger(__name__)

_connections: Set[WebSocket] = set()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    _connections.add(websocket)
    try:
        while True:
            data = _build_payload()
            await websocket.send_text(json.dumps(data))
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        pass
    except Exception as exc:
        logger.debug("WS error: %s", exc)
    finally:
        _connections.discard(websocket)


def _build_payload() -> dict:
    db: Session = SessionLocal()
    try:
        devices = db.query(Device).all()
        all_traffic = traffic_monitor.get_all_traffic()

        device_list = []
        total_dl, total_ul = 0.0, 0.0

        for d in devices:
            stats = all_traffic.get(d.ip, {"download": 0.0, "upload": 0.0, "download_total": 0.0, "upload_total": 0.0})
            total_dl += stats["download"]
            total_ul += stats["upload"]
            device_list.append({
                "id": d.id,
                "ip": d.ip,
                "mac": d.mac,
                "hostname": d.hostname,
                "vendor": d.vendor,
                "is_online": d.is_online,
                "priority": d.priority,
                "download_limit": d.download_limit,
                "upload_limit": d.upload_limit,
                "traffic": stats,
            })

        return {
            "type": "update",
            "timestamp": datetime.utcnow().isoformat(),
            "summary": {
                "total_devices": len(devices),
                "online_devices": sum(1 for d in devices if d.is_online),
                "total_download": round(total_dl, 3),
                "total_upload": round(total_ul, 3),
            },
            "devices": device_list,
        }
    finally:
        db.close()
