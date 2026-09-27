from datetime import date

import pytest
from statement_helpers import csv_bytes

from finances_api.statements import nationwide
from finances_api.statements.contract import (
    InvalidStatement,
    ParsedStatement,
    RowError,
    TransactionCandidate,
)
from finances_api.statements.source_keys import fingerprint_key

HEADER = ["Date", "Transaction type", "Description", "Paid out", "Paid in", "Balance"]


def nationwide_row(
    *,
    date: str = "03 Sep 2026",
    source_type: str = "Contactless Payment",
    description: str = "SYNTHETIC CAFE",
    paid_out: str = "£4.50",
    paid_in: str = "",
    balance: str = "£995.50",
) -> list[str]:
    return [date, source_type, description, paid_out, paid_in, balance]


def nationwide_csv(*rows: list[str]) -> bytes:
    account_summary = [
        ["Account Name:", "Synthetic ****00000"],
        ["Account Balance:", "£1000.00"],
        ["Available Balance: ", "£1000.00"],
        [],
    ]
    return csv_bytes(
        [*account_summary, HEADER, *rows], line_terminator="\r\n", encoding="utf-8-sig"
    )


def test_parses_paid_out_as_negative_and_paid_in_as_positive_pence() -> None:
    content = nationwide_csv(
        nationwide_row(),
        nationwide_row(
            source_type="Bank credit",
            description="SYNTHETIC EMPLOYER",
            paid_out="",
            paid_in="£1500.00",
            balance="£2495.50",
        ),
    )

    result = nationwide.parse(content)

    assert result == ParsedStatement(
        (
            TransactionCandidate(
                row_number=6,
                transaction_date=date(2026, 9, 3),
                amount_minor=-450,
                raw_description="SYNTHETIC CAFE",
                source_key=fingerprint_key(
                    date(2026, 9, 3), "Contactless Payment", "SYNTHETIC CAFE", -450, 99550
                ),
                balance_after_minor=99550,
                source_type="Contactless Payment",
            ),
            TransactionCandidate(
                row_number=7,
                transaction_date=date(2026, 9, 3),
                amount_minor=150000,
                raw_description="SYNTHETIC EMPLOYER",
                source_key=fingerprint_key(
                    date(2026, 9, 3), "Bank credit", "SYNTHETIC EMPLOYER", 150000, 249550
                ),
                balance_after_minor=249550,
                source_type="Bank credit",
            ),
        )
    )


@pytest.mark.parametrize(("paid_out", "paid_in"), [("£4.50", "£4.50"), ("", "")])
def test_rejects_a_row_unless_exactly_one_amount_is_present(paid_out: str, paid_in: str) -> None:
    content = nationwide_csv(nationwide_row(paid_out=paid_out, paid_in=paid_in))

    result = nationwide.parse(content)

    assert result == InvalidStatement(
        (RowError(6, "Exactly one of Paid out or Paid in is required"),)
    )
