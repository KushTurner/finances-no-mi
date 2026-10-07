from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects.sqlite import insert

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

LEGACY_CATEGORIES = [
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
transactions = sa.table(
    "transactions",
    sa.column("category_id", sa.Integer()),
    sa.column("category_decision_source", sa.String()),
    sa.column("category_decided_at", sa.DateTime()),
)
merchants = sa.table("merchants", sa.column("category_id", sa.Integer()))
suggestions = sa.table("merchant_suggestions", sa.column("suggested_category_id", sa.Integer()))


def _rename_or_merge(old_name: str, new_name: str) -> None:
    connection = op.get_bind()
    old_id = connection.scalar(sa.select(categories.c.id).where(categories.c.name == old_name))
    if old_id is None:
        return
    new_id = connection.scalar(sa.select(categories.c.id).where(categories.c.name == new_name))
    if new_id is None:
        connection.execute(
            categories.update().where(categories.c.id == old_id).values(name=new_name)
        )
        return
    for table, column in (
        (transactions, transactions.c.category_id),
        (merchants, merchants.c.category_id),
        (suggestions, suggestions.c.suggested_category_id),
    ):
        connection.execute(table.update().where(column == old_id).values({column: new_id}))
    connection.execute(categories.delete().where(categories.c.id == old_id))


def _seed(definitions: list[tuple[str, str]]) -> None:
    for name, definition in definitions:
        statement = insert(categories).values(name=name, definition=definition)
        op.execute(
            statement.on_conflict_do_update(
                index_elements=["name"],
                set_={"definition": definition},
            )
        )


def _retire(names: Sequence[str]) -> None:
    connection = op.get_bind()
    ids = list(connection.scalars(sa.select(categories.c.id).where(categories.c.name.in_(names))))
    if not ids:
        return
    other_id = connection.scalar(sa.select(categories.c.id).where(categories.c.name == "Other"))
    connection.execute(
        transactions.update()
        .where(transactions.c.category_id.in_(ids))
        .values(
            category_id=None,
            category_decision_source=None,
            category_decided_at=None,
        )
    )
    connection.execute(suggestions.delete().where(suggestions.c.suggested_category_id.in_(ids)))
    connection.execute(
        merchants.update().where(merchants.c.category_id.in_(ids)).values(category_id=other_id)
    )
    connection.execute(categories.delete().where(categories.c.id.in_(ids)))


def upgrade() -> None:
    _rename_or_merge("Home & bills", "Bills")
    _rename_or_merge("Groceries", "Food")
    _rename_or_merge("Eating out", "Food")
    _rename_or_merge("Own-account transfers", "Transfers")
    _seed(CATEGORIES)
    _retire(["Travel", "Shopping & leisure", "Health & personal care"])


def downgrade() -> None:
    _retire(["Food", "Subscriptions", "Shopping", "Savings & investments"])
    _rename_or_merge("Bills", "Home & bills")
    _rename_or_merge("Transfers", "Own-account transfers")
    _seed(LEGACY_CATEGORIES)
