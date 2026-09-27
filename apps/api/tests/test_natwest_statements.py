from datetime import date

from statement_helpers import candidates_of, csv_bytes

from finances_api.statements import natwest
from finances_api.statements.contract import (
    InvalidStatement,
    ParsedStatement,
    RowError,
    TransactionCandidate,
)
from finances_api.statements.source_keys import fingerprint_key

HEADER = ["Date", "Type", "Description", "Value", "Balance", "Account Name", "Account Number"]


def natwest_row(
    *,
    date: str = "03 Sep 2026",
    source_type: str = "POS",
    description: str = "SYNTHETIC CAFE , EXAMPLETON GB",
    value: str = "-4.50",
    balance: str = "995.50",
) -> list[str]:
    return [date, source_type, description, value, balance, "A N OTHER", "000000-00000000"]


def natwest_csv(*rows: list[str]) -> bytes:
    return csv_bytes([HEADER, *rows])


def test_parses_a_purchase_as_negative_pence_identified_by_its_fingerprint() -> None:
    content = natwest_csv(natwest_row())

    result = natwest.parse(content)

    assert result == ParsedStatement(
        (
            TransactionCandidate(
                row_number=2,
                transaction_date=date(2026, 9, 3),
                amount_minor=-450,
                raw_description="SYNTHETIC CAFE , EXAMPLETON GB",
                source_key=fingerprint_key(
                    date(2026, 9, 3), "POS", "SYNTHETIC CAFE , EXAMPLETON GB", -450, 99550
                ),
                balance_after_minor=99550,
                source_type="POS",
            ),
        )
    )


def test_parses_income_as_positive_pence() -> None:
    content = natwest_csv(natwest_row(source_type="BAC", value="1500.00", balance="2495.50"))

    candidates = candidates_of(natwest.parse(content))

    assert [candidate.amount_minor for candidate in candidates] == [150000]


def test_identical_same_day_purchases_remain_separate_transactions() -> None:
    content = natwest_csv(natwest_row(balance="996.50"), natwest_row(balance="992.00"))

    candidates = candidates_of(natwest.parse(content))

    assert len({candidate.source_key for candidate in candidates}) == 2


def test_overlapping_exports_identify_a_shared_row_identically() -> None:
    shared_row = natwest_row(date="02 Sep 2026", balance="1000.00")
    earlier_export = natwest_csv(shared_row, natwest_row(date="01 Sep 2026", balance="1004.50"))
    later_export = natwest_csv(natwest_row(date="03 Sep 2026", balance="995.50"), shared_row)

    earlier = candidates_of(natwest.parse(earlier_export))
    later = candidates_of(natwest.parse(later_export))

    assert earlier[0].source_key == later[1].source_key


def test_numbers_an_identical_purchase_repeated_after_a_refund() -> None:
    content = natwest_csv(
        natwest_row(balance="995.50"),
        natwest_row(value="4.50", balance="1000.00"),
        natwest_row(balance="995.50"),
    )

    candidates = candidates_of(natwest.parse(content))

    assert candidates[2].source_key == f"{candidates[0].source_key}#2"


def test_overlapping_exports_number_repeated_purchases_identically() -> None:
    same_day = [
        natwest_row(balance="995.50"),
        natwest_row(value="4.50", balance="1000.00"),
        natwest_row(balance="995.50"),
    ]
    earlier_export = natwest_csv(*same_day, natwest_row(date="02 Sep 2026", balance="1000.00"))
    later_export = natwest_csv(natwest_row(date="04 Sep 2026", balance="991.00"), *same_day)

    earlier = candidates_of(natwest.parse(earlier_export))
    later = candidates_of(natwest.parse(later_export))

    assert [c.source_key for c in earlier[:3]] == [c.source_key for c in later[1:]]


def test_reports_an_invalid_amount_with_its_row_number() -> None:
    content = natwest_csv(natwest_row(), natwest_row(value="four pounds", balance="991.00"))

    result = natwest.parse(content)

    assert result == InvalidStatement((RowError(3, "Value is not a valid GBP amount"),))
