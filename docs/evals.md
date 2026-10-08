# Categorization evals

Use LangChain to call a model and LangSmith to review labelled examples and compare
experiments. The starter dataset has 32 synthetic examples covering all nine
categories, refunds, expense repayments, own-account transfers, and ambiguous payments.
It tests the workflow and important edge cases; its scores do not establish
accuracy on your real transaction history.

The runner, prompt, category definitions, scoring, and synthetic examples are in
Git. They work on any machine with the project dependencies. Credentials and
private datasets stay outside Git. The runner does not access the application's
database or assign transaction categories.

## Set up LangSmith

From `apps/api`:

```bash
uv sync --locked --group dev
cp -n .env.example .env
```

In [LangSmith](https://smith.langchain.com), open **Settings → API Keys** and create
an API key following the [key setup guide](https://docs.langchain.com/langsmith/create-account-api-key).
Add it to `LANGSMITH_API_KEY` in the local `.env` file. Keep
`LANGSMITH_TRACING=true` to record model calls in your experiments. Leave
`LANGSMITH_WORKSPACE_ID` empty unless your key has access to multiple workspaces;
in that case, set it to the intended workspace's ID. If your account uses a region
other than the default US region, set `LANGSMITH_ENDPOINT` to that region's API
endpoint from the key setup guide.

Create the starter dataset:

```bash
uv run --env-file .env python -m finances_api.evals seed
```

This uploads only the committed synthetic examples and their reference labels,
without calling a model. It prints a link to the dataset. Rerunning it adds missing
starter examples without duplicating existing ones or overwriting edited labels.

## Run the first experiment

Choose a model that supports structured output, then add its provider key to the
local `.env` file. A LangSmith account does not supply model-provider credentials
or pay for those model calls.

| Provider | LangChain integration package | Local key | Model identifier |
| --- | --- | --- | --- |
| OpenAI | `langchain-openai` | `OPENAI_API_KEY` | `openai:MODEL_NAME` |
| Google Gemini | `langchain-google-genai` | `GOOGLE_API_KEY` | `google_genai:MODEL_NAME` |
| Anthropic | `langchain-anthropic` | `ANTHROPIC_API_KEY` | `anthropic:MODEL_NAME` |

For example, replace `MODEL_NAME` with your chosen OpenAI model and run:

```bash
uv run --env-file .env --with langchain-openai python -m finances_api.evals run \
  --model 'openai:MODEL_NAME' --limit 5
```

For another provider, change both the integration package and model identifier
using the table. `--with` installs that integration for the command without
adding every provider SDK to the application. The evaluation makes one request
per selected example, runs one at a time, and disables automatic retries. Start
with five examples to check credentials and structured output, then omit
`--limit` to evaluate the entire starter dataset.

If an Anthropic key covers multiple workspaces, set `ANTHROPIC_WORKSPACE_ID` in
the local `.env` file. Find it under **Settings → Workspaces** in the Claude
Console. A workspace-scoped key does not need this setting. See
[Anthropic authentication](https://platform.claude.com/docs/en/manage-claude/authentication).

The command prints an experiment link. In **Datasets & Experiments**, inspect
predictions alongside reference outputs and select experiments to compare
models. Each experiment records its model, prompt version, category-definition
version, and dataset snapshot. Select a fixed dataset version or tag for
comparisons:

```bash
uv run --env-file .env --with langchain-openai python -m finances_api.evals run \
  --model 'openai:MODEL_NAME' \
  --dataset finances-no-mi-synthetic-v3 --version baseline-v1
```

Create the `baseline-v1` tag in the dataset's **Examples** tab before using it.
`--version` also accepts a dataset version timestamp. Use `--split dev` or
`--split holdout` after creating those splits in the UI. Keep held-out labels and
examples out of prompts and any historical-example retrieval. The current runner
uses one transaction only; reviewed-history retrieval still needs implementation.
A future comparison must use the same fixed reviewed history and test transactions
for both variants, with only the history input changing.

## Use your labelled transactions

Keep real datasets under the Git-ignored `.data/evals/` directory. Import a JSON
array containing transaction inputs and your chosen reference categories:

```json
[
  {
    "case_id": "example-001",
    "inputs": {
      "description": "SYNTHETIC CAFE RESTAURANT MEAL",
      "institution": "amex",
      "direction": "outgoing",
      "transaction_type": null
    },
    "outputs": {"category": "Food"}
  }
]
```

Use the transaction's original description. Your category is the reference
answer, not model input. Optional review notes stay out of model input too.
Each example needs a unique `case_id`. Import the file into a separate dataset:

```bash
uv run --env-file .env python -m finances_api.evals seed \
  --data ../../.data/evals/benchmark.json --dataset finances-no-mi-reviewed-v1
```

Rerunning the import adds missing examples and preserves existing labels. Edit
existing examples in LangSmith when correcting their inputs or reference labels.
Then run a model against that dataset:

```bash
uv run --env-file .env --with langchain-openai python -m finances_api.evals run \
  --model 'openai:MODEL_NAME' --dataset finances-no-mi-reviewed-v1 \
  --model-settings '{"max_tokens":256}'
```

`--model-settings` supplies provider-specific configuration, such as output
limits or thinking settings. Choose settings supported by the selected model.
The runner always uses a 30-second timeout and disables automatic retries.

## Review and label examples

Open the dataset's **Examples** tab. Edit an example or add a synthetic example
with exactly these input fields:

```json
{
  "description": "PERSON COASTAL HOLIDAY SHARE REPAYMENT",
  "institution": "natwest",
  "direction": "incoming",
  "transaction_type": "FPI"
}
```

Supply the reference output separately:

```json
{
  "category": "Other"
}
```

`category` is the user-selected answer, and it is the only reference field. A
known answer stays the reference even when the transaction description is vague.
For example, a synthetic payment with only `PERSON TRANSFER` in its description
can have the reference `Subscriptions` when the reviewer knows it paid for a
membership. The categorizer receives only the input fields above, not the
reviewer's explanation or the reference label. No manual context is required at
transaction upload or labelling time beyond choosing the category.

Unfinished or genuinely unlabelled examples stay out of the benchmark; `null`
is a model abstention, not a reference category. Abstaining on a labelled example
is not a correct category prediction, but coverage and abstention metrics report
how much work remains for human review.

Predictions contain `category` and a `status`: `suggested`, `abstained`, or
`failed`. Failures have a safe error code rather than a raw provider response.
Input validation excludes additional fields, and all selected inputs and labels
are validated before model calls begin. Reference outputs are supplied to the
scorer, never to the categorizer.

To review experiment runs in a focused UI, select an experiment and choose
**Annotate → Add to Annotation Queue**. Feedback alone does not change benchmark
reference labels. Save a corrected reference example with **Add to Dataset**,
using the reference-output shape above, or edit the dataset example directly.
Keep experimental prompt-development
examples separate from the held-out set.

## Read the scores

- **Correctness:** fraction matching the user-selected category. Abstentions and
  failures do not count as correct category predictions.
- **Suggestion accuracy:** correctness among non-abstaining suggestions. Omitted
  when there are no suggestions.
- **Suggestion coverage:** fraction of all examples receiving a category.
- **Abstention rate** and **failure rate:** reported separately so errors cannot
  look like successful abstentions.
- **Reported input/output tokens:** totals for responses that supply usage.
  **Usage coverage** shows how much of the experiment those totals represent.

LangSmith records run latency and model traces. Check model token usage and the
provider's pricing when comparing cost; a missing usage or cost value does not
mean the request was free. Scoring uses code, so there is no additional model
charge for an LLM judge.

## Data boundary and verification

Model providers receive transaction inputs. LangSmith stores dataset examples,
reference labels, prompts, and model traces so you can inspect and compare runs.
Keep real transactions, statements, private result files, and credentials out of
Git. Committed examples, tests, screenshots, and documentation use synthetic data.

Automated tests stub model responses and block outbound connections in the eval
tests. They check our scoring, input/reference separation, dataset imports, and
category definitions. Live experiments are explicit manual runs outside CI.

Official documentation:

- [LangChain models](https://docs.langchain.com/oss/python/langchain/models)
- [LangSmith evaluation quickstart](https://docs.langchain.com/langsmith/evaluation-quickstart)
- [Dataset editing](https://docs.langchain.com/langsmith/manage-datasets-in-application)
- [Annotation queues](https://docs.langchain.com/langsmith/annotation-queues)
