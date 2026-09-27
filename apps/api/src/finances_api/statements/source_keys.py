import hashlib
import json
from datetime import date

from finances_api.statements.contract import TransactionCandidate


def reference_key(reference: str) -> str:
    return f"ref:{reference}"


def fingerprint_key(
    transaction_date: date,
    source_type: str,
    raw_description: str,
    amount_minor: int,
    balance_after_minor: int,
) -> str:
    fields = [
        transaction_date.isoformat(),
        source_type,
        raw_description,
        amount_minor,
        balance_after_minor,
    ]
    encoded = json.dumps(fields, separators=(",", ":"), ensure_ascii=False).encode()
    return f"fp:{hashlib.sha256(encoded).hexdigest()}"


def fingerprinted_candidate(
    row_number: int,
    transaction_date: date,
    source_type: str,
    raw_description: str,
    amount_minor: int,
    balance_after_minor: int,
) -> TransactionCandidate:
    return TransactionCandidate(
        row_number=row_number,
        transaction_date=transaction_date,
        amount_minor=amount_minor,
        raw_description=raw_description,
        source_key=fingerprint_key(
            transaction_date, source_type, raw_description, amount_minor, balance_after_minor
        ),
        balance_after_minor=balance_after_minor,
        source_type=source_type,
    )


def numbered_repeat_key(source_key: str, occurrence: int) -> str:
    return f"{source_key}#{occurrence}"
