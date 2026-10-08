from pathlib import Path
from uuid import uuid5

from langsmith import Client
from langsmith.schemas import Dataset, Example, ExampleCreate
from langsmith.utils import LangSmithNotFoundError
from pydantic import BaseModel, ConfigDict, TypeAdapter

from finances_api.evals.categorization import ReferenceDecision, TransactionContext

STARTER_DATASET_NAME = "finances-no-mi-synthetic-v3"


class LabelledExample(BaseModel):
    model_config = ConfigDict(extra="forbid")

    case_id: str
    inputs: TransactionContext
    outputs: ReferenceDecision


def load_examples(path: Path) -> list[LabelledExample]:
    cases = TypeAdapter(list[LabelledExample]).validate_json(path.read_bytes())
    if not cases or len({case.case_id for case in cases}) != len(cases):
        raise ValueError("Examples must be nonempty and have unique case IDs")
    return cases


def starter_examples() -> list[LabelledExample]:
    return load_examples(Path(__file__).with_name("synthetic-v3.json"))


def seed_dataset(client: Client, dataset_name: str, cases: list[LabelledExample]) -> Dataset:
    try:
        dataset = client.read_dataset(dataset_name=dataset_name)
    except LangSmithNotFoundError:
        dataset = client.create_dataset(  # pyright: ignore[reportUnknownMemberType]
            dataset_name=dataset_name,
            description="Labelled transaction categorization examples.",
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
            metadata={"case_id": case.case_id},
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
