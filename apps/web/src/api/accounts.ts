import { requestJson } from './client';

export type AccountType = 'current_account' | 'credit_card' | 'savings';

export type CardType = 'credit' | 'debit';

export type AccountPreset = {
  id: string;
  name: string;
  institution: string;
  account_type: AccountType;
  card_type: CardType;
};

export function listAccountPresets(): Promise<AccountPreset[]> {
  return requestJson('/api/account-presets');
}
