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
import { getDepthStyle, getContextStyle } from '@/lib/mock-data/schema-visual';
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
      className={cn(
        'ml-2 mt-1 mb-1 pl-3 border-l-2 rounded-r-md space-y-2 py-2 pr-1',
        depthStyle.border,
        depthStyle.bg
      )}
    >
      <div className={cn('flex items-center justify-between gap-2 pr-1')}>
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
              isArray ? 'text-accent hover:text-accent hover:bg-accent/10' : 'text-primary hover:text-primary hover:bg-primary/10'
            )}
            onClick={onAdd}
          >
            <Plus className="h-3 w-3 mr-1" />
            {addLabel}
          </Button>
        )}
      </div>
      {children}
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

  return (
    <div className="space-y-1">
      <SchemaFieldRow
        field={field}
        depth={depth}
        onChange={updateField}
        onRemove={removeField}
        canRemove={canRemove}
        onAddChild={field.type === 'object' ? addChild : undefined}
      />

      {field.type === 'object' && (field.children?.length ?? 0) > 0 && (
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

      {field.type === 'array' &&
        field.item?.type === 'object' &&
        (field.item.children?.length ?? 0) > 0 && (
          <NestedGroup
            depth={depth + 1}
            context="array-item"
            parentName={field.name || 'array'}
            onAdd={addItemChild}
            addLabel="Add item field"
          >
            {field.item.children!.map((child) => (
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
    </div>
  );
};

export default SchemaFieldNode;
