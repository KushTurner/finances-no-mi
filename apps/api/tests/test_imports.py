import hashlib
from datetime import date

from httpx2 import Response
from ofx_helpers import bank_statement_ofx, credit_card_statement_ofx, ofx_transaction
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from starlette.testclient import TestClient

from finances_api.models import (
    Account,
    Base,
    ImportFile,
    ImportFileTransaction,
    MerchantKey,
    Transaction,
)


def upload(
    client: TestClient,
    content: bytes,
    *,
    preset: str | None = None,
    name: str | None = None,
    filename: str = "statement.ofx",
) -> Response:
    form = {key: value for key, value in (("preset", preset), ("name", name)) if value is not None}
    return client.post(
        "/imports", files={"file": (filename, content, "application/x-ofx")}, data=form
    )


def count(session: Session, model: type[Base]) -> int:
    return session.scalar(select(func.count()).select_from(model)) or 0


def test_an_unmatched_statement_needs_account_setup_and_stores_nothing(
    client: TestClient, session: Session
) -> None:
    response = upload(client, bank_statement_ofx())

    assert response.status_code == 422
    assert response.json() == {"detail": "Add an account for this statement", "card_type": "debit"}
    assert [count(session, model) for model in (Account, ImportFile, Transaction)] == [0, 0, 0]


def test_adds_the_account_from_its_preset_and_imports_the_statement(client: TestClient) -> None:
    content = bank_statement_ofx(ofx_transaction(fitid="A"), ofx_transaction(fitid="B"))

    response = upload(client, content, preset="natwest_select")

    assert response.status_code == 201
    assert response.json() == {
        "import_id": 1,
        "account_name": "NatWest Select",
        "new_transaction_count": 2,
        "existing_transaction_count": 0,
    }
    assert client.get("/accounts").json() == [
        {
            "id": 1,
            "name": "NatWest Select",
            "institution": "natwest",
            "account_type": "current_account",
            "preset": "natwest_select",
        }
    ]


def test_a_nickname_replaces_the_preset_name(client: TestClient) -> None:
    response = upload(client, bank_statement_ofx(), preset="natwest_select", name=" Bills ")

    assert response.json()["account_name"] == "Bills"


def test_adds_a_nationwide_member_card_from_a_credit_card_statement(
    client: TestClient, session: Session
) -> None:
    response = upload(client, credit_card_statement_ofx(), preset="nationwide_member_card")

    account = session.scalars(select(Account)).one()
    assert response.status_code == 201
    assert (account.name, account.institution, account.account_type) == (
        "Nationwide Member Card",
        "nationwide",
        "credit_card",
    )


def test_saves_the_statement_identifiers_on_the_new_account(
    client: TestClient, session: Session
) -> None:
    content = credit_card_statement_ofx(acctid="XXXX-0001", org="SYNTH", fid="1234")

    upload(client, content, preset="amex_gold")

    account = session.scalars(select(Account)).one()
    assert (account.acctid, account.bankid, account.org, account.fid) == (
        "XXXX-0001",
        None,
        "SYNTH",
        "1234",
    )


def test_a_later_statement_imports_directly_into_the_matching_account(
    client: TestClient, session: Session
) -> None:
    upload(client, bank_statement_ofx(ofx_transaction(fitid="A")), preset="natwest_select")

    response = upload(client, bank_statement_ofx(ofx_transaction(fitid="B")))

    assert response.json()["account_name"] == "NatWest Select"
    assert count(session, Account) == 1


def test_a_preset_is_ignored_when_the_statement_already_matches_an_account(
    client: TestClient, session: Session
) -> None:
    upload(client, bank_statement_ofx(ofx_transaction(fitid="A")), preset="natwest_select")

    response = upload(
        client, bank_statement_ofx(ofx_transaction(fitid="B")), preset="nationwide_flexone"
    )

    assert response.json()["account_name"] == "NatWest Select"
    assert count(session, Account) == 1


def test_accounts_from_the_same_preset_remain_separate(
    client: TestClient, session: Session
) -> None:
    upload(client, bank_statement_ofx(acctid="00000001"), preset="natwest_select")

    response = upload(client, bank_statement_ofx(acctid="00000002"), preset="natwest_select")

    assert response.status_code == 201
    assert session.scalars(select(Account.name)).all() == ["NatWest Select", "NatWest Select"]


def test_a_credit_card_statement_needs_a_credit_card_account(client: TestClient) -> None:
    response = upload(client, credit_card_statement_ofx())

    assert response.json()["card_type"] == "credit"


def test_rejects_a_preset_for_the_other_card_type(client: TestClient, session: Session) -> None:
    response = upload(client, bank_statement_ofx(), preset="amex_gold")

    assert response.json() == {
        "errors": [
            {
                "position": None,
                "message": (
                    "American Express Gold is a credit card, but this is a debit card statement"
                ),
            }
        ]
    }
    assert count(session, Account) == 0


def test_rejects_a_statement_that_matches_more_than_one_account(
    client: TestClient, session: Session
) -> None:
    session.add_all(
        Account(
            name=name,
            institution="nationwide",
            account_type="current_account",
            preset="nationwide_flexone",
            acctid="****0001",
        )
        for name in ("First", "Second")
    )
    session.commit()

    response = upload(client, bank_statement_ofx(acctid="****0001", bankid="000000"))

    assert response.json() == {
        "errors": [
            {"position": None, "message": "This statement matches more than one saved account"}
        ]
    }
    assert count(session, ImportFile) == 0


def test_stores_the_canonical_transaction_with_its_source_evidence(
    client: TestClient, session: Session
) -> None:
    content = bank_statement_ofx(
        ofx_transaction(
            fitid="SYNTH-1",
            trntype="POS",
            dtposted="20260903",
            trnamt="-4.50",
            name="SYNTHETIC CAFE",
            memo="SYNTHETIC MEMO",
        )
    )

    upload(client, content, preset="natwest_select")

    transaction = session.scalars(select(Transaction)).one()
    assert (
        transaction.fitid,
        transaction.transaction_date,
        transaction.amount_minor,
        transaction.source_type,
        transaction.raw_description,
        transaction.memo,
    ) == ("SYNTH-1", date(2026, 9, 3), -450, "POS", "SYNTHETIC CAFE", "SYNTHETIC MEMO")


def test_stores_the_original_file_bytes_and_hash(client: TestClient, session: Session) -> None:
    content = bank_statement_ofx()

    upload(client, content, preset="natwest_select")

    import_file = session.scalars(select(ImportFile)).one()
    assert (import_file.content, import_file.content_sha256) == (
        content,
        hashlib.sha256(content).hexdigest(),
    )


def test_rejects_an_exact_file_reupload(client: TestClient, session: Session) -> None:
    content = bank_statement_ofx()
    upload(client, content, preset="natwest_select")

    response = upload(client, content, filename="renamed.ofx")

    assert response.status_code == 409
    assert count(session, ImportFile) == 1


def test_overlapping_statements_reuse_the_shared_transaction(
    client: TestClient, session: Session
) -> None:
    shared = ofx_transaction(fitid="SHARED")
    upload(
        client,
        bank_statement_ofx(ofx_transaction(fitid="EARLIER"), shared),
        preset="natwest_select",
    )

    response = upload(client, bank_statement_ofx(shared, ofx_transaction(fitid="LATER")))

    assert response.json() == {
        "import_id": 2,
        "account_name": "NatWest Select",
        "new_transaction_count": 1,
        "existing_transaction_count": 1,
    }
    assert (count(session, Transaction), count(session, ImportFileTransaction)) == (3, 4)


def test_the_same_fitid_in_different_accounts_is_stored_separately(
    client: TestClient, session: Session
) -> None:
    upload(client, bank_statement_ofx(acctid="00000001"), preset="natwest_select")

    upload(client, bank_statement_ofx(acctid="00000002"), preset="natwest_select")

    assert count(session, Transaction) == 2


def test_equivalent_descriptions_share_one_merchant_key(
    client: TestClient, session: Session
) -> None:
    upload(
        client,
        bank_statement_ofx(ofx_transaction(fitid="A", name="Synthetic Cafe")),
        preset="natwest_select",
    )

    upload(client, bank_statement_ofx(ofx_transaction(fitid="B", name="SYNTHETIC  CAFE")))

    assert session.scalars(select(MerchantKey.value)).all() == ["SYNTHETIC CAFE"]


def test_an_invalid_statement_is_reported_and_creates_nothing(
    client: TestClient, session: Session
) -> None:
    content = bank_statement_ofx(ofx_transaction(fitid="A"), ofx_transaction(fitid="A"))

    response = upload(client, content, preset="natwest_select")

    assert response.status_code == 400
    assert response.json() == {
        "errors": [{"position": 2, "message": "FITID is repeated in this statement"}]
    }
    assert [count(session, model) for model in (Account, ImportFile, MerchantKey)] == [0, 0, 0]
