from collections.abc import Iterator
from datetime import date, datetime
from pathlib import Path

import pytest
from alembic.config import Config
from sqlalchemy import Engine, MetaData, select, text
from sqlalchemy.orm import Session

from alembic import command
from finances_api.database import create_database_engine
from finances_api.models import (
    Account,
    Category,
    ImportFileTransaction,
    Merchant,
    MerchantKey,
    MerchantSuggestion,
    Transaction,
)


def test_upgrade_preserves_existing_imports_without_inheriting_merchant_categories(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    database_url = f"sqlite:///{tmp_path / 'upgrade.db'}"
    monkeypatch.setenv("FINANCES_DATABASE_URL", database_url)
    config = Config(Path(__file__).resolve().parents[1] / "alembic.ini")
    command.upgrade(config, "20260927_0001")
    engine = create_database_engine(database_url)
    with engine.begin() as connection:
        connection.execute(
            text(
                "INSERT INTO accounts VALUES (1, 'Synthetic account', 'natwest', 'current_account')"
            )
        )
        connection.execute(text("INSERT INTO categories VALUES (1, 'Eating out')"))
        connection.execute(text("INSERT INTO merchants VALUES (1, 'Synthetic cafe', 1)"))
        connection.execute(text("INSERT INTO merchant_keys VALUES (1, 'SYNTHETIC CAFE', 1)"))
        connection.execute(
            text(
                "INSERT INTO import_files "
                "(id, account_id, original_filename, content_sha256, content) "
                "VALUES (1, 1, 'synthetic.csv', :hash, :content)"
            ),
            {"hash": "a" * 64, "content": b"synthetic statement"},
        )
        connection.execute(
            text(
                "INSERT INTO transactions "
                "(id, account_id, transaction_date, amount_minor, raw_description, "
                "source_key, merchant_key_id) "
                "VALUES (1, 1, '2026-09-03', -450, 'SYNTHETIC CAFE', 'synthetic-key', 1)"
            )
        )
        connection.execute(text("INSERT INTO import_file_transactions VALUES (1, 1, 2)"))
        metadata = MetaData()
        metadata.reflect(connection)
        source_before = connection.execute(select(metadata.tables["transactions"])).mappings().one()

    command.upgrade(config, "head")

    with Session(engine) as session:
        transaction = session.scalars(select(Transaction)).one()
        assert {key: getattr(transaction, key) for key in source_before} == dict(source_before)
        assert (
            transaction.category_id,
            transaction.category_decision_source,
            transaction.category_decided_at,
        ) == (None, None, None)
        assert session.scalars(select(ImportFileTransaction.transaction_id)).all() == [1]
        assert len(session.scalars(select(Category)).all()) == 9
        assert session.scalar(select(Category.definition).where(Category.name == "Food"))
    with engine.connect() as connection:
        assert connection.execute(text("PRAGMA foreign_key_check")).all() == []
    engine.dispose()


@pytest.fixture
def legacy_database(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Iterator[Engine]:
    database_url = f"sqlite:///{tmp_path / 'legacy.db'}"
    monkeypatch.setenv("FINANCES_DATABASE_URL", database_url)
    command.upgrade(Config(Path(__file__).resolve().parents[1] / "alembic.ini"), "20260927_0002")
    engine = create_database_engine(database_url)
    with Session(engine) as session:
        account = Account(
            name="Synthetic account", institution="natwest", account_type="current_account"
        )
        session.add(account)
        for category in session.scalars(select(Category).order_by(Category.id)).all():
            merchant = Merchant(name=f"Synthetic {category.name}", category_id=category.id)
            session.add(merchant)
            session.flush()
            key = MerchantKey(value=merchant.name, merchant_id=merchant.id)
            session.add(key)
            session.flush()
            session.add(
                Transaction(
                    account_id=account.id,
                    transaction_date=date(2026, 9, 1),
                    amount_minor=-100,
                    raw_description=merchant.name,
                    source_key=merchant.name,
                    merchant_key_id=key.id,
                    category_id=category.id,
                    category_decision_source="human",
                    category_decided_at=datetime(2026, 9, 2),
                )
            )
            session.add(
                MerchantSuggestion(
                    merchant_key_id=key.id,
                    suggested_merchant_name=merchant.name,
                    suggested_category_id=category.id,
                    confidence=0.8,
                )
            )
        session.commit()
    yield engine
    engine.dispose()


def test_taxonomy_upgrade_preserves_direct_decisions_and_reopens_ambiguous_ones(
    legacy_database: Engine,
) -> None:
    command.upgrade(Config(Path(__file__).resolve().parents[1] / "alembic.ini"), "head")

    with Session(legacy_database) as session:
        rows = session.execute(
            select(Transaction, Category.name).outerjoin(
                Category, Transaction.category_id == Category.id
            )
        ).all()
        categories = {transaction.raw_description: name for transaction, name in rows}
        assert categories == {
            "Synthetic Home & bills": "Bills",
            "Synthetic Groceries": "Food",
            "Synthetic Eating out": "Food",
            "Synthetic Transport": "Transport",
            "Synthetic Travel": None,
            "Synthetic Shopping & leisure": None,
            "Synthetic Health & personal care": None,
            "Synthetic Other": "Other",
            "Synthetic Income": "Income",
            "Synthetic Own-account transfers": "Transfers",
        }
        assert all(
            (transaction.category_decision_source, transaction.category_decided_at)
            == (("human", datetime(2026, 9, 2)) if name is not None else (None, None))
            and transaction.amount_minor == -100
            and transaction.source_key == transaction.raw_description
            for transaction, name in rows
        )
    with legacy_database.connect() as connection:
        assert connection.execute(text("PRAGMA foreign_key_check")).all() == []


def test_taxonomy_upgrade_remaps_legacy_merchants_and_discards_obsolete_suggestions(
    legacy_database: Engine,
) -> None:
    command.upgrade(Config(Path(__file__).resolve().parents[1] / "alembic.ini"), "head")

    with Session(legacy_database) as session:
        retired_names = [
            "Synthetic Travel",
            "Synthetic Shopping & leisure",
            "Synthetic Health & personal care",
        ]
        mapped = session.scalars(
            select(Category.name).join(Merchant).where(Merchant.name.in_(retired_names))
        ).all()
        assert mapped == ["Other", "Other", "Other"]
        assert len(session.scalars(select(MerchantSuggestion)).all()) == 7
        assert len(session.scalars(select(Category)).all()) == 9


def test_taxonomy_downgrade_restores_old_choices_without_inventing_food_assignments(
    legacy_database: Engine,
) -> None:
    config = Config(Path(__file__).resolve().parents[1] / "alembic.ini")
    command.upgrade(config, "head")

    command.downgrade(config, "20260927_0002")

    with Session(legacy_database) as session:
        food = session.scalars(
            select(Transaction).where(
                Transaction.raw_description.in_(["Synthetic Groceries", "Synthetic Eating out"])
            )
        ).all()
        assert [
            (row.category_id, row.category_decision_source, row.category_decided_at) for row in food
        ] == [
            (None, None, None),
            (None, None, None),
        ]
        assert len(session.scalars(select(Category)).all()) == 10
    with legacy_database.connect() as connection:
        assert connection.execute(text("PRAGMA foreign_key_check")).all() == []
