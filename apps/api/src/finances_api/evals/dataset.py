from pathlib import Path
from uuid import uuid5

from langsmith import Client
from langsmith.schemas import Dataset, Example, ExampleCreate
from langsmith.utils import LangSmithNotFoundError
from pydantic import BaseModel, ConfigDict, TypeAdapter

from finances_api.evals.categorization import ReferenceDecision, TransactionContext

STARTER_DATASET_NAME = "finances-no-mi-synthetic-v2"


class StarterExample(BaseModel):
    model_config = ConfigDict(extra="forbid")

    case_id: str
    inputs: TransactionContext
    outputs: ReferenceDecision


def starter_examples() -> list[StarterExample]:
    content = Path(__file__).with_name("synthetic-v2.json").read_bytes()
    return TypeAdapter(list[StarterExample]).validate_json(content)


def seed_dataset(client: Client) -> Dataset:
    cases = starter_examples()
    try:
        dataset = client.read_dataset(dataset_name=STARTER_DATASET_NAME)
    except LangSmithNotFoundError:
        dataset = client.create_dataset(  # pyright: ignore[reportUnknownMemberType]
            dataset_name=STARTER_DATASET_NAME,
            description="Synthetic categorization starter examples. No real financial data.",
            inputs_schema=TransactionContext.model_json_schema(),
            outputs_schema=ReferenceDecision.model_json_schema(),
        )
    existing = client.list_examples(dataset_id=dataset.id)  # pyright: ignore[reportUnknownMemberType]
    existing_ids = {example.id for example in existing}
    missing = [
        ExampleCreate(
            id=uuid5(dataset.id, case.case_id),
            inputs=case.inputs.model_dump(),
            outputs=case.outputs.model_dump(),
            metadata={"case_id": case.case_id, "synthetic": True},
        )
        for case in cases
        if uuid5(dataset.id, case.case_id) not in existing_ids
    ]
    if missing:
        client.create_examples(  # pyright: ignore[reportUnknownMemberType]
            dataset_id=dataset.id, examples=missing
        )
    return dataset


def validate_examples(examples: list[Example]) -> None:
    if not examples:
        raise ValueError("The selected dataset has no examples")
    for example in examples:
        TransactionContext.model_validate(example.inputs)
        ReferenceDecision.model_validate(example.outputs)
