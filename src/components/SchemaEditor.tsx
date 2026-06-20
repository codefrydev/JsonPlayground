import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SchemaFieldNode from '@/components/SchemaFieldNode';
import { createSchemaField } from '@/lib/mock-data/field-catalog';
import { SCHEMA_ROW_GRID } from '@/lib/mock-data/schema-visual';
import type { SchemaField } from '@/lib/mock-data/types';

export function SchemaTypeLegend() {
  return (
    <div className="hidden lg:flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
      <span className="flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        Object
      </span>
      <span className="flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        Array
      </span>
      <span className="flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
        Scalar
      </span>
      <span className="text-muted-foreground/70">|</span>
      <span>L1 cyan · L2 violet · L3+ amber</span>
    </div>
  );
}

interface SchemaEditorProps {
  fields: SchemaField[];
  onChange: (fields: SchemaField[]) => void;
}

const SchemaEditor: React.FC<SchemaEditorProps> = ({ fields, onChange }) => {
  const addField = () => {
    onChange([
      ...fields,
      createSchemaField({ name: `field_${fields.length + 1}`, type: 'lorem' }),
    ]);
  };

  return (
    <div className="flex flex-col gap-3 min-h-0 flex-1">
      <div
        className={`${SCHEMA_ROW_GRID} px-2 text-xs font-medium text-muted-foreground shrink-0`}
      >
        <span className="text-center" title="Nesting level">Lvl</span>
        <span>Field Name</span>
        <span>Type</span>
        <span>Blank %</span>
        <span>Options</span>
        <span />
      </div>

      <div className="flex-1 min-h-0 overflow-auto space-y-2 px-2">
        {fields.map((field) => (
          <SchemaFieldNode
            key={field.id}
            field={field}
            fields={fields}
            onChange={onChange}
            canRemove={fields.length > 1}
          />
        ))}
      </div>

      <Button type="button" variant="outline" size="sm" onClick={addField} className="shrink-0 w-fit">
        <Plus className="h-4 w-4 mr-1" />
        Add field
      </Button>
    </div>
  );
};

export default SchemaEditor;
