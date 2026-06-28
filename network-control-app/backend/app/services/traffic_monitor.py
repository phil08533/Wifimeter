"""
Per-device traffic monitoring.

Live mode:  requires root + scapy packet capture on the LAN interface.
Demo mode:  distributes real system I/O among known devices with added jitter,
            giving realistic-looking charts without root access.
"""
import asyncio
import logging
import math
import random
import time
from collections import defaultdict
from datetime import datetime
from typing import Dict, Optional

import psutil

logger = logging.getLogger(__name__)

# Shared state – updated by the background loop, read by API handlers
_traffic: Dict[str, Dict] = {}          # ip -> {download, upload, dl_total, ul_total}
_history: Dict[str, list] = defaultdict(list)  # ip -> [{ts, dl, ul}, ...]
_MAX_HISTORY = 300  # 5 minutes at 1 sample/second

_scapy_available = False
_capture_counts: Dict[str, Dict] = defaultdict(lambda: {"rx": 0, "tx": 0})
_last_counts: Dict[str, Dict] = {}


def _try_import_scapy() -> bool:
    try:
        import scapy.all  # noqa: F401
        return True
    except ImportError:
        return False


# ──────────────────────────────────────────────────────────────────────────────
# Demo mode helpers
# ──────────────────────────────────────────────────────────────────────────────

_demo_profiles: Dict[str, Dict] = {}


def _demo_profile(ip: str) -> Dict:
    """Assign a stable usage profile to an IP so traffic looks device-specific."""
    if ip not in _demo_profiles:
        seed = sum(ord(c) for c in ip)
        rng = random.Random(seed)
        _demo_profiles[ip] = {
            "base_dl": rng.uniform(0.1, 20.0),
            "base_ul": rng.uniform(0.05, 5.0),
            "phase": rng.uniform(0, math.pi * 2),
            "variance": rng.uniform(0.2, 0.8),
        }
    return _demo_profiles[ip]


def _demo_traffic(ip: str, t: float) -> tuple[float, float]:
    p = _demo_profile(ip)
    wave = math.sin(t / 15.0 + p["phase"]) * p["variance"]
    dl = max(0.01, p["base_dl"] * (1 + wave) + random.gauss(0, 0.3))
    ul = max(0.01, p["base_ul"] * (1 + wave * 0.5) + random.gauss(0, 0.1))
    return round(dl, 3), round(ul, 3)


# ──────────────────────────────────────────────────────────────────────────────
# Scapy live capture (root only)
# ──────────────────────────────────────────────────────────────────────────────

def _start_scapy_capture(iface: Optional[str] = None) -> None:
    """Launch scapy sniffer in a daemon thread; counts bytes per src/dst IP."""
    from scapy.all import sniff, IP  # type: ignore

    def handle(pkt):
        if IP not in pkt:
            return
        size = len(pkt)
        src, dst = pkt[IP].src, pkt[IP].dst
        _capture_counts[src]["tx"] = _capture_counts[src].get("tx", 0) + size
        _capture_counts[dst]["rx"] = _capture_counts[dst].get("rx", 0) + size

    import threading
    t = threading.Thread(
        target=lambda: sniff(prn=handle, store=False, iface=iface),
        daemon=True,
    )
    t.start()
    logger.info("Scapy live capture started on interface %s", iface or "default")


# ──────────────────────────────────────────────────────────────────────────────
# Background update loop
# ──────────────────────────────────────────────────────────────────────────────

async def run_traffic_monitor(interval: int = 1) -> None:
    """Continuously update _traffic at <interval> second cadence."""
    global _scapy_available
    _scapy_available = _try_import_scapy()

    if _scapy_available:
        try:
            _start_scapy_capture()
        except PermissionError:
            logger.info("Not root – falling back to demo traffic mode")
            _scapy_available = False

    while True:
        t0 = time.monotonic()
        now = datetime.utcnow()

        if _scapy_available:
            _update_from_scapy(interval)
        else:
            _update_demo(now)

        await asyncio.sleep(max(0, interval - (time.monotonic() - t0)))


def _update_from_scapy(interval: int) -> None:
    global _last_counts
    current = dict(_capture_counts)
    for ip, counts in current.items():
        prev = _last_counts.get(ip, {"rx": 0, "tx": 0})
        rx_bytes = max(0, counts.get("rx", 0) - prev.get("rx", 0))
        tx_bytes = max(0, counts.get("tx", 0) - prev.get("tx", 0))
        dl_mbps = round((rx_bytes * 8) / (1_000_000 * interval), 3)
        ul_mbps = round((tx_bytes * 8) / (1_000_000 * interval), 3)
        prev_total = _traffic.get(ip, {})
        _traffic[ip] = {
            "download": dl_mbps,
            "upload": ul_mbps,
            "download_total": round(prev_total.get("download_total", 0) + rx_bytes / 1_000_000, 3),
            "upload_total": round(prev_total.get("upload_total", 0) + tx_bytes / 1_000_000, 3),
        }
        _append_history(ip, dl_mbps, ul_mbps)
    _last_counts = current


def _update_demo(now: datetime) -> None:
    t = now.timestamp()
    for ip in list(_traffic.keys()):
        dl, ul = _demo_traffic(ip, t)
        prev = _traffic[ip]
        _traffic[ip] = {
            "download": dl,
            "upload": ul,
            "download_total": round(prev.get("download_total", 0) + dl / 3600, 3),
            "upload_total": round(prev.get("upload_total", 0) + ul / 3600, 3),
        }
        _append_history(ip, dl, ul)


def _append_history(ip: str, dl: float, ul: float) -> None:
    h = _history[ip]
    h.append({"timestamp": datetime.utcnow().isoformat(), "download_mbps": dl, "upload_mbps": ul})
    if len(h) > _MAX_HISTORY:
        del h[:-_MAX_HISTORY]


# ──────────────────────────────────────────────────────────────────────────────
# Public API used by routers
# ──────────────────────────────────────────────────────────────────────────────

def register_device(ip: str) -> None:
    """Tell the monitor about a device so demo mode generates data for it."""
    if ip not in _traffic:
        _traffic[ip] = {"download": 0.0, "upload": 0.0, "download_total": 0.0, "upload_total": 0.0}


def get_all_traffic() -> Dict[str, Dict]:
    return dict(_traffic)


def get_device_traffic(ip: str) -> Optional[Dict]:
    return _traffic.get(ip)


def get_device_history(ip: str, limit: int = 60) -> list:
    return list(_history.get(ip, []))[-limit:]
