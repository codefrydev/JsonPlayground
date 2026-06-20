import type { FieldType } from './types';

/** Shared column layout for schema header + field rows */
export const SCHEMA_ROW_GRID =
  'grid grid-cols-[40px_minmax(0,1fr)_148px_72px_minmax(0,1fr)_80px] gap-2 items-center';

/** Left indent per nesting level (px) */
export const SCHEMA_NEST_INDENT = 20;

export interface DepthStyle {
  border: string;
  bg: string;
  ring: string;
  text: string;
  label: string;
}

const DEPTH_STYLES: DepthStyle[] = [
  {
    border: 'border-l-primary/50',
    bg: 'bg-primary/[0.04]',
    ring: 'ring-primary/20',
    text: 'text-primary',
    label: 'Root',
  },
  {
    border: 'border-l-accent/50',
    bg: 'bg-accent/[0.06]',
    ring: 'ring-accent/25',
    text: 'text-accent',
    label: 'Level 1',
  },
  {
    border: 'border-l-warning/50',
    bg: 'bg-warning/[0.06]',
    ring: 'ring-warning/25',
    text: 'text-warning',
    label: 'Level 2',
  },
  {
    border: 'border-l-success/50',
    bg: 'bg-success/[0.06]',
    ring: 'ring-success/25',
    text: 'text-success',
    label: 'Level 3+',
  },
];

export function getDepthStyle(depth: number): DepthStyle {
  return DEPTH_STYLES[Math.min(depth, DEPTH_STYLES.length - 1)];
}

export interface TypeStyle {
  badge: string;
  select: string;
  label: string;
}

export function getTypeStyle(type: FieldType): TypeStyle {
  if (type === 'object') {
    return {
      badge: 'bg-primary/15 text-primary border-primary/30',
      select: 'border-primary/30 bg-primary/[0.06]',
      label: 'Object',
    };
  }
  if (type === 'array') {
    return {
      badge: 'bg-accent/15 text-accent border-accent/30',
      select: 'border-accent/30 bg-accent/[0.06]',
      label: 'Array',
    };
  }
  return {
    badge: 'bg-muted/40 text-muted-foreground border-border',
    select: '',
    label: 'Scalar',
  };
}

export type NestingContext = 'root' | 'object-child' | 'array-item';

export function getContextStyle(context: NestingContext): {
  header: string;
  icon: 'braces' | 'list' | null;
} {
  if (context === 'object-child') {
    return { header: 'Nested fields', icon: 'braces' };
  }
  if (context === 'array-item') {
    return { header: 'Array item fields', icon: 'list' };
  }
  return { header: '', icon: null };
}
