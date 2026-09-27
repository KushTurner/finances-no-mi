from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, StringConstraints
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from finances_api.database import get_session
from finances_api.models import Account

Institution = Literal["amex", "natwest", "nationwide", "chase"]
AccountType = Literal["current_account", "credit_card", "savings"]


class AccountCreate(BaseModel):
    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
    institution: Institution
    account_type: AccountType


class AccountResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    institution: Institution
    account_type: AccountType


router = APIRouter(prefix="/accounts", tags=["accounts"])


@router.get("")
def list_accounts(session: Annotated[Session, Depends(get_session)]) -> list[AccountResponse]:
    accounts = session.scalars(select(Account).order_by(Account.name))
    return [AccountResponse.model_validate(account) for account in accounts]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_account(
    account_create: AccountCreate, session: Annotated[Session, Depends(get_session)]
) -> AccountResponse:
    account = Account(**account_create.model_dump())
    session.add(account)
    try:
        session.commit()
    except IntegrityError:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "An account with this name already exists"
        ) from None
    return AccountResponse.model_validate(account)
