"""
OpenWrt router adapter.
Connects over SSH and manages bandwidth via Linux tc (traffic control).
Falls back to no-op mode when no router is configured.
"""
import asyncio
import logging
from typing import Optional, Dict

logger = logging.getLogger(__name__)


class OpenWrtAdapter:
    def __init__(self, host: str, user: str, password: str, port: int = 22):
        self.host = host
        self.user = user
        self.password = password
        self.port = port
        self._client = None

    def _connect(self):
        import paramiko
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(
            hostname=self.host,
            port=self.port,
            username=self.user,
            password=self.password,
            timeout=10,
        )
        self._client = client

    def _run(self, cmd: str) -> tuple[str, str]:
        if not self._client:
            self._connect()
        _, stdout, stderr = self._client.exec_command(cmd)
        return stdout.read().decode(), stderr.read().decode()

    def close(self):
        if self._client:
            self._client.close()
            self._client = None

    # ── Bandwidth limiting via tc ──────────────────────────────────────────

    def set_bandwidth_limit(self, ip: str, download_mbps: float, upload_mbps: float) -> bool:
        """Apply HTB qdisc rules to limit a specific IP's throughput."""
        try:
            iface = self._get_lan_iface()
            # Convert Mbps to kbit
            dl_kbit = int(download_mbps * 1000) if download_mbps > 0 else 0
            ul_kbit = int(upload_mbps * 1000) if upload_mbps > 0 else 0

            # Remove any existing mark-based rule for this IP
            self._run(f"iptables -t mangle -D POSTROUTING -d {ip} -j MARK --set-mark 100 2>/dev/null || true")
            self._run(f"iptables -t mangle -D PREROUTING -s {ip} -j MARK --set-mark 101 2>/dev/null || true")

            if dl_kbit > 0:
                self._run(f"iptables -t mangle -A POSTROUTING -d {ip} -j MARK --set-mark 100")
                self._run(
                    f"tc filter add dev {iface} parent 1: protocol ip u32 "
                    f"match ip dst {ip}/32 flowid 1:10"
                )
                self._run(
                    f"tc class add dev {iface} parent 1: classid 1:10 htb "
                    f"rate {dl_kbit}kbit ceil {dl_kbit}kbit"
                )

            if ul_kbit > 0:
                self._run(f"iptables -t mangle -A PREROUTING -s {ip} -j MARK --set-mark 101")

            out, err = self._run("echo ok")
            return "ok" in out
        except Exception as exc:
            logger.error("Failed to set bandwidth limit for %s: %s", ip, exc)
            return False

    def remove_bandwidth_limit(self, ip: str) -> bool:
        try:
            self._run(f"iptables -t mangle -D POSTROUTING -d {ip} -j MARK --set-mark 100 2>/dev/null || true")
            self._run(f"iptables -t mangle -D PREROUTING -s {ip} -j MARK --set-mark 101 2>/dev/null || true")
            return True
        except Exception as exc:
            logger.error("Failed to remove bandwidth limit for %s: %s", ip, exc)
            return False

    def set_priority(self, ip: str, priority: str) -> bool:
        """Map priority level to DSCP marking."""
        dscp_map = {
            "critical": "0x2e",  # EF (Expedited Forwarding)
            "high":     "0x28",  # CS5
            "normal":   "0x00",  # BE
            "low":      "0x08",  # CS1
            "guest":    "0x00",  # BE
        }
        dscp = dscp_map.get(priority, "0x00")
        try:
            self._run(
                f"iptables -t mangle -A PREROUTING -s {ip} -j DSCP --set-dscp {dscp}"
            )
            return True
        except Exception as exc:
            logger.error("Failed to set priority for %s: %s", ip, exc)
            return False

    def _get_lan_iface(self) -> str:
        out, _ = self._run("uci get network.lan.ifname 2>/dev/null || echo br-lan")
        return out.strip() or "br-lan"

    def get_connected_clients(self) -> list[Dict]:
        """Read ARP table from router for authoritative device list."""
        try:
            out, _ = self._run("cat /proc/net/arp")
            clients = []
            for line in out.splitlines()[1:]:
                parts = line.split()
                if len(parts) >= 4 and parts[2] == "0x2":
                    clients.append({"ip": parts[0], "mac": parts[3]})
            return clients
        except Exception as exc:
            logger.error("Failed to read ARP table: %s", exc)
            return []


class NoOpAdapter:
    """Used when no router is configured; logs all calls instead of executing."""

    def set_bandwidth_limit(self, ip: str, dl: float, ul: float) -> bool:
        logger.info("[NoOp] Would set %s dl=%.1f ul=%.1f Mbps", ip, dl, ul)
        return True

    def remove_bandwidth_limit(self, ip: str) -> bool:
        logger.info("[NoOp] Would remove limit for %s", ip)
        return True

    def set_priority(self, ip: str, priority: str) -> bool:
        logger.info("[NoOp] Would set priority %s for %s", priority, ip)
        return True

    def get_connected_clients(self) -> list:
        return []


_adapter: Optional[OpenWrtAdapter | NoOpAdapter] = None


def get_adapter(host: str = "", user: str = "root", password: str = "", port: int = 22):
    global _adapter
    if _adapter is None:
        if host:
            _adapter = OpenWrtAdapter(host, user, password, port)
            logger.info("Using OpenWrt adapter at %s", host)
        else:
            _adapter = NoOpAdapter()
            logger.info("No router configured – using no-op adapter")
    return _adapter
