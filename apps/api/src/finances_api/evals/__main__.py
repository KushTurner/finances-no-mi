import argparse
import os

from langsmith import Client
from pydantic import ValidationError

from finances_api.categories import CATEGORY_DEFINITIONS_VERSION
from finances_api.evals.categorization import (
    PROMPT_VERSION,
    create_categorizer,
)
from finances_api.evals.dataset import STARTER_DATASET_NAME, seed_dataset, validate_examples
from finances_api.evals.scoring import correctness, summarize


def positive_integer(value: str) -> int:
    number = int(value)
    if number <= 0:
        raise argparse.ArgumentTypeError("Must be greater than zero")
    return number


def main() -> int:
    parser = argparse.ArgumentParser(description="Synthetic transaction categorization evals")
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("seed", help="Create the synthetic starter dataset in LangSmith")
    run = commands.add_parser("run", help="Evaluate a model against a labelled LangSmith dataset")
    run.add_argument("--model", required=True, help="LangChain model identifier: provider:model")
    run.add_argument("--dataset", default=STARTER_DATASET_NAME)
    run.add_argument("--version", default="latest", help="Dataset version timestamp or tag")
    run.add_argument("--split", help="Dataset split, such as dev or holdout")
    run.add_argument("--limit", type=positive_integer, help="Maximum number of examples to run")
    args = parser.parse_args()
    if not os.environ.get("LANGSMITH_API_KEY"):
        parser.error("Set LANGSMITH_API_KEY in your local environment or .env file")

    try:
        client = Client()
        if args.command == "seed":
            dataset = seed_dataset(client)
            print(f"Synthetic starter dataset ready: {dataset.url}")
            return 0
        examples = list(
            client.list_examples(  # pyright: ignore[reportUnknownMemberType]
                dataset_name=args.dataset,
                as_of=args.version,
                splits=[args.split] if args.split else None,
                limit=args.limit,
            )
        )
        try:
            validate_examples(examples)
        except (ValidationError, ValueError):
            parser.error(
                "Dataset is empty or has invalid inputs or reference labels; review it first"
            )
        target = create_categorizer(args.model)
        results = client.evaluate(  # pyright: ignore[reportUnknownMemberType]
            target,
            data=examples,
            evaluators=[correctness],
            summary_evaluators=[summarize],
            experiment_prefix="transaction-categorization",
            metadata={
                "model": args.model,
                "prompt_version": PROMPT_VERSION,
                "category_definitions_version": CATEGORY_DEFINITIONS_VERSION,
                "requested_dataset_version": args.version,
            },
            max_concurrency=1,
        )
        print(f"Evaluation complete: {results.url}")
    except ImportError:
        parser.error(
            "Install the selected model's LangChain provider integration; see docs/evals.md"
        )
    except Exception:
        parser.error("Evaluation setup failed; check local credentials and LangSmith connectivity")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
