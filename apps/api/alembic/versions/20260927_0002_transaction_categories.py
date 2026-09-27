from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects.sqlite import insert

from alembic import op

revision: str = "20260927_0002"
down_revision: str | None = "20260927_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

CATEGORIES = [
    ("Home & bills", "Rent, utilities, and recurring household services such as broadband."),
    ("Groceries", "Food and everyday household consumables purchased for home use."),
    ("Eating out", "Restaurants, cafés, takeaways, and pubs outside a known travel context."),
    ("Transport", "Everyday public transport, taxis, fuel, and other motoring costs."),
    (
        "Travel",
        "Holidays and trips, including their accommodation, transport, "
        "and other known trip expenses.",
    ),
    (
        "Shopping & leisure",
        "Clothing, electronics, entertainment, hobbies, and leisure subscriptions.",
    ),
    ("Health & personal care", "Healthcare, fitness, grooming, and personal care."),
    (
        "Other",
        "A known purpose outside the other categories, "
        "such as a gift sent or an unrelated bank fee.",
    ),
    (
        "Income",
        "Salary, interest received, and gifts received; excludes expense repayments, "
        "refunds, and transfers between the user's own accounts.",
    ),
    (
        "Own-account transfers",
        "Moving money between the user's own accounts, including paying their credit-card balance. "
        "Exclude these from spending and income totals.",
    ),
]


def upgrade() -> None:
    op.add_column(
        "categories", sa.Column("definition", sa.Text(), nullable=False, server_default="")
    )
    categories = sa.table(
        "categories", sa.column("name", sa.String()), sa.column("definition", sa.Text())
    )
    for name, definition in CATEGORIES:
        statement = insert(categories).values(name=name, definition=definition)
        op.execute(
            statement.on_conflict_do_update(
                index_elements=["name"], set_={"definition": definition}
            )
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


def downgrade() -> None:
    with op.batch_alter_table("transactions") as batch:
        batch.drop_constraint("ck_transactions_category_decision", type_="check")
        batch.drop_index("ix_transactions_category_id")
        batch.drop_constraint("fk_transactions_category_id", type_="foreignkey")
        batch.drop_column("category_id")
        batch.drop_column("category_decision_source")
        batch.drop_column("category_decided_at")
    with op.batch_alter_table("categories") as batch:
        batch.drop_column("definition")
