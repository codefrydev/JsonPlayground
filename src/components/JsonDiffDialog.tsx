import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import JsonEditor from '@/components/JsonEditor';
import { diffJson, type JsonDiffEntry } from '@/lib/json-diff';
import { parseJson } from '@/lib/json-parse';
import { cn } from '@/lib/utils';

interface JsonDiffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leftJson: string;
  onHighlightPath?: (path: string) => void;
}

const diffTypeClass: Record<JsonDiffEntry['type'], string> = {
  added: 'border-l-success bg-success/10',
  removed: 'border-l-destructive bg-destructive/10',
  changed: 'border-l-warning bg-warning/10',
};

const JsonDiffDialog: React.FC<JsonDiffDialogProps> = ({
  open,
  onOpenChange,
  leftJson,
  onHighlightPath,
}) => {
  const [rightJson, setRightJson] = useState('');

  const diffEntries = useMemo(() => {
    const left = parseJson(leftJson);
    const right = parseJson(rightJson);
    if (!left.valid || !right.valid) return [];
    return diffJson(left.data, right.data);
  }, [leftJson, rightJson]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Compare JSON</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 min-h-[200px] flex-1 overflow-hidden">
          <div className="flex flex-col min-h-0 border border-border rounded-md overflow-hidden">
            <div className="px-2 py-1 text-xs font-medium bg-muted/50 border-b border-border">Left (current)</div>
            <div className="flex-1 min-h-[180px] flex flex-col">
              <JsonEditor value={leftJson} onChange={() => {}} readOnly />
            </div>
          </div>
          <div className="flex flex-col min-h-0 border border-border rounded-md overflow-hidden">
            <div className="px-2 py-1 text-xs font-medium bg-muted/50 border-b border-border">Right</div>
            <div className="flex-1 min-h-[180px] flex flex-col">
              <JsonEditor value={rightJson} onChange={setRightJson} placeholder="Paste JSON to compare..." />
            </div>
          </div>
        </div>
        <div className="overflow-auto max-h-48 border border-border rounded-md p-2 space-y-1">
          {diffEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {rightJson.trim() ? 'No structural differences (or invalid JSON).' : 'Paste JSON on the right to compare.'}
            </p>
          ) : (
            diffEntries.map((entry, i) => (
              <button
                key={`${entry.path}-${i}`}
                type="button"
                className={cn(
                  'w-full text-left text-xs font-mono px-2 py-1 rounded border-l-2',
                  diffTypeClass[entry.type]
                )}
                onClick={() => onHighlightPath?.(entry.path)}
              >
                <span className="text-muted-foreground">{entry.type}</span> {entry.path}
              </button>
            ))
          )}
        </div>
        <Button variant="outline" size="sm" className="self-end" onClick={() => onOpenChange(false)}>
          Close
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default JsonDiffDialog;
