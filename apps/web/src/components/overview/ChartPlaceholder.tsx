import { Panel } from './Panel';

type ChartPlaceholderProps = {
  title: string;
  description: string;
  failed: boolean;
  loadingMessage: string;
  errorMessage: string;
};

export function ChartPlaceholder({
  title,
  description,
  failed,
  loadingMessage,
  errorMessage,
}: ChartPlaceholderProps) {
  return (
    <Panel title={title} description={description}>
      <p
        role={failed ? 'alert' : 'status'}
        className="min-h-56 text-sm text-muted-foreground"
      >
        {failed ? errorMessage : loadingMessage}
      </p>
    </Panel>
  );
}
