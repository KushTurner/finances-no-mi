from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20261010_0006"
down_revision: str | None = "20261010_0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

COUNTS_AS_VALUES = "('income', 'repayment', 'own_account')"


def upgrade() -> None:
    with op.batch_alter_table("transactions") as batch:
        batch.add_column(sa.Column("counts_as", sa.String(), nullable=True))
        batch.add_column(sa.Column("counts_as_source", sa.String(), nullable=True))
        batch.create_check_constraint(
            "ck_transactions_counts_as", f"counts_as IS NULL OR counts_as IN {COUNTS_AS_VALUES}"
        )
        batch.create_check_constraint(
            "ck_transactions_counts_as_incoming",
            "counts_as NOT IN ('income', 'repayment') OR amount_minor > 0",
        )
        batch.create_check_constraint(
            "ck_transactions_counts_as_source",
            "(counts_as IS NULL AND counts_as_source IS NULL) OR "
            "(counts_as IS NOT NULL AND counts_as_source IN ('payer', 'human'))",
        )

    op.create_table(
        "payer_rules",
        sa.Column("merchant_key_id", sa.Integer(), nullable=False),
        sa.Column("counts_as", sa.String(), nullable=False),
        sa.CheckConstraint(f"counts_as IN {COUNTS_AS_VALUES}", name="ck_payer_rules_counts_as"),
        sa.ForeignKeyConstraint(["merchant_key_id"], ["merchant_keys.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("merchant_key_id"),
    )


def downgrade() -> None:
    op.drop_table("payer_rules")
    with op.batch_alter_table("transactions") as batch:
        batch.drop_constraint("ck_transactions_counts_as_source", type_="check")
        batch.drop_constraint("ck_transactions_counts_as_incoming", type_="check")
        batch.drop_constraint("ck_transactions_counts_as", type_="check")
        batch.drop_column("counts_as_source")
        batch.drop_column("counts_as")
