import pytest
from starlette.testclient import TestClient
from statement_helpers import csv_bytes

from finances_api.models import Institution
from finances_api.statements.parsers import detect_institution

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
        b"\xff\xfeDate,Type\n",
    ],
)
def test_does_not_detect_an_unsupported_or_ambiguous_file(content: bytes) -> None:
    detected = detect_institution(content)

    assert detected is None


def test_reports_the_detected_institution_of_an_uploaded_statement(client: TestClient) -> None:
    content = csv_bytes([NATWEST_HEADER])

    response = client.post(
        "/statements/institution", files={"file": ("statement.csv", content, "text/csv")}
    )

    assert response.json() == {"institution": "natwest"}
