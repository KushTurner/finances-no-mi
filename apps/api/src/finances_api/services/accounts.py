from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from finances_api.models import Account


def list_accounts(session: Session) -> Sequence[Account]:
    return session.scalars(select(Account).order_by(Account.name)).all()
