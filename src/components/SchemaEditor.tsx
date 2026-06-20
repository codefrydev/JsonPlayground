import React, { useState } from 'react';
import { Plus, FileJson } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import JsonEditor from '@/components/JsonEditor';
import SchemaFieldNode from '@/components/SchemaFieldNode';
import { createSchemaField } from '@/lib/mock-data/field-catalog';
import { inferSchemaFromJson } from '@/lib/mock-data/infer-schema';
import type { SchemaField } from '@/lib/mock-data/types';

interface SchemaEditorProps {
  fields: SchemaField[];
  onChange: (fields: SchemaField[]) => void;
  onDeriveError?: (message: string) => void;
}

const DERIVE_EXAMPLE = `[
  {
    "id": 1,
    "name": "Alice",
    "address": { "city": "New York", "country": "USA" },
    "tags": ["admin", "beta"],
    "orders": [
      { "product": "Widget", "qty": 2 },
      { "product": "Gadget", "qty": 1 }
    ]
  }
]`;

const SchemaEditor: React.FC<SchemaEditorProps> = ({
  fields,
  onChange,
  onDeriveError,
}) => {
  const [deriveOpen, setDeriveOpen] = useState(false);
  const [deriveInput, setDeriveInput] = useState(DERIVE_EXAMPLE);

  const addField = () => {
    onChange([
      ...fields,
      createSchemaField({ name: `field_${fields.length + 1}`, type: 'lorem' }),
    ]);
  };

  const handleDerive = () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(deriveInput);
    } catch (e) {
      onDeriveError?.(e instanceof Error ? e.message : 'Invalid JSON');
      return;
    }

    const result = inferSchemaFromJson(parsed);
    if (!result.ok) {
      onDeriveError?.(result.error);
      return;
    }

    onChange(result.fields);
    setDeriveOpen(false);
  };

  return (
    <div className="flex flex-col gap-3 min-h-0 flex-1">
      <div className="flex items-center justify-between gap-2 shrink-0">
        <h2 className="text-sm font-medium text-foreground">Schema</h2>
        <Button type="button" variant="outline" size="sm" onClick={() => setDeriveOpen(true)}>
          <FileJson className="h-4 w-4 mr-1" />
          Derive from example
        </Button>
      </div>

      <div
        className="grid grid-cols-[auto_1fr_132px_64px_1fr_auto] gap-2 px-1 text-xs font-medium text-muted-foreground shrink-0"
      >
        <span className="w-8 text-center" title="Nesting level">Lvl</span>
        <span>Field Name</span>
        <span>Type</span>
        <span>Blank %</span>
        <span>Options</span>
        <span />
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-[10px] text-muted-foreground shrink-0">
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

      <div className="flex-1 min-h-0 overflow-auto space-y-2 pr-1">
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

      <Dialog open={deriveOpen} onOpenChange={setDeriveOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Derive schema from example JSON</DialogTitle>
            <DialogDescription>
              Paste a JSON object or array of objects. Nested objects and arrays are inferred automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="h-64 border border-border rounded-md overflow-hidden">
            <JsonEditor value={deriveInput} onChange={setDeriveInput} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeriveOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleDerive}>
              Apply schema
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SchemaEditor;
