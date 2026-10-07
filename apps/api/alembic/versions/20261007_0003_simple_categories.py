from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20261007_0003"
down_revision: str | None = "20260927_0002"
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

PREVIOUS_CATEGORIES = [
    ("Home & bills", "Rent, utilities, and recurring household services such as broadband."),
    ("Groceries", "Food and everyday household consumables purchased for home use."),
    ("Eating out", "Restaurants, cafés, takeaways, and pubs outside a known travel context."),
    ("Transport", "Everyday public transport, taxis, fuel, and other motoring costs."),
    (
        "Travel",
        "Holidays and trips, including their accommodation, transport, and other known trip "
        "expenses.",
    ),
    (
        "Shopping & leisure",
        "Clothing, electronics, entertainment, hobbies, and leisure subscriptions.",
    ),
    ("Health & personal care", "Healthcare, fitness, grooming, and personal care."),
    (
        "Other",
        "A known purpose outside the other categories, such as a gift sent or an unrelated bank "
        "fee.",
    ),
    (
        "Income",
        "Salary, interest received, and gifts received; excludes expense repayments, refunds, and "
        "transfers between the user's own accounts.",
    ),
    (
        "Own-account transfers",
        "Moving money between the user's own accounts, including paying their credit-card balance. "
        "Exclude these from spending and income totals.",
    ),
]

categories = sa.table(
    "categories",
    sa.column("id", sa.Integer()),
    sa.column("name", sa.String()),
    sa.column("definition", sa.Text()),
)


def upgrade() -> None:
    op.execute(categories.delete())
    op.bulk_insert(
        categories, [{"name": name, "definition": definition} for name, definition in CATEGORIES]
    )


def downgrade() -> None:
    op.execute(categories.delete())
    op.bulk_insert(
        categories,
        [{"name": name, "definition": definition} for name, definition in PREVIOUS_CATEGORIES],
    )
