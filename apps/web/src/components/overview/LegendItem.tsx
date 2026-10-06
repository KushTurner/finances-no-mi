type LegendItemProps = {
  color: string;
  label: string;
  shape?: 'line' | 'square';
};

export function LegendItem({ color, label, shape = 'line' }: LegendItemProps) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <i
        aria-hidden="true"
        className={
          shape === 'line'
            ? 'h-[3px] w-3.5 rounded-sm'
            : 'size-2.5 rounded-[3px]'
        }
        style={{ background: color }}
      />
      {label}
    </span>
  );
}
