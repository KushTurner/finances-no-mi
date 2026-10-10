import type { Transaction } from '@/api';

function normalize(text: string) {
  return text.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function filterByDescription(
  transactions: Transaction[],
  search: string,
) {
  const needle = normalize(search);
  if (!needle) return transactions;
  return transactions.filter((transaction) =>
    normalize(transaction.raw_description).includes(needle),
  );
}

export function emptyTransactionsMessage(category: string, search: string) {
  if (search.trim()) return `No transactions match “${search.trim()}”.`;
  return category === 'all'
    ? 'No transactions yet. Import a statement to get started.'
    : 'No transactions match this category.';
}
