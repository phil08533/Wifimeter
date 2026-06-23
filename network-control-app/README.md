# Wifimeter – Network Management Dashboard

A full-stack network control panel with real-time device discovery, per-device
bandwidth monitoring, QoS controls, and OpenWrt router integration.

**Stack:** FastAPI · React · Tailwind CSS · Recharts · SQLite · OpenWrt/SSH

---

## Features

| Feature | Status |
|---|---|
| Device discovery (ARP scan / ping sweep) | ✅ |
| Real-time traffic graphs via WebSocket | ✅ |
| Per-device bandwidth limit sliders | ✅ |
| Priority levels (Critical → Guest) | ✅ |
| Schedule-based bandwidth rules | ✅ |
| Network topology map | ✅ |
| OpenWrt SSH integration (tc/HTB) | ✅ |
| Usage history (SQLite → graphs) | ✅ |

---

## Quick Start

### Development (two terminals)

**Backend**
```bash
cd network-control-app/backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # edit subnet / router settings
uvicorn app.main:app --reload
```

**Frontend**
```bash
cd network-control-app/frontend
npm install
npm run dev
```

Open http://localhost:5173

### Docker (production)

```bash
cp .env.example .env   # edit SUBNET, OPENWRT_HOST, etc.
docker compose up -d
```

Open http://localhost:5173

> **Note:** The backend container runs with `network_mode: host` so the ARP
> scanner can see LAN devices. ARP scanning also requires the container to run
> as root (the default). Without root, the scanner falls back to a ping sweep;
> without network access it uses realistic simulated per-device traffic.

---

## API Reference

### Devices

| Method | Path | Description |
|---|---|---|
| `GET` | `/devices` | List all discovered devices |
| `GET` | `/devices/{id}` | Get single device |
| `PATCH` | `/devices/{id}` | Update hostname / priority / limits |
| `POST` | `/devices/{id}/limit` | Set download/upload limit (Mbps) |
| `POST` | `/devices/{id}/priority` | Set priority level |
| `GET` | `/devices/{id}/schedules` | List bandwidth schedules |
| `POST` | `/devices/{id}/schedules` | Create schedule |
| `DELETE` | `/devices/{id}/schedules/{sid}` | Delete schedule |

### Traffic

| Method | Path | Description |
|---|---|---|
| `GET` | `/traffic` | Current snapshot for all devices |
| `GET` | `/traffic/{id}/history` | Historical points (up to 300) |

### WebSocket

```
ws://localhost:8000/ws
```

Broadcasts every second:
```json
{
  "type": "update",
  "timestamp": "2026-06-23T10:00:00",
  "summary": { "total_devices": 8, "online_devices": 7, "total_download": 45.2, "total_upload": 3.1 },
  "devices": [
    {
      "id": 1, "ip": "192.168.1.5", "mac": "aa:bb:cc:dd:ee:ff",
      "hostname": "MacBook-Pro", "vendor": "Apple",
      "is_online": true, "priority": "high",
      "download_limit": 0, "upload_limit": 0,
      "traffic": { "download": 12.4, "upload": 1.1, "download_total": 234.5, "upload_total": 18.2 }
    }
  ]
}
```

---

## OpenWrt Integration

1. Enable SSH on your router (LuCI → System → Administration)
2. Fill in the Settings page (IP, user, password)
3. Click **Test Connection**
4. Bandwidth limits will now apply via Linux `tc` HTB queuing on the router

The adapter writes `iptables` marks and `tc` HTB classes. Removing a limit
(setting to 0 Mbps) cleans up the rules automatically.

---

## Project Structure

```
network-control-app/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app + background tasks
│   │   ├── config.py            # Settings (pydantic-settings)
│   │   ├── database/
│   │   │   ├── db.py            # SQLAlchemy engine + session
│   │   │   └── models.py        # Device, TrafficHistory, Schedule
│   │   ├── schemas/             # Pydantic request/response models
│   │   ├── services/
│   │   │   ├── discovery.py     # ARP scan + ping sweep
│   │   │   ├── traffic_monitor.py  # Per-device bandwidth tracking
│   │   │   ├── qos_controller.py   # Limit/priority orchestration
│   │   │   └── router_adapter.py   # OpenWrt SSH adapter
│   │   └── routers/             # FastAPI route handlers
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── components/          # DeviceCard, TrafficGraph, NetworkMap…
│       ├── pages/               # Dashboard, Devices, Traffic, Settings
│       ├── hooks/               # useWebSocket, useDevices
│       └── services/api.js      # Axios API client
├── tests/test_api.py
└── docker-compose.yml
```

---

## Roadmap (v2)

- JWT authentication + HTTPS
- Multiple router support (DD-WRT, pfSense)
- Mesh network view
- AI bandwidth recommendations
- Mobile app (React Native)
- ISP outage detection
