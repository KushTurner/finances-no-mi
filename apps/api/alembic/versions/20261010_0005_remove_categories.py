from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20261010_0005"
down_revision: str | None = "20261009_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

CATEGORIES = [
    (
        "Bills",
        "Rent, utilities, household bills, family loan repayments, and car finance repayments.",
    ),
    (
        "Food",
        "Groceries, work lunches, restaurants, takeaways, coffee, and drinks including alcohol.",
    ),
    ("Subscriptions", "Streaming, software, and recurring memberships including gyms."),
    (
        "Transport",
        "Public transport, taxis, transport tickets, fuel, parking, and car maintenance.",
    ),
    ("Shopping", "Clothes, electronics, household items, and general retail purchases."),
    (
        "Savings & investments",
        "Contributions to savings or investments and withdrawals from them. "
        "Exclude these movements from spending and income totals.",
    ),
    (
        "Other",
        "Spending outside the other categories, including gifts sent, personal support, "
        "recreation, accommodation, healthcare services, and unrelated bank fees.",
    ),
    (
        "Income",
        "Salary, interest received, and gifts received; excludes expense repayments, refunds, "
        "savings withdrawals, and transfers between the user's own accounts.",
    ),
    (
        "Transfers",
        "Other movements between the user's own accounts, including credit-card repayments. Use "
        "Savings & investments for saving or investing. Exclude these movements from spending and "
        "income totals.",
    ),
]


def upgrade() -> None:
    op.drop_table("merchant_suggestions")
    with op.batch_alter_table("merchant_keys") as batch:
        batch.drop_index("ix_merchant_keys_merchant_id")
        batch.drop_column("merchant_id")
    op.drop_index("ix_merchants_category_id", table_name="merchants")
    op.drop_table("merchants")

    with op.batch_alter_table("transactions") as batch:
        batch.drop_constraint("ck_transactions_category_decision", type_="check")
        batch.drop_index("ix_transactions_category_id")
        batch.drop_constraint("fk_transactions_category_id", type_="foreignkey")
        batch.drop_column("category_id")
        batch.drop_column("category_decision_source")
        batch.drop_column("category_decided_at")
    op.drop_table("categories")


def downgrade() -> None:
    categories = op.create_table(
        "categories",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("definition", sa.Text(), nullable=False, server_default=""),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.bulk_insert(
        categories, [{"name": name, "definition": definition} for name, definition in CATEGORIES]
    )

    with op.batch_alter_table("transactions") as batch:
        batch.add_column(sa.Column("category_id", sa.Integer(), nullable=True))
        batch.add_column(sa.Column("category_decision_source", sa.String(), nullable=True))
        batch.add_column(sa.Column("category_decided_at", sa.DateTime(), nullable=True))
        batch.create_foreign_key(
            "fk_transactions_category_id",
            "categories",
            ["category_id"],
            ["id"],
            ondelete="RESTRICT",
        )
        batch.create_index("ix_transactions_category_id", ["category_id"])
        batch.create_check_constraint(
            "ck_transactions_category_decision",
            "(category_id IS NULL AND category_decision_source IS NULL "
            "AND category_decided_at IS NULL) OR "
            "(category_id IS NOT NULL AND category_decision_source IS NOT NULL "
            "AND category_decided_at IS NOT NULL)",
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
    with op.batch_alter_table("merchant_keys") as batch:
        batch.add_column(sa.Column("merchant_id", sa.Integer(), nullable=True))
        batch.create_foreign_key(
            "fk_merchant_keys_merchant_id",
            "merchants",
            ["merchant_id"],
            ["id"],
            ondelete="RESTRICT",
        )
        batch.create_index("ix_merchant_keys_merchant_id", ["merchant_id"])
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
