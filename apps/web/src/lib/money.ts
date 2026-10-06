export const MASK = '£••••';

const pounds = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
});
const signedPounds = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  signDisplay: 'exceptZero',
});
const wholePounds = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0,
});
const compactPounds = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  notation: 'compact',
  maximumFractionDigits: 1,
});

export type MoneyFormat = {
  pounds: (pence: number) => string;
  wholePounds: (pence: number) => string;
  compact: (pence: number) => string;
};

export function moneyFormat(hidden: boolean): MoneyFormat {
  if (hidden) {
    return { pounds: () => MASK, wholePounds: () => MASK, compact: () => MASK };
  }
  return {
    pounds: (pence) => pounds.format(pence / 100),
    wholePounds: (pence) => wholePounds.format(Math.round(pence / 100)),
    compact: (pence) => compactPounds.format(pence / 100),
  };
}

export function formatSignedPounds(pence: number) {
  return signedPounds.format(pence / 100);
}

export function splitPence(formatted: string) {
  const [whole, pence = ''] = formatted.split('.');
  return { whole, pence };
}
