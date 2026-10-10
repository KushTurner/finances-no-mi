import { Link } from '@tanstack/react-router';

const navLink =
  'rounded-full px-3 py-1.5 text-sm whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground';
const activeNavLink = {
  className: 'bg-secondary font-medium text-foreground',
};

export function AppHeader() {
  return (
    <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 pt-7">
      <Link to="/" className="flex items-center gap-2.5 font-semibold">
        <span
          aria-hidden="true"
          className="grid size-7 place-items-center rounded-lg bg-linear-to-br from-metal to-metal-dark text-xs font-bold"
        >
          £
        </span>
        Finances
      </Link>
      <nav aria-label="Main navigation" className="flex gap-1">
        <Link
          to="/"
          className={navLink}
          activeOptions={{ exact: true, includeSearch: false }}
          activeProps={activeNavLink}
        >
          Overview
        </Link>
        <Link
          to="/transactions"
          className={navLink}
          activeOptions={{ includeSearch: false }}
          activeProps={activeNavLink}
        >
          Transactions
        </Link>
        <Link to="/money-in" className={navLink} activeProps={activeNavLink}>
          Money in
        </Link>
        <Link to="/import" className={navLink} activeProps={activeNavLink}>
          Import
        </Link>
      </nav>
    </header>
  );
}
