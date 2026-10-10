from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from finances_api.demo_data import AMEX, NATIONWIDE, NATWEST, seed_demo_data
from finances_api.models import Account, Transaction


def test_seeds_every_synthetic_transaction_with_a_mix_of_categorized_and_uncategorized(
    session: Session,
) -> None:
    seed_demo_data(session, date(2026, 10, 6))

    transactions = session.scalars(select(Transaction)).all()
    account_names = session.scalars(select(Account.name).order_by(Account.name)).all()
    uncategorized = [transaction for transaction in transactions if transaction.category_id is None]
    expected_uncategorized = [
        demo for demo in [*NATWEST, *NATIONWIDE, *AMEX] if demo.category is None
    ]
    assert len(transactions) == len(NATWEST) + len(NATIONWIDE) + len(AMEX)
    assert account_names == ["American Express Gold", "NatWest Select", "Nationwide FlexOne"]
    assert len(uncategorized) == len(expected_uncategorized)
