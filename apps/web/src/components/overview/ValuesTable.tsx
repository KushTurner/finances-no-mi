import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type ValuesTableProps = {
  caption: string;
  headings: string[];
  rows: { key: string; cells: string[] }[];
};

export function ValuesTable({ caption, headings, rows }: ValuesTableProps) {
  return (
    <Table className="tabular-nums">
      <caption className="sr-only">{caption}</caption>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {headings.map((heading, index) => (
            <TableHead
              key={heading}
              className={index > 0 ? 'text-right' : 'pl-2'}
            >
              {heading}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.key}>
            {row.cells.map((cell, index) => (
              <TableCell
                key={headings[index]}
                className={index > 0 ? 'py-1.5 text-right' : 'py-1.5 pl-2'}
              >
                {cell}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
