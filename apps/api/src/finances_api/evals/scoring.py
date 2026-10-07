from collections.abc import Sequence
from typing import Any, cast

from langsmith.evaluation.evaluator import EvaluationResult, EvaluationResults
from langsmith.schemas import Example, Run

from finances_api.evals.categorization import Prediction, ReferenceDecision


def correct_prediction(outputs: dict[str, Any], reference_outputs: dict[str, Any]) -> bool:
    prediction = Prediction.model_validate(outputs)
    reference = ReferenceDecision.model_validate(reference_outputs)
    return prediction.status == "suggested" and prediction.category == reference.category


def correctness(outputs: dict[str, Any], reference_outputs: dict[str, Any]) -> EvaluationResult:
    return EvaluationResult(key="correctness", score=correct_prediction(outputs, reference_outputs))


def summarize(runs: Sequence[Run], examples: Sequence[Example]) -> EvaluationResults:
    if not runs:
        return {"results": []}
    examples_by_id = {example.id: example for example in examples}
    suggested = correct_suggestions = abstained = failed = correct = 0
    input_tokens = output_tokens = usage_count = 0
    for run in runs:
        outputs = cast(dict[str, Any] | None, run.outputs)  # pyright: ignore[reportUnknownMemberType]
        if run.error or not outputs:
            failed += 1
            continue
        prediction = Prediction.model_validate(outputs)
        if run.reference_example_id is None:
            raise ValueError("Evaluation run has no reference example")
        reference = examples_by_id[run.reference_example_id].outputs
        is_correct = correct_prediction(outputs, reference or {})
        correct += is_correct
        suggested += prediction.status == "suggested"
        correct_suggestions += prediction.status == "suggested" and is_correct
        abstained += prediction.status == "abstained"
        failed += prediction.status == "failed"
        if prediction.input_tokens is not None and prediction.output_tokens is not None:
            usage_count += 1
            input_tokens += prediction.input_tokens
            output_tokens += prediction.output_tokens

    metrics: dict[str, float] = {
        "correctness": correct / len(runs),
        "suggestion_coverage": suggested / len(runs),
        "abstention_rate": abstained / len(runs),
        "failure_rate": failed / len(runs),
        "usage_coverage": usage_count / len(runs),
    }
    if suggested:
        metrics["suggestion_accuracy"] = correct_suggestions / suggested
    if usage_count:
        metrics["reported_input_tokens"] = input_tokens
        metrics["reported_output_tokens"] = output_tokens
    return {"results": [EvaluationResult(key=key, score=value) for key, value in metrics.items()]}
