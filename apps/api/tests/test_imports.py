import hashlib
from datetime import date

from httpx2 import Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from starlette.testclient import TestClient
from statement_helpers import csv_bytes

from finances_api.models import (
    Base,
    ImportFile,
    ImportFileTransaction,
    MerchantKey,
    Transaction,
)

NATWEST_HEADER = ["Date", "Type", "Description", "Value", "Balance"]


def natwest_row(
    *,
    date: str = "03 Sep 2026",
    description: str = "SYNTHETIC CAFE",
    value: str = "-4.50",
    balance: str = "995.50",
) -> list[str]:
    return [date, "POS", description, value, balance]


def natwest_csv(*rows: list[str]) -> bytes:
    return csv_bytes([NATWEST_HEADER, *rows])


def create_account(client: TestClient) -> int:
    response = client.post(
        "/accounts",
        json={
            "name": "Synthetic Current",
            "institution": "natwest",
            "account_type": "current_account",
        },
    )
    return response.json()["id"]


def upload(
    client: TestClient, account_id: int, content: bytes, filename: str = "statement.csv"
) -> Response:
    return client.post(
        f"/accounts/{account_id}/imports", files={"file": (filename, content, "text/csv")}
    )


def count(session: Session, model: type[Base]) -> int:
    return session.scalar(select(func.count()).select_from(model)) or 0


def test_imports_every_transaction_as_new(client: TestClient) -> None:
    account_id = create_account(client)
    content = natwest_csv(
        natwest_row(date="02 Sep 2026", balance="1000.00"), natwest_row(balance="995.50")
    )

    response = upload(client, account_id, content)

    assert response.status_code == 201
    assert response.json() == {
        "import_id": 1,
        "new_transaction_count": 2,
        "existing_transaction_count": 0,
    }


def test_stores_the_canonical_transaction_with_its_source_evidence(
    client: TestClient, session: Session
) -> None:
    account_id = create_account(client)

    upload(client, account_id, natwest_csv(natwest_row()))

    transaction = session.scalars(select(Transaction)).one()
    assert (
        transaction.transaction_date,
        transaction.amount_minor,
        transaction.balance_after_minor,
        transaction.source_type,
        transaction.raw_description,
    ) == (date(2026, 9, 3), -450, 99550, "POS", "SYNTHETIC CAFE")


def test_stores_the_original_file_bytes_and_hash(client: TestClient, session: Session) -> None:
    account_id = create_account(client)
    content = natwest_csv(natwest_row())

    upload(client, account_id, content)

    import_file = session.scalars(select(ImportFile)).one()
    assert (import_file.content, import_file.content_sha256) == (
        content,
        hashlib.sha256(content).hexdigest(),
    )


def test_rejects_an_exact_file_reupload(client: TestClient, session: Session) -> None:
    account_id = create_account(client)
    content = natwest_csv(natwest_row())
    upload(client, account_id, content)

    response = upload(client, account_id, content, filename="renamed.csv")

    assert response.status_code == 409
    assert count(session, ImportFile) == 1


def test_overlapping_exports_reuse_the_shared_transaction(
    client: TestClient, session: Session
) -> None:
    account_id = create_account(client)
    shared_row = natwest_row(date="02 Sep 2026", balance="1000.00")
    earlier_export = natwest_csv(natwest_row(date="01 Sep 2026", balance="1004.50"), shared_row)
    later_export = natwest_csv(shared_row, natwest_row(date="03 Sep 2026", balance="995.50"))
    upload(client, account_id, earlier_export)

    response = upload(client, account_id, later_export)

    assert response.json() == {
        "import_id": 2,
        "new_transaction_count": 1,
        "existing_transaction_count": 1,
    }
    assert (count(session, Transaction), count(session, ImportFileTransaction)) == (3, 4)


def test_identical_same_day_purchases_are_stored_separately(
    client: TestClient, session: Session
) -> None:
    account_id = create_account(client)
    content = natwest_csv(natwest_row(balance="1000.00"), natwest_row(balance="995.50"))

    upload(client, account_id, content)

    assert count(session, Transaction) == 2


def test_equivalent_descriptions_share_one_merchant_key(
    client: TestClient, session: Session
) -> None:
    account_id = create_account(client)
    upload(client, account_id, natwest_csv(natwest_row(description="Synthetic Cafe")))

    upload(
        client,
        account_id,
        natwest_csv(natwest_row(date="04 Sep 2026", description="SYNTHETIC  CAFE")),
    )

    assert session.scalars(select(MerchantKey.value)).all() == ["SYNTHETIC CAFE"]


def test_an_invalid_row_is_reported_and_nothing_is_stored(
    client: TestClient, session: Session
) -> None:
    account_id = create_account(client)
    content = natwest_csv(natwest_row(), natwest_row(value="four pounds"))

    response = upload(client, account_id, content)

    assert response.status_code == 400
    assert response.json() == {
        "errors": [{"row_number": 3, "message": "Value is not a valid GBP amount"}]
    }
    assert [count(session, model) for model in (ImportFile, Transaction, MerchantKey)] == [0, 0, 0]


def test_rejects_an_import_for_an_unknown_account(client: TestClient) -> None:
    response = upload(client, 999, natwest_csv(natwest_row()))

    assert response.status_code == 404
