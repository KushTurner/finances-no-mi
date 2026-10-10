from dataclasses import dataclass
from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from finances_api.database import create_database_engine
from finances_api.models import AccountPresetId, Transaction
from finances_api.services.imports import ImportCompleted, NewAccount, import_statement


@dataclass(frozen=True)
class DemoTransaction:
    days_ago: int
    description: str
    amount_pence: int


NATWEST = [
    DemoTransaction(58, "SYNTHETIC EMPLOYER SALARY", 320000),
    DemoTransaction(57, "SYNTHETIC LETTINGS RENT", -125000),
    DemoTransaction(52, "SYNTHETIC ENERGY CO", -8400),
    DemoTransaction(45, "SYNTHETIC CORNER SHOP", -1265),
    DemoTransaction(41, "SYNTHETIC CARD PAYMENT TO AMEX", -42000),
    DemoTransaction(33, "SYNTHETIC LUNCH REPAYMENT FROM A FRIEND", 1200),
    DemoTransaction(28, "SYNTHETIC EMPLOYER SALARY", 320000),
    DemoTransaction(27, "SYNTHETIC LETTINGS RENT", -125000),
    DemoTransaction(22, "SYNTHETIC ENERGY CO", -9100),
    DemoTransaction(15, "SYNTHETIC TRANSFER TO NATIONWIDE", -50000),
    DemoTransaction(13, "SYNTHETIC INVESTMENT CONTRIBUTION", -40000),
    DemoTransaction(12, "SYNTHETIC SAVINGS WITHDRAWAL", 5000),
    DemoTransaction(10, "SYNTHETIC STREAMING MEMBERSHIP", -999),
    DemoTransaction(11, "SYNTHETIC CARD PAYMENT TO AMEX", -38500),
    DemoTransaction(4, "SYNTHETIC PAYMENT TO A FRIEND", -2500),
]

NATIONWIDE = [
    DemoTransaction(54, "SYNTHETIC SUPERMARKET", -6420),
    DemoTransaction(47, "SYNTHETIC PHARMACY", -1150),
    DemoTransaction(39, "SYNTHETIC SUPERMARKET", -5873),
    DemoTransaction(31, "SYNTHETIC INTEREST", 412),
    DemoTransaction(15, "SYNTHETIC TRANSFER FROM NATWEST", 50000),
    DemoTransaction(9, "SYNTHETIC SUPERMARKET", -7105),
    DemoTransaction(2, "SYNTHETIC GYM MEMBERSHIP", -3800),
]

AMEX = [
    DemoTransaction(56, "SYNTHETIC COFFEE HOUSE", -450),
    DemoTransaction(50, "SYNTHETIC RAIL TICKETS", -2860),
    DemoTransaction(46, "SYNTHETIC BOOKSHOP", -1899),
    DemoTransaction(41, "SYNTHETIC PAYMENT RECEIVED THANK YOU", 42000),
    DemoTransaction(36, "SYNTHETIC HOTEL BOOKING", -31200),
    DemoTransaction(30, "SYNTHETIC NOODLE BAR", -2340),
    DemoTransaction(24, "SYNTHETIC BOOKSHOP REFUND", 1899),
    DemoTransaction(18, "SYNTHETIC ONLINE SHOP WITH A LONGER DESCRIPTION REF 000000", -12999),
    DemoTransaction(11, "SYNTHETIC PAYMENT RECEIVED THANK YOU", 38500),
    DemoTransaction(6, "SYNTHETIC COFFEE HOUSE", -520),
    DemoTransaction(3, "SYNTHETIC TAXI", -1475),
]


def seed_demo_data(session: Session, today: date) -> None:
    statements: list[tuple[str, AccountPresetId, bytes]] = [
        ("natwest-demo.ofx", "natwest_select", natwest_ofx(NATWEST, today)),
        ("nationwide-demo.ofx", "nationwide_flexone", nationwide_ofx(NATIONWIDE, today)),
        ("amex-demo.ofx", "amex_gold", amex_ofx(AMEX, today)),
    ]
    for filename, preset, content in statements:
        result = import_statement(session, filename, content, NewAccount(preset))
        if not isinstance(result, ImportCompleted):
            raise RuntimeError(f"Could not import {filename}: {result}")


def natwest_ofx(transactions: list[DemoTransaction], today: date) -> bytes:
    account = "<BANKACCTFROM><BANKID>600000<ACCTID>00000001<ACCTTYPE>CHECKING</BANKACCTFROM>"
    return _bank_statement_ofx(account, transactions, today, "NW")


def nationwide_ofx(transactions: list[DemoTransaction], today: date) -> bytes:
    account = "<BANKACCTFROM><BANKID>000000<ACCTID>****0001<ACCTTYPE>CHECKING</BANKACCTFROM>"
    return _bank_statement_ofx(account, transactions, today, "NAT")


def amex_ofx(transactions: list[DemoTransaction], today: date) -> bytes:
    body = (
        "<CREDITCARDMSGSRSV1><CCSTMTTRNRS><TRNUID>1<STATUS><CODE>0<SEVERITY>INFO</STATUS>"
        "<CCSTMTRS><CURDEF>GBP<CCACCTFROM><ACCTID>XXXX-XXXXXX-00001</CCACCTFROM>"
        f"{_transaction_list(transactions, today, 'AT')}"
        "<LEDGERBAL><BALAMT>0.00<DTASOF>20260101</LEDGERBAL>"
        "</CCSTMTRS></CCSTMTTRNRS></CREDITCARDMSGSRSV1>"
    )
    return _ofx(_signon("<FI><ORG>SYNTHETIC<FID>00000</FI>") + body)


def _bank_statement_ofx(
    account: str, transactions: list[DemoTransaction], today: date, fitid_prefix: str
) -> bytes:
    body = (
        "<BANKMSGSRSV1><STMTTRNRS><TRNUID>1<STATUS><CODE>0<SEVERITY>INFO</STATUS>"
        f"<STMTRS><CURDEF>GBP{account}{_transaction_list(transactions, today, fitid_prefix)}"
        "<LEDGERBAL><BALAMT>0.00<DTASOF>20260101</LEDGERBAL>"
        "</STMTRS></STMTTRNRS></BANKMSGSRSV1>"
    )
    return _ofx(_signon("") + body)


def _transaction_list(transactions: list[DemoTransaction], today: date, fitid_prefix: str) -> str:
    dates = [_day(today, transaction).strftime("%Y%m%d") for transaction in transactions]
    statement_transactions = "".join(
        f"<STMTTRN><TRNTYPE>{'CREDIT' if transaction.amount_pence > 0 else 'DEBIT'}"
        f"<DTPOSTED>{posted}<TRNAMT>{_pounds(transaction.amount_pence)}"
        f"<FITID>{fitid_prefix}{index:06d}<NAME>{transaction.description}</STMTTRN>"
        for index, (transaction, posted) in enumerate(zip(transactions, dates, strict=True), 1)
    )
    return (
        f"<BANKTRANLIST><DTSTART>{min(dates)}<DTEND>{max(dates)}"
        f"{statement_transactions}</BANKTRANLIST>"
    )


def _signon(fi: str) -> str:
    return (
        "<SIGNONMSGSRSV1><SONRS><STATUS><CODE>0<SEVERITY>INFO</STATUS>"
        f"<DTSERVER>20260101000000<LANGUAGE>ENG{fi}</SONRS></SIGNONMSGSRSV1>"
    )


def _ofx(messages: str) -> bytes:
    header = (
        "OFXHEADER:100\nDATA:OFXSGML\nVERSION:102\nSECURITY:NONE\nENCODING:USASCII\n"
        "CHARSET:1252\nCOMPRESSION:NONE\nOLDFILEUID:NONE\nNEWFILEUID:NONE\n\n"
    )
    return f"{header}<OFX>{messages}</OFX>".encode("ascii")


def _day(today: date, transaction: DemoTransaction) -> date:
    return today - timedelta(days=transaction.days_ago)


def _pounds(pence: int) -> str:
    return f"{pence / 100:.2f}"


def main() -> None:
    engine = create_database_engine()
    with Session(engine) as session:
        seed_demo_data(session, date.today())
        count = len(session.scalars(select(Transaction.id)).all())
    print(f"Seeded {count} synthetic demo transactions")


if __name__ == "__main__":
    main()
