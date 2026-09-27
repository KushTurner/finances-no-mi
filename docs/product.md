# Product

## Purpose

Finances No MI is a local-only application for bringing personal financial activity into one place. It imports transactions from multiple institutions, supports transaction-level categorization, and provides a foundation for understanding monthly spending.

The application is for one user on one machine. It is not a hosted service.

## Primary workflows

### Import transactions

1. Drop or choose one or more supported CSV files.
2. Each file is imported into the account for its institution, which is created on that institution's first import.
3. Review each file's import result, including rows added, rows already observed in an earlier import, and any validation failure.
4. View the imported transactions in a common format regardless of their source institution.

Amex, NatWest, and Nationwide CSV exports are the initial supported formats.

### Categorize transactions

1. Browse imported transactions with their original descriptions and signed amounts.
2. Choose a category from a fixed list of ten broad categories, for one transaction or a selected group.
3. In the later suggestion slice, request LLM suggestions for uncategorized transactions using description context, direction, transaction type, and the allowed category definitions.
4. Accept a suggestion or select a different allowed category. Insufficient information leaves the transaction uncategorized.
5. Keep the suggestion and the user's decision separately so future evaluation can measure accuracy.

Categories belong to individual transactions. Identifying a merchant or person is not required, and assigning a category does not create a rule for future transactions with the same description or sender. See [Transaction categorization](features/transaction-categorization.md) for the category list and treatment of repayments.

### Review financial activity

The user can inspect transactions across accounts by date, category, and description. The [spending overview](features/spending-overview.md) summarizes spending and income for a chosen period and accounts. Merchant search and a conversational interface are future capabilities.

A future question about spending at a merchant can combine a date filter with matching descriptions. Category is an optional additional filter, not a prerequisite for identifying that merchant's transactions. An LLM may interpret the question and help identify matches; application code calculates totals using integer pence and makes the matching transactions available for inspection.

## Product rules

- Preserve the source transaction description and meaningful payment references for local review and future analysis.
- Treat two legitimate transactions as separate events even when they share a date, description, and amount.
- Accept statement exports with overlapping date ranges without duplicating transactions already observed.
- Derive incoming/outgoing direction from the institution's amount fields, not from a guess about the description.
- Treat known refunds and expense repayments as positive offsets to the original spending category. Incoming money is not necessarily income.
- Require human approval before an LLM suggestion becomes an assigned category in the initial workflow.
- Keep application and statement data local, apart from the limited categorization context permitted by the [LLM boundary](features/transaction-categorization.md#llm-boundary).
- Preserve reviewed decisions as evidence. Importing more data or accepting a suggestion does not itself train the model or create a reusable matching rule.
- Use synthetic financial data in source control, tests, documentation, and screenshots.

## Non-goals

- Hosting the application or supporting multiple users.
- Authentication, authorization, or account sharing.
- Connecting directly to bank APIs.
- Moving or initiating payments.
- Automatic approval in the initial implementation. Later automation requires evaluation against human-reviewed decisions; an LLM's self-reported confidence is not sufficient.
- Mandatory merchant normalization, automatic person identification, or institution-specific regex cleanup for categorization.
- Adding budgeting, forecasting, investment tracking, or other adjacent finance features unless requested.
- Using LangGraph for a single categorization request. It should only be considered when a future workflow actually requires orchestration.
