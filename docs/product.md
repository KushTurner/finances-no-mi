# Product

## Purpose

Finances No MI is a local-only application for bringing personal financial activity into one place. It imports transactions from multiple institutions, normalizes merchant descriptions, supports human-reviewed categorization, and provides a foundation for understanding monthly spending.

The application is for one user on one machine. It is not a hosted service.

## Primary workflows

### Import transactions

1. Drop or choose one or more supported CSV files.
2. Each file is imported into the account for its institution, which is created on that institution's first import.
3. Review each file's import result, including rows added, rows already observed in an earlier import, and any validation failure.
4. View the imported transactions in a common format regardless of their source institution.

Amex, NatWest, and Nationwide CSV exports are the initial supported formats. Chase savings activity is entered manually because a suitable CSV export is not available.

### Resolve merchants

1. The application derives a stable merchant key from each raw transaction description using deterministic rules.
2. Known merchant keys resolve immediately to their canonical merchant and category.
3. An ordinary LLM call proposes a merchant and category for an unresolved key.
4. The user reviews the proposal and either approves or corrects it.
5. Future transactions with that merchant key reuse the approved resolution without another LLM call.

For example:

```text
DELIVEROO LTD -> Deliveroo -> Eating Out
```

### Review financial activity

The user can inspect transactions across accounts with their resolved merchant and category. Monthly summaries and a conversational interface are intended future capabilities, but they are not part of the initial implementation.

## Product rules

- Preserve the source transaction description even when a normalized merchant key is derived from it.
- Treat two legitimate transactions as separate events even when they share a date, description, and amount.
- Accept statement exports with overlapping date ranges without duplicating transactions already observed.
- Require human approval before an LLM suggestion becomes a durable merchant mapping.
- Keep all application and statement data on the local machine, apart from the minimal normalized value sent when requesting an LLM suggestion.
- Use synthetic financial data in source control, tests, documentation, and screenshots.

## Non-goals

- Hosting the application or supporting multiple users.
- Authentication, authorization, or account sharing.
- Connecting directly to bank APIs.
- Moving or initiating payments.
- Automatic approval based on an LLM confidence threshold.
- Adding budgeting, forecasting, investment tracking, or other adjacent finance features unless requested.
- Using LangGraph for a single categorization request. It should only be considered when a future workflow actually requires orchestration.
