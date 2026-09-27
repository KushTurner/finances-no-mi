from collections.abc import Sequence
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from finances_api.models import Account, AccountType, Institution


@dataclass(frozen=True)
class DuplicateAccountName:
    pass


def list_accounts(session: Session) -> Sequence[Account]:
    return session.scalars(select(Account).order_by(Account.name)).all()


def create_account(
    session: Session, name: str, institution: Institution, account_type: AccountType
) -> Account | DuplicateAccountName:
    account = Account(name=name, institution=institution, account_type=account_type)
    session.add(account)
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        return DuplicateAccountName()
    session.refresh(account)
    return account
