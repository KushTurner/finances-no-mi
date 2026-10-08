import { useId, useState, type FormEvent } from 'react';

import type { AccountType, NewAccount } from '@/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAccountPresetsQuery } from '@/hooks';

type AccountSetupFormProps = {
  accountType: AccountType | null;
  disabled: boolean;
  onAddAccount: (newAccount: NewAccount) => void;
};

export function AccountSetupForm({
  accountType,
  disabled,
  onAddAccount,
}: AccountSetupFormProps) {
  const presetsQuery = useAccountPresetsQuery();
  const presets = (presetsQuery.data ?? []).filter(
    (preset) => accountType === null || preset.account_type === accountType,
  );
  const [chosenPreset, setChosenPreset] = useState('');
  const [name, setName] = useState('');
  const nameId = useId();
  const preset =
    presets.length === 1
      ? presets[0]
      : presets.find((candidate) => candidate.id === chosenPreset);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (preset) onAddAccount({ preset: preset.id, name });
  }

  if (presetsQuery.isError) {
    return (
      <p role="alert" className="mt-2 text-sm text-destructive">
        Could not load the accounts you can add. {presetsQuery.error.message}.
      </p>
    );
  }

  return (
    <form className="mt-2 grid gap-4" onSubmit={handleSubmit}>
      <p className="text-sm text-muted-foreground">
        This statement is for an account you have not added yet.
      </p>
      {presetsQuery.isSuccess && presets.length === 0 ? (
        <p className="text-sm text-warning">
          No supported account matches this statement.
        </p>
      ) : (
        <fieldset className="grid gap-2" disabled={disabled}>
          <legend className="mb-2 text-sm text-muted-foreground">
            Account
          </legend>
          {presets.map((candidate) => (
            <label
              key={candidate.id}
              className="flex items-center gap-2 text-sm"
            >
              <input
                type="radio"
                name="preset"
                value={candidate.id}
                checked={preset?.id === candidate.id}
                onChange={() => setChosenPreset(candidate.id)}
                className="accent-foreground"
              />
              {candidate.name}
            </label>
          ))}
        </fieldset>
      )}
      <div className="grid max-w-sm gap-2">
        <label htmlFor={nameId} className="text-sm text-muted-foreground">
          Name (optional)
        </label>
        <Input
          id={nameId}
          value={name}
          placeholder={preset?.name}
          disabled={disabled}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <Button type="submit" className="w-fit" disabled={disabled || !preset}>
        Add account and import
      </Button>
    </form>
  );
}
