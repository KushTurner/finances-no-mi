"""Create the initial application schema.

Revision ID: 20260927_0001
Revises:
Create Date: 2026-09-27
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260927_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "accounts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("institution", sa.String(), nullable=False),
        sa.Column("account_type", sa.String(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_table(
        "categories",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_table(
        "import_files",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("account_id", sa.Integer(), nullable=False),
        sa.Column("original_filename", sa.String(), nullable=False),
        sa.Column("content_sha256", sa.String(length=64), nullable=False),
        sa.Column("content", sa.LargeBinary(), nullable=False),
        sa.Column(
            "imported_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("content_sha256"),
    )
    op.create_table(
        "merchants",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("category_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["category_id"], ["categories.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_index("ix_merchants_category_id", "merchants", ["category_id"], unique=False)
    op.create_table(
        "merchant_keys",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("value", sa.String(), nullable=False),
        sa.Column("merchant_id", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["merchant_id"], ["merchants.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("value"),
    )
    op.create_index("ix_merchant_keys_merchant_id", "merchant_keys", ["merchant_id"], unique=False)
    op.create_table(
        "merchant_suggestions",
        sa.Column("merchant_key_id", sa.Integer(), nullable=False),
        sa.Column("suggested_merchant_name", sa.String(), nullable=False),
        sa.Column("suggested_category_id", sa.Integer(), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "confidence >= 0 AND confidence <= 1",
            name="ck_merchant_suggestions_confidence",
        ),
        sa.ForeignKeyConstraint(["merchant_key_id"], ["merchant_keys.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["suggested_category_id"], ["categories.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("merchant_key_id"),
    )
    op.create_table(
        "transactions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("account_id", sa.Integer(), nullable=False),
        sa.Column("transaction_date", sa.Date(), nullable=False),
        sa.Column("amount_minor", sa.Integer(), nullable=False),
        sa.Column("balance_after_minor", sa.Integer(), nullable=True),
        sa.Column("source_type", sa.String(), nullable=True),
        sa.Column("raw_description", sa.Text(), nullable=False),
        sa.Column("source_reference", sa.String(), nullable=True),
        sa.Column("source_key", sa.String(), nullable=False),
        sa.Column("merchant_key_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["merchant_key_id"], ["merchant_keys.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("account_id", "source_key", name="uq_transactions_source_key"),
    )
    op.create_index(
        "ix_transactions_account_date",
        "transactions",
        ["account_id", "transaction_date"],
        unique=False,
    )
    op.create_index(
        "ix_transactions_merchant_key_id", "transactions", ["merchant_key_id"], unique=False
    )
    op.create_table(
        "import_file_transactions",
        sa.Column("import_file_id", sa.Integer(), nullable=False),
        sa.Column("transaction_id", sa.Integer(), nullable=False),
        sa.Column("row_number", sa.Integer(), nullable=False),
        sa.CheckConstraint(
            "row_number > 0",
            name="ck_import_file_transactions_row_number",
        ),
        sa.ForeignKeyConstraint(["import_file_id"], ["import_files.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["transaction_id"], ["transactions.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("import_file_id", "row_number"),
        sa.UniqueConstraint(
            "import_file_id",
            "transaction_id",
            name="uq_import_file_transactions_transaction",
        ),
    )
    op.create_index(
        "ix_import_file_transactions_transaction_id",
        "import_file_transactions",
        ["transaction_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_import_file_transactions_transaction_id",
        table_name="import_file_transactions",
    )
    op.drop_table("import_file_transactions")
    op.drop_index("ix_transactions_merchant_key_id", table_name="transactions")
    op.drop_index("ix_transactions_account_date", table_name="transactions")
    op.drop_table("transactions")
    op.drop_table("merchant_suggestions")
    op.drop_index("ix_merchant_keys_merchant_id", table_name="merchant_keys")
    op.drop_table("merchant_keys")
    op.drop_index("ix_merchants_category_id", table_name="merchants")
    op.drop_table("merchants")
    op.drop_table("import_files")
    op.drop_table("categories")
    op.drop_table("accounts")
