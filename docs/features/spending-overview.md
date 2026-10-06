# Spending Overview

## Outcome

The user can see where their money went over a chosen period, across all accounts or selected ones, without reading individual transactions. Totals stay honest while many transactions are still uncategorized: the page states how much of each total is uncertain rather than hiding it.

The page is deliberately simple. Anything that needs institution-specific rules, or knowledge of what kind of card an account is, waits until it is needed.

## Definitions

All arithmetic happens in application code using integer pence.

- **Spent** is the negative of the sum of signed amounts for transactions in spending categories, plus uncategorized outgoing transactions. Own-account transfers and Income are excluded. Refunds and repayments in a spending category reduce Spent, following [Transaction categorization](transaction-categorization.md#business-rules).
- **Income** is the sum of transactions categorized as Income.
- **Net** is Income minus Spent.
- An uncategorized outgoing transaction counts as spending because most outgoing money is spending, but it may be an unrecognized own-account transfer such as a credit-card repayment.
- An uncategorized incoming transaction is not counted as Income or as a refund. Incoming money is not necessarily income, and treating an unrecognized credit-card repayment as a refund would cancel out real card spending.

## Overview page

### Period and account filters

- Period presets: This month, Last month, Last 90 days, This year, and Last 12 months. This month and This year are calendar periods to date (1 Oct to today, 1 Jan to today). Last month is the previous calendar month. Last 90 days and Last 12 months are rolling windows ending today (today and the 89 or 364 days before it).
- The frontend turns a preset into a date range; the API accepts any date range.
- Only complete periods are compared: Last month against the month before, Last 90 days against the previous 90 days, and Last 12 months against the previous 365 days. This month and This year have no comparison, because a few days of data compared with the same few days of another period says little; the spending pace chart covers the month in progress.
- Account cards act as the account filter. Selecting one or more cards narrows every total and chart to those accounts; clearing the selection shows all accounts.
- One filter row scopes the whole page. Charts do not have their own filters.
- The period and account selection live in the URL search parameters so refresh, back navigation, and links to the filtered transactions page preserve them. Changing a filter updates the URL without reloading the page and replaces the current history entry rather than adding one per click.

### Data freshness

Exports do not state the date range they cover, so an account is only known to be current up to its latest transaction.

- A requested range that ends after the latest transaction across the selected accounts instead ends on that date, provided the latest transaction falls inside the range. The page shows the range it was given back, for example "1 – 26 Sep", rather than "today".
- A range with no transactions yet keeps its requested end, and the page shows that the period has no transactions.
- A comparison is only shown when the imported data covers the whole previous period, meaning the selected accounts' earliest transaction is on or before its first day. A period is never compared with one the data only partly covers.

### Account cards

- Each account appears as a plain graphite card showing its name, what was spent from it in the selected period, and the date of its latest transaction.
- Every card looks the same. Cards do not depend on the institution or on whether the account is a credit card or a current account.
- The row of cards scrolls horizontally when there are more cards than fit, with previous and next controls.

### Totals

- Spent, Income, and Net for the selected period and accounts.
- For periods with a comparison, each total shows its change from the comparison period. Spent and Income show a percentage. Net shows the difference in pounds, because a percentage change of a value that can be negative is misleading.
- Increases in Spent and decreases in Income or Net are marked as unfavourable using an arrow and text, never color alone.

### Uncategorized notice

When the selected period and accounts contain uncategorized transactions, show their count, the outgoing amount counted as spending, and the incoming amount not counted. Link to the transactions page filtered to uncategorized transactions.

### Charts

| Chart | Content |
| --- | --- |
| Spending pace | Running total of Spent by day for the latest month in the period, compared with the month before. States how far ahead or behind the previous month the current month is at the same day. |
| Spending by category | Spent per category for the period as ranked horizontal bars with amounts and shares. Uncategorized outgoing spending is a separate, muted final row. |
| Monthly spending | Spent per calendar month for the 12 months ending with the month the period ends in, with months in the selected period highlighted and the average of complete months marked. |
| Income and spending | Income and Spent side by side per month for the last 12 months, with the amount kept over complete months. |
| Largest payments | The eight largest outgoing transactions in the period, excluding own-account transfers, with date, raw description, account, and amount. Transactions are not grouped, because descriptions include institution-specific references and suffixes that would need per-institution cleanup. |

A month is complete when the selected accounts' data covers all of it: the month has fully gone by (its last day is on or before the latest transaction) and the data started on or before its first day. Exports usually start part-way through a month, so the first month of data is not complete. Averages and the amount kept use complete months only.

Charts follow these rules:

- Every chart has a table view with the same values. Tooltips add detail but are never the only way to read a value.
- One y-axis per chart. No pie or donut charts.
- Chart colors are checked for color-vision deficiency and contrast against the page surface.

### Hide amounts

A toggle replaces every monetary amount on the page with the same fixed mask, including cards, totals, chart axes and labels, tooltips, tables, and the notice. The mask does not reveal an amount's length. Percentages remain visible. The setting is remembered in the browser.

## Visual design

- Dark only, using the Graphite palette: near-black background, dark grey surfaces, white text and accent, with color reserved for data.
- Minimal and Apple-like: system font stack, generous spacing, hairline borders rather than heavy shadows, and tabular figures in aligned columns.
- Keep Tailwind and add shadcn/ui components and its Recharts-based chart component. Use TanStack Table for tabular views where it simplifies sorting.
- The Import and Transactions pages adopt the same styling and components without changing their behaviour.
- The overview becomes the home page at `/`, and Import moves to `/import`. One navigation bar links Overview, Transactions, and Import.

## API

The API is three read-only endpoints. Each accepts optional repeated `account_id` parameters; without them it covers every account. A range that ends before it starts, or an unknown account, is rejected with a 400 response. Amounts are integer pence in fields ending `_pence`; every amount is GBP. Spent and the uncategorized amounts are magnitudes, while transaction amounts keep their sign.

- `GET /summary?from=YYYY-MM-DD&to=YYYY-MM-DD` returns the resolved `start` and `end` (see [Data freshness](#data-freshness)), the transaction count, Spent, Income, and Net, the uncategorized outgoing and incoming counts and amounts, Spent per spending category ranked highest first, every account with its Spent and earliest and latest transaction dates (unaffected by the account filter, so every card can still be shown), and the eight largest payments.
- `GET /summary/months?from=YYYY-MM&to=YYYY-MM` returns Spent, Income, and whether the month is complete for every month in the range, with the average Spent and the amount kept (Income minus Spent) over complete months.
- `GET /summary/days?from=YYYY-MM-DD&to=YYYY-MM-DD` returns Spent and the running total of Spent for every day in the range.

The routes stay thin; a service owns the aggregation rules defined above. The frontend formats pence and derives percentages, shares, and differences from returned values. It does not add up transaction lists itself. A comparison is a second `/summary` request for the comparison range.

## Acceptance criteria

- Spent excludes Own-account transfers and Income, includes uncategorized outgoing transactions, and ignores uncategorized incoming transactions.
- A categorized refund reduces Spent in its category.
- Totals for the comparison period use the same accounts and definitions as the selected period, and only complete periods are compared.
- Selecting account cards changes every total, chart, and the notice consistently; clearing the selection restores all accounts.
- A range that ends after the latest transaction across the selected accounts ends on that transaction's date.
- Monthly averages and the amount kept use complete months only.
- Hiding amounts masks every monetary value on the page and keeps percentages.
- The restyled Import and Transactions pages keep their existing behaviour and pass their existing tests, updated only for the new routes and markup.
- Service tests use synthetic transactions covering spending, refunds, income, own-account transfers, uncategorized outgoing and incoming transactions, and multiple accounts.
- Browser tests start only the frontend, mock API requests, block other network traffic, and use synthetic data in screenshots.

## Deferred

- Account settings: setting whether an account is a credit card or a current account, choosing a card design, and recording a credit limit.
- Account balances and credit-limit usage. Amex exports have no balance, and finding the latest balance within a day depends on each institution's row order.
- Suggesting matched own-account transfer pairs, such as a card repayment and the bank payment that funded it.
- Grouping spending by merchant, which needs institution-specific description cleanup.
- Choosing a custom date range in the page. The API already accepts any range.
- Comparisons for periods still in progress.
- A light theme.
- Calendar heatmaps, category trends over time, and recurring-payment detection.
