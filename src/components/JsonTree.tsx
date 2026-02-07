import React, { useState, useCallback } from 'react';
import { ChevronRight, ChevronDown, Copy, Code2, Braces, List, Type, Hash } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const PREVIEW_MAX = 40;

function getPreview(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') {
    const s = value.replace(/"/g, '\\"');
    return s.length > PREVIEW_MAX ? `"${s.slice(0, PREVIEW_MAX)}..."` : `"${s}"`;
  }
  if (Array.isArray(value)) return `[${value.length} items]`;
  if (typeof value === 'object') {
    const keys = Object.keys(value as object);
    return `{${keys.length} keys}`;
  }
  return String(value);
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'object':
      return <Braces className="w-3.5 h-3.5 text-code-property shrink-0" />;
    case 'array':
      return <List className="w-3.5 h-3.5 text-code-keyword shrink-0" />;
    case 'string':
      return <Type className="w-3.5 h-3.5 text-code-string shrink-0" />;
    case 'number':
      return <Hash className="w-3.5 h-3.5 text-code-number shrink-0" />;
    default:
      return <Braces className="w-3.5 h-3.5 text-muted-foreground shrink-0" />;
  }
}

function getValueType(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

interface JsonTreeProps {
  data: unknown;
  onCopyPath?: (path: string) => void;
  onInsertPath?: (path: string) => void;
}

interface TreeNodeProps {
  path: string;
  keyLabel: string;
  value: unknown;
  depth: number;
  onCopyPath: (path: string) => void;
  onInsertPath?: (path: string) => void;
  defaultOpen?: boolean;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  path,
  keyLabel,
  value,
  depth,
  onCopyPath,
  onInsertPath,
  defaultOpen = false,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const { toast } = useToast();
  const isObject = value !== null && typeof value === 'object';
  const isArray = Array.isArray(value);
  const hasChildren = isObject && ((isArray && (value as unknown[]).length > 0) || (!isArray && Object.keys(value as object).length > 0));

  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onCopyPath(path);
      navigator.clipboard.writeText(path).then(
        () => toast({ title: 'Path copied', description: path }),
        () => toast({ title: 'Copy failed', variant: 'destructive' })
      );
    },
    [path, onCopyPath, toast]
  );

  const handleInsert = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onInsertPath) {
        onInsertPath(path);
        toast({ title: 'Inserted into code', description: path });
      }
    },
    [path, onInsertPath, toast]
  );

  const paddingLeft = 12 + depth * 16;

  if (!hasChildren) {
    return (
      <div
        className="group flex items-center gap-1.5 py-0.5 px-1 rounded hover:bg-muted/50 font-mono text-sm"
        style={{ paddingLeft }}
      >
        <span className="w-4 shrink-0" />
        {getTypeIcon(getValueType(value))}
        <span className="text-muted-foreground">{keyLabel}:</span>
        <span
          className={cn(
            getValueType(value) === 'string' && 'text-code-string',
            getValueType(value) === 'number' && 'text-code-number',
            getValueType(value) === 'boolean' && 'text-warning'
          )}
        >
          {getPreview(value)}
        </span>
        <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy} title="Copy path">
            <Copy className="w-3 h-3" />
          </Button>
          {onInsertPath && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleInsert} title="Use in code">
              <Code2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="font-mono text-sm group flex items-center rounded hover:bg-muted/50" style={{ paddingLeft }}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex flex-1 min-w-0 items-center gap-1.5 py-0.5 px-1 rounded text-left"
          >
            <span className="shrink-0 w-4 flex items-center justify-center">
              {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </span>
            {getTypeIcon(isArray ? 'array' : 'object')}
            <span className="text-muted-foreground">{keyLabel}:</span>
            <span className="text-muted-foreground">
              {isArray ? `[${(value as unknown[]).length} items]` : `{${Object.keys(value as object).length} keys}`}
            </span>
          </button>
        </CollapsibleTrigger>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 shrink-0 py-0.5 pr-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy} title="Copy path">
            <Copy className="w-3 h-3" />
          </Button>
          {onInsertPath && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleInsert} title="Use in code">
              <Code2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
      <CollapsibleContent>
        {isArray
            ? (value as unknown[]).map((item, index) => (
                <TreeNode
                  key={`${path}[${index}]`}
                  path={`${path}[${index}]`}
                  keyLabel={`[${index}]`}
                  value={item}
                  depth={depth + 1}
                  onCopyPath={onCopyPath}
                  onInsertPath={onInsertPath}
                  defaultOpen={depth === 0}
                />
              ))
            : Object.entries(value as Record<string, unknown>).map(([k, v]) => (
                <TreeNode
                  key={`${path}.${k}`}
                  path={`${path}.${k}`}
                  keyLabel={k}
                  value={v}
                  depth={depth + 1}
                  onCopyPath={onCopyPath}
                  onInsertPath={onInsertPath}
                  defaultOpen={depth === 0}
                />
              ))}
      </CollapsibleContent>
    </Collapsible>
  );
};

const JsonTree: React.FC<JsonTreeProps> = ({ data, onCopyPath, onInsertPath }) => {
  const copyPath = onCopyPath ?? (() => {});

  if (data === null || data === undefined) {
    return (
      <div className="p-3 text-muted-foreground font-mono text-sm">
        {data === null ? 'null' : 'undefined'}
      </div>
    );
  }

  if (typeof data !== 'object') {
    return (
      <div className="p-3 font-mono text-sm">
        {getTypeIcon(typeof data)}
        <span className="ml-2">{getPreview(data)}</span>
      </div>
    );
  }

  const isArray = Array.isArray(data);
  const entries = isArray
    ? (data as unknown[]).map((item, index) => ({ key: `[${index}]`, path: `data[${index}]`, value: item }))
    : Object.entries(data as object).map(([key, value]) => ({ key, path: `data.${key}`, value }));

  return (
    <div className="overflow-auto editor-scrollbar py-2">
      {entries.map(({ key, path, value }) => (
        <TreeNode
          key={path}
          path={path}
          keyLabel={key}
          value={value}
          depth={0}
          onCopyPath={copyPath}
          onInsertPath={onInsertPath}
          defaultOpen={true}
        />
      ))}
    </div>
  );
};

export default JsonTree;
