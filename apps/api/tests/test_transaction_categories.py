from datetime import date

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session
from starlette.testclient import TestClient
from test_imports import natwest_csv, natwest_row, upload

from finances_api.models import Category, ImportFile, ImportFileTransaction, Transaction


@pytest.fixture
def imported(client: TestClient) -> list[int]:
    upload(
        client,
        natwest_csv(
            natwest_row(description="SYNTHETIC CAFE", value="-4.50"),
            natwest_row(description="SYNTHETIC CAFE", value="2.00"),
            natwest_row(description="SYNTHETIC SALARY", value="2000.00"),
            natwest_row(description="SYNTHETIC OWN ACCOUNT", value="-500.00"),
            natwest_row(description="SYNTHETIC PERSONAL PAYMENT", value="25.00"),
        ),
    )
    return [row["id"] for row in client.get("/transactions").json()]


def category_id(client: TestClient, name: str) -> int:
    return next(
        category["id"] for category in client.get("/categories").json() if category["name"] == name
    )


def test_lists_the_nine_defined_categories(client: TestClient) -> None:
    response = client.get("/categories")

    assert [category["name"] for category in response.json()] == [
        "Bills",
        "Food",
        "Subscriptions",
        "Transport",
        "Shopping",
        "Savings & investments",
        "Other",
        "Income",
        "Transfers",
    ]
    assert all(category["definition"] for category in response.json())


def test_lists_original_details_newest_first(client: TestClient) -> None:
    upload(client, natwest_csv(natwest_row(date="02 Sep 2026"), natwest_row(date="03 Sep 2026")))

    response = client.get("/transactions")

    assert response.json()[0] == {
        "id": 2,
        "account_name": "NatWest",
        "transaction_date": "2026-09-03",
        "amount_pence": -450,
        "raw_description": "SYNTHETIC CAFE",
        "source_type": "POS",
        "category_id": None,
    }
    assert [row["id"] for row in response.json()] == [2, 1]


def test_assigns_changes_and_clears_a_human_decision(
    client: TestClient, session: Session, imported: list[int]
) -> None:
    selected_id = imported[0]
    for category in [category_id(client, "Other"), category_id(client, "Other"), None]:
        response = client.patch(
            "/transactions/category",
            json={"transaction_ids": [selected_id], "category_id": category},
        )

        session.expire_all()
        transaction = session.get(Transaction, selected_id)
        assert response.json() == {"updated_count": 1}
        assert transaction is not None
        assert (transaction.category_id, transaction.category_decision_source) == (
            category,
            "human" if category is not None else None,
        )
        assert (transaction.category_decided_at is not None) == (category is not None)


def test_bulk_assignment_changes_only_selected_transactions(
    client: TestClient, imported: list[int]
) -> None:
    eating_out = category_id(client, "Food")

    response = client.patch(
        "/transactions/category", json={"transaction_ids": imported[-2:], "category_id": eating_out}
    )

    assert response.json() == {"updated_count": 2}
    assert [
        (row["amount_pence"], row["category_id"]) for row in client.get("/transactions").json()
    ] == [
        (2500, None),
        (-50000, None),
        (200000, None),
        (200, eating_out),
        (-450, eating_out),
    ]


def test_same_merchant_key_can_have_different_categories(
    client: TestClient, imported: list[int]
) -> None:
    category = category_id(client, "Other")

    client.patch(
        "/transactions/category", json={"transaction_ids": [imported[-1]], "category_id": category}
    )

    rows = client.get("/transactions").json()
    assert [row["category_id"] for row in rows[-2:]] == [None, category]


@pytest.mark.parametrize("selection", ["missing", "duplicate", "empty"])
def test_invalid_selection_leaves_existing_assignments_unchanged(
    client: TestClient, imported: list[int], selection: str
) -> None:
    category = category_id(client, "Income")
    selected_id = imported[0]
    client.patch(
        "/transactions/category", json={"transaction_ids": [selected_id], "category_id": category}
    )
    ids = {"missing": [selected_id, 99999], "duplicate": [selected_id, selected_id], "empty": []}[
        selection
    ]

    response = client.patch(
        "/transactions/category", json={"transaction_ids": ids, "category_id": None}
    )

    assert response.status_code in (400, 422)
    assert client.get("/transactions").json()[0]["category_id"] == category


def test_unknown_category_changes_nothing(client: TestClient, imported: list[int]) -> None:
    response = client.patch(
        "/transactions/category", json={"transaction_ids": imported, "category_id": 99999}
    )

    assert response.json() == {"detail": "Unknown category"}
    assert all(row["category_id"] is None for row in client.get("/transactions").json())


def test_uncategorized_filter_includes_cleared_transactions(
    client: TestClient, imported: list[int]
) -> None:
    category = category_id(client, "Transfers")
    client.patch(
        "/transactions/category", json={"transaction_ids": imported[:2], "category_id": category}
    )
    client.patch(
        "/transactions/category", json={"transaction_ids": [imported[0]], "category_id": None}
    )

    uncategorized = client.get("/transactions?category=uncategorized").json()
    assigned = client.get(f"/transactions?category={category}").json()

    assert [row["id"] for row in uncategorized] == [imported[0], *imported[2:]]
    assert [row["id"] for row in assigned] == [imported[1]]


def test_categorization_preserves_source_evidence_and_overlapping_import_identity(
    client: TestClient, session: Session
) -> None:
    original = natwest_csv(natwest_row())
    upload(client, original)
    category = category_id(client, "Food")

    client.patch("/transactions/category", json={"transaction_ids": [1], "category_id": category})
    response = upload(client, natwest_csv(natwest_row(), natwest_row(date="04 Sep 2026")))

    rows = session.scalars(select(Transaction).order_by(Transaction.id)).all()
    assert response.json()["existing_transaction_count"] == 1
    assert [(row.category_id, row.category_decision_source) for row in rows] == [
        (category, "human"),
        (None, None),
    ]
    assert (
        rows[0].transaction_date,
        rows[0].amount_minor,
        rows[0].balance_after_minor,
        rows[0].source_type,
        rows[0].raw_description,
    ) == (date(2026, 9, 3), -450, 99550, "POS", "SYNTHETIC CAFE")
    assert session.scalars(select(ImportFile.content).order_by(ImportFile.id)).first() == original
    assert len(session.scalars(select(ImportFileTransaction)).all()) == 3


@pytest.mark.parametrize("definition", ["", "A synthetic custom category definition"])
def test_unseeded_legacy_category_is_not_an_allowed_choice(
    client: TestClient, session: Session, imported: list[int], definition: str
) -> None:
    legacy = Category(name="Legacy category", definition=definition)
    session.add(legacy)
    session.commit()

    response = client.patch(
        "/transactions/category", json={"transaction_ids": imported, "category_id": legacy.id}
    )

    assert response.status_code == 400
    assert len(client.get("/categories").json()) == 9
