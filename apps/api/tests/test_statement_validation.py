import pytest
from statement_helpers import candidates_of, csv_bytes

from finances_api.statements import natwest
from finances_api.statements.contract import InvalidStatement, RowError

HEADER = ["Date", "Type", "Description", "Value", "Balance", "Account Name", "Account Number"]
VALID_ROW = ["03 Sep 2026", "POS", "SYNTHETIC CAFE", "-4.50", "995.50", "A N OTHER", "0"]


@pytest.mark.parametrize(
    "content",
    [b"\xff\xfeDate,Type\n", b'Date,Type,Description,Value,Balance\n03 Sep 2026,"POS'],
)
def test_rejects_content_that_is_not_a_readable_csv(content: bytes) -> None:
    result = natwest.parse(content)

    assert result == InvalidStatement((RowError(None, "File is not a readable UTF-8 CSV"),))


def test_rejects_a_statement_without_transactions() -> None:
    content = csv_bytes([HEADER])

    result = natwest.parse(content)

    assert result == InvalidStatement((RowError(None, "File contains no transactions"),))


def test_ignores_blank_rows() -> None:
    content = csv_bytes([HEADER, VALID_ROW, [], ["", "", "", "", "", "", ""]])

    candidates = candidates_of(natwest.parse(content))

    assert [candidate.row_number for candidate in candidates] == [2]


def test_rejects_a_repeated_transaction_within_one_file() -> None:
    content = csv_bytes([HEADER, VALID_ROW, VALID_ROW])

    result = natwest.parse(content)

    assert result == InvalidStatement((RowError(3, "Duplicates row 2"),))


def test_rejects_a_row_with_a_different_number_of_columns() -> None:
    content = csv_bytes([HEADER, VALID_ROW[:5]])

    result = natwest.parse(content)

    assert result == InvalidStatement((RowError(2, "Expected 7 columns but found 5"),))


def test_reports_every_invalid_row() -> None:
    content = csv_bytes(
        [HEADER, ["", *VALID_ROW[1:]], VALID_ROW, [VALID_ROW[0], "", *VALID_ROW[2:]]]
    )

    result = natwest.parse(content)

    assert result == InvalidStatement(
        (RowError(2, "Date is not a valid date"), RowError(4, "Type is required"))
    )
