import pytest
from statement_helpers import csv_bytes

from finances_api.models import Institution
from finances_api.statements.parsers import UNSUPPORTED_STATEMENT, detect_institution
from finances_api.statements.reading import UNREADABLE_FILE

AMEX_HEADER = ["Date", "Description", "Card Member", "Account #", "Amount", "Reference"]
NATWEST_HEADER = ["Date", "Type", "Description", "Value", "Balance", "Account Name"]
NATIONWIDE_SUMMARY = [["Account Name:", "Synthetic ****00000"], []]
NATIONWIDE_HEADER = ["Date", "Transaction type", "Description", "Paid out", "Paid in", "Balance"]


@pytest.mark.parametrize(
    ("records", "institution"),
    [
        ([AMEX_HEADER], "amex"),
        ([NATWEST_HEADER], "natwest"),
        ([*NATIONWIDE_SUMMARY, NATIONWIDE_HEADER], "nationwide"),
    ],
)
def test_detects_the_institution_from_its_header_row(
    records: list[list[str]], institution: Institution
) -> None:
    content = csv_bytes(records, encoding="utf-8-sig")

    detected = detect_institution(content)

    assert detected == institution


@pytest.mark.parametrize(
    "content",
    [
        csv_bytes([["Date", "Description", "Amount"]]),
        csv_bytes([AMEX_HEADER, NATWEST_HEADER]),
    ],
)
def test_rejects_an_unsupported_or_ambiguous_header(content: bytes) -> None:
    detected = detect_institution(content)

    assert detected == UNSUPPORTED_STATEMENT


def test_rejects_a_file_that_is_not_a_readable_csv() -> None:
    detected = detect_institution(b"\xff\xfeDate,Type\n")

    assert detected == UNREADABLE_FILE
