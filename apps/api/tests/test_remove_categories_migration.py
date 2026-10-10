from pathlib import Path

import pytest
from alembic.config import Config
from sqlalchemy import inspect, text

from alembic import command
from finances_api.database import create_database_engine

REMOVED_TABLES = {"categories", "merchants", "merchant_suggestions"}


def test_upgrade_removes_categories_and_keeps_imported_transactions(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    database_url = f"sqlite:///{tmp_path / 'categories.db'}"
    monkeypatch.setenv("FINANCES_DATABASE_URL", database_url)
    config = Config(Path(__file__).resolve().parents[1] / "alembic.ini")
    command.upgrade(config, "20261009_0004")
    engine = create_database_engine(database_url)
    with engine.begin() as connection:
        connection.execute(
            text(
                "INSERT INTO accounts (id, name, institution, account_type, preset, acctid) "
                "VALUES (1, 'NatWest Select', 'natwest', 'current_account', 'natwest_select', "
                "'synthetic-acctid')"
            )
        )
        connection.execute(text("INSERT INTO merchant_keys VALUES (1, 'SYNTHETIC CAFE', NULL)"))
        connection.execute(
            text(
                "INSERT INTO transactions "
                "(id, account_id, transaction_date, amount_minor, raw_description, fitid, "
                "merchant_key_id, category_id, category_decision_source, category_decided_at) "
                "VALUES (1, 1, '2026-09-03', -450, 'SYNTHETIC CAFE', 'synthetic-fitid', 1, "
                "1, 'human', '2026-09-04 00:00:00')"
            )
        )

    command.upgrade(config, "head")

    with engine.connect() as connection:
        transaction = connection.execute(
            text("SELECT amount_minor, raw_description FROM transactions")
        ).one()
        tables = set(inspect(connection).get_table_names())
    assert tuple(transaction) == (-450, "SYNTHETIC CAFE")
    assert tables.isdisjoint(REMOVED_TABLES)
    engine.dispose()
