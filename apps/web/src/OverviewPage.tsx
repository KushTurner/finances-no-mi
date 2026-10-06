import { Link } from '@tanstack/react-router';

import { PageHeading } from '@/components/PageHeading';
import { Card, CardContent } from '@/components/ui/card';

export function OverviewPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <PageHeading title="Overview" />
      <Card className="mt-8">
        <CardContent>
          <p className="text-muted-foreground">
            A summary of your spending and income is coming soon. In the
            meantime, you can{' '}
            <Link
              to="/transactions"
              className="text-foreground underline underline-offset-4"
            >
              browse your transactions
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
