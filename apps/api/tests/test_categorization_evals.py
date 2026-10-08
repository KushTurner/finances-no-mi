import json
import socket
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from unittest.mock import MagicMock, create_autospec
from uuid import UUID, uuid4, uuid5

import pytest
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import AIMessage
from langsmith import Client
from langsmith.schemas import Dataset, Example, Run
from pydantic import ValidationError
from sqlalchemy.orm import Session

from finances_api.evals import __main__ as cli
from finances_api.evals.categorization import (
    CATEGORY_DEFINITIONS,
    Categorizer,
    Prediction,
    ReferenceDecision,
)
from finances_api.evals.dataset import (
    STARTER_DATASET_NAME,
    load_examples,
    seed_dataset,
    starter_examples,
    validate_examples,
)
from finances_api.evals.scoring import correctness, summarize
from finances_api.services.categories import list_categories

CONTEXT: dict[str, Any] = {
    "description": "SYNTHETIC CAFE RESTAURANT MEAL",
    "institution": "amex",
    "direction": "outgoing",
    "transaction_type": None,
}


@pytest.fixture(autouse=True)
def block_external_calls(monkeypatch: pytest.MonkeyPatch) -> None:
    def deny_connection(*args: object, **kwargs: object) -> None:
        raise AssertionError("Evaluation tests must not connect to external services")

    monkeypatch.setenv("LANGSMITH_TRACING", "false")
    monkeypatch.delenv("LANGSMITH_API_KEY", raising=False)
    monkeypatch.setattr(socket.socket, "connect", deny_connection)


@pytest.fixture
def model() -> MagicMock:
    return create_autospec(BaseChatModel, instance=True)


@pytest.mark.parametrize(("category", "status"), [("Food", "suggested"), (None, "abstained")])
def test_returns_validated_suggestion_and_usage(
    model: MagicMock, category: str | None, status: str
) -> None:
    model.with_structured_output.return_value.invoke.return_value = {
        "parsed": {"category": category},
        "raw": AIMessage(
            content="",
            usage_metadata={"input_tokens": 100, "output_tokens": 10, "total_tokens": 110},
        ),
        "parsing_error": None,
    }

    result = Categorizer(model)(CONTEXT)

    assert result == {
        "category": category,
        "status": status,
        "error": None,
        "input_tokens": 100,
        "output_tokens": 10,
    }


@pytest.mark.parametrize(
    "response",
    [
        {"parsed": {"category": "Invented category"}},
        {"parsed": {"category": "Food", "confidence": 1}},
        {"parsed": {}},
        {"parsed": None},
        {"parsed": {"category": "Food"}, "parsing_error": ValueError("synthetic error")},
        "invalid response",
    ],
)
def test_invalid_response_is_a_failure_rather_than_abstention(
    model: MagicMock, response: object
) -> None:
    model.with_structured_output.return_value.invoke.return_value = response

    result = Categorizer(model)(CONTEXT)

    assert result["category"] is None
    assert (result["status"], result["error"]) == ("failed", "invalid_response")


def test_provider_failure_does_not_expose_its_message(
    model: MagicMock, capsys: pytest.CaptureFixture[str]
) -> None:
    model.with_structured_output.return_value.invoke.side_effect = RuntimeError(
        "SYNTHETIC PRIVATE RESPONSE"
    )

    result = Categorizer(model)(CONTEXT)

    assert (result["status"], result["error"]) == ("failed", "provider_error")
    assert "SYNTHETIC PRIVATE RESPONSE" not in json.dumps(result) + capsys.readouterr().err


@pytest.mark.parametrize(
    "field",
    [
        "category",
        "user_context",
        "reference_outputs",
    ],
)
def test_unexpected_input_fields_are_rejected_before_a_model_call(
    model: MagicMock, field: str
) -> None:
    target = Categorizer(model)
    inputs = {**CONTEXT, field: "synthetic prohibited value"}

    with pytest.raises(ValidationError):
        target(inputs)

    model.with_structured_output.return_value.invoke.assert_not_called()


def test_model_receives_only_context_and_category_definitions(model: MagicMock) -> None:
    model.with_structured_output.return_value.invoke.return_value = {"parsed": {"category": None}}

    Categorizer(model)(CONTEXT)

    messages = model.with_structured_output.return_value.invoke.call_args.args[0]
    assert json.loads(messages[1].content) == CONTEXT
    assert "Food" in messages[0].content


@pytest.mark.parametrize(
    ("prediction", "expected"),
    [
        (Prediction(category=None, status="abstained"), False),
        (Prediction(category="Subscriptions", status="suggested"), True),
        (Prediction(category="Other", status="suggested"), False),
        (Prediction(category=None, status="failed", error="provider_error"), False),
    ],
)
def test_scores_the_actual_category_even_when_the_description_is_ambiguous(
    prediction: Prediction, expected: bool
) -> None:
    reference = ReferenceDecision(category="Subscriptions")

    result = correctness(prediction.model_dump(), reference.model_dump())

    assert result.score == expected
    assert result.key == "correctness"


def test_always_abstaining_has_zero_coverage_and_misses_answerable_cases() -> None:
    examples = [
        Example(id=uuid4(), inputs=case.inputs.model_dump(), outputs=case.outputs.model_dump())
        for case in starter_examples()
    ]
    runs = [
        make_run(example.id, Prediction(category=None, status="abstained")) for example in examples
    ]

    result = summarize(runs, examples)

    scores = {metric.key: metric.score for metric in result.get("results", [])}
    assert scores["suggestion_coverage"] == 0
    assert scores["correctness"] == 0
    assert "suggestion_accuracy" not in scores


def test_summary_distinguishes_failure_and_counts_wrong_suggestions() -> None:
    examples = [Example(id=uuid4(), outputs={"category": "Food"}) for _ in range(4)]
    predictions = [
        Prediction(category="Food", status="suggested", input_tokens=100, output_tokens=10),
        Prediction(category="Other", status="suggested"),
        Prediction(category=None, status="abstained"),
        Prediction(category=None, status="failed", error="invalid_response"),
    ]
    runs = [
        make_run(example.id, prediction)
        for example, prediction in zip(examples, predictions, strict=True)
    ]

    result = summarize(runs, examples)

    assert {metric.key: metric.score for metric in result.get("results", [])} == {
        "correctness": 0.25,
        "suggestion_coverage": 0.5,
        "suggestion_accuracy": 0.5,
        "abstention_rate": 0.25,
        "failure_rate": 0.25,
        "usage_coverage": 0.25,
        "reported_input_tokens": 100,
        "reported_output_tokens": 10,
    }


def make_run(example_id: UUID, prediction: Prediction) -> Run:
    run_id = uuid4()
    return Run(
        id=run_id,
        trace_id=run_id,
        name="synthetic-categorization",
        start_time=datetime.now(UTC),
        run_type="chain",
        reference_example_id=example_id,
        outputs=prediction.model_dump(),
    )


def test_starter_definitions_match_the_app_and_cover_every_category(session: Session) -> None:
    app_definitions = {category.name: category.definition for category in list_categories(session)}
    cases = starter_examples()

    assert CATEGORY_DEFINITIONS == app_definitions
    assert {case.outputs.category for case in cases} == set(CATEGORY_DEFINITIONS)


def test_seed_preserves_existing_labels_and_fills_only_missing_examples() -> None:
    client = create_autospec(Client, instance=True)
    dataset = Dataset(id=uuid4(), name=STARTER_DATASET_NAME, created_at=datetime.now(UTC))
    client.read_dataset.return_value = dataset
    cases = starter_examples()
    existing = Example(
        id=uuid5(dataset.id, cases[0].case_id),
        outputs={"category": "Other"},
    )
    client.list_examples.return_value = iter([existing])

    seed_dataset(client, STARTER_DATASET_NAME, cases)

    uploaded = client.create_examples.call_args.kwargs["examples"]
    assert existing.id not in {example.id for example in uploaded}
    assert len(uploaded) == len(cases) - 1


@pytest.mark.parametrize("examples", [[], [Example(id=uuid4(), inputs=CONTEXT, outputs={})]])
def test_empty_or_unlabelled_datasets_are_rejected(examples: list[Example]) -> None:
    with pytest.raises(ValueError):
        validate_examples(examples)


def test_missing_key_gives_setup_instructions_without_connecting(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    monkeypatch.setattr("sys.argv", ["categorization-evals", "seed"])

    with pytest.raises(SystemExit) as error:
        cli.main()

    assert error.value.code == 2
    assert "Set LANGSMITH_API_KEY" in capsys.readouterr().err


@pytest.mark.parametrize(
    "outputs",
    [
        {"category": None},
        {"category": "Food", "context_sufficient": False},
        {"category": "Food", "user_context": "Synthetic explanation"},
    ],
)
def test_reference_requires_only_a_known_category(outputs: dict[str, Any]) -> None:
    with pytest.raises(ValidationError):
        ReferenceDecision.model_validate(outputs)


@pytest.mark.parametrize("duplicate", [False, True])
def test_import_rejects_empty_files_and_duplicate_case_ids(tmp_path: Path, duplicate: bool) -> None:
    data = tmp_path / "synthetic.json"
    case = starter_examples()[0].model_dump()
    data.write_text(json.dumps([case, case] if duplicate else []))

    with pytest.raises(ValueError):
        load_examples(data)
