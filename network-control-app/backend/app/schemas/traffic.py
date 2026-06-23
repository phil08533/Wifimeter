from pydantic import BaseModel
from typing import Dict, List, Optional
from datetime import datetime


class DeviceTraffic(BaseModel):
    download: float  # Mbps
    upload: float    # Mbps
    download_total: float  # MB
    upload_total: float    # MB


class TrafficSnapshot(BaseModel):
    timestamp: datetime
    devices: Dict[str, DeviceTraffic]


class TrafficHistoryPoint(BaseModel):
    model_config = {"from_attributes": True}

    timestamp: datetime
    download_mbps: float
    upload_mbps: float


class TrafficHistoryResponse(BaseModel):
    device_id: int
    ip: str
    points: List[TrafficHistoryPoint]
