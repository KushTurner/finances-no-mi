from typing import Literal

CategoryName = Literal[
    "Bills",
    "Food",
    "Subscriptions",
    "Transport",
    "Shopping",
    "Savings & investments",
    "Other",
    "Income",
    "Transfers",
]

CATEGORY_DEFINITIONS: dict[CategoryName, str] = {
    "Bills": "Rent, utilities, household bills, family loan repayments, "
    "and car finance repayments.",
    "Food": "Groceries, work lunches, restaurants, takeaways, coffee, "
    "and drinks including alcohol.",
    "Subscriptions": "Streaming, software, and recurring memberships including gyms.",
    "Transport": "Public transport, taxis, transport tickets, fuel, parking, and car maintenance.",
    "Shopping": "Clothes, electronics, household items, and general retail purchases.",
    "Savings & investments": "Contributions to savings or investments and withdrawals from them. "
    "Exclude these movements from spending and income totals.",
    "Other": "Spending outside the other categories, including gifts sent, personal support, "
    "recreation, accommodation, healthcare services, and unrelated bank fees.",
    "Income": "Salary, interest received, and gifts received; excludes expense repayments, "
    "refunds, savings withdrawals, and transfers between the user's own accounts.",
    "Transfers": "Other movements between the user's own accounts, including credit-card "
    "repayments. Use Savings & investments for saving or investing. "
    "Exclude these movements from spending and income totals.",
}

CATEGORY_DEFINITIONS_VERSION = "2026-10-07"
