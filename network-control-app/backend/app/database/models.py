from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.db import Base


class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    ip = Column(String, unique=True, index=True, nullable=False)
    mac = Column(String, unique=True, index=True, nullable=False)
    hostname = Column(String, default="Unknown")
    vendor = Column(String, default="Unknown")
    is_online = Column(Boolean, default=True)
    priority = Column(String, default="normal")  # critical, high, normal, low, guest
    download_limit = Column(Float, default=0.0)  # Mbps, 0 = unlimited
    upload_limit = Column(Float, default=0.0)    # Mbps, 0 = unlimited
    first_seen = Column(DateTime, server_default=func.now())
    last_seen = Column(DateTime, server_default=func.now(), onupdate=func.now())

    traffic_history = relationship("TrafficHistory", back_populates="device", cascade="all, delete-orphan")
    schedules = relationship("Schedule", back_populates="device", cascade="all, delete-orphan")


class TrafficHistory(Base):
    __tablename__ = "traffic_history"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=False)
    timestamp = Column(DateTime, server_default=func.now(), index=True)
    download_mbps = Column(Float, default=0.0)
    upload_mbps = Column(Float, default=0.0)
    download_bytes_total = Column(Float, default=0.0)
    upload_bytes_total = Column(Float, default=0.0)

    device = relationship("Device", back_populates="traffic_history")


class Schedule(Base):
    __tablename__ = "schedules"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=False)
    name = Column(String, default="Schedule")
    start_time = Column(String, nullable=False)  # "HH:MM"
    end_time = Column(String, nullable=False)    # "HH:MM"
    days_of_week = Column(JSON, default=list)    # [0,1,2,3,4,5,6] Mon=0
    download_limit = Column(Float, default=0.0)
    upload_limit = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    device = relationship("Device", back_populates="schedules")
