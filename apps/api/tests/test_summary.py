from datetime import date
from typing import Any
from uuid import uuid4

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session
from starlette.testclient import TestClient

from finances_api.models import Account, Category, MerchantKey, Transaction


def add_account(session: Session, name: str = "NatWest") -> int:
    account = Account(name=name, institution="natwest", account_type="current_account")
    session.add(account)
    session.commit()
    return account.id


def add_transaction(
    session: Session,
    account_id: int,
    on: str,
    amount_pence: int,
    category: str | None = None,
    description: str = "SYNTHETIC SHOP",
) -> int:
    merchant_key = session.scalar(select(MerchantKey).where(MerchantKey.value == description))
    if merchant_key is None:
        merchant_key = MerchantKey(value=description)
        session.add(merchant_key)
        session.flush()
    category_id = (
        session.scalars(select(Category.id).where(Category.name == category)).one()
        if category
        else None
    )
    transaction = Transaction(
        account_id=account_id,
        transaction_date=date.fromisoformat(on),
        amount_minor=amount_pence,
        raw_description=description,
        source_key=uuid4().hex,
        merchant_key_id=merchant_key.id,
        category_id=category_id,
        category_decision_source="human" if category else None,
        category_decided_at=date(2026, 10, 6) if category else None,
    )
    session.add(transaction)
    session.commit()
    return transaction.id


def get_summary(client: TestClient, query: str) -> Any:
    response = client.get(f"/summary?{query}")
    assert response.status_code == 200
    return response.json()


def test_spent_counts_spending_less_refunds_and_uncategorized_outgoing(
    client: TestClient, session: Session
) -> None:
    natwest = add_account(session)
    add_transaction(session, natwest, "2026-09-02", -5000, "Groceries")
    add_transaction(session, natwest, "2026-09-03", 1000, "Groceries")
    add_transaction(session, natwest, "2026-09-04", -2000)
    add_transaction(session, natwest, "2026-09-05", 300000, "Income")
    add_transaction(session, natwest, "2026-09-06", -40000, "Own-account transfers")
    add_transaction(session, natwest, "2026-09-07", 40000, "Own-account transfers")

    summary = get_summary(client, "from=2026-09-01&to=2026-09-30")

    assert (summary["spent_pence"], summary["income_pence"], summary["net_pence"]) == (
        6000,
        300000,
        294000,
    )


def test_uncategorized_incoming_is_reported_but_not_counted(
    client: TestClient, session: Session
) -> None:
    natwest = add_account(session)
    add_transaction(session, natwest, "2026-09-02", -2000)
    add_transaction(session, natwest, "2026-09-03", 1200)
    add_transaction(session, natwest, "2026-09-04", 700)

    summary = get_summary(client, "from=2026-09-01&to=2026-09-30")

    assert (summary["spent_pence"], summary["income_pence"]) == (2000, 0)
    assert summary["uncategorized"] == {
        "outgoing_count": 1,
        "outgoing_pence": 2000,
        "incoming_count": 2,
        "incoming_pence": 1900,
    }


def test_range_ends_at_the_latest_transaction_of_the_selected_accounts(
    client: TestClient, session: Session
) -> None:
    natwest = add_account(session, "NatWest")
    amex = add_account(session, "Amex")
    add_transaction(session, natwest, "2026-10-03", -100)
    add_transaction(session, amex, "2026-10-05", -100)

    summary = get_summary(client, f"from=2026-10-01&to=2026-10-06&account_id={natwest}")

    assert (summary["start"], summary["end"]) == ("2026-10-01", "2026-10-03")


def test_range_keeps_its_end_when_it_has_no_transactions_yet(
    client: TestClient, session: Session
) -> None:
    natwest = add_account(session)
    add_transaction(session, natwest, "2026-09-20", -100)

    summary = get_summary(client, "from=2026-10-01&to=2026-10-06")

    assert (summary["end"], summary["transaction_count"]) == ("2026-10-06", 0)


def test_account_filter_narrows_totals_but_every_account_is_listed(
    client: TestClient, session: Session
) -> None:
    natwest = add_account(session, "NatWest")
    amex = add_account(session, "Amex")
    nationwide = add_account(session, "Nationwide")
    add_transaction(session, natwest, "2026-09-02", -1000, "Groceries")
    add_transaction(session, amex, "2026-09-03", -2500, "Eating out")

    summary = get_summary(client, f"from=2026-09-01&to=2026-09-30&account_id={amex}")

    assert (summary["spent_pence"], summary["transaction_count"]) == (2500, 1)
    assert summary["accounts"] == [
        {
            "id": natwest,
            "name": "NatWest",
            "spent_pence": 1000,
            "latest_transaction_date": "2026-09-02",
        },
        {"id": amex, "name": "Amex", "spent_pence": 2500, "latest_transaction_date": "2026-09-03"},
        {"id": nationwide, "name": "Nationwide", "spent_pence": 0, "latest_transaction_date": None},
    ]


def test_categories_rank_spending_and_leave_out_income_transfers_and_zero_totals(
    client: TestClient, session: Session
) -> None:
    natwest = add_account(session)
    add_transaction(session, natwest, "2026-09-02", -1000, "Transport")
    add_transaction(session, natwest, "2026-09-03", -1000, "Eating out")
    add_transaction(session, natwest, "2026-09-04", -3000, "Groceries")
    add_transaction(session, natwest, "2026-09-05", -500, "Travel")
    add_transaction(session, natwest, "2026-09-06", 500, "Travel")
    add_transaction(session, natwest, "2026-09-07", 300000, "Income")
    add_transaction(session, natwest, "2026-09-08", -40000, "Own-account transfers")
    add_transaction(session, natwest, "2026-09-09", -9999)

    summary = get_summary(client, "from=2026-09-01&to=2026-09-30")

    assert [(row["name"], row["spent_pence"]) for row in summary["categories"]] == [
        ("Groceries", 3000),
        ("Eating out", 1000),
        ("Transport", 1000),
    ]


def test_largest_payments_are_the_eight_biggest_outgoing_spending_transactions(
    client: TestClient, session: Session
) -> None:
    natwest = add_account(session)
    for pence in range(100, 1100, 100):
        add_transaction(session, natwest, "2026-09-02", -pence, "Groceries")
    add_transaction(session, natwest, "2026-09-03", -5000)
    add_transaction(session, natwest, "2026-09-04", -90000, "Own-account transfers")
    add_transaction(session, natwest, "2026-09-05", 80000, "Groceries")

    summary = get_summary(client, "from=2026-09-01&to=2026-09-30")

    assert [row["amount_pence"] for row in summary["largest_payments"]] == [
        -5000,
        -1000,
        -900,
        -800,
        -700,
        -600,
        -500,
        -400,
    ]


def test_largest_payments_show_newest_first_when_amounts_tie(
    client: TestClient, session: Session
) -> None:
    natwest = add_account(session)
    add_transaction(session, natwest, "2026-09-02", -500, description="SYNTHETIC OLDER")
    add_transaction(session, natwest, "2026-09-04", -500, description="SYNTHETIC NEWER")

    summary = get_summary(client, "from=2026-09-01&to=2026-09-30")

    assert summary["largest_payments"] == [
        {
            "id": 2,
            "date": "2026-09-04",
            "description": "SYNTHETIC NEWER",
            "account_name": "NatWest",
            "amount_pence": -500,
        },
        {
            "id": 1,
            "date": "2026-09-02",
            "description": "SYNTHETIC OLDER",
            "account_name": "NatWest",
            "amount_pence": -500,
        },
    ]


def test_months_are_complete_only_when_the_data_covers_them_fully(
    client: TestClient, session: Session
) -> None:
    natwest = add_account(session)
    add_transaction(session, natwest, "2026-08-15", -1000, "Groceries")
    add_transaction(session, natwest, "2026-09-10", -2000, "Groceries")
    add_transaction(session, natwest, "2026-10-03", -3000, "Groceries")

    response = client.get("/summary/months?from=2026-07&to=2026-10")

    assert [
        (month["month"], month["spent_pence"], month["complete"])
        for month in response.json()["months"]
    ] == [
        ("2026-07", 0, False),
        ("2026-08", 1000, False),
        ("2026-09", 2000, True),
        ("2026-10", 3000, False),
    ]


def test_monthly_average_and_amount_kept_use_complete_months_only(
    client: TestClient, session: Session
) -> None:
    natwest = add_account(session)
    add_transaction(session, natwest, "2026-06-15", -99999, "Groceries")
    add_transaction(session, natwest, "2026-07-01", 300000, "Income")
    add_transaction(session, natwest, "2026-07-10", -100000, "Home & bills")
    add_transaction(session, natwest, "2026-08-01", 300000, "Income")
    add_transaction(session, natwest, "2026-08-10", -100001, "Home & bills")
    add_transaction(session, natwest, "2026-09-02", -50000, "Home & bills")

    response = client.get("/summary/months?from=2026-06&to=2026-09")

    assert (response.json()["average_spent_pence"], response.json()["kept_pence"]) == (
        100000,
        399999,
    )


def test_days_include_days_without_spending_in_the_running_total(
    client: TestClient, session: Session
) -> None:
    natwest = add_account(session)
    add_transaction(session, natwest, "2026-09-01", -1000, "Groceries")
    add_transaction(session, natwest, "2026-09-03", -500)
    add_transaction(session, natwest, "2026-09-03", 300000, "Income")

    response = client.get("/summary/days?from=2026-09-01&to=2026-09-03")

    assert response.json() == [
        {"date": "2026-09-01", "spent_pence": 1000, "running_spent_pence": 1000},
        {"date": "2026-09-02", "spent_pence": 0, "running_spent_pence": 1000},
        {"date": "2026-09-03", "spent_pence": 500, "running_spent_pence": 1500},
    ]


@pytest.mark.parametrize(
    "url",
    [
        "/summary?from=2026-09-02&to=2026-09-01",
        "/summary/months?from=2026-09&to=2026-08",
        "/summary/days?from=2026-09-02&to=2026-09-01",
    ],
)
def test_rejects_a_range_that_ends_before_it_starts(client: TestClient, url: str) -> None:
    response = client.get(url)

    assert response.status_code == 400
    assert response.json() == {"detail": "Choose a start on or before the end"}


@pytest.mark.parametrize(
    "url",
    [
        "/summary?from=2026-09-01&to=2026-09-30",
        "/summary/months?from=2026-08&to=2026-09",
        "/summary/days?from=2026-09-01&to=2026-09-30",
    ],
)
def test_rejects_an_unknown_account(client: TestClient, session: Session, url: str) -> None:
    natwest = add_account(session)

    response = client.get(f"{url}&account_id={natwest}&account_id=999")

    assert response.status_code == 400
    assert response.json() == {"detail": "Unknown account"}


def test_rejects_a_month_that_is_not_year_and_month(client: TestClient) -> None:
    response = client.get("/summary/months?from=2026-9-01&to=2026-10")

    assert response.status_code == 422
