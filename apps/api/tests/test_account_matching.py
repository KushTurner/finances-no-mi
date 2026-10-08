import pytest
from sqlalchemy.orm import Session

from finances_api.models import Account
from finances_api.services.accounts import find_matching_accounts
from finances_api.statements.ofx import StatementAccount


def save_account(
    session: Session,
    *,
    acctid: str = "12345678",
    bankid: str | None = None,
    org: str | None = None,
    fid: str | None = None,
) -> Account:
    account = Account(
        name="Synthetic account",
        institution="natwest",
        account_type="current_account",
        preset="natwest_select",
        acctid=acctid,
        bankid=bankid,
        org=org,
        fid=fid,
    )
    session.add(account)
    session.commit()
    return account


def statement_account(
    *,
    acctid: str = "12345678",
    bankid: str | None = None,
    org: str | None = None,
    fid: str | None = None,
) -> StatementAccount:
    return StatementAccount(
        acctid=acctid, bankid=bankid, org=org, fid=fid, account_type="current_account"
    )


def test_matches_the_account_with_the_same_identifiers(session: Session) -> None:
    account = save_account(session, bankid="600000")

    matches = find_matching_accounts(session, statement_account(bankid="600000"))

    assert matches == [account]


def test_does_not_match_a_different_account_identifier(session: Session) -> None:
    save_account(session, acctid="00012345")

    matches = find_matching_accounts(session, statement_account(acctid="12345"))

    assert matches == []


@pytest.mark.parametrize(
    "saved, parsed",
    [
        ({"bankid": "600000"}, {"bankid": "600001"}),
        ({"org": "SYNTH"}, {"org": "OTHER"}),
        ({"fid": "1234"}, {"fid": "9999"}),
    ],
)
def test_does_not_match_when_a_supplied_institution_identifier_differs(
    session: Session, saved: dict[str, str], parsed: dict[str, str]
) -> None:
    save_account(session, **saved)

    matches = find_matching_accounts(session, statement_account(**parsed))

    assert matches == []


@pytest.mark.parametrize("parsed_bankid", [None, "0", "000000"])
def test_ignores_absent_and_placeholder_bank_identifiers(
    session: Session, parsed_bankid: str | None
) -> None:
    account = save_account(session, bankid="600000")

    matches = find_matching_accounts(session, statement_account(bankid=parsed_bankid))

    assert matches == [account]
