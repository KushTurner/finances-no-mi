from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from finances_api.database import get_session
from finances_api.models import CountsAs
from finances_api.services import payers


class PayerRuleRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    counts_as: CountsAs | None


router = APIRouter(prefix="/payers", tags=["payers"])


@router.get("")
def list_payers(session: Annotated[Session, Depends(get_session)]) -> list[payers.PayerSummary]:
    return payers.list_payers(session)


@router.patch("/{payer_id}")
def set_payer_rule(
    payer_id: Annotated[int, Path(gt=0)],
    request: PayerRuleRequest,
    session: Annotated[Session, Depends(get_session)],
) -> payers.PayerRuleApplied:
    result = payers.set_payer_rule(session, payer_id, request.counts_as)
    if isinstance(result, payers.UnknownPayer):
        raise HTTPException(status_code=404, detail="Unknown payer")
    return result
