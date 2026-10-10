from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from finances_api.database import get_session
from finances_api.models import CountsAs
from finances_api.services import transactions

PositiveId = Annotated[int, Field(strict=True, gt=0)]


class MarkRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    transaction_ids: Annotated[list[PositiveId], Field(min_length=1)]
    counts_as: CountsAs | None


router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("")
def list_transactions(
    session: Annotated[Session, Depends(get_session)],
    payer: Annotated[int | None, Query(gt=0)] = None,
) -> list[transactions.TransactionDetails]:
    return transactions.list_transactions(session, payer)


@router.patch("/counts-as")
def mark_transactions(
    request: MarkRequest, session: Annotated[Session, Depends(get_session)]
) -> transactions.MarkApplied:
    result = transactions.mark_transactions(session, request.transaction_ids, request.counts_as)
    if isinstance(result, transactions.InvalidMark):
        raise HTTPException(status_code=400, detail=result.message)
    return result
