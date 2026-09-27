from starlette.testclient import TestClient

from finances_api.main import app


def test_health_check() -> None:
    client = TestClient(app)

    response = client.get("/health")

    assert response.json() == {"status": "ok"}
