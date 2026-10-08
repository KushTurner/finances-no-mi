from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from finances_api.database import get_session
from finances_api.models import AccountPresetId, AccountType, Institution
from finances_api.services import accounts


class AccountResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    institution: Institution
    account_type: AccountType
    preset: AccountPresetId


router = APIRouter(prefix="/accounts", tags=["accounts"])


@router.get("")
def list_accounts(session: Annotated[Session, Depends(get_session)]) -> list[AccountResponse]:
    return [AccountResponse.model_validate(account) for account in accounts.list_accounts(session)]
