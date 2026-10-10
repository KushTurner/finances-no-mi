from dataclasses import dataclass
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from finances_api.counting import applies_to, payer_mark
from finances_api.models import Account, CountsAs, CountsAsSource, Transaction
from finances_api.services.payers import payer_rules


@dataclass(frozen=True)
class TransactionDetails:
    id: int
    account_name: str
    transaction_date: date
    amount_pence: int
    raw_description: str
    source_type: str | None
    counts_as: CountsAs | None
    counts_as_source: CountsAsSource | None


@dataclass(frozen=True)
class MarkApplied:
    updated_count: int


@dataclass(frozen=True)
class InvalidMark:
    message: str


def list_transactions(session: Session, payer_id: int | None = None) -> list[TransactionDetails]:
    statement = select(Transaction, Account.name).join(Account)
    if payer_id is not None:
        statement = statement.where(
            Transaction.merchant_key_id == payer_id, Transaction.amount_minor > 0
        )
    statement = statement.order_by(Transaction.transaction_date.desc(), Transaction.id.desc())
    return [
        TransactionDetails(
            id=transaction.id,
            account_name=account_name,
            transaction_date=transaction.transaction_date,
            amount_pence=transaction.amount_minor,
            raw_description=transaction.raw_description,
            source_type=transaction.source_type,
            counts_as=transaction.counts_as,
            counts_as_source=transaction.counts_as_source,
        )
        for transaction, account_name in session.execute(statement)
    ]


def mark_transactions(
    session: Session, transaction_ids: list[int], counts_as: CountsAs | None
) -> MarkApplied | InvalidMark:
    with session.begin():
        if not transaction_ids or len(set(transaction_ids)) != len(transaction_ids):
            return InvalidMark("Select each transaction once")
        transactions = session.scalars(
            select(Transaction).where(Transaction.id.in_(transaction_ids))
        ).all()
        if len(transactions) != len(transaction_ids):
            return InvalidMark("One or more selected transactions do not exist")
        if counts_as is not None and not all(
            applies_to(counts_as, transaction.amount_minor) for transaction in transactions
        ):
            return InvalidMark("Income and repayments can only be money coming in")
        rules = payer_rules(session, {transaction.merchant_key_id for transaction in transactions})
        for transaction in transactions:
            if counts_as is None:
                mark = payer_mark(rules.get(transaction.merchant_key_id), transaction.amount_minor)
                transaction.counts_as = mark
                transaction.counts_as_source = "payer" if mark else None
            else:
                transaction.counts_as = counts_as
                transaction.counts_as_source = "human"
        return MarkApplied(updated_count=len(transactions))
