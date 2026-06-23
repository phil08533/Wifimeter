"""Basic API smoke tests — run with: pytest tests/"""
import pytest


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_list_devices_empty(client):
    r = client.get("/devices")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_traffic_snapshot(client):
    r = client.get("/traffic")
    assert r.status_code == 200
    body = r.json()
    assert "devices" in body
    assert "timestamp" in body


def test_get_settings(client):
    r = client.get("/settings")
    assert r.status_code == 200
    body = r.json()
    assert "subnet" in body
    assert "scan_interval" in body


def test_device_not_found(client):
    r = client.get("/devices/99999")
    assert r.status_code == 404


def test_traffic_history_not_found(client):
    r = client.get("/traffic/99999/history")
    assert r.status_code == 404
