import React, { useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sparkles, Home, Copy, Download, ExternalLink } from 'lucide-react';
import SchemaEditor from '@/components/SchemaEditor';
import JsonEditor from '@/components/JsonEditor';
import DataPreviewTable from '@/components/DataPreviewTable';
import { useToast } from '@/hooks/use-toast';
import { DEFAULT_SCHEMA, cloneSchemaFields } from '@/lib/mock-data/field-catalog';
import { generateRecords, clampRowCount } from '@/lib/mock-data/generate';
import { flattenRecords } from '@/lib/mock-data/flatten';
import { hasNestedFields } from '@/lib/mock-data/schema-tree';
import { MAX_ROW_COUNT, type OutputFormat, type SchemaField } from '@/lib/mock-data/types';
import { jsonToCsv } from '@/lib/csv-json-convert';
import { downloadText } from '@/lib/download';
import { buildShareUrl } from '@/lib/share-state';

const DEFAULT_ROW_COUNT = 10;

const JsonGenerator: React.FC = () => {
  const { toast } = useToast();
  const [fields, setFields] = useState<SchemaField[]>(() => cloneSchemaFields(DEFAULT_SCHEMA));
  const [rowCount, setRowCount] = useState(DEFAULT_ROW_COUNT);
  const [format, setFormat] = useState<OutputFormat>('json');
  const [records, setRecords] = useState<Record<string, unknown>[]>([]);
  const [previewTab, setPreviewTab] = useState<'json' | 'table'>('json');
  const [generateError, setGenerateError] = useState<string | null>(null);

  const flatRecords = useMemo(() => flattenRecords(records), [records]);
  const isNested = useMemo(() => hasNestedFields(fields), [fields]);

  const headers = useMemo(() => {
    if (flatRecords.length === 0) return [];
    const keys = new Set<string>();
    for (const row of flatRecords) {
      for (const k of Object.keys(row)) keys.add(k);
    }
    return Array.from(keys);
  }, [flatRecords]);

  const previewText = useMemo(() => {
    if (records.length === 0) return '';
    if (format === 'csv') {
      const result = jsonToCsv(JSON.stringify(flatRecords));
      return result.ok ? result.csv : result.error;
    }
    return JSON.stringify(records, null, 2);
  }, [records, flatRecords, format]);

  const handleGenerate = useCallback(() => {
    const count = clampRowCount(rowCount);
    setRowCount(count);
    const result = generateRecords(fields, count);
    if (!result.ok) {
      setGenerateError(result.error);
      toast({ title: 'Cannot generate', description: result.error, variant: 'destructive' });
      return;
    }
    setGenerateError(null);
    setRecords(result.records);
    toast({
      title: 'Generated',
      description: `${result.records.length} row${result.records.length === 1 ? '' : 's'}`,
    });
  }, [fields, rowCount, toast]);

  const handleCopy = async () => {
    if (!previewText) {
      toast({ title: 'Nothing to copy', variant: 'destructive' });
      return;
    }
    try {
      await navigator.clipboard.writeText(previewText);
      toast({ title: 'Copied', description: 'Output copied to clipboard' });
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  };

  const handleDownload = () => {
    if (!previewText) {
      toast({ title: 'Nothing to download', variant: 'destructive' });
      return;
    }
    if (format === 'csv') {
      downloadText('data.csv', previewText, 'text/csv');
    } else {
      downloadText('data.json', previewText, 'application/json');
    }
    toast({ title: 'Downloaded', description: format === 'csv' ? 'data.csv' : 'data.json' });
  };

  const handleOpenInPlayground = () => {
    if (records.length === 0) {
      toast({ title: 'Generate data first', variant: 'destructive' });
      return;
    }
    const json = JSON.stringify(records, null, 2);
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, '');
      const url = buildShareUrl(window.location.origin, `${base}/json`, { j: json, c: '' });
      window.open(url, '_blank');
    } catch {
      toast({
        title: 'Payload too large',
        description: 'Try fewer rows to open in JSON Playground.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="flex items-center justify-between gap-4 px-6 py-4 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">JSON Generator</h1>
          <Link
            to="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <Home className="w-4 h-4" />
            Home
          </Link>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex flex-col p-4">
        <ResizablePanelGroup
          direction="horizontal"
          className="flex-1 rounded-lg border border-border overflow-hidden"
        >
          <ResizablePanel defaultSize={45} minSize={25} className="flex flex-col min-w-0">
            <div className="px-3 py-2 border-b border-border bg-muted/50 text-sm font-medium shrink-0">
              Schema
            </div>
            <div className="flex-1 min-h-0 flex flex-col p-3 overflow-hidden">
              <SchemaEditor
                fields={fields}
                onChange={setFields}
                onDeriveError={(message) =>
                  toast({ title: 'Derive failed', description: message, variant: 'destructive' })
                }
              />
            </div>
            <div className="shrink-0 border-t border-border p-3 space-y-2 bg-card">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <label htmlFor="row-count" className="text-sm text-muted-foreground whitespace-nowrap">
                    Rows
                  </label>
                  <Input
                    id="row-count"
                    type="number"
                    min={1}
                    max={MAX_ROW_COUNT}
                    value={rowCount}
                    onChange={(e) => setRowCount(Number(e.target.value) || 1)}
                    className="h-9 w-24"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Format</span>
                  <Select value={format} onValueChange={(v) => setFormat(v as OutputFormat)}>
                    <SelectTrigger className="h-9 w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="json">JSON</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="button" onClick={handleGenerate}>
                  <Sparkles className="h-4 w-4 mr-1" />
                  Generate
                </Button>
              </div>
              {generateError && (
                <p className="text-sm text-destructive">{generateError}</p>
              )}
            </div>
          </ResizablePanel>

          <ResizableHandle className="bg-border" />

          <ResizablePanel defaultSize={55} minSize={25} className="flex flex-col min-w-0">
            <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-muted/50 shrink-0">
              <span className="text-sm font-medium">Preview</span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  disabled={!previewText}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleDownload}
                  disabled={!previewText}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleOpenInPlayground}
                  disabled={records.length === 0}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Open in JSON Playground
                </Button>
              </div>
            </div>

            <Tabs
              value={previewTab}
              onValueChange={(v) => setPreviewTab(v as 'json' | 'table')}
              className="flex-1 min-h-0 flex flex-col"
            >
              <TabsList className="mx-3 mt-2 w-fit shrink-0">
                <TabsTrigger value="json">JSON</TabsTrigger>
                <TabsTrigger value="table">Table</TabsTrigger>
              </TabsList>

              <TabsContent value="json" className="flex-1 min-h-0 flex flex-col m-0 px-3 pb-3 data-[state=inactive]:hidden">
                {records.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-2">
                    Configure your schema and click Generate to preview output.
                  </p>
                ) : (
                  <div className="flex-1 min-h-0 flex flex-col mt-2">
                    <JsonEditor
                      value={previewText}
                      onChange={() => {}}
                      readOnly
                      placeholder="Generated output will appear here..."
                    />
                  </div>
                )}
              </TabsContent>

              <TabsContent value="table" className="flex-1 min-h-0 overflow-auto m-0 px-3 pb-3 data-[state=inactive]:hidden">
                {records.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-2">
                    Configure your schema and click Generate to see a table preview.
                  </p>
                ) : (
                  <>
                    {isNested && (
                      <p className="text-xs text-muted-foreground mt-2 mb-1">
                        Nested fields use dot notation (e.g. address.city). Arrays are shown as JSON.
                      </p>
                    )}
                    <DataPreviewTable headers={headers} rows={flatRecords} />
                  </>
                )}
              </TabsContent>
            </Tabs>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
};

export default JsonGenerator;
