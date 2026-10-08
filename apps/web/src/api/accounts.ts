import { requestJson } from './client';

export type AccountType = 'current_account' | 'credit_card' | 'savings';

export type AccountPreset = {
  id: string;
  name: string;
  institution: string;
  account_type: AccountType;
};

export function listAccountPresets(): Promise<AccountPreset[]> {
  return requestJson('/api/account-presets');
}
