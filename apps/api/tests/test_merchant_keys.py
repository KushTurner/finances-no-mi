from finances_api.merchant_keys import normalize_merchant_key


def test_collapses_whitespace_and_uppercases_the_description() -> None:
    raw_description = "  Synthetic\tCafe   Exampleton "

    merchant_key = normalize_merchant_key(raw_description)

    assert merchant_key == "SYNTHETIC CAFE EXAMPLETON"
