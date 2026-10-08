from dataclasses import dataclass

from finances_api.models import AccountPresetId, AccountType, Institution


@dataclass(frozen=True)
class AccountPreset:
    id: AccountPresetId
    name: str
    institution: Institution
    account_type: AccountType


ACCOUNT_PRESETS = (
    AccountPreset("amex_gold", "American Express Gold", "amex", "credit_card"),
    AccountPreset("nationwide_flexone", "Nationwide FlexOne", "nationwide", "current_account"),
    AccountPreset("natwest_select", "NatWest Select", "natwest", "current_account"),
)

PRESETS_BY_ID = {preset.id: preset for preset in ACCOUNT_PRESETS}
