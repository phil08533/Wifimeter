from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.database.db import get_db
from app.database.models import Device, Schedule
from app.schemas.device import DeviceResponse, DeviceUpdate, BandwidthLimit, ScheduleCreate, ScheduleResponse
from app.services import qos_controller
from app.services.traffic_monitor import register_device

router = APIRouter(prefix="/devices", tags=["devices"])


@router.get("", response_model=List[DeviceResponse])
def list_devices(db: Session = Depends(get_db)):
    return db.query(Device).order_by(Device.is_online.desc(), Device.hostname).all()


@router.get("/{device_id}", response_model=DeviceResponse)
def get_device(device_id: int, db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return device


@router.patch("/{device_id}", response_model=DeviceResponse)
def update_device(device_id: int, payload: DeviceUpdate, db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(device, field, value)
    db.commit()
    db.refresh(device)
    return device


@router.post("/{device_id}/limit", response_model=DeviceResponse)
def set_bandwidth_limit(device_id: int, limit: BandwidthLimit, db: Session = Depends(get_db)):
    ok = qos_controller.apply_bandwidth_limit(db, device_id, limit.download_limit, limit.upload_limit)
    if not ok:
        raise HTTPException(status_code=404, detail="Device not found")
    device = db.query(Device).filter(Device.id == device_id).first()
    return device


@router.post("/{device_id}/priority", response_model=DeviceResponse)
def set_priority(device_id: int, priority: str, db: Session = Depends(get_db)):
    ok = qos_controller.apply_priority(db, device_id, priority)
    if not ok:
        raise HTTPException(status_code=400, detail="Invalid priority or device not found")
    device = db.query(Device).filter(Device.id == device_id).first()
    return device


@router.get("/{device_id}/schedules", response_model=List[ScheduleResponse])
def list_schedules(device_id: int, db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return db.query(Schedule).filter(Schedule.device_id == device_id).all()


@router.post("/{device_id}/schedules", response_model=ScheduleResponse)
def create_schedule(device_id: int, schedule: ScheduleCreate, db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    db_schedule = Schedule(device_id=device_id, **schedule.model_dump())
    db.add(db_schedule)
    db.commit()
    db.refresh(db_schedule)
    return db_schedule


@router.delete("/{device_id}/schedules/{schedule_id}")
def delete_schedule(device_id: int, schedule_id: int, db: Session = Depends(get_db)):
    schedule = db.query(Schedule).filter(
        Schedule.id == schedule_id, Schedule.device_id == device_id
    ).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    db.delete(schedule)
    db.commit()
    return {"ok": True}
