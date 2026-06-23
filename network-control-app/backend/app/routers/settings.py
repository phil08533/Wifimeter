from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.config import settings
from app.services.router_adapter import get_adapter

router = APIRouter(prefix="/settings", tags=["settings"])


class RouterConfig(BaseModel):
    host: str
    user: str = "root"
    password: str
    port: int = 22


class AppConfig(BaseModel):
    subnet: str
    scan_interval: int
    openwrt_host: Optional[str] = None


@router.get("")
def get_settings():
    return {
        "subnet": settings.subnet,
        "scan_interval": settings.scan_interval,
        "openwrt_host": settings.openwrt_host,
        "openwrt_user": settings.openwrt_user,
        "openwrt_port": settings.openwrt_port,
        "router_connected": bool(settings.openwrt_host),
    }


@router.post("/router/test")
def test_router_connection(config: RouterConfig):
    try:
        from app.services.router_adapter import OpenWrtAdapter
        adapter = OpenWrtAdapter(config.host, config.user, config.password, config.port)
        out, _ = adapter._run("echo ok")
        adapter.close()
        return {"connected": "ok" in out, "message": "Connection successful"}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Connection failed: {exc}")
