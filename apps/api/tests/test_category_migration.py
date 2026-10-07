from pathlib import Path

import pytest
from alembic.config import Config
from sqlalchemy import MetaData, select, text
from sqlalchemy.orm import Session

from alembic import command
from finances_api.categories import CATEGORY_DEFINITIONS
from finances_api.database import create_database_engine
from finances_api.models import Category, ImportFileTransaction, Transaction


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

    command.upgrade(config, "20260927_0002")

    with Session(engine) as session:
        transaction = session.scalars(select(Transaction)).one()
        assert {key: getattr(transaction, key) for key in source_before} == dict(source_before)
        assert (
            transaction.category_id,
            transaction.category_decision_source,
            transaction.category_decided_at,
        ) == (None, None, None)
        assert session.scalars(select(ImportFileTransaction.transaction_id)).all() == [1]
        assert len(session.scalars(select(Category)).all()) == 10
        assert session.scalar(select(Category.definition).where(Category.id == 1))
    with engine.connect() as connection:
        assert connection.execute(text("PRAGMA foreign_key_check")).all() == []
    engine.dispose()


def test_empty_database_upgrade_seeds_the_nine_categories(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    database_url = f"sqlite:///{tmp_path / 'categories.db'}"
    monkeypatch.setenv("FINANCES_DATABASE_URL", database_url)
    config = Config(Path(__file__).resolve().parents[1] / "alembic.ini")
    command.upgrade(config, "20260927_0002")
    engine = create_database_engine(database_url)

    command.upgrade(config, "head")

    with Session(engine) as session:
        categories = {
            category.name: category.definition for category in session.scalars(select(Category))
        }
        assert categories == CATEGORY_DEFINITIONS
        assert len(categories) == 9
    engine.dispose()
