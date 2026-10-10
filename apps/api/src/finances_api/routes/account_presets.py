from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict

from finances_api.account_presets import ACCOUNT_PRESETS
from finances_api.models import AccountPresetId, AccountType, CardType, Institution


class AccountPresetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: AccountPresetId
    name: str
    institution: Institution
    account_type: AccountType
    card_type: CardType


router = APIRouter(prefix="/account-presets", tags=["accounts"])


@router.get("")
def list_account_presets() -> list[AccountPresetResponse]:
    return [AccountPresetResponse.model_validate(preset) for preset in ACCOUNT_PRESETS]
