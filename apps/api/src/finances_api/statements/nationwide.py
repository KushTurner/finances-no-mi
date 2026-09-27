from finances_api.statements.contract import ParseResult, TransactionCandidate
from finances_api.statements.fields import (
    InvalidRow,
    Row,
    read_date,
    read_optional_pence,
    read_pence,
    read_text,
)
from finances_api.statements.reading import parse_statement
from finances_api.statements.source_keys import fingerprint_key

REQUIRED_COLUMNS = ("Date", "Transaction type", "Description", "Paid out", "Paid in", "Balance")


def parse(content: bytes) -> ParseResult:
    return parse_statement(content, REQUIRED_COLUMNS, _parse_row)


def _parse_row(row_number: int, row: Row) -> TransactionCandidate:
    transaction_date = read_date(row, "Date", "%d %b %Y")
    source_type = read_text(row, "Transaction type")
    raw_description = read_text(row, "Description")
    amount_minor = _read_amount(row)
    balance_after_minor = read_pence(row, "Balance")
    return TransactionCandidate(
        row_number=row_number,
        transaction_date=transaction_date,
        amount_minor=amount_minor,
        raw_description=raw_description,
        source_key=fingerprint_key(
            transaction_date, source_type, raw_description, amount_minor, balance_after_minor
        ),
        balance_after_minor=balance_after_minor,
        source_type=source_type,
    )


def _read_amount(row: Row) -> int:
    match (read_optional_pence(row, "Paid out"), read_optional_pence(row, "Paid in")):
        case (int() as paid_out, None):
            return -paid_out
        case (None, int() as paid_in):
            return paid_in
        case _:
            raise InvalidRow("Exactly one of Paid out or Paid in is required")
