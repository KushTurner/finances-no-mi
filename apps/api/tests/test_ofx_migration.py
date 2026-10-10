from pathlib import Path

import pytest
from alembic.config import Config
from sqlalchemy import text

from alembic import command
from finances_api.database import create_database_engine

IMPORTED_DATA_TABLES = (
    "accounts",
    "import_files",
    "transactions",
    "import_file_transactions",
    "merchant_keys",
)


def test_upgrade_removes_csv_imported_data_and_keeps_categories(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    database_url = f"sqlite:///{tmp_path / 'ofx.db'}"
    monkeypatch.setenv("FINANCES_DATABASE_URL", database_url)
    config = Config(Path(__file__).resolve().parents[1] / "alembic.ini")
    command.upgrade(config, "20261007_0003")
    engine = create_database_engine(database_url)
    with engine.begin() as connection:
        connection.execute(
            text("INSERT INTO accounts VALUES (1, 'NatWest', 'natwest', 'current_account')")
        )
        connection.execute(text("INSERT INTO merchant_keys VALUES (1, 'SYNTHETIC CAFE', NULL)"))
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
                "source_key, merchant_key_id, category_id, category_decision_source, "
                "category_decided_at) "
                "VALUES (1, 1, '2026-09-03', -450, 'SYNTHETIC CAFE', 'fp:synthetic', 1, "
                "1, 'human', '2026-09-04 00:00:00')"
            )
        )
        connection.execute(text("INSERT INTO import_file_transactions VALUES (1, 1, 2)"))

    command.upgrade(config, "head")

    with engine.connect() as connection:
        remaining = [
            connection.scalar(text(f"SELECT COUNT(*) FROM {table}"))
            for table in IMPORTED_DATA_TABLES
        ]
        category_count = connection.scalar(text("SELECT COUNT(*) FROM categories"))
    assert remaining == [0, 0, 0, 0, 0]
    assert category_count == 9
    engine.dispose()
