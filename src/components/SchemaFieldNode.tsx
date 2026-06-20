import React from 'react';
import { Braces, List, Plus } from 'lucide-react';
import SchemaFieldRow from '@/components/SchemaFieldRow';
import { Button } from '@/components/ui/button';
import { createSchemaField } from '@/lib/mock-data/field-catalog';
import {
  updateFieldById,
  removeFieldById,
  addChildField,
} from '@/lib/mock-data/schema-tree';
import { getDepthStyle, getContextStyle, SCHEMA_NEST_INDENT } from '@/lib/mock-data/schema-visual';
import type { SchemaField } from '@/lib/mock-data/types';
import { cn } from '@/lib/utils';

interface SchemaFieldNodeProps {
  field: SchemaField;
  fields: SchemaField[];
  depth?: number;
  onChange: (fields: SchemaField[]) => void;
  canRemove: boolean;
}

function NestedGroup({
  depth,
  context,
  parentName,
  children,
  onAdd,
  addLabel,
}: {
  depth: number;
  context: 'object-child' | 'array-item';
  parentName: string;
  children: React.ReactNode;
  onAdd?: () => void;
  addLabel: string;
}) {
  const depthStyle = getDepthStyle(depth);
  const ctx = getContextStyle(context);
  const isArray = context === 'array-item';

  return (
    <div
      className={cn('border-l-2 space-y-1 py-2 pr-2', depthStyle.border, depthStyle.bg)}
      style={{ marginLeft: SCHEMA_NEST_INDENT, paddingLeft: SCHEMA_NEST_INDENT }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className={cn('flex items-center gap-1.5 text-xs font-medium', depthStyle.text)}>
          {ctx.icon === 'braces' ? (
            <Braces className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <List className="h-3.5 w-3.5 shrink-0" />
          )}
          <span>{ctx.header}</span>
          <code
            className={cn(
              'rounded px-1.5 py-0.5 text-[11px] font-mono border',
              isArray
                ? 'bg-accent/10 text-accent border-accent/25'
                : 'bg-primary/10 text-primary border-primary/25'
            )}
          >
            {parentName}
          </code>
        </div>
        {onAdd && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              'h-7 text-xs shrink-0',
              isArray
                ? 'text-accent hover:text-accent hover:bg-accent/10'
                : 'text-primary hover:text-primary hover:bg-primary/10'
            )}
            onClick={onAdd}
          >
            <Plus className="h-3 w-3 mr-1" />
            {addLabel}
          </Button>
        )}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

const SchemaFieldNode: React.FC<SchemaFieldNodeProps> = ({
  field,
  fields,
  depth = 0,
  onChange,
  canRemove,
}) => {
  const depthStyle = getDepthStyle(depth);
  const isContainer = field.type === 'object' || field.type === 'array';
  const hasObjectChildren = field.type === 'object' && (field.children?.length ?? 0) > 0;
  const hasArrayObjectChildren =
    field.type === 'array' &&
    field.item?.type === 'object' &&
    (field.item.children?.length ?? 0) > 0;

  const updateField = (updated: SchemaField) => {
    onChange(updateFieldById(fields, field.id, () => updated));
  };

  const removeField = () => {
    onChange(removeFieldById(fields, field.id));
  };

  const addChild = () => {
    const child = createSchemaField({
      name: `field_${(field.children?.length ?? 0) + 1}`,
      type: 'lorem',
    });
    onChange(addChildField(fields, field.id, child));
  };

  const addItemChild = () => {
    if (!field.item || field.item.type !== 'object') return;
    const child = createSchemaField({
      name: `field_${(field.item.children?.length ?? 0) + 1}`,
      type: 'lorem',
    });
    onChange(
      updateFieldById(fields, field.id, (f) => ({
        ...f,
        item: {
          ...f.item!,
          children: [...(f.item!.children ?? []), child],
        },
      }))
    );
  };

  const nestedContent = (
    <>
      {hasObjectChildren && (
        <NestedGroup
          depth={depth + 1}
          context="object-child"
          parentName={field.name || 'object'}
          onAdd={addChild}
          addLabel="Add field"
        >
          {field.children!.map((child) => (
            <SchemaFieldNode
              key={child.id}
              field={child}
              fields={fields}
              depth={depth + 1}
              onChange={onChange}
              canRemove={(field.children?.length ?? 0) > 1}
            />
          ))}
        </NestedGroup>
      )}

      {hasArrayObjectChildren && (
        <NestedGroup
          depth={depth + 1}
          context="array-item"
          parentName={field.name || 'array'}
          onAdd={addItemChild}
          addLabel="Add item field"
        >
          {field.item!.children!.map((child) => (
            <SchemaFieldNode
              key={child.id}
              field={child}
              fields={fields}
              depth={depth + 1}
              onChange={onChange}
              canRemove={(field.item!.children?.length ?? 0) > 1}
            />
          ))}
        </NestedGroup>
      )}
    </>
  );

  // Nested leaf — row only, lives inside parent's NestedGroup
  if (depth > 0 && !isContainer) {
    return (
      <SchemaFieldRow
        field={field}
        depth={depth}
        onChange={updateField}
        onRemove={removeField}
        canRemove={canRemove}
        borderless
      />
    );
  }

  // Container (object/array) — parent card wraps row + children
  if (isContainer) {
    return (
      <div
        className={cn(
          'rounded-lg border overflow-hidden transition-colors',
          depth === 0 ? 'border-border/40 bg-card/40' : 'border-border/60',
          depth > 0 && depthStyle.bg,
          'ring-1 ring-inset',
          depthStyle.ring
        )}
      >
        <SchemaFieldRow
          field={field}
          depth={depth}
          onChange={updateField}
          onRemove={removeField}
          canRemove={canRemove}
          onAddChild={field.type === 'object' ? addChild : undefined}
          borderless
        />
        {nestedContent}
      </div>
    );
  }

  // Root-level scalar field
  return (
    <SchemaFieldRow
      field={field}
      depth={depth}
      onChange={updateField}
      onRemove={removeField}
      canRemove={canRemove}
    />
  );
};

export default SchemaFieldNode;
