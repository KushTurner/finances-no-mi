import { useState, type DragEvent } from 'react';

type StatementDropZoneProps = {
  onFiles: (files: File[]) => void;
};

export function StatementDropZone({ onFiles }: StatementDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  function handleDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    onFiles(Array.from(event.dataTransfer.files));
  }

  return (
    <label
      className={`mt-8 flex cursor-pointer flex-col items-center rounded-xl border border-dashed px-6 py-12 text-center transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50 ${isDragging ? 'border-foreground bg-accent' : 'border-input bg-card hover:bg-accent'}`}
      onDragOver={handleDragOver}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <span className="pointer-events-none font-medium">
        Drop statement CSVs here
      </span>
      <span className="pointer-events-none mt-1 text-sm text-muted-foreground">
        or click to choose files
      </span>
      <input
        className="sr-only"
        type="file"
        accept=".csv,text/csv"
        multiple
        onChange={(event) => {
          onFiles(Array.from(event.target.files ?? []));
          event.target.value = '';
        }}
      />
    </label>
  );
}
