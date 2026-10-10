from finances_api.models import CountsAs

INCOMING_ONLY: frozenset[CountsAs] = frozenset({"income", "repayment"})


def applies_to(counts_as: CountsAs, amount_pence: int) -> bool:
    return counts_as not in INCOMING_ONLY or amount_pence > 0


def payer_mark(rule: CountsAs | None, amount_pence: int) -> CountsAs | None:
    return rule if rule is not None and applies_to(rule, amount_pence) else None
