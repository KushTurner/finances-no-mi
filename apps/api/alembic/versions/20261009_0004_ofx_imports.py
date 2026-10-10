from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20261009_0004"
down_revision: str | None = "20261007_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

IMPORTED_DATA_TABLES = (
    "import_file_transactions",
    "transactions",
    "import_files",
    "merchant_suggestions",
    "merchant_keys",
    "accounts",
)

UNIQUE_NAMING_CONVENTION = {"uq": "uq_%(table_name)s_%(column_0_name)s"}


def upgrade() -> None:
    _delete_imported_data()

    with op.batch_alter_table("accounts", naming_convention=UNIQUE_NAMING_CONVENTION) as batch:
        batch.drop_constraint("uq_accounts_name", type_="unique")
        batch.add_column(sa.Column("preset", sa.String(), nullable=False))
        batch.add_column(sa.Column("acctid", sa.String(), nullable=False))
        batch.add_column(sa.Column("bankid", sa.String(), nullable=True))
        batch.add_column(sa.Column("org", sa.String(), nullable=True))
        batch.add_column(sa.Column("fid", sa.String(), nullable=True))
        batch.create_index("ix_accounts_acctid", ["acctid"])

    with op.batch_alter_table("transactions") as batch:
        batch.drop_constraint("uq_transactions_source_key", type_="unique")
        batch.alter_column("source_key", new_column_name="fitid")
        batch.drop_column("balance_after_minor")
        batch.drop_column("source_reference")
        batch.add_column(sa.Column("memo", sa.Text(), nullable=True))

    with op.batch_alter_table("transactions") as batch:
        batch.create_unique_constraint("uq_transactions_fitid", ["account_id", "fitid"])

    with op.batch_alter_table("import_file_transactions") as batch:
        batch.drop_constraint("ck_import_file_transactions_row_number", type_="check")
        batch.alter_column("row_number", new_column_name="position")
        batch.create_check_constraint("ck_import_file_transactions_position", "position > 0")


def downgrade() -> None:
    _delete_imported_data()

    with op.batch_alter_table("import_file_transactions") as batch:
        batch.drop_constraint("ck_import_file_transactions_position", type_="check")
        batch.alter_column("position", new_column_name="row_number")
        batch.create_check_constraint("ck_import_file_transactions_row_number", "row_number > 0")

    with op.batch_alter_table("transactions") as batch:
        batch.drop_constraint("uq_transactions_fitid", type_="unique")
        batch.drop_column("memo")
        batch.add_column(sa.Column("source_reference", sa.String(), nullable=True))
        batch.add_column(sa.Column("balance_after_minor", sa.Integer(), nullable=True))
        batch.alter_column("fitid", new_column_name="source_key")

    with op.batch_alter_table("transactions") as batch:
        batch.create_unique_constraint("uq_transactions_source_key", ["account_id", "source_key"])

    with op.batch_alter_table("accounts", naming_convention=UNIQUE_NAMING_CONVENTION) as batch:
        batch.drop_index("ix_accounts_acctid")
        batch.drop_column("fid")
        batch.drop_column("org")
        batch.drop_column("bankid")
        batch.drop_column("acctid")
        batch.drop_column("preset")
        batch.create_unique_constraint("uq_accounts_name", ["name"])


def _delete_imported_data() -> None:
    for table in IMPORTED_DATA_TABLES:
        op.execute(sa.table(table).delete())
