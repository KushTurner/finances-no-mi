from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path
from time import perf_counter
from typing import Any
from uuid import NAMESPACE_URL, uuid4, uuid5

from langsmith.run_helpers import tracing_context  # pyright: ignore[reportUnknownVariableType]
from langsmith.schemas import Example, Run
from pydantic import TypeAdapter

from finances_api.evals.categorization import Prediction
from finances_api.evals.dataset import StarterExample
from finances_api.evals.scoring import correct_prediction, summarize


def load_local_examples(path: Path) -> list[StarterExample]:
    examples = TypeAdapter(list[StarterExample]).validate_json(path.read_bytes())
    if not examples or len({example.case_id for example in examples}) != len(examples):
        raise ValueError("Local examples must be nonempty and have unique case IDs")
    return examples


def evaluate_local(
    target: Callable[[dict[str, Any]], dict[str, Any]], cases: list[StarterExample]
) -> dict[str, Any]:
    examples: list[Example] = []
    runs: list[Run] = []
    predictions: list[dict[str, Any]] = []
    with tracing_context(enabled=False):
        for case in cases:
            example_id = uuid5(NAMESPACE_URL, case.case_id)
            started_at = datetime.now(UTC)
            started = perf_counter()
            prediction = Prediction.model_validate(target(case.inputs.model_dump()))
            elapsed = perf_counter() - started
            example = Example(id=example_id, outputs=case.outputs.model_dump())
            run_id = uuid4()
            examples.append(example)
            runs.append(
                Run(
                    id=run_id,
                    trace_id=run_id,
                    name="local-categorization",
                    run_type="chain",
                    start_time=started_at,
                    reference_example_id=example_id,
                    outputs=prediction.model_dump(),
                )
            )
            predictions.append(
                {
                    "case_id": case.case_id,
                    "reference_category": case.outputs.category,
                    "prediction": prediction.model_dump(),
                    "correct": correct_prediction(
                        prediction.model_dump(), case.outputs.model_dump()
                    ),
                    "latency_seconds": elapsed,
                }
            )
    metrics = {metric.key: metric.score for metric in summarize(runs, examples).get("results", [])}
    return {"example_count": len(cases), "metrics": metrics, "predictions": predictions}
