"""
Device discovery via ARP scan (scapy) with ping-sweep fallback.
Runs privileged ARP when available; otherwise uses socket-based host sweep.
"""
import asyncio
import socket
import struct
import subprocess
import ipaddress
import logging
from datetime import datetime
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

# Partial OUI vendor table (extended lookup could use an external DB)
OUI_TABLE: Dict[str, str] = {
    "00:50:56": "VMware",
    "00:0c:29": "VMware",
    "00:1a:11": "Google",
    "b8:27:eb": "Raspberry Pi",
    "dc:a6:32": "Raspberry Pi",
    "e4:5f:01": "Raspberry Pi",
    "18:fe:34": "Espressif (ESP8266)",
    "24:62:ab": "Apple",
    "a4:c3:f0": "Apple",
    "f8:ff:c2": "Apple",
    "3c:22:fb": "Apple",
    "ac:de:48": "Apple",
    "00:17:f2": "Apple",
    "f4:f5:d8": "Google Nest",
    "54:60:09": "Google",
    "d8:6c:63": "Amazon",
    "fc:a6:67": "Amazon",
    "68:37:e9": "Amazon",
    "00:e0:4c": "Realtek",
    "00:23:14": "Intel",
    "8c:8d:28": "Intel",
    "00:1b:21": "Intel",
    "78:2b:cb": "Intel",
    "00:21:6a": "Cisco",
    "00:1a:a1": "Cisco",
    "fc:fb:fb": "Cisco",
    "20:a6:cd": "Ubiquiti",
    "24:a4:3c": "Ubiquiti",
    "04:18:d6": "Ubiquiti",
    "00:27:22": "TP-Link",
    "50:c7:bf": "TP-Link",
    "a0:f3:c1": "TP-Link",
    "00:09:5b": "Netgear",
    "20:4e:7f": "Netgear",
    "a0:04:60": "Samsung",
    "8c:71:f8": "Samsung",
    "50:01:bb": "Samsung",
    "98:01:a7": "Samsung",
    "d0:57:7b": "Dell",
    "00:14:22": "Dell",
    "98:90:96": "Dell",
    "08:00:27": "VirtualBox",
    "52:54:00": "QEMU/KVM",
}


def lookup_vendor(mac: str) -> str:
    prefix = mac[:8].lower()
    return OUI_TABLE.get(prefix, "Unknown")


def resolve_hostname(ip: str) -> str:
    try:
        return socket.gethostbyaddr(ip)[0]
    except Exception:
        return ip


async def _arp_scan(subnet: str) -> List[Dict]:
    """Privileged ARP scan using scapy."""
    try:
        from scapy.all import ARP, Ether, srp  # type: ignore
        import warnings
        warnings.filterwarnings("ignore")

        network = ipaddress.ip_network(subnet, strict=False)
        pkt = Ether(dst="ff:ff:ff:ff:ff:ff") / ARP(pdst=str(network))
        answered, _ = srp(pkt, timeout=2, verbose=False, retry=1)

        devices = []
        for _, recv in answered:
            ip = recv.psrc
            mac = recv.hwsrc.lower()
            devices.append({
                "ip": ip,
                "mac": mac,
                "hostname": resolve_hostname(ip),
                "vendor": lookup_vendor(mac),
            })
        return devices
    except Exception as exc:
        logger.debug("ARP scan failed (likely not root): %s", exc)
        return []


async def _ping_sweep(subnet: str) -> List[Dict]:
    """Unprivileged ping sweep fallback."""
    network = ipaddress.ip_network(subnet, strict=False)
    hosts = list(network.hosts())
    if len(hosts) > 512:
        hosts = hosts[:512]

    async def ping_one(ip: str) -> Optional[str]:
        try:
            proc = await asyncio.create_subprocess_exec(
                "ping", "-c", "1", "-W", "1", str(ip),
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.DEVNULL,
            )
            await asyncio.wait_for(proc.communicate(), timeout=2)
            return str(ip) if proc.returncode == 0 else None
        except Exception:
            return None

    tasks = [ping_one(str(h)) for h in hosts]
    results = await asyncio.gather(*tasks)
    live_ips = [r for r in results if r]

    devices = []
    for ip in live_ips:
        devices.append({
            "ip": ip,
            "mac": _fake_mac(ip),
            "hostname": resolve_hostname(ip),
            "vendor": "Unknown",
        })
    return devices


def _fake_mac(ip: str) -> str:
    """Generate a deterministic placeholder MAC from an IP (ping sweep has no MAC data)."""
    parts = ip.split(".")
    return f"00:00:{int(parts[0]):02x}:{int(parts[1]):02x}:{int(parts[2]):02x}:{int(parts[3]):02x}"


async def discover_devices(subnet: str) -> List[Dict]:
    """Return discovered devices, preferring ARP scan over ping sweep."""
    devices = await _arp_scan(subnet)
    if not devices:
        logger.info("ARP scan returned no results; falling back to ping sweep")
        devices = await _ping_sweep(subnet)

    # Deduplicate by IP
    seen: Dict[str, Dict] = {}
    for d in devices:
        seen[d["ip"]] = d

    return list(seen.values())
