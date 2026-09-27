from datetime import date

from finances_api.statements.source_keys import fingerprint_key, reference_key


def test_fingerprint_key_never_changes_for_the_same_transaction() -> None:
    key = fingerprint_key(date(2026, 9, 3), "POS", "SYNTHETIC CAFE", -450, 99550)

    assert key == "fp:59d8af4045887153ea8ef78385394eac20145c7f1f74457daf0fa9d2490c9643"


def test_fingerprint_key_distinguishes_every_identity_field() -> None:
    base = (date(2026, 9, 3), "POS", "SYNTHETIC CAFE", -450, 99550)
    variants = [
        (date(2026, 9, 4), "POS", "SYNTHETIC CAFE", -450, 99550),
        (date(2026, 9, 3), "D/D", "SYNTHETIC CAFE", -450, 99550),
        (date(2026, 9, 3), "POS", "SYNTHETIC CAFE ", -450, 99550),
        (date(2026, 9, 3), "POS", "SYNTHETIC CAFE", -451, 99550),
        (date(2026, 9, 3), "POS", "SYNTHETIC CAFE", -450, 99549),
    ]

    keys = {fingerprint_key(*fields) for fields in [base, *variants]}

    assert len(keys) == 6


def test_reference_key_uses_the_source_reference() -> None:
    key = reference_key("AT000000000000000000001")

    assert key == "ref:AT000000000000000000001"
