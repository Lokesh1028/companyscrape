from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_returns_ok_shape():
    r = client.get("/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    assert "version" in data
    assert data["environment"] in ("development", "staging", "production")
