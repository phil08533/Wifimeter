#!/bin/bash
set -e

echo "╔══════════════════════════════════╗"
echo "║   Wifimeter — Linux Setup       ║"
echo "╚══════════════════════════════════╝"
echo ""

if [ "$EUID" -ne 0 ]; then
    echo "Please run as root:  sudo bash setup.sh"
    exit 1
fi

# ── Step 1: Docker ────────────────────────────────────────────────────────────
if ! command -v docker &> /dev/null; then
    echo "[1/4] Installing Docker..."
    apt-get update -qq
    apt-get install -y -qq docker.io docker-compose-v2
    systemctl enable --now docker
    echo "      Done."
else
    echo "[1/4] Docker is already installed."
fi

# ── Step 2: Environment file ──────────────────────────────────────────────────
echo "[2/4] Setting up environment..."
if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
    echo "      Created backend/.env"
    echo "      Default subnet is 192.168.1.0/24 — edit if yours is different:"
    echo "        nano backend/.env"
else
    echo "      backend/.env already exists."
fi

# ── Step 3: Build and launch ──────────────────────────────────────────────────
echo "[3/4] Building and starting containers..."
echo "      (First run takes 3-5 minutes — subsequent starts are instant)"
echo ""
docker compose -f docker-compose.linux.yml up -d --build

# ── Step 4: Done ──────────────────────────────────────────────────────────────
echo ""
echo "[4/4] Wifimeter is running!"
echo ""

LAN_IP=$(hostname -I | awk '{print $1}')
echo "  Open in any browser on your network:"
echo ""
echo "    http://${LAN_IP}:5173"
echo ""
echo "  To stop:    sudo docker compose -f docker-compose.linux.yml down"
echo "  To restart: sudo docker compose -f docker-compose.linux.yml up -d"
echo "  To view logs: sudo docker compose -f docker-compose.linux.yml logs -f"
echo ""
