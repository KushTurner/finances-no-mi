from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from finances_api.database import get_session
from finances_api.services import transactions

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("")
def list_transactions(
    session: Annotated[Session, Depends(get_session)],
) -> list[transactions.TransactionDetails]:
    return transactions.list_transactions(session)
