from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, StringConstraints
from sqlalchemy.orm import Session

from finances_api.database import get_session
from finances_api.models import AccountType, Institution
from finances_api.services import accounts
from finances_api.services.accounts import DuplicateAccountName


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
    return [AccountResponse.model_validate(account) for account in accounts.list_accounts(session)]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_account(
    account_create: AccountCreate, session: Annotated[Session, Depends(get_session)]
) -> AccountResponse:
    account = accounts.create_account(
        session, account_create.name, account_create.institution, account_create.account_type
    )
    if isinstance(account, DuplicateAccountName):
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this name already exists")
    return AccountResponse.model_validate(account)
