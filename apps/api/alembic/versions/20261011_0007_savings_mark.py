from collections.abc import Sequence

from alembic import op

revision: str = "20261011_0007"
down_revision: str | None = "20261010_0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

VALUES = "('income', 'repayment', 'own_account', 'savings')"
PREVIOUS_VALUES = "('income', 'repayment', 'own_account')"


def upgrade() -> None:
    _replace_checks(VALUES)


def downgrade() -> None:
    op.execute("DELETE FROM payer_rules WHERE counts_as = 'savings'")
    op.execute(
        "UPDATE transactions SET counts_as = NULL, counts_as_source = NULL "
        "WHERE counts_as = 'savings'"
    )
    _replace_checks(PREVIOUS_VALUES)


def _replace_checks(values: str) -> None:
    with op.batch_alter_table("transactions") as batch:
        batch.drop_constraint("ck_transactions_counts_as", type_="check")
        batch.create_check_constraint(
            "ck_transactions_counts_as", f"counts_as IS NULL OR counts_as IN {values}"
        )
    with op.batch_alter_table("payer_rules") as batch:
        batch.drop_constraint("ck_payer_rules_counts_as", type_="check")
        batch.create_check_constraint("ck_payer_rules_counts_as", f"counts_as IN {values}")
