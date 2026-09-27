from finances_api.statements.contract import ParseResult, TransactionCandidate
from finances_api.statements.fields import Row, read_date, read_pence, read_text
from finances_api.statements.reading import parse_statement
from finances_api.statements.source_keys import fingerprinted_candidate

REQUIRED_COLUMNS = ("Date", "Type", "Description", "Value", "Balance")


def parse(content: bytes) -> ParseResult:
    return parse_statement(content, REQUIRED_COLUMNS, _parse_row)


def _parse_row(row_number: int, row: Row) -> TransactionCandidate:
    transaction_date = read_date(row, "Date", "%d %b %Y")
    source_type = read_text(row, "Type")
    raw_description = read_text(row, "Description")
    amount_minor = read_pence(row, "Value")
    balance_after_minor = read_pence(row, "Balance")
    return fingerprinted_candidate(
        row_number,
        transaction_date,
        source_type,
        raw_description,
        amount_minor,
        balance_after_minor,
    )
