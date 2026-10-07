import argparse
import json
import os
from pathlib import Path
from typing import Any, cast

from langsmith import Client
from langsmith.run_helpers import tracing_context  # pyright: ignore[reportUnknownVariableType]
from pydantic import ValidationError

from finances_api.categories import CATEGORY_DEFINITIONS_VERSION
from finances_api.evals.categorization import (
    PROMPT_VERSION,
    create_categorizer,
)
from finances_api.evals.dataset import STARTER_DATASET_NAME, seed_dataset, validate_examples
from finances_api.evals.local import evaluate_local, load_local_examples
from finances_api.evals.scoring import correctness, summarize


def positive_integer(value: str) -> int:
    number = int(value)
    if number <= 0:
        raise argparse.ArgumentTypeError("Must be greater than zero")
    return number


def model_settings(value: str) -> dict[str, Any]:
    try:
        settings = json.loads(value)
    except json.JSONDecodeError as error:
        raise argparse.ArgumentTypeError("Model settings must be a JSON object") from error
    if not isinstance(settings, dict) or {"timeout", "max_retries"} & settings.keys():
        raise argparse.ArgumentTypeError("Use a JSON object without timeout or max_retries")
    return cast(dict[str, Any], settings)


def main() -> int:
    parser = argparse.ArgumentParser(description="Transaction categorization evals")
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("seed", help="Create the synthetic starter dataset in LangSmith")
    run = commands.add_parser("run", help="Evaluate a model against a labelled LangSmith dataset")
    run.add_argument("--model", required=True, help="LangChain model identifier: provider:model")
    run.add_argument("--dataset", default=STARTER_DATASET_NAME)
    run.add_argument("--version", default="latest", help="Dataset version timestamp or tag")
    run.add_argument("--split", help="Dataset split, such as dev or holdout")
    run.add_argument("--limit", type=positive_integer, help="Maximum number of examples to run")
    run.add_argument("--model-settings", type=model_settings, default={})
    local = commands.add_parser("run-local", help="Evaluate a local JSON dataset without LangSmith")
    local.add_argument("--model", required=True, help="LangChain model identifier: provider:model")
    local.add_argument("--data", required=True, type=Path)
    local.add_argument("--output", required=True, type=Path)
    local.add_argument("--limit", type=positive_integer)
    local.add_argument("--model-settings", type=model_settings, default={})
    args = parser.parse_args()
    if args.command == "run-local":
        return run_local(parser, args)
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
        target = create_categorizer(args.model, **args.model_settings)
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


def run_local(parser: argparse.ArgumentParser, args: argparse.Namespace) -> int:
    try:
        cases = load_local_examples(args.data)
    except (OSError, ValidationError, ValueError):
        parser.error("Local dataset is unreadable, empty, or invalid; review its inputs and labels")
    selected = cases[: args.limit]
    try:
        with tracing_context(enabled=False):
            target = create_categorizer(args.model, **args.model_settings)
            report = evaluate_local(target, selected)
    except ImportError:
        parser.error(
            "Install the selected model's LangChain provider integration; see docs/evals.md"
        )
    except Exception:
        parser.error("Local evaluation setup failed; check provider credentials and model settings")
    report.update(
        {
            "model": args.model,
            "prompt_version": PROMPT_VERSION,
            "category_definitions_version": CATEGORY_DEFINITIONS_VERSION,
        }
    )
    try:
        args.output.write_text(json.dumps(report, indent=2) + "\n")
    except OSError:
        parser.error("Cannot write the local results file")
    print(json.dumps({"example_count": len(selected), "metrics": report["metrics"]}))
    print(f"Local results saved: {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
