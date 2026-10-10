import { useId, useState, type FormEvent } from 'react';

import type { CardType, NewAccount } from '@/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAccountPresetsQuery } from '@/hooks';

type AccountSetupFormProps = {
  cardType: CardType;
  disabled: boolean;
  onAddAccount: (newAccount: NewAccount) => void;
};

export function AccountSetupForm({
  cardType,
  disabled,
  onAddAccount,
}: AccountSetupFormProps) {
  const presetsQuery = useAccountPresetsQuery();
  const presets = (presetsQuery.data ?? []).filter(
    (preset) => preset.card_type === cardType,
  );
  const [chosenPreset, setChosenPreset] = useState('');
  const [name, setName] = useState('');
  const formId = useId();
  const preset = presets.find((candidate) => candidate.id === chosenPreset);

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
        This {cardType} card statement is for an account you have not added yet.
      </p>
      <div className="grid max-w-sm gap-2">
        <Label
          htmlFor={`${formId}-card`}
          className="font-normal text-muted-foreground"
        >
          Card
        </Label>
        <Select
          value={chosenPreset}
          disabled={disabled}
          onValueChange={setChosenPreset}
        >
          <SelectTrigger id={`${formId}-card`} className="w-full">
            <SelectValue placeholder="Choose a card" />
          </SelectTrigger>
          <SelectContent>
            {presets.map((candidate) => (
              <SelectItem key={candidate.id} value={candidate.id}>
                {candidate.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid max-w-sm gap-2">
        <Label
          htmlFor={`${formId}-name`}
          className="font-normal text-muted-foreground"
        >
          Name (optional)
        </Label>
        <Input
          id={`${formId}-name`}
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
