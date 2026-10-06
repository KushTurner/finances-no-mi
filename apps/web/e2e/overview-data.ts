type SyntheticTransaction = {
  id: number;
  accountId: number;
  date: string;
  amount: number;
  description: string;
  category: string | null;
};

export type SyntheticAccount = { id: number; name: string; latest: string };

export const syntheticAccounts: SyntheticAccount[] = [
  { id: 1, name: 'NatWest', latest: '2026-10-03' },
  { id: 2, name: 'Nationwide', latest: '2026-09-30' },
  { id: 3, name: 'Amex', latest: '2026-10-02' },
];

const categoryIds: Record<string, number> = {
  'Home & bills': 1,
  Groceries: 2,
  'Eating out': 3,
  Transport: 4,
  Travel: 5,
  'Shopping & leisure': 6,
  'Health & personal care': 7,
  Other: 8,
  Income: 9,
  'Own-account transfers': 10,
};

const DAY_MS = 86_400_000;
const firstDay = '2025-09-12';

function addDays(date: string, days: number) {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

function lastDayOfMonth(date: string) {
  const [year, month] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

function buildTransactions(accounts: SyntheticAccount[]) {
  const transactions: SyntheticTransaction[] = [];
  let seed = 7;
  const next = () => {
    seed = (seed * 48271) % 2147483647;
    return seed / 2147483647;
  };
  const add = (
    accountId: number,
    date: string,
    amount: number,
    description: string,
    category: string | null,
  ) => {
    const account = accounts.find((candidate) => candidate.id === accountId);
    if (!account || date > account.latest) return;
    const recent = date >= '2026-09-20';
    const uncategorized =
      category !== 'Income' &&
      category !== 'Own-account transfers' &&
      recent &&
      next() < 0.35;
    transactions.push({
      id: transactions.length + 1,
      accountId,
      date,
      amount,
      description,
      category: uncategorized ? null : category,
    });
  };

  for (let date = firstDay; date <= '2026-10-06'; date = addDays(date, 1)) {
    const day = Number(date.slice(8, 10));
    if (day === 25) add(1, date, 320000, 'SYNTHETIC EMPLOYER SALARY', 'Income');
    if (day === 1)
      add(1, date, -125000, 'SYNTHETIC LETTINGS RENT', 'Home & bills');
    if (day === 15)
      add(
        1,
        date,
        -8400 - Math.round(next() * 3000),
        'SYNTHETIC ENERGY CO',
        'Home & bills',
      );
    if (day === 26)
      add(
        1,
        date,
        -50000,
        'SYNTHETIC TRANSFER TO NATIONWIDE',
        'Own-account transfers',
      );
    if (day === 3)
      add(
        1,
        date,
        -42000,
        'SYNTHETIC CARD PAYMENT TO AMEX',
        'Own-account transfers',
      );
    if (day === 27)
      add(
        2,
        date,
        50000,
        'SYNTHETIC TRANSFER FROM NATWEST',
        'Own-account transfers',
      );
    if (date === lastDayOfMonth(date))
      add(2, date, 412, 'SYNTHETIC INTEREST', 'Income');
    if (day === 3)
      add(
        3,
        date,
        42000,
        'SYNTHETIC PAYMENT RECEIVED',
        'Own-account transfers',
      );
    if (next() < 0.3)
      add(
        2,
        date,
        -Math.round(1500 + next() * 6000),
        'SYNTHETIC SUPERMARKET',
        'Groceries',
      );
    if (next() < 0.35)
      add(
        3,
        date,
        -Math.round(400 + next() * 3500),
        'SYNTHETIC COFFEE HOUSE',
        'Eating out',
      );
    if (next() < 0.25)
      add(
        3,
        date,
        -Math.round(250 + next() * 2200),
        'SYNTHETIC CITY RIDES',
        'Transport',
      );
    if (next() < 0.1)
      add(
        3,
        date,
        -Math.round(900 + next() * 9000),
        'SYNTHETIC BOOKSHOP',
        'Shopping & leisure',
      );
    if (next() < 0.04)
      add(
        2,
        date,
        -Math.round(800 + next() * 4000),
        'SYNTHETIC PHARMACY',
        'Health & personal care',
      );
    if (next() < 0.015)
      add(
        3,
        date,
        Math.round(1200 + next() * 3000),
        'SYNTHETIC BOOKSHOP REFUND',
        'Shopping & leisure',
      );
    if (date === '2026-08-14')
      add(3, date, -64000, 'SYNTHETIC HARBOUR HOTEL', 'Travel');
    if (date === '2026-09-29')
      add(1, date, -2500, 'SYNTHETIC PAYMENT TO A FRIEND', null);
    if (date === '2026-09-30')
      add(1, date, 1200, 'SYNTHETIC LUNCH REPAYMENT', null);
    if (date === '2026-10-01')
      add(1, date, 1500, 'SYNTHETIC PAYMENT FROM A FRIEND', null);
    if (date === '2026-10-02')
      add(3, date, -1850, 'SYNTHETIC CORNER SHOP', null);
    if (date === '2026-10-03')
      add(1, date, -38500, 'SYNTHETIC CARD PAYMENT', null);
  }
  return transactions;
}

function spentOf(transaction: SyntheticTransaction) {
  if (transaction.category === 'Income') return 0;
  if (transaction.category === 'Own-account transfers') return 0;
  if (transaction.category === null) return Math.max(-transaction.amount, 0);
  return -transaction.amount;
}

function incomeOf(transaction: SyntheticTransaction) {
  return transaction.category === 'Income' ? transaction.amount : 0;
}

export function syntheticApi(accounts = syntheticAccounts) {
  const transactions = buildTransactions(accounts);
  const scoped = (accountIds: number[]) =>
    transactions.filter(
      (transaction) =>
        accountIds.length === 0 || accountIds.includes(transaction.accountId),
    );
  const between = (list: SyntheticTransaction[], from: string, to: string) =>
    list.filter(
      (transaction) => transaction.date >= from && transaction.date <= to,
    );

  function summary(from: string, to: string, accountIds: number[]) {
    const selected = scoped(accountIds);
    const latest = selected.reduce(
      (max, transaction) => (transaction.date > max ? transaction.date : max),
      '',
    );
    const end = latest && latest >= from && latest < to ? latest : to;
    const inRange = between(selected, from, end);
    const spent = inRange.reduce((sum, t) => sum + spentOf(t), 0);
    const income = inRange.reduce((sum, t) => sum + incomeOf(t), 0);
    const uncategorized = inRange.filter((t) => t.category === null);
    const outgoing = uncategorized.filter((t) => t.amount < 0);
    const incoming = uncategorized.filter((t) => t.amount > 0);
    const byCategory = new Map<string, number>();
    for (const t of inRange) {
      if (
        !t.category ||
        t.category === 'Income' ||
        t.category === 'Own-account transfers'
      )
        continue;
      byCategory.set(
        t.category,
        (byCategory.get(t.category) ?? 0) + spentOf(t),
      );
    }
    return {
      start: from,
      end,
      transaction_count: inRange.length,
      spent_pence: spent,
      income_pence: income,
      net_pence: income - spent,
      uncategorized: {
        outgoing_count: outgoing.length,
        outgoing_pence: outgoing.reduce((sum, t) => sum - t.amount, 0),
        incoming_count: incoming.length,
        incoming_pence: incoming.reduce((sum, t) => sum + t.amount, 0),
      },
      categories: [...byCategory.entries()]
        .filter(([, value]) => value !== 0)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([name, value]) => ({
          id: categoryIds[name],
          name,
          spent_pence: value,
        })),
      accounts: accounts.map((account) => {
        const own = between(
          transactions.filter((t) => t.accountId === account.id),
          from,
          end,
        );
        const ownDates = transactions
          .filter((t) => t.accountId === account.id)
          .map((t) => t.date)
          .sort();
        return {
          id: account.id,
          name: account.name,
          spent_pence: own.reduce((sum, t) => sum + spentOf(t), 0),
          earliest_transaction_date: ownDates.at(0) ?? null,
          latest_transaction_date: ownDates.at(-1) ?? null,
        };
      }),
      largest_payments: inRange
        .filter(
          (t) =>
            t.amount < 0 &&
            t.category !== 'Income' &&
            t.category !== 'Own-account transfers',
        )
        .sort(
          (a, b) =>
            a.amount - b.amount || b.date.localeCompare(a.date) || b.id - a.id,
        )
        .slice(0, 8)
        .map((t) => ({
          id: t.id,
          date: t.date,
          description: t.description,
          account_name:
            accounts.find((account) => account.id === t.accountId)?.name ?? '',
          amount_pence: t.amount,
        })),
    };
  }

  function months(from: string, to: string, accountIds: number[]) {
    const selected = scoped(accountIds);
    const earliest = selected.reduce(
      (min, t) => (min === '' || t.date < min ? t.date : min),
      '',
    );
    const latest = selected.reduce(
      (max, t) => (t.date > max ? t.date : max),
      '',
    );
    const rows = [];
    for (let month = from; month <= to;) {
      const first = `${month}-01`;
      const last = lastDayOfMonth(first);
      const inMonth = between(selected, first, last);
      rows.push({
        month,
        spent_pence: inMonth.reduce((sum, t) => sum + spentOf(t), 0),
        income_pence: inMonth.reduce((sum, t) => sum + incomeOf(t), 0),
        complete: earliest !== '' && first >= earliest && last <= latest,
      });
      month = addDays(last, 1).slice(0, 7);
    }
    const complete = rows.filter((row) => row.complete);
    return {
      months: rows,
      average_spent_pence: complete.length
        ? Math.round(
            complete.reduce((sum, row) => sum + row.spent_pence, 0) /
              complete.length,
          )
        : 0,
      kept_pence: complete.reduce(
        (sum, row) => sum + row.income_pence - row.spent_pence,
        0,
      ),
    };
  }

  function days(from: string, to: string, accountIds: number[]) {
    const selected = scoped(accountIds);
    const rows = [];
    let running = 0;
    for (let date = from; date <= to; date = addDays(date, 1)) {
      const spent = between(selected, date, date).reduce(
        (sum, t) => sum + spentOf(t),
        0,
      );
      running += spent;
      rows.push({ date, spent_pence: spent, running_spent_pence: running });
    }
    return rows;
  }

  return { summary, months, days };
}
