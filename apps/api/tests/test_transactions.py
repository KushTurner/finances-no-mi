from ofx_helpers import bank_statement_ofx, ofx_transaction
from starlette.testclient import TestClient
from test_imports import upload


def test_lists_original_details_newest_first(client: TestClient) -> None:
    upload(
        client,
        bank_statement_ofx(
            ofx_transaction(fitid="1", dtposted="20260902", trntype="POS", name="SYNTHETIC CAFE"),
            ofx_transaction(fitid="2", dtposted="20260903", trntype="POS", name="SYNTHETIC CAFE"),
        ),
        preset="natwest_select",
    )

    response = client.get("/transactions")

    assert response.json()[0] == {
        "id": 2,
        "account_name": "NatWest Select",
        "transaction_date": "2026-09-03",
        "amount_pence": -450,
        "raw_description": "SYNTHETIC CAFE",
        "source_type": "POS",
    }
    assert [row["id"] for row in response.json()] == [2, 1]
