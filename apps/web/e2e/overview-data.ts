type SyntheticTransaction = {
  id: number;
  accountId: number;
  date: string;
  amount: number;
  description: string;
  countsAs: 'own_account' | 'savings' | null;
};

export type SyntheticAccount = { id: number; name: string; latest: string };

export const syntheticAccounts: SyntheticAccount[] = [
  { id: 1, name: 'NatWest', latest: '2026-10-03' },
  { id: 2, name: 'Nationwide', latest: '2026-09-30' },
  { id: 3, name: 'Amex', latest: '2026-10-02' },
];

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
    countsAs: SyntheticTransaction['countsAs'] = null,
  ) => {
    const account = accounts.find((candidate) => candidate.id === accountId);
    if (!account || date > account.latest) return;
    transactions.push({
      id: transactions.length + 1,
      accountId,
      date,
      amount,
      description,
      countsAs,
    });
  };

  for (let date = firstDay; date <= '2026-10-06'; date = addDays(date, 1)) {
    const day = Number(date.slice(8, 10));
    if (day === 25) add(1, date, 320000, 'SYNTHETIC EMPLOYER SALARY');
    if (day === 1) add(1, date, -125000, 'SYNTHETIC LETTINGS RENT');
    if (day === 15)
      add(1, date, -8400 - Math.round(next() * 3000), 'SYNTHETIC ENERGY CO');
    if (day === 26)
      add(1, date, -50000, 'SYNTHETIC TRANSFER TO NATIONWIDE', 'own_account');
    if (day === 10)
      add(1, date, -50000, 'SYNTHETIC INVESTMENT CONTRIBUTION', 'savings');
    if (day === 12)
      add(1, date, 5000, 'SYNTHETIC SAVINGS WITHDRAWAL', 'savings');
    if (day === 18) add(3, date, -999, 'SYNTHETIC STREAMING MEMBERSHIP');
    if (day === 3)
      add(1, date, -42000, 'SYNTHETIC CARD PAYMENT TO AMEX', 'own_account');
    if (day === 27)
      add(2, date, 50000, 'SYNTHETIC TRANSFER FROM NATWEST', 'own_account');
    if (date === lastDayOfMonth(date)) add(2, date, 412, 'SYNTHETIC INTEREST');
    if (day === 3)
      add(3, date, 42000, 'SYNTHETIC PAYMENT RECEIVED', 'own_account');
    if (next() < 0.3)
      add(2, date, -Math.round(1500 + next() * 6000), 'SYNTHETIC SUPERMARKET');
    if (next() < 0.35)
      add(3, date, -Math.round(400 + next() * 3500), 'SYNTHETIC COFFEE HOUSE');
    if (next() < 0.25)
      add(3, date, -Math.round(250 + next() * 2200), 'SYNTHETIC CITY RIDES');
    if (next() < 0.1)
      add(3, date, -Math.round(900 + next() * 9000), 'SYNTHETIC BOOKSHOP');
    if (next() < 0.04)
      add(2, date, -Math.round(800 + next() * 4000), 'SYNTHETIC PHARMACY');
    if (next() < 0.015)
      add(
        3,
        date,
        Math.round(1200 + next() * 3000),
        'SYNTHETIC BOOKSHOP REFUND',
      );
    if (date === '2026-08-14') add(3, date, -64000, 'SYNTHETIC HARBOUR HOTEL');
    if (date === '2026-09-29')
      add(1, date, -2500, 'SYNTHETIC PAYMENT TO A FRIEND');
    if (date === '2026-09-30') add(1, date, 1200, 'SYNTHETIC LUNCH REPAYMENT');
    if (date === '2026-10-01')
      add(1, date, 1500, 'SYNTHETIC PAYMENT FROM A FRIEND');
    if (date === '2026-10-02') add(3, date, -1850, 'SYNTHETIC CORNER SHOP');
    if (date === '2026-10-03') add(1, date, -38500, 'SYNTHETIC CARD PAYMENT');
  }
  return transactions;
}

function spentOf(transaction: SyntheticTransaction) {
  return transaction.countsAs ? 0 : Math.max(-transaction.amount, 0);
}

function incomeOf(transaction: SyntheticTransaction) {
  return transaction.countsAs ? 0 : Math.max(transaction.amount, 0);
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
    return {
      start: from,
      end,
      transaction_count: inRange.length,
      spent_pence: spent,
      income_pence: income,
      savings_pence: -inRange
        .filter((t) => t.countsAs === 'savings')
        .reduce((sum, t) => sum + t.amount, 0),
      net_pence: income - spent,
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
        .filter((t) => t.amount < 0 && !t.countsAs)
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
