# Transaction Categorization

## Outcome

The user can understand spending through a small, fixed category list without first resolving merchants or identifying people. Categories are assigned to individual transactions. LLM suggestions later reduce manual selection, while the user remains able to inspect and correct decisions.

This document describes the agreed plan. The [roadmap](../roadmap.md) separates manual categorization, suggestions, grouped review, evaluation, and eventual automation into implementation slices.

## Categories

The fixed list contains nine categories. The API and eval runner share their definitions; the UI uses the API list. Each transaction has one category, and the model cannot create categories.

| Category | Definition |
| --- | --- |
| Bills | Rent, utilities, household bills, family loan repayments, and car finance repayments. |
| Food | Groceries, work lunches, restaurants, takeaways, coffee, and drinks including alcohol. |
| Subscriptions | Streaming, software, and recurring memberships including gyms. |
| Transport | Public transport, taxis, transport tickets, fuel, parking, and car maintenance. |
| Shopping | Clothes, electronics, household items, and general retail purchases. |
| Savings & investments | Contributions to savings or investments and withdrawals from them. Exclude these movements from spending and income totals. |
| Other | Spending outside the other categories, including gifts sent, personal support, recreation, accommodation, healthcare services, and unrelated bank fees. |
| Income | Salary, interest received, and gifts received; excludes expense repayments, refunds, savings withdrawals, and transfers between the user's own accounts. |
| Transfers | Other movements between the user's own accounts, including credit-card repayments. Use Savings & investments for saving or investing. Exclude these movements from spending and income totals. |

Uncategorized is the absence of an assignment. Other is for spending outside the named categories, while an unclear purpose can stay unassigned. A direct debit is a payment method: utilities and loan repayments use Bills; streaming, software and memberships use Subscriptions.

Transport tickets keep Transport during a holiday. Accommodation and recreational activities use Other. Food includes drinks and alcohol. A supermarket or marketplace name alone may not establish the purchase purpose.

## Business rules

- Preserve raw descriptions, signed amounts, source types, and import identity.
- Determine incoming/outgoing direction from institution-specific amount conventions before categorization. A positive amount does not by itself mean Income.
- A category belongs to one transaction. Two transactions with the same merchant key may have different categories.
- A correction or bulk assignment applies only to the selected transactions. It does not create a sender, merchant, or substring matching rule for future imports.
- Known refunds and expense repayments use the original spending category with their positive sign, offsetting that spending. They do not need a separate reimbursement category.
- Payments between different people are not necessarily own-account transfers. The sender's name does not establish payment purpose or reliable personal identity.
- Savings & investments and Transfers are excluded from spending and income. Savings contributions and withdrawals are shown as separate net activity.
- For spending categories, net spending is the negative of the sum of signed amounts; positive repayments reduce it. Application code calculates totals in integer pence.
- Ambiguous transactions remain uncategorized until the user chooses a category. Do not invent a purpose for vague personal payments.
- Category changes must be correctable without editing imported source fields.

For example, two synthetic incoming payments with references `COASTAL TRIP REPAYMENT` and `HOLIDAY SHARE` could both be Other after the user confirms that they repay trip expenses. A later payment from either sender with a dinner reference could instead be Food. Only the user's confirmation or sufficient transaction context establishes the purpose.

## Manual categorization slice

1. Display transactions with account, date, signed amount, raw description, available transaction type, and current category.
2. Filter by category, including uncategorized transactions.
3. Choose an allowed category for one transaction or an explicitly selected set.
4. Permit changing or clearing an assignment.

The backend lists categories with their definitions, lists transactions, and applies category decisions atomically through a service. Reject unknown category IDs and invalid transaction selections without partial writes. Category creation and a general category-management interface are not required for this slice.

Use Alembic to seed categories, add definitions, and add transaction-level assignments and decision metadata. Existing merchant tables need not be removed, but they do not supply authoritative categories. New imports start uncategorized and do not inherit categories from matching descriptions.

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
- Send the original transaction description, institution, incoming/outgoing direction, available transaction type, and allowed category definitions.
- Keep reference labels and reviewer explanations out of model input. Previously reviewed examples are a later slice.
- Model providers receive transaction inputs; LangSmith stores evaluation examples and model traces for review. Keep real transaction files and credentials out of Git.
- Keep provider credentials in the local environment and financial contents out of application console logs.
- Stub all external LLM calls in automated tests. Use synthetic data in fixtures, evaluations committed to Git, screenshots, and documentation.

## Evidence for future automation

Record enough to compare the proposed category with the human decision: transaction, prediction or abstention, optional confidence, provider/model, prompt and category-definition versions, suggestion time, final reviewed category, and review time. Keep previous reviewed outcomes stable if the user later changes an assignment or requests another suggestion.

Reviewed examples may later provide context to new suggestions without training a model. Evaluate on later transactions with their answers withheld from the suggestion context. The reference answer is only the user-selected category. Explanations are optional review notes and never extra test input. Keep a known reference category even when the description is vague; measure category accuracy, suggestion coverage, abstention and failures separately. History selection is still a later slice. Measure accuracy and review reduction, including errors on ambiguous personal payments.

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
- Input tests prove that reference labels and reviewer explanations are excluded and transaction descriptions are preserved.

## Deferred

- Automatic person identification, merchant resolution, and regex cleanup as categorization prerequisites.
- Reusable merchant or substring matching rules.
- Category hierarchies, split transactions, trip tags, and automatic matching of repayments to original purchases.
- A category-management UI, custom model training, prompt archives, and raw LLM response storage.
- Merchant search and conversational analysis. These can build on descriptions and transaction filters later, with arithmetic performed by application code. Period summaries are planned in [Spending overview](spending-overview.md).

## Decisions for later slices

- Choose the LLM provider/model and structured output contract when implementing suggestions.
- Define reviewed-example selection and an accuracy target before evaluating automation. Do not pick an automatic-approval threshold before collecting evidence.
