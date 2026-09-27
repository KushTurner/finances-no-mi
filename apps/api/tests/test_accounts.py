from starlette.testclient import TestClient

SYNTHETIC_ACCOUNT = {
    "name": "Synthetic Current",
    "institution": "natwest",
    "account_type": "current_account",
}


def test_lists_a_created_account(client: TestClient) -> None:
    client.post("/accounts", json=SYNTHETIC_ACCOUNT)

    response = client.get("/accounts")

    assert response.json() == [{"id": 1, **SYNTHETIC_ACCOUNT}]


def test_rejects_a_duplicate_account_name(client: TestClient) -> None:
    client.post("/accounts", json=SYNTHETIC_ACCOUNT)

    response = client.post("/accounts", json={**SYNTHETIC_ACCOUNT, "institution": "amex"})

    assert response.status_code == 409
