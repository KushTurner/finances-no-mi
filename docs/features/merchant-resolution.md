# Merchant Resolution

## Outcome

Noisy source descriptions resolve to consistent merchants and categories, with deterministic mappings reused and LLM suggestions reviewed by the user before they become authoritative.

## User flow

1. A transaction receives a normalized merchant key during import.
2. If that key already points to a merchant, the transaction is categorized immediately.
3. If the key is unresolved and has no current suggestion, the backend requests one structured LLM suggestion.
4. The pending suggestion appears in the review interface with its proposed merchant, category, and confidence.
5. The user approves the suggestion or corrects the merchant and category.
6. The merchant key is assigned to the chosen merchant and the pending suggestion is removed.

## Business rules

The relationship is:

```text
merchant key -> merchant -> category
```

- A merchant key is a normalized value derived from a raw description.
- Many merchant keys may point to the same canonical merchant.
- Each merchant belongs to one category.
- A merchant key may be unresolved, but a persisted transaction must still retain that key.
- There is at most one current suggestion for an unresolved merchant key.
- Confidence is displayed to aid review; it never bypasses review.
- Approved mappings are reused without another LLM request.
- Changing a merchant's category affects every key mapped to that merchant.

For example:

```text
DELIVEROO LTD -> Deliveroo -> Eating Out
```

### LLM boundary

- Categorization is a normal structured LLM request, not a LangGraph workflow.
- Send only the normalized merchant key and the allowed category choices needed to make the suggestion.
- Do not send the statement file, filename, account details, balances, or other transactions.
- Require structured output containing a proposed merchant name, category, and confidence from zero to one.
- Treat invalid, unavailable, or refused responses as a recoverable failure; the key remains unresolved.
- Keep credentials in the local environment and never persist or log them.
- Stub the client in all normal automated tests.

## Data changes

The initial schema already supports the workflow:

- `merchant_keys.merchant_id` is absent until the key is resolved.
- `merchants` stores canonical display names and category assignments.
- `categories` stores the allowed categories.
- `merchant_suggestions` stores one current proposal per unresolved key.

Approving or correcting a suggestion sets `merchant_keys.merchant_id` and deletes the corresponding `merchant_suggestions` row in one database transaction.

The first implementation does not need suggestion history, prompt history, token usage, or raw LLM responses.

## API and UI behaviour

The backend needs operations to:

- list unresolved merchant keys and their current suggestions;
- request a suggestion for an unresolved key;
- approve a proposed merchant and category;
- correct the merchant or category before approval.

The review UI should show the merchant key, proposed canonical merchant, proposed category, and confidence. It should support approving the proposal or changing those two proposed values. Raw transactions may be added as local review context later, but they must not be sent to the LLM.

## Acceptance criteria

- A known merchant key resolves without calling the LLM client.
- An unresolved key can receive one valid structured suggestion.
- Repeated requests do not create multiple pending suggestions for the same key.
- Approving a suggestion creates or reuses the canonical merchant, assigns the key, and removes the suggestion atomically.
- Correcting a suggestion persists the corrected merchant and category rather than the proposed values.
- A failed or invalid LLM response leaves the merchant key unresolved and does not create a partial suggestion.
- No confidence value automatically approves a mapping.
- Tests use a stub client and synthetic merchant keys.

## Out of scope

- LangGraph orchestration.
- Automatic approval thresholds.
- Suggestion or prompt history.
- Autonomous recategorization of approved merchants.
- Category hierarchies, budgets, or spending targets.
- Monthly summaries and the chatbot.

## Open questions

- Define the initial category list before implementing suggestions.
- Choose the LLM provider and model when implementing the client rather than during earlier slices.
- Decide whether suggestion generation is user-triggered or automatically requested after a successful import when planning that slice.
