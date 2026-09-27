import re
from collections.abc import Mapping
from datetime import date, datetime

Row = Mapping[str, str]

AMOUNT_PATTERN = re.compile(r"(?P<sign>-?)£?(?P<pounds>\d+)(?:\.(?P<pence>\d{1,2}))?")


class InvalidRow(Exception):
    pass


def read_text(row: Row, column: str) -> str:
    value = row[column]
    if not value.strip():
        raise InvalidRow(f"{column} is required")
    return value


def read_date(row: Row, column: str, date_format: str) -> date:
    try:
        return datetime.strptime(row[column], date_format).date()
    except ValueError:
        raise InvalidRow(f"{column} is not a valid date") from None


def read_pence(row: Row, column: str) -> int:
    match = AMOUNT_PATTERN.fullmatch(row[column])
    if match is None:
        raise InvalidRow(f"{column} is not a valid GBP amount")
    pence = int(match["pounds"]) * 100 + int((match["pence"] or "0").ljust(2, "0"))
    return -pence if match["sign"] else pence


def read_optional_pence(row: Row, column: str) -> int | None:
    if not row[column]:
        return None
    return read_pence(row, column)
