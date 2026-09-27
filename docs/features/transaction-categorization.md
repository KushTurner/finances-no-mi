# Transaction Categorization

## Outcome

The user can understand spending through a small, fixed category list without first resolving merchants or identifying people. Categories are assigned to individual transactions. LLM suggestions later reduce manual selection, while the user remains able to inspect and correct decisions.

This document describes the agreed plan. The [roadmap](../roadmap.md) separates manual categorization, suggestions, grouped review, evaluation, and eventual automation into implementation slices.

## Initial categories

The initial list contains ten categories. Both the UI and LLM use the same allowed categories and definitions. The LLM cannot create categories. Changes to the list or definitions are deliberate product changes; they do not silently recategorize existing transactions.

| Category | Definition |
| --- | --- |
| Home & bills | Rent, utilities, and recurring household services such as broadband. |
| Groceries | Food and everyday household consumables purchased for home use. |
| Eating out | Restaurants, cafés, takeaways, and pubs outside a known travel context. |
| Transport | Everyday public transport, taxis, fuel, and other motoring costs. |
| Travel | Holidays and trips, including their accommodation, transport, and other known trip expenses. |
| Shopping & leisure | Clothing, electronics, entertainment, hobbies, and leisure subscriptions. |
| Health & personal care | Healthcare, fitness, grooming, and personal care. |
| Other | A known purpose outside the other categories, such as a gift sent or an unrelated bank fee. |
| Income | Salary, interest received, and gifts received; excludes expense repayments, refunds, and transfers between the user's own accounts. |
| Own-account transfers | Moving money between the user's own accounts, including paying their credit-card balance. Exclude these from spending and income totals. |

Uncategorized is the absence of an assigned category, not an additional category. Other is not a substitute for uncertainty. A recurring payment is categorized by its purpose, not merely by being a subscription.

Travel context must be supported by the transaction or the user's decision. A country name alone does not establish Travel. Likewise, a supermarket name does not prove that every purchase was Groceries.

## Business rules

- Preserve raw descriptions, signed amounts, source types, and import identity.
- Determine incoming/outgoing direction from institution-specific amount conventions before categorization. A positive amount does not by itself mean Income.
- A category belongs to one transaction. Two transactions with the same merchant key may have different categories.
- A correction or bulk assignment applies only to the selected transactions. It does not create a sender, merchant, or substring matching rule for future imports.
- Known refunds and expense repayments use the original spending category with their positive sign, offsetting that spending. They do not need a separate reimbursement category.
- Payments between different people are not necessarily own-account transfers. The sender's name does not establish payment purpose or reliable personal identity.
- For spending categories, net spending is the negative of the sum of signed amounts; positive repayments reduce it. Application code calculates totals in integer pence.
- Ambiguous transactions remain uncategorized until the user chooses a category. Do not invent a purpose for vague personal payments.
- Category changes must be correctable without editing imported source fields.

For example, two synthetic incoming payments with references `COASTAL TRIP REPAYMENT` and `HOLIDAY SHARE` could both be Travel after the user confirms that they repay trip expenses. A later payment from either sender with a dinner reference could instead be Eating out. Only the user's confirmation or sufficient transaction context establishes the purpose.

## Manual categorization slice

1. Display transactions with account, date, signed amount, raw description, available transaction type, and current category.
2. Filter by category, including uncategorized transactions.
3. Choose an allowed category for one transaction or an explicitly selected set.
4. Permit changing or clearing an assignment.

The backend lists categories with their definitions, lists transactions, and applies category decisions atomically through a service. Reject unknown category IDs and invalid transaction selections without partial writes. Category creation and a general category-management interface are not required for this slice.

Use Alembic to seed categories, add definitions, and add transaction-level assignments and decision metadata. Existing merchant tables need not be removed, but they do not supply authoritative categories. Existing transactions start uncategorized unless an explicit migration policy is agreed; new imports do not inherit categories from matching descriptions.

## Suggestions and review

1. The user requests suggestions for uncategorized transactions.
2. A small application interface calls the chosen LLM provider with the permitted context.
3. Structured output identifies one allowed category or explicitly abstains. Validate category membership and any returned confidence in the backend.
4. Store each transaction's suggestion separately from its assigned category. Repeated requests reuse an existing pending suggestion; assigned transactions are not silently resuggested.
5. Display suggestions for approval or correction. The later grouped-review slice filters or groups them by proposed category while preserving access to every transaction's description and amount.
6. Apply the user's decision only to selected transaction IDs. Bulk review can include different merchants or people; it does not depend on inferring a shared identity.
7. Retain the original prediction and review outcome for evaluation. Reviewed suggestions leave the pending queue but are not deleted.

Suggestion caching is not a reusable category rule. If introduced later, it must consider all input context and model/prompt/category-definition versions, rather than sharing results solely because a sender or description matches.

A failed, refused, or invalid response leaves the transaction available for manual categorization and retry. An abstention is distinct from a failed request. Neither an abstention nor a confidence score automatically assigns a category in the initial workflow.

## LLM boundary

- Use an ordinary structured request; LangGraph is not needed.
- Permit only a sanitized description, institution, incoming/outgoing direction, available transaction type, and the allowed category definitions in the initial suggestion input.
- Preserve useful purpose text in the description, rather than reducing it to an assumed merchant name. Remove identifiable account/payment references and minimize personal identifiers before an external request. Define and test the sanitization policy with synthetic examples before implementing the provider integration; if useful context cannot be sent within that policy, use manual review.
- Keep the original description local and unchanged. Do not send statement files, filenames, account identifiers, balances, source-reference fields, or unrelated transactions.
- Previously reviewed examples are a later slice. Define their permitted contents and sanitization before sending any historical examples externally.
- Never log financial descriptions, request payloads, raw responses containing transaction data, or credentials. Keep provider credentials in the local environment.
- Stub all external LLM calls in automated tests. Use synthetic data in fixtures, evaluations committed to Git, screenshots, and documentation.

## Evidence for future automation

Record enough to compare the proposed category with the human decision: transaction, prediction or abstention, optional confidence, provider/model, prompt and category-definition versions, suggestion time, final reviewed category, and review time. Keep previous reviewed outcomes stable if the user later changes an assignment or requests another suggestion.

Reviewed examples may later provide context to new suggestions without training a model. Evaluate on later transactions with their answers withheld from the suggestion context. Measure accuracy and review reduction, including errors on ambiguous personal payments.

Before enabling automatic categorization, evaluate candidate thresholds while all decisions are still reviewed. An LLM's self-reported confidence is not calibrated accuracy, and a few matching examples are not enough evidence. Keep future automatic assignments distinguishable and correctable, sample them for review, and re-evaluate after category or model changes. Do not use unreviewed automatic assignments as human-confirmed labels. Custom model training is optional and deferred.

## Acceptance criteria

### Manual categorization

- Every allowed category has a definition; unknown category IDs are rejected.
- An existing imported transaction can be assigned, recategorized, or cleared without changing its source fields or import observations.
- Two transactions sharing a description key can hold different categories.
- Bulk assignment updates only the selected transactions and fails atomically for an invalid selection.
- Uncategorized filtering excludes assigned transactions and includes cleared ones.
- Synthetic examples cover outgoing spending, incoming repayments, income, own-account transfers, and ambiguous personal payments.
- Browser tests start only the frontend, mock API requests, and block other network traffic.

### Suggestions and review

- A valid suggestion uses an allowed category; unknown categories, malformed outputs, and provider failures never assign a category.
- Abstention leaves the transaction uncategorized.
- Repeated requests do not duplicate pending suggestions or overwrite reviewed evidence.
- Approval or correction assigns the chosen category and retains the original prediction and human outcome atomically.
- No confidence value bypasses review in the initial workflow.
- Same-sender payments with different purposes can receive different categories, and bulk approval never creates an implicit future rule.
- Outbound input tests prove that prohibited fields are excluded and meaningful synthetic purpose text is preserved.

## Deferred

- Automatic person identification, merchant resolution, and regex cleanup as categorization prerequisites.
- Reusable merchant or substring matching rules.
- Category hierarchies, split transactions, trip tags, and automatic matching of repayments to original purchases.
- A category-management UI, custom model training, prompt archives, and raw LLM response storage.
- Merchant search and conversational analysis. These can build on descriptions and transaction filters later, with arithmetic performed by application code. Period summaries are planned in [Spending overview](spending-overview.md).

## Decisions for later slices

- Choose the LLM provider/model, structured output contract, and tested sanitization policy when implementing suggestions.
- Define reviewed-example selection and an accuracy target before evaluating automation. Do not pick an automatic-approval threshold before collecting evidence.
