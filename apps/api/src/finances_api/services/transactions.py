from dataclasses import dataclass
from datetime import UTC, date, datetime
from typing import Literal

from sqlalchemy import select
from sqlalchemy.orm import Session

from finances_api.categories import CATEGORY_DEFINITIONS
from finances_api.models import Account, Category, Transaction


@dataclass(frozen=True)
class TransactionDetails:
    id: int
    account_name: str
    transaction_date: date
    amount_pence: int
    raw_description: str
    source_type: str | None
    category_id: int | None


def list_transactions(
    session: Session, category: int | Literal["uncategorized"] | None = None
) -> list[TransactionDetails]:
    statement = select(Transaction, Account.name).join(Account)
    if category == "uncategorized":
        statement = statement.where(Transaction.category_id.is_(None))
    elif category is not None:
        statement = statement.where(Transaction.category_id == category)
    statement = statement.order_by(Transaction.transaction_date.desc(), Transaction.id.desc())
    return [
        TransactionDetails(
            id=transaction.id,
            account_name=account_name,
            transaction_date=transaction.transaction_date,
            amount_pence=transaction.amount_minor,
            raw_description=transaction.raw_description,
            source_type=transaction.source_type,
            category_id=transaction.category_id,
        )
        for transaction, account_name in session.execute(statement)
    ]


@dataclass(frozen=True)
class CategoryDecision:
    updated_count: int


@dataclass(frozen=True)
class InvalidDecision:
    message: str


def assign_category(
    session: Session, transaction_ids: list[int], category_id: int | None
) -> CategoryDecision | InvalidDecision:
    with session.begin():
        if not transaction_ids or len(set(transaction_ids)) != len(transaction_ids):
            return InvalidDecision("Select each transaction once")
        if category_id is not None:
            category = session.get(Category, category_id)
            if (
                category is None
                or category.name not in CATEGORY_DEFINITIONS
                or not category.definition
            ):
                return InvalidDecision("Unknown category")
        transactions = session.scalars(
            select(Transaction).where(Transaction.id.in_(transaction_ids))
        ).all()
        if len(transactions) != len(transaction_ids):
            return InvalidDecision("One or more selected transactions do not exist")
        decided_at = datetime.now(UTC).replace(tzinfo=None) if category_id is not None else None
        for transaction in transactions:
            transaction.category_id = category_id
            transaction.category_decision_source = "human" if category_id is not None else None
            transaction.category_decided_at = decided_at
        return CategoryDecision(updated_count=len(transactions))
