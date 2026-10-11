# Backlog

Ideas collected from reviewing a year of real usage. Nothing here is scheduled; the [roadmap](roadmap.md) decides what gets built and in what order. Each item states the problem it solves.

## Accuracy

- **Match own-account transfer pairs.** A transfer between the user's accounts has two halves with different descriptions, so marking one half on Money in leaves the other counted as spending. Card repayments and transfers between current accounts were the largest source of wrong totals. Suggest pairs using one rule: the same amount leaving one account and arriving in another within a few days, and let the user mark both halves together.
- **Show data coverage.** Totals for periods before an account's first import are silently incomplete. Show each account's imported date range next to the totals, or warn when the selected period starts before an account's data does.
- **Link a repayment to the spending it covers.** Repayments reduce spending in the month they arrive, so a month can show low or negative spending after a group trip. Linking lets the repayment count in the month of the original spending.

## Quick wins

- **Money out page.** Group outgoing transactions by payee, mirroring Money in, so a recurring payee such as a card repayment or an investment platform is decided once and applied to future imports.
- **Sort and filter transactions.** Sort by amount and filter by month and account. Reviewing the largest transactions first is the fastest way to find unmarked noise.
- **Savings rate.** Show the share of income invested and kept for the selected period.
- **One-click marking.** Replace the mark dropdown and Apply button on Transactions with one button per choice, and use a one-click choice per payer on Money in. Marking after a search currently takes five steps, and deciding every payer takes two clicks each.
- **Import on drop.** Start importing statements as soon as they are dropped instead of requiring a separate Import button.

## Accounts

- **Account settings.** Rename accounts after setup, either on a settings page or directly on the overview's account cards.
- **Accounts for any bank.** Account setup only offers three fixed presets, and the data model only accepts their three institutions. Replace presets with a name and account type chosen by the user (credit or debit is already known from the OFX file), so any bank's OFX statement can be imported.
- **Older Nationwide history.** Nationwide only exports OFX for roughly the last 15 months; older statements are available only as PDFs. Importing them needs a PDF statement parser that produces the same canonical transactions as the OFX parser.

## Budgeting

- **Fixed versus disposable.** Mark recurring costs such as commuting, insurance and subscriptions as fixed, and show disposable spending this month against a monthly budget.
- **Seasonal view.** Chart disposable spending month by month so spending creep is visible while it is happening.
- **Goals and pots.** Track progress toward goals such as an emergency fund, holidays or a house deposit. Bank OFX files include balances, which could support this; Amex exports do not.

## Group expenses

- **Trip splits.** Tag the transactions for a trip, see its total cost and each person's share, and show who still owes money after repayments.

## Categorization

- **Bring back categories with suggestions.** Understanding where money goes needed manual grouping into eating out, shopping, commuting and so on. The paused [categorization plan](features/transaction-categorization.md) and its eval benchmark remain the starting point.

## Known limitations

- Only GBP statements and transactions are supported. Accounts held in other currencies, such as a travel card topped up in euros, cannot be imported.
- A payer is identified by its normalized description. Descriptions that include amounts or exchange rates create a separate payer for each transaction, so those are marked from the Transactions page instead.
