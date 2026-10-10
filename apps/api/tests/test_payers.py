from typing import Any

import pytest
from ofx_helpers import bank_statement_ofx, ofx_transaction
from sqlalchemy import select
from sqlalchemy.orm import Session
from starlette.testclient import TestClient
from test_imports import upload

from finances_api.models import MerchantKey

FRIEND = "SYNTHETIC FRIEND"
EMPLOYER = "SYNTHETIC EMPLOYER"
OWN_SAVINGS = "SYNTHETIC OWN SAVINGS"


@pytest.fixture
def imported(client: TestClient) -> None:
    upload(
        client,
        bank_statement_ofx(
            ofx_transaction(fitid="1", dtposted="20260902", trnamt="-60.00", name="SYNTHETIC CAFE"),
            ofx_transaction(fitid="2", dtposted="20260903", trnamt="20.00", name=FRIEND),
            ofx_transaction(fitid="3", dtposted="20260904", trnamt="10.00", name=FRIEND),
            ofx_transaction(fitid="4", dtposted="20260905", trnamt="-5.00", name=FRIEND),
            ofx_transaction(fitid="5", dtposted="20260906", trnamt="2000.00", name=EMPLOYER),
            ofx_transaction(fitid="6", dtposted="20260907", trnamt="-500.00", name=OWN_SAVINGS),
            ofx_transaction(fitid="7", dtposted="20260908", trnamt="300.00", name=OWN_SAVINGS),
        ),
        preset="natwest_select",
    )


def payer_id(client: TestClient, name: str) -> int:
    return next(payer["id"] for payer in client.get("/payers").json() if payer["name"] == name)


def set_rule(client: TestClient, name: str, counts_as: str | None) -> Any:
    return client.patch(f"/payers/{payer_id(client, name)}", json={"counts_as": counts_as})


def marks(client: TestClient) -> dict[int, tuple[str | None, str | None]]:
    return {
        row["id"]: (row["counts_as"], row["counts_as_source"])
        for row in client.get("/transactions").json()
    }


def totals(client: TestClient) -> tuple[int, int]:
    summary = client.get("/summary?from=2026-09-01&to=2026-09-30").json()
    return summary["spent_pence"], summary["income_pence"]


def test_lists_everyone_who_sent_money_undecided_first_then_by_amount(
    client: TestClient, imported: None
) -> None:
    set_rule(client, EMPLOYER, "income")

    payers = client.get("/payers").json()

    assert [(payer["name"], payer["counts_as"]) for payer in payers] == [
        (OWN_SAVINGS, None),
        (FRIEND, None),
        (EMPLOYER, "income"),
    ]
    assert payers[1] == {
        "id": payer_id(client, FRIEND),
        "name": FRIEND,
        "payment_count": 2,
        "received_pence": 3000,
        "latest_payment_date": "2026-09-04",
        "counts_as": None,
    }


def test_a_repayment_rule_reduces_spending_and_leaves_money_sent_to_them_as_spending(
    client: TestClient, imported: None
) -> None:
    response = set_rule(client, FRIEND, "repayment")

    assert response.json() == {"updated_count": 2}
    assert [marks(client)[id] for id in (2, 3, 4)] == [
        ("repayment", "payer"),
        ("repayment", "payer"),
        (None, None),
    ]
    assert totals(client) == (6000 + 500 + 50000 - 3000, 200000 + 30000)


def test_an_own_account_rule_removes_both_directions_from_totals_and_largest_payments(
    client: TestClient, imported: None
) -> None:
    set_rule(client, OWN_SAVINGS, "own_account")

    summary = client.get("/summary?from=2026-09-01&to=2026-09-30").json()

    assert totals(client) == (6000 + 500, 3000 + 200000)
    assert all(payment["description"] != OWN_SAVINGS for payment in summary["largest_payments"])


def test_your_own_mark_survives_rule_changes_and_clearing_it_falls_back_to_the_rule(
    client: TestClient, imported: None
) -> None:
    set_rule(client, FRIEND, "repayment")
    client.patch("/transactions/counts-as", json={"transaction_ids": [3], "counts_as": "income"})
    set_rule(client, FRIEND, None)
    set_rule(client, FRIEND, "repayment")
    kept = marks(client)[3]

    client.patch("/transactions/counts-as", json={"transaction_ids": [3], "counts_as": None})

    assert kept == ("income", "human")
    assert marks(client)[3] == ("repayment", "payer")


def test_clearing_a_rule_returns_its_payments_to_counting_by_direction(
    client: TestClient, imported: None
) -> None:
    set_rule(client, FRIEND, "repayment")

    response = set_rule(client, FRIEND, None)

    assert response.json() == {"updated_count": 2}
    assert totals(client) == (6000 + 500 + 50000, 3000 + 200000 + 30000)


def test_new_imports_from_a_payer_with_a_rule_are_marked(
    client: TestClient, imported: None
) -> None:
    set_rule(client, FRIEND, "repayment")

    upload(
        client,
        bank_statement_ofx(
            ofx_transaction(fitid="8", dtposted="20260909", trnamt="15.00", name=FRIEND),
            ofx_transaction(fitid="9", dtposted="20260909", trnamt="-15.00", name=FRIEND),
        ),
    )

    assert [marks(client)[id] for id in (8, 9)] == [("repayment", "payer"), (None, None)]


def test_lists_only_the_payments_received_from_a_payer(client: TestClient, imported: None) -> None:
    response = client.get(f"/transactions?payer={payer_id(client, FRIEND)}")

    assert [row["id"] for row in response.json()] == [3, 2]


def test_income_and_repayments_cannot_mark_money_going_out(
    client: TestClient, imported: None
) -> None:
    response = client.patch(
        "/transactions/counts-as", json={"transaction_ids": [2, 4], "counts_as": "repayment"}
    )

    assert response.status_code == 400
    assert [marks(client)[id] for id in (2, 4)] == [(None, None), (None, None)]


def test_a_rule_for_someone_who_never_sent_money_is_rejected(
    client: TestClient, session: Session, imported: None
) -> None:
    cafe = session.scalars(
        select(MerchantKey.id).where(MerchantKey.value == "SYNTHETIC CAFE")
    ).one()

    response = client.patch(f"/payers/{cafe}", json={"counts_as": "income"})

    assert response.status_code == 404
