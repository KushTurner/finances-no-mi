from finances_api.statements.contract import ParseResult, TransactionCandidate
from finances_api.statements.fields import InvalidRow, Row, read_date, read_pence, read_text
from finances_api.statements.reading import parse_statement
from finances_api.statements.source_keys import reference_key

REQUIRED_COLUMNS = ("Date", "Description", "Amount", "Reference")


def parse(content: bytes) -> ParseResult:
    return parse_statement(content, REQUIRED_COLUMNS, _parse_row)


def _parse_row(row_number: int, row: Row) -> TransactionCandidate:
    reference = _read_reference(row)
    return TransactionCandidate(
        row_number=row_number,
        transaction_date=read_date(row, "Date", "%d/%m/%Y"),
        amount_minor=-read_pence(row, "Amount"),
        raw_description=read_text(row, "Description"),
        source_key=reference_key(reference),
        source_reference=reference,
    )


def _read_reference(row: Row) -> str:
    reference = row["Reference"].removeprefix("'").removesuffix("'")
    if not reference.strip():
        raise InvalidRow("Reference is required")
    return reference
