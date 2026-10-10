from dataclasses import dataclass
from datetime import date

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from finances_api.counting import payer_mark
from finances_api.models import CountsAs, MerchantKey, PayerRule, Transaction


@dataclass(frozen=True)
class PayerSummary:
    id: int
    name: str
    payment_count: int
    received_pence: int
    latest_payment_date: date
    counts_as: CountsAs | None


@dataclass(frozen=True)
class PayerRuleApplied:
    updated_count: int


@dataclass(frozen=True)
class UnknownPayer:
    pass


def list_payers(session: Session) -> list[PayerSummary]:
    received = func.sum(Transaction.amount_minor)
    statement = (
        select(
            MerchantKey.id,
            MerchantKey.value,
            func.count(Transaction.id),
            received,
            func.max(Transaction.transaction_date),
            PayerRule.counts_as,
        )
        .join(Transaction, Transaction.merchant_key_id == MerchantKey.id)
        .outerjoin(PayerRule, PayerRule.merchant_key_id == MerchantKey.id)
        .where(Transaction.amount_minor > 0)
        .group_by(MerchantKey.id, PayerRule.counts_as)
        .order_by(PayerRule.counts_as.is_not(None), received.desc(), MerchantKey.value)
    )
    return [
        PayerSummary(
            id=payer_id,
            name=name,
            payment_count=payment_count,
            received_pence=received_pence,
            latest_payment_date=latest_payment_date,
            counts_as=counts_as,
        )
        for payer_id, name, payment_count, received_pence, latest_payment_date, counts_as in (
            session.execute(statement)
        )
    ]


def set_payer_rule(
    session: Session, payer_id: int, counts_as: CountsAs | None
) -> PayerRuleApplied | UnknownPayer:
    with session.begin():
        if not _receives_payments(session, payer_id):
            return UnknownPayer()
        _save_rule(session, payer_id, counts_as)
        transactions = session.scalars(
            select(Transaction).where(
                Transaction.merchant_key_id == payer_id,
                or_(
                    Transaction.counts_as_source.is_(None), Transaction.counts_as_source == "payer"
                ),
            )
        )
        updated_count = 0
        for transaction in transactions:
            mark = payer_mark(counts_as, transaction.amount_minor)
            if transaction.counts_as != mark:
                transaction.counts_as = mark
                transaction.counts_as_source = "payer" if mark else None
                updated_count += 1
        return PayerRuleApplied(updated_count=updated_count)


def payer_rules(session: Session, merchant_key_ids: set[int]) -> dict[int, CountsAs]:
    rules = session.execute(
        select(PayerRule.merchant_key_id, PayerRule.counts_as).where(
            PayerRule.merchant_key_id.in_(merchant_key_ids)
        )
    )
    return {merchant_key_id: counts_as for merchant_key_id, counts_as in rules}


def _receives_payments(session: Session, payer_id: int) -> bool:
    incoming = select(Transaction.id).where(
        Transaction.merchant_key_id == payer_id, Transaction.amount_minor > 0
    )
    return session.scalar(select(incoming.exists())) is True


def _save_rule(session: Session, payer_id: int, counts_as: CountsAs | None) -> None:
    rule = session.get(PayerRule, payer_id)
    if counts_as is None:
        if rule is not None:
            session.delete(rule)
    elif rule is None:
        session.add(PayerRule(merchant_key_id=payer_id, counts_as=counts_as))
    else:
        rule.counts_as = counts_as
