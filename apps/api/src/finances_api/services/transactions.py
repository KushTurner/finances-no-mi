from dataclasses import dataclass
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from finances_api.models import Account, Transaction


@dataclass(frozen=True)
class TransactionDetails:
    id: int
    account_name: str
    transaction_date: date
    amount_pence: int
    raw_description: str
    source_type: str | None


def list_transactions(session: Session) -> list[TransactionDetails]:
    statement = (
        select(Transaction, Account.name)
        .join(Account)
        .order_by(Transaction.transaction_date.desc(), Transaction.id.desc())
    )
    return [
        TransactionDetails(
            id=transaction.id,
            account_name=account_name,
            transaction_date=transaction.transaction_date,
            amount_pence=transaction.amount_minor,
            raw_description=transaction.raw_description,
            source_type=transaction.source_type,
        )
        for transaction, account_name in session.execute(statement)
    ]
