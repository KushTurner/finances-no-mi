# Money In

## Outcome

The user removes noise from their totals so the overview shows actual spending. Every transaction counts by default: money out is spending and money in is income. The user marks the exceptions, mostly by deciding once per payer.

## Marks

| Mark | Allowed on | Effect on totals |
| --- | --- | --- |
| None | Any transaction | Money out counts as Spent, money in as Income |
| Income | Money in | Counts as Income |
| Repayment | Money in | Reduces Spent instead of adding to Income |
| Own account | Money in or out | Left out of every total and of largest payments |

Repayments reduce Spent in the month they arrive, so a single month can show low or even negative spending when repayments arrive after the spending they cover. Longer periods even this out.

## Payers

- A payer is the normalized description (merchant key) of transactions that brought money in.
- The Money in page lists every payer with their payment count, total received, and latest payment, undecided payers first, then by amount received.
- A payer's choice is a rule: it marks every transaction with that description where the mark is allowed. Income and Repayment mark only money coming in, so money the user sends to the same person stays spending. Own account marks both directions.
- A rule applies to existing transactions when it is set and to new imports automatically.
- Clearing a rule removes the marks it applied.

## Individual payments

- Expanding a payer shows the payments received from them, each of which can be marked individually.
- The user's own mark always wins: changing or clearing the payer's rule never overwrites it.
- Clearing the user's own mark falls back to the payer's rule, if any.

## API

- `GET /payers` lists payers.
- `PATCH /payers/{id}` with `{"counts_as": "income" | "repayment" | "own_account" | null}` sets or clears a payer's rule and returns `updated_count`.
- `GET /transactions?payer={id}` lists a payer's incoming payments. Every transaction includes `counts_as` and `counts_as_source` (`payer`, `human`, or null).
- `PATCH /transactions/counts-as` with `transaction_ids` and `counts_as` sets or clears the user's own mark. Income and Repayment are rejected for money going out.

## Deferred

- Marking outgoing transactions on the Transactions page, such as transfers to the user's own accounts. The marking endpoint already supports it.
- Suggesting matched own-account transfer pairs.
- Linking a repayment to the spending it covers so it counts in that month.
