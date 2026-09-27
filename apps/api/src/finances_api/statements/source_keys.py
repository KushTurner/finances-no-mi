import hashlib
import json
from datetime import date


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
