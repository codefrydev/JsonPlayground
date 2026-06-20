import React from 'react';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const HEADER_TONES = [
  'bg-primary/12 text-primary border-primary/25',
  'bg-accent/12 text-accent border-accent/25',
  'bg-[hsl(var(--success))]/12 text-[hsl(var(--success))] border-[hsl(var(--success))]/25',
  'bg-[hsl(var(--warning))]/12 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/25',
  'bg-[hsl(var(--code-property))]/12 text-[hsl(var(--code-property))] border-[hsl(var(--code-property))]/25',
  'bg-[hsl(var(--code-keyword))]/12 text-[hsl(var(--code-keyword))] border-[hsl(var(--code-keyword))]/25',
] as const;

interface CellDisplay {
  text: string;
  className: string;
}

function formatCell(value: unknown, header: string): CellDisplay {
  if (value === null || value === undefined || value === '') {
    return { text: '—', className: 'text-muted-foreground/45 italic' };
  }

  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);

  if (text === 'true' || text === 'false') {
    const isTrue = text === 'true';
    return {
      text,
      className: cn(
        'inline-flex rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wide',
        isTrue
          ? 'bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]'
          : 'bg-destructive/15 text-destructive',
      ),
    };
  }

  if (/^-?\d+(\.\d+)?$/.test(text)) {
    return {
      text,
      className: 'font-mono tabular-nums text-[hsl(var(--code-number))] font-medium',
    };
  }

  if (header === 'id' || header.endsWith('.id') || header.endsWith('_id')) {
    return {
      text,
      className: 'font-mono tabular-nums text-primary font-semibold',
    };
  }

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
    return {
      text,
      className: 'text-[hsl(var(--code-keyword))] underline decoration-primary/30 underline-offset-2',
    };
  }

  if (text.startsWith('[') || text.startsWith('{')) {
    return {
      text,
      className:
        'font-mono text-xs text-[hsl(var(--code-property))] max-w-[16rem] truncate block',
      };
  }

  return { text, className: 'text-foreground/90' };
}

function HeaderLabel({ name }: { name: string }) {
  const parts = name.split('.');
  if (parts.length === 1) {
    return <span className="font-medium">{name}</span>;
  }

  return (
    <span className="font-mono text-xs leading-tight">
      {parts.map((part, index) => (
        <span key={`${part}-${index}`}>
          {index > 0 && <span className="text-muted-foreground/50">.</span>}
          <span className={index === parts.length - 1 ? 'font-semibold' : 'opacity-80'}>
            {part}
          </span>
        </span>
      ))}
    </span>
  );
}

interface DataPreviewTableProps {
  headers: string[];
  rows: Record<string, unknown>[];
  className?: string;
  showRowNumbers?: boolean;
}

const DataPreviewTable: React.FC<DataPreviewTableProps> = ({
  headers,
  rows,
  className,
  showRowNumbers = true,
}) => {
  if (headers.length === 0) return null;

  return (
    <div
      className={cn(
        'mt-2 overflow-hidden rounded-xl border border-border/80 bg-card/40 shadow-sm ring-1 ring-primary/5',
        className,
      )}
    >
      <Table>
        <TableHeader>
          <TableRow className="border-none hover:bg-transparent">
            {showRowNumbers && (
              <TableHead className="sticky top-0 z-10 h-11 w-12 border-b border-r border-border/60 bg-muted/80 px-2 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur-sm">
                #
              </TableHead>
            )}
            {headers.map((header, index) => (
              <TableHead
                key={header}
                className={cn(
                  'sticky top-0 z-10 h-11 min-w-[7rem] border-b border-r border-border/60 px-3 py-2 text-left backdrop-blur-sm last:border-r-0',
                  HEADER_TONES[index % HEADER_TONES.length],
                )}
              >
                <HeaderLabel name={header} />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, rowIndex) => (
            <TableRow
              key={rowIndex}
              className={cn(
                'border-border/50 transition-colors hover:bg-primary/[0.06]',
                rowIndex % 2 === 0 ? 'bg-background/20' : 'bg-muted/[0.08]',
              )}
            >
              {showRowNumbers && (
                <TableCell className="border-r border-border/40 bg-muted/20 px-2 py-2 text-center font-mono text-xs tabular-nums text-muted-foreground">
                  {rowIndex + 1}
                </TableCell>
              )}
              {headers.map((header) => {
                const cell = formatCell(row[header], header);
                return (
                  <TableCell
                    key={header}
                    className="border-r border-border/30 px-3 py-2 align-top last:border-r-0"
                    title={cell.text}
                  >
                    <span className={cell.className}>{cell.text}</span>
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default DataPreviewTable;
