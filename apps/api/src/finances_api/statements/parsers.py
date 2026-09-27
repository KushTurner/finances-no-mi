import csv
from collections.abc import Callable, Mapping, Sequence

from finances_api.models import Institution
from finances_api.statements import amex, nationwide, natwest
from finances_api.statements.contract import InvalidStatement, ParseResult, RowError
from finances_api.statements.reading import UNREADABLE_FILE, find_header, read_records

StatementParser = Callable[[bytes], ParseResult]

PARSERS_BY_INSTITUTION: Mapping[Institution, StatementParser] = {
    "amex": amex.parse,
    "natwest": natwest.parse,
    "nationwide": nationwide.parse,
}

REQUIRED_COLUMNS_BY_INSTITUTION: Mapping[Institution, Sequence[str]] = {
    "amex": amex.REQUIRED_COLUMNS,
    "natwest": natwest.REQUIRED_COLUMNS,
    "nationwide": nationwide.REQUIRED_COLUMNS,
}


UNSUPPORTED_STATEMENT = InvalidStatement(
    (RowError(None, "No header row matches a supported Amex, NatWest, or Nationwide statement"),)
)


def detect_institution(content: bytes) -> Institution | InvalidStatement:
    try:
        records = read_records(content)
    except (UnicodeDecodeError, csv.Error):
        return UNREADABLE_FILE

    matches: list[Institution] = [
        institution
        for institution, required_columns in REQUIRED_COLUMNS_BY_INSTITUTION.items()
        if find_header(records, required_columns) is not None
    ]
    return matches[0] if len(matches) == 1 else UNSUPPORTED_STATEMENT
