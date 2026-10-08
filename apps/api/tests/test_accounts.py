from sqlalchemy.orm import Session
from starlette.testclient import TestClient

from finances_api.models import Account


def test_lists_accounts_in_name_order(client: TestClient, session: Session) -> None:
    session.add_all(
        [
            Account(
                name="NatWest",
                institution="natwest",
                account_type="current_account",
                preset="natwest_select",
                acctid="00000001",
            ),
            Account(
                name="Amex",
                institution="amex",
                account_type="credit_card",
                preset="amex_gold",
                acctid="XXXX-0001",
            ),
        ]
    )
    session.commit()

    response = client.get("/accounts")

    assert [account["name"] for account in response.json()] == ["Amex", "NatWest"]


def test_lists_the_account_presets(client: TestClient) -> None:
    response = client.get("/account-presets")

    assert response.json() == [
        {
            "id": "amex_gold",
            "name": "American Express Gold",
            "institution": "amex",
            "account_type": "credit_card",
        },
        {
            "id": "nationwide_flexone",
            "name": "Nationwide FlexOne",
            "institution": "nationwide",
            "account_type": "current_account",
        },
        {
            "id": "natwest_select",
            "name": "NatWest Select",
            "institution": "natwest",
            "account_type": "current_account",
        },
    ]
