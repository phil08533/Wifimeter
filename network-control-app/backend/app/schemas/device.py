from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class DeviceBase(BaseModel):
    ip: str
    mac: str
    hostname: Optional[str] = "Unknown"
    vendor: Optional[str] = "Unknown"


class DeviceCreate(DeviceBase):
    pass


class DeviceUpdate(BaseModel):
    hostname: Optional[str] = None
    priority: Optional[str] = None
    download_limit: Optional[float] = None
    upload_limit: Optional[float] = None


class DeviceResponse(DeviceBase):
    model_config = {"from_attributes": True}

    id: int
    is_online: bool
    priority: str
    download_limit: float
    upload_limit: float
    first_seen: Optional[datetime]
    last_seen: Optional[datetime]


class BandwidthLimit(BaseModel):
    download_limit: float  # Mbps
    upload_limit: float    # Mbps


class ScheduleCreate(BaseModel):
    name: str = "Schedule"
    start_time: str  # "HH:MM"
    end_time: str    # "HH:MM"
    days_of_week: list[int] = [0, 1, 2, 3, 4, 5, 6]
    download_limit: float = 0.0
    upload_limit: float = 0.0
    is_active: bool = True


class ScheduleResponse(ScheduleCreate):
    model_config = {"from_attributes": True}

    id: int
    device_id: int
    created_at: Optional[datetime]
