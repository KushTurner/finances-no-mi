from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from finances_api.models import Account
from finances_api.statements.ofx import StatementAccount


def list_accounts(session: Session) -> Sequence[Account]:
    return session.scalars(select(Account).order_by(Account.name, Account.id)).all()


def find_matching_accounts(session: Session, statement_account: StatementAccount) -> list[Account]:
    candidates = session.scalars(select(Account).where(Account.acctid == statement_account.acctid))
    return [account for account in candidates if _identifiers_agree(account, statement_account)]


def _identifiers_agree(account: Account, statement_account: StatementAccount) -> bool:
    identifier_pairs = (
        (account.bankid, statement_account.bankid),
        (account.org, statement_account.org),
        (account.fid, statement_account.fid),
    )
    return all(
        saved == parsed
        for saved, parsed in identifier_pairs
        if _is_meaningful(saved) and _is_meaningful(parsed)
    )


def _is_meaningful(identifier: str | None) -> bool:
    return identifier is not None and identifier.strip("0 ") != ""
