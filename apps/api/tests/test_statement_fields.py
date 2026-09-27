import pytest

from finances_api.statements.fields import InvalidRow, read_pence


@pytest.mark.parametrize(
    ("text", "pence"),
    [
        ("12.34", 1234),
        ("£12.34", 1234),
        ("-12.34", -1234),
        ("-£0.05", -5),
        ("7", 700),
        ("7.5", 750),
        ("0.00", 0),
    ],
)
def test_reads_gbp_amounts_as_pence(text: str, pence: int) -> None:
    row = {"Amount": text}

    result = read_pence(row, "Amount")

    assert result == pence


@pytest.mark.parametrize("text", ["", "12.345", "1,234.00", "£", "12.", "twelve", " 12.00"])
def test_rejects_unrecognised_amounts(text: str) -> None:
    row = {"Amount": text}

    with pytest.raises(InvalidRow, match="Amount is not a valid GBP amount"):
        read_pence(row, "Amount")
