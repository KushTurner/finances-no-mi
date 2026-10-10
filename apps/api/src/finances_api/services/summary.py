import calendar
from collections import defaultdict
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import date, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from finances_api.models import Account, CountsAs, Transaction

LARGEST_PAYMENT_LIMIT = 8


@dataclass(frozen=True)
class InvalidSummaryRequest:
    message: str


@dataclass(frozen=True)
class AccountSpending:
    id: int
    name: str
    spent_pence: int
    earliest_transaction_date: date | None
    latest_transaction_date: date | None


@dataclass(frozen=True)
class Payment:
    id: int
    date: date
    description: str
    account_name: str
    amount_pence: int


@dataclass(frozen=True)
class Summary:
    start: date
    end: date
    transaction_count: int
    spent_pence: int
    income_pence: int
    savings_pence: int
    net_pence: int
    accounts: list[AccountSpending]
    largest_payments: list[Payment]


@dataclass(frozen=True)
class MonthTotals:
    month: str
    spent_pence: int
    income_pence: int
    complete: bool


@dataclass(frozen=True)
class MonthlySummary:
    months: list[MonthTotals]
    average_spent_pence: int
    kept_pence: int


@dataclass(frozen=True)
class DayTotals:
    date: date
    spent_pence: int
    running_spent_pence: int


@dataclass(frozen=True)
class _Row:
    id: int
    account_id: int
    account_name: str
    date: date
    amount_pence: int
    description: str
    counts_as: CountsAs | None


LEFT_OUT: frozenset[CountsAs] = frozenset({"own_account", "savings"})


def spent_pence(amount_pence: int, counts_as: CountsAs | None) -> int:
    if counts_as in LEFT_OUT:
        return 0
    if counts_as == "repayment":
        return -amount_pence
    return -amount_pence if amount_pence < 0 else 0


def income_pence(amount_pence: int, counts_as: CountsAs | None) -> int:
    if counts_as in LEFT_OUT or counts_as == "repayment":
        return 0
    return amount_pence if amount_pence > 0 else 0


def summarize(
    session: Session, start: date, end: date, account_ids: Sequence[int]
) -> Summary | InvalidSummaryRequest:
    invalid = _validate(session, start, end, account_ids)
    if invalid is not None:
        return invalid
    latest = _date_bounds(session, account_ids)[1]
    if latest is not None and start <= latest < end:
        end = latest

    all_rows = _rows(session, start, end, [])
    selected_ids = set(account_ids)
    rows = [row for row in all_rows if not selected_ids or row.account_id in selected_ids]
    spent = sum(spent_pence(row.amount_pence, row.counts_as) for row in rows)
    income = sum(income_pence(row.amount_pence, row.counts_as) for row in rows)
    return Summary(
        start=start,
        end=end,
        transaction_count=len(rows),
        spent_pence=spent,
        income_pence=income,
        savings_pence=-sum(row.amount_pence for row in rows if row.counts_as == "savings"),
        net_pence=income - spent,
        accounts=_accounts(session, all_rows),
        largest_payments=_largest_payments(rows),
    )


def summarize_months(
    session: Session, first_month: date, last_month: date, account_ids: Sequence[int]
) -> MonthlySummary | InvalidSummaryRequest:
    invalid = _validate(session, first_month, last_month, account_ids)
    if invalid is not None:
        return invalid
    earliest, latest = _date_bounds(session, account_ids)
    last_day = _month_end(last_month)

    spent: dict[date, int] = defaultdict(int)
    income: dict[date, int] = defaultdict(int)
    for row in _rows(session, first_month, last_day, account_ids):
        month = row.date.replace(day=1)
        spent[month] += spent_pence(row.amount_pence, row.counts_as)
        income[month] += income_pence(row.amount_pence, row.counts_as)

    months = [
        MonthTotals(
            month=month.strftime("%Y-%m"),
            spent_pence=spent[month],
            income_pence=income[month],
            complete=earliest is not None
            and latest is not None
            and earliest <= month
            and _month_end(month) <= latest,
        )
        for month in _months(first_month, last_month)
    ]
    complete = [month for month in months if month.complete]
    complete_spent = sum(month.spent_pence for month in complete)
    return MonthlySummary(
        months=months,
        average_spent_pence=round(complete_spent / len(complete)) if complete else 0,
        kept_pence=sum(month.income_pence for month in complete) - complete_spent,
    )


def summarize_days(
    session: Session, start: date, end: date, account_ids: Sequence[int]
) -> list[DayTotals] | InvalidSummaryRequest:
    invalid = _validate(session, start, end, account_ids)
    if invalid is not None:
        return invalid
    spent: dict[date, int] = defaultdict(int)
    for row in _rows(session, start, end, account_ids):
        spent[row.date] += spent_pence(row.amount_pence, row.counts_as)

    days: list[DayTotals] = []
    running = 0
    day = start
    while day <= end:
        running += spent[day]
        days.append(DayTotals(date=day, spent_pence=spent[day], running_spent_pence=running))
        day += timedelta(days=1)
    return days


def _validate(
    session: Session, start: date, end: date, account_ids: Sequence[int]
) -> InvalidSummaryRequest | None:
    if start > end:
        return InvalidSummaryRequest("Choose a start on or before the end")
    if account_ids:
        known = session.scalars(select(Account.id).where(Account.id.in_(account_ids))).all()
        if len(set(known)) != len(set(account_ids)):
            return InvalidSummaryRequest("Unknown account")
    return None


def _date_bounds(session: Session, account_ids: Sequence[int]) -> tuple[date | None, date | None]:
    statement = select(
        func.min(Transaction.transaction_date), func.max(Transaction.transaction_date)
    )
    if account_ids:
        statement = statement.where(Transaction.account_id.in_(account_ids))
    earliest, latest = session.execute(statement).one()
    return earliest, latest


def _rows(session: Session, start: date, end: date, account_ids: Sequence[int]) -> list[_Row]:
    statement = (
        select(Transaction, Account.name)
        .join(Account)
        .where(Transaction.transaction_date.between(start, end))
    )
    if account_ids:
        statement = statement.where(Transaction.account_id.in_(account_ids))
    return [
        _Row(
            id=transaction.id,
            account_id=transaction.account_id,
            account_name=account_name,
            date=transaction.transaction_date,
            amount_pence=transaction.amount_minor,
            description=transaction.raw_description,
            counts_as=transaction.counts_as,
        )
        for transaction, account_name in session.execute(statement)
    ]


def _accounts(session: Session, rows: list[_Row]) -> list[AccountSpending]:
    spent: dict[int, int] = defaultdict(int)
    for row in rows:
        spent[row.account_id] += spent_pence(row.amount_pence, row.counts_as)
    statement = (
        select(
            Account.id,
            Account.name,
            func.min(Transaction.transaction_date),
            func.max(Transaction.transaction_date),
        )
        .outerjoin(Transaction)
        .group_by(Account.id)
        .order_by(Account.id)
    )
    return [
        AccountSpending(
            id=account_id,
            name=name,
            spent_pence=spent[account_id],
            earliest_transaction_date=earliest,
            latest_transaction_date=latest,
        )
        for account_id, name, earliest, latest in session.execute(statement)
    ]


def _largest_payments(rows: list[_Row]) -> list[Payment]:
    payments = [row for row in rows if row.amount_pence < 0 and row.counts_as not in LEFT_OUT]
    payments.sort(key=lambda row: (row.amount_pence, -row.date.toordinal(), -row.id))
    return [
        Payment(
            id=row.id,
            date=row.date,
            description=row.description,
            account_name=row.account_name,
            amount_pence=row.amount_pence,
        )
        for row in payments[:LARGEST_PAYMENT_LIMIT]
    ]


def _month_end(month: date) -> date:
    return month.replace(day=calendar.monthrange(month.year, month.month)[1])


def _months(first_month: date, last_month: date) -> list[date]:
    months: list[date] = []
    month = first_month
    while month <= last_month:
        months.append(month)
        month = _month_end(month) + timedelta(days=1)
    return months
