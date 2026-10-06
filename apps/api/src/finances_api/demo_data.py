import csv
import io
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from finances_api.database import create_database_engine
from finances_api.models import Category, Transaction
from finances_api.services.imports import ImportCompleted, import_statement
from finances_api.services.transactions import assign_category


@dataclass(frozen=True)
class DemoTransaction:
    days_ago: int
    description: str
    amount_pence: int
    category: str | None


NATWEST = [
    DemoTransaction(58, "SYNTHETIC EMPLOYER SALARY", 320000, "Income"),
    DemoTransaction(57, "SYNTHETIC LETTINGS RENT", -125000, "Home & bills"),
    DemoTransaction(52, "SYNTHETIC ENERGY CO", -8400, "Home & bills"),
    DemoTransaction(45, "SYNTHETIC CORNER SHOP", -1265, "Groceries"),
    DemoTransaction(41, "SYNTHETIC CARD PAYMENT TO AMEX", -42000, "Own-account transfers"),
    DemoTransaction(33, "SYNTHETIC LUNCH REPAYMENT FROM A FRIEND", 1200, None),
    DemoTransaction(28, "SYNTHETIC EMPLOYER SALARY", 320000, "Income"),
    DemoTransaction(27, "SYNTHETIC LETTINGS RENT", -125000, "Home & bills"),
    DemoTransaction(22, "SYNTHETIC ENERGY CO", -9100, "Home & bills"),
    DemoTransaction(15, "SYNTHETIC TRANSFER TO NATIONWIDE", -50000, "Own-account transfers"),
    DemoTransaction(11, "SYNTHETIC CARD PAYMENT TO AMEX", -38500, None),
    DemoTransaction(4, "SYNTHETIC PAYMENT TO A FRIEND", -2500, None),
]

NATIONWIDE = [
    DemoTransaction(54, "SYNTHETIC SUPERMARKET", -6420, "Groceries"),
    DemoTransaction(47, "SYNTHETIC PHARMACY", -1150, "Health & personal care"),
    DemoTransaction(39, "SYNTHETIC SUPERMARKET", -5873, "Groceries"),
    DemoTransaction(31, "SYNTHETIC INTEREST", 412, "Income"),
    DemoTransaction(15, "SYNTHETIC TRANSFER FROM NATWEST", 50000, "Own-account transfers"),
    DemoTransaction(9, "SYNTHETIC SUPERMARKET", -7105, None),
    DemoTransaction(2, "SYNTHETIC GYM MEMBERSHIP", -3800, None),
]

AMEX = [
    DemoTransaction(56, "SYNTHETIC COFFEE HOUSE", -450, "Eating out"),
    DemoTransaction(50, "SYNTHETIC RAIL TICKETS", -2860, "Transport"),
    DemoTransaction(46, "SYNTHETIC BOOKSHOP", -1899, "Shopping & leisure"),
    DemoTransaction(41, "SYNTHETIC PAYMENT RECEIVED THANK YOU", 42000, "Own-account transfers"),
    DemoTransaction(36, "SYNTHETIC HOTEL BOOKING", -31200, "Travel"),
    DemoTransaction(30, "SYNTHETIC NOODLE BAR", -2340, "Eating out"),
    DemoTransaction(24, "SYNTHETIC BOOKSHOP REFUND", 1899, "Shopping & leisure"),
    DemoTransaction(18, "SYNTHETIC ONLINE SHOP WITH A LONGER DESCRIPTION REF 000000", -12999, None),
    DemoTransaction(11, "SYNTHETIC PAYMENT RECEIVED THANK YOU", 38500, None),
    DemoTransaction(6, "SYNTHETIC COFFEE HOUSE", -520, None),
    DemoTransaction(3, "SYNTHETIC TAXI", -1475, None),
]


def seed_demo_data(session: Session, today: date) -> None:
    statements = {
        "natwest-demo.csv": natwest_csv(NATWEST, today),
        "nationwide-demo.csv": nationwide_csv(NATIONWIDE, today),
        "amex-demo.csv": amex_csv(AMEX, today),
    }
    for filename, content in statements.items():
        result = import_statement(session, filename, content)
        if not isinstance(result, ImportCompleted):
            raise RuntimeError(f"Could not import {filename}: {result}")
    _assign_demo_categories(session)


def natwest_csv(transactions: list[DemoTransaction], today: date) -> bytes:
    rows: list[list[str]] = [["Date", "Type", "Description", "Value", "Balance"]]
    balance = 250000
    for transaction in transactions:
        balance += transaction.amount_pence
        rows.append(
            [
                _day(today, transaction).strftime("%d %b %Y"),
                "BAC" if transaction.amount_pence > 0 else "POS",
                transaction.description,
                _pounds(transaction.amount_pence),
                _pounds(balance),
            ]
        )
    return _csv(rows)


def nationwide_csv(transactions: list[DemoTransaction], today: date) -> bytes:
    rows: list[list[str]] = [
        ["Account Name:", "Synthetic ****00000"],
        ["Account Balance:", "£1000.00"],
        ["Available Balance: ", "£1000.00"],
        [],
        ["Date", "Transaction type", "Description", "Paid out", "Paid in", "Balance"],
    ]
    balance = 100000
    for transaction in transactions:
        balance += transaction.amount_pence
        amount = f"£{_pounds(abs(transaction.amount_pence))}"
        rows.append(
            [
                _day(today, transaction).strftime("%d %b %Y"),
                "Payment" if transaction.amount_pence < 0 else "Credit",
                transaction.description,
                amount if transaction.amount_pence < 0 else "",
                amount if transaction.amount_pence > 0 else "",
                f"£{_pounds(balance)}",
            ]
        )
    return _csv(rows, line_terminator="\r\n", encoding="utf-8-sig")


def amex_csv(transactions: list[DemoTransaction], today: date) -> bytes:
    rows: list[list[str]] = [
        [
            "Date",
            "Description",
            "Card Member",
            "Account #",
            "Amount",
            "Extended Details",
            "Appears On Your Statement As",
            "Address",
            "Town/City",
            "Postcode",
            "Country",
            "Reference",
            "Category",
        ]
    ]
    for index, transaction in enumerate(transactions, start=1):
        rows.append(
            [
                _day(today, transaction).strftime("%d/%m/%Y"),
                transaction.description,
                "A N OTHER",
                "-00000",
                _pounds(-transaction.amount_pence),
                "",
                transaction.description,
                "1 EXAMPLE STREET",
                "EXAMPLETON",
                "AB1 2CD",
                "UNITED KINGDOM",
                f"'AT{index:021d}'",
                "",
            ]
        )
    return _csv(rows)


def _assign_demo_categories(session: Session) -> None:
    category_ids = {category.name: category.id for category in session.scalars(select(Category))}
    transaction_ids: dict[str, list[int]] = defaultdict(list)
    for transaction in session.scalars(select(Transaction)):
        category = _demo_category(transaction)
        if category is not None:
            transaction_ids[category].append(transaction.id)
    session.commit()
    for category, ids in transaction_ids.items():
        assign_category(session, ids, category_ids[category])


def _demo_category(transaction: Transaction) -> str | None:
    for demo in [*NATWEST, *NATIONWIDE, *AMEX]:
        if (
            demo.description == transaction.raw_description
            and demo.amount_pence == transaction.amount_minor
        ):
            return demo.category
    return None


def _day(today: date, transaction: DemoTransaction) -> date:
    return today - timedelta(days=transaction.days_ago)


def _pounds(pence: int) -> str:
    return f"{pence / 100:.2f}"


def _csv(rows: list[list[str]], *, line_terminator: str = "\n", encoding: str = "utf-8") -> bytes:
    buffer = io.StringIO()
    csv.writer(buffer, lineterminator=line_terminator).writerows(rows)
    return buffer.getvalue().encode(encoding)


def main() -> None:
    engine = create_database_engine()
    with Session(engine) as session:
        seed_demo_data(session, date.today())
        count = len(session.scalars(select(Transaction.id)).all())
    print(f"Seeded {count} synthetic demo transactions")


if __name__ == "__main__":
    main()
