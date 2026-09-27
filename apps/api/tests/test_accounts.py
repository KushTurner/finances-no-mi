from sqlalchemy.orm import Session
from starlette.testclient import TestClient

from finances_api.models import Account


def test_lists_accounts_in_name_order(client: TestClient, session: Session) -> None:
    session.add_all(
        [
            Account(name="NatWest", institution="natwest", account_type="current_account"),
            Account(name="Amex", institution="amex", account_type="credit_card"),
        ]
    )
    session.commit()

    response = client.get("/accounts")

    assert [account["name"] for account in response.json()] == ["Amex", "NatWest"]
