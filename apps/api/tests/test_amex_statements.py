from datetime import date

from statement_helpers import candidates_of, csv_bytes

from finances_api.statements import amex
from finances_api.statements.contract import (
    InvalidStatement,
    ParsedStatement,
    RowError,
    TransactionCandidate,
)

HEADER = [
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


def amex_row(
    *,
    date: str = "03/09/2026",
    description: str = "SYNTHETIC CAFE",
    amount: str = "4.50",
    reference: str = "'AT000000000000000000001'",
    address: str = "1 EXAMPLE STREET",
) -> list[str]:
    return [
        date,
        description,
        "A N OTHER",
        "-00000",
        amount,
        "",
        description,
        address,
        "EXAMPLETON",
        "AB1 2CD",
        "UNITED KINGDOM",
        reference,
        "Restaurant-Restaurant",
    ]


def amex_csv(*rows: list[str]) -> bytes:
    return csv_bytes([HEADER, *rows])


def test_parses_a_charge_as_negative_pence_identified_by_its_reference() -> None:
    content = amex_csv(amex_row())

    result = amex.parse(content)

    assert result == ParsedStatement(
        (
            TransactionCandidate(
                row_number=2,
                transaction_date=date(2026, 9, 3),
                amount_minor=-450,
                raw_description="SYNTHETIC CAFE",
                source_key="ref:AT000000000000000000001",
                source_reference="AT000000000000000000001",
            ),
        )
    )


def test_parses_a_refund_as_positive_pence() -> None:
    content = amex_csv(amex_row(amount="-12.00"))

    candidates = candidates_of(amex.parse(content))

    assert [candidate.amount_minor for candidate in candidates] == [1200]


def test_reports_the_spreadsheet_row_after_a_multiline_address() -> None:
    content = amex_csv(
        amex_row(address="1 EXAMPLE STREET\nEXAMPLETON"),
        amex_row(date="31/02/2026", reference="'AT000000000000000000002'"),
    )

    result = amex.parse(content)

    assert result == InvalidStatement((RowError(3, "Date is not a valid date"),))


def test_rejects_a_row_without_a_reference() -> None:
    content = amex_csv(amex_row(reference=""))

    result = amex.parse(content)

    assert result == InvalidStatement((RowError(2, "Reference is required"),))


def test_rejects_a_file_without_the_required_columns() -> None:
    content = csv_bytes([["Date", "Description", "Amount"], ["03/09/2026", "SYNTHETIC", "1.00"]])

    result = amex.parse(content)

    assert result == InvalidStatement(
        (
            RowError(
                None, "Expected a header row with columns: Date, Description, Amount, Reference"
            ),
        )
    )
