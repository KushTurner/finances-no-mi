from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from finances_api.database import get_session
from finances_api.services import transactions

PositiveId = Annotated[int, Field(strict=True, gt=0)]


class CategoryAssignment(BaseModel):
    model_config = ConfigDict(extra="forbid")

    transaction_ids: Annotated[list[PositiveId], Field(min_length=1)]
    category_id: PositiveId | None


router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("")
def list_transactions(
    session: Annotated[Session, Depends(get_session)],
    category: Annotated[int | Literal["uncategorized"] | None, Query()] = None,
) -> list[transactions.TransactionDetails]:
    return transactions.list_transactions(session, category)


@router.patch("/category")
def assign_category(
    assignment: CategoryAssignment, session: Annotated[Session, Depends(get_session)]
) -> transactions.CategoryDecision:
    result = transactions.assign_category(
        session, assignment.transaction_ids, assignment.category_id
    )
    if isinstance(result, transactions.InvalidDecision):
        raise HTTPException(status_code=400, detail=result.message)
    return result
