import React from 'react';
import { Trash2, Plus, Braces, List } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FIELD_TYPE_CATALOG,
  getDefaultOptionsForType,
  getDefaultChildrenForType,
  getDefaultItemForArray,
  createSchemaField,
} from '@/lib/mock-data/field-catalog';
import { getDepthStyle, getTypeStyle } from '@/lib/mock-data/schema-visual';
import type { FieldType, SchemaField } from '@/lib/mock-data/types';
import { cn } from '@/lib/utils';

interface SchemaFieldRowProps {
  field: SchemaField;
  depth?: number;
  onChange: (field: SchemaField) => void;
  onRemove: () => void;
  canRemove: boolean;
  onAddChild?: () => void;
}

const SchemaFieldRow: React.FC<SchemaFieldRowProps> = ({
  field,
  depth = 0,
  onChange,
  onRemove,
  canRemove,
  onAddChild,
}) => {
  const meta = FIELD_TYPE_CATALOG.find((m) => m.type === field.type);
  const depthStyle = getDepthStyle(depth);
  const typeStyle = getTypeStyle(field.type);
  const isContainer = field.type === 'object' || field.type === 'array';

  const handleTypeChange = (type: FieldType) => {
    const next: SchemaField = {
      ...field,
      type,
      options: getDefaultOptionsForType(type),
      children: getDefaultChildrenForType(type),
      item: type === 'array' ? getDefaultItemForArray() : undefined,
    };
    if (type !== 'object') next.children = undefined;
    if (type !== 'array') next.item = undefined;
    onChange(next);
  };

  const handleEnumValuesChange = (raw: string) => {
    const values = raw.split(',').map((v) => v.trim());
    onChange({
      ...field,
      options: { ...field.options, values },
    });
  };

  const handleArrayItemTypeChange = (type: FieldType) => {
    const item = createSchemaField({ name: '', type });
    onChange({ ...field, item });
  };

  return (
    <div
      className={cn(
        'rounded-lg border transition-colors',
        depth > 0 ? cn('border-border/60', depthStyle.bg) : 'border-border/40 bg-card/40',
        isContainer && 'ring-1 ring-inset',
        isContainer && depthStyle.ring
      )}
    >
      <div className="grid grid-cols-[auto_1fr_132px_64px_1fr_auto] gap-2 items-center p-2">
        <div className="flex flex-col items-center gap-0.5 w-8 shrink-0">
          {depth > 0 ? (
            <span
              className={cn(
                'text-[10px] font-semibold uppercase tracking-wide leading-none',
                depthStyle.text
              )}
              title={`Nesting ${depthStyle.label}`}
            >
              L{depth}
            </span>
          ) : (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground leading-none">
              —
            </span>
          )}
          {field.type === 'object' ? (
            <Braces className={cn('h-3.5 w-3.5', depthStyle.text)} />
          ) : field.type === 'array' ? (
            <List className={cn('h-3.5 w-3.5', typeStyle.badge.includes('accent') ? 'text-accent' : depthStyle.text)} />
          ) : (
            <span className="h-3.5 w-3.5 rounded-full bg-muted-foreground/25" />
          )}
        </div>

        <Input
          value={field.name}
          onChange={(e) => onChange({ ...field, name: e.target.value })}
          placeholder="field_name"
          className={cn('h-9', isContainer && 'font-medium')}
        />

        <Select value={field.type} onValueChange={(v) => handleTypeChange(v as FieldType)}>
          <SelectTrigger className={cn('h-9 text-xs', typeStyle.select)}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FIELD_TYPE_CATALOG.map((item) => (
                <SelectItem key={item.type} value={item.type}>
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        'inline-block h-1.5 w-1.5 rounded-full shrink-0',
                        item.type === 'object' && 'bg-primary',
                        item.type === 'array' && 'bg-accent',
                        item.type !== 'object' && item.type !== 'array' && 'bg-muted-foreground/40'
                      )}
                    />
                    {item.label}
                  </span>
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        <Input
          type="number"
          min={0}
          max={100}
          value={field.blankPercent}
          onChange={(e) =>
            onChange({
              ...field,
              blankPercent: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
            })
          }
          className="h-9"
          title="Blank %"
        />

        <div className="min-w-0">
          {meta?.hasNumericOptions ? (
            <div className="flex gap-1">
              <Input
                type="number"
                value={field.options?.min ?? ''}
                onChange={(e) =>
                  onChange({
                    ...field,
                    options: { ...field.options, min: Number(e.target.value) },
                  })
                }
                placeholder="min"
                className="h-9"
              />
              <Input
                type="number"
                value={field.options?.max ?? ''}
                onChange={(e) =>
                  onChange({
                    ...field,
                    options: { ...field.options, max: Number(e.target.value) },
                  })
                }
                placeholder="max"
                className="h-9"
              />
            </div>
          ) : meta?.hasEnumOptions ? (
            <Input
              value={(field.options?.values ?? []).join(', ')}
              onChange={(e) => handleEnumValuesChange(e.target.value)}
              placeholder="A, B, C"
              className="h-9"
            />
          ) : meta?.hasArrayOptions ? (
            <div className="flex gap-1">
              <Input
                type="number"
                min={0}
                value={field.options?.minItems ?? ''}
                onChange={(e) =>
                  onChange({
                    ...field,
                    options: {
                      ...field.options,
                      minItems: Math.max(0, Number(e.target.value) || 0),
                    },
                  })
                }
                placeholder="min"
                className="h-9"
                title="Min items"
              />
              <Input
                type="number"
                min={0}
                value={field.options?.maxItems ?? ''}
                onChange={(e) =>
                  onChange({
                    ...field,
                    options: {
                      ...field.options,
                      maxItems: Math.max(0, Number(e.target.value) || 0),
                    },
                  })
                }
                placeholder="max"
                className="h-9"
                title="Max items"
              />
            </div>
          ) : (
            <span className="text-xs text-muted-foreground px-1">—</span>
          )}
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          {field.type === 'object' && onAddChild && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-primary hover:text-primary hover:bg-primary/10"
              onClick={onAddChild}
              aria-label="Add nested field"
              title="Add nested field"
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
            disabled={!canRemove}
            aria-label="Remove field"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {field.type === 'array' && field.item && (
        <div className="flex items-center gap-2 px-2 pb-2 pt-0 border-t border-border/40 mx-2 mt-0 pt-2">
          <span className={cn('text-xs font-medium whitespace-nowrap', typeStyle.badge.includes('accent') ? 'text-accent' : 'text-muted-foreground')}>
            Item type
          </span>
          <Select
            value={field.item.type}
            onValueChange={(v) => handleArrayItemTypeChange(v as FieldType)}
          >
            <SelectTrigger className={cn('h-8 w-44 text-xs', getTypeStyle(field.item.type).select)}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FIELD_TYPE_CATALOG.filter((t) => t.type !== 'array').map((item) => (
                <SelectItem key={item.type} value={item.type}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
};

export default SchemaFieldRow;
