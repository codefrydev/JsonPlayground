import React, { useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Sparkles, Home, Copy, Download, ExternalLink, Eye, FileJson } from 'lucide-react';
import SchemaEditor, { SchemaTypeLegend } from '@/components/SchemaEditor';
import JsonEditor from '@/components/JsonEditor';
import DataPreviewTable from '@/components/DataPreviewTable';
import { useToast } from '@/hooks/use-toast';
import { DEFAULT_SCHEMA, cloneSchemaFields } from '@/lib/mock-data/field-catalog';
import { inferSchemaFromJson } from '@/lib/mock-data/infer-schema';
import { generateRecords, clampRowCount } from '@/lib/mock-data/generate';
import { flattenRecords } from '@/lib/mock-data/flatten';
import { hasNestedFields } from '@/lib/mock-data/schema-tree';
import { MAX_ROW_COUNT, type OutputFormat, type SchemaField } from '@/lib/mock-data/types';
import { jsonToCsv } from '@/lib/csv-json-convert';
import { jsonToXaml } from '@/lib/xaml-json-convert';
import { downloadText } from '@/lib/download';
import { buildShareUrl } from '@/lib/share-state';

const DEFAULT_ROW_COUNT = 10;

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

const JsonGenerator: React.FC = () => {
  const { toast } = useToast();
  const [fields, setFields] = useState<SchemaField[]>(() => cloneSchemaFields(DEFAULT_SCHEMA));
  const [rowCount, setRowCount] = useState(DEFAULT_ROW_COUNT);
  const [format, setFormat] = useState<OutputFormat>('json');
  const [records, setRecords] = useState<Record<string, unknown>[]>([]);
  const [previewTab, setPreviewTab] = useState<'json' | 'table'>('json');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deriveOpen, setDeriveOpen] = useState(false);
  const [deriveInput, setDeriveInput] = useState(DERIVE_EXAMPLE);
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
    if (format === 'xml') {
      const result = jsonToXaml(JSON.stringify({ records }));
      return result.ok ? result.xaml : result.error;
    }
    return JSON.stringify(records, null, 2);
  }, [records, flatRecords, format]);

  const previewFormatLabel = format === 'json' ? 'JSON' : format === 'csv' ? 'CSV' : 'XML';
  const downloadFilename =
    format === 'csv' ? 'data.csv' : format === 'xml' ? 'data.xml' : 'data.json';

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
    setPreviewOpen(true);
    toast({
      title: 'Generated',
      description: `${result.records.length} row${result.records.length === 1 ? '' : 's'}`,
    });
  }, [fields, rowCount, toast]);

  const handleDerive = useCallback(() => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(deriveInput);
    } catch (e) {
      toast({
        title: 'Derive failed',
        description: e instanceof Error ? e.message : 'Invalid JSON',
        variant: 'destructive',
      });
      return;
    }

    const result = inferSchemaFromJson(parsed);
    if (!result.ok) {
      toast({ title: 'Derive failed', description: result.error, variant: 'destructive' });
      return;
    }

    setFields(result.fields);
    setDeriveOpen(false);
  }, [deriveInput, toast]);

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
    } else if (format === 'xml') {
      downloadText('data.xml', previewText, 'application/xml');
    } else {
      downloadText('data.json', previewText, 'application/json');
    }
    toast({ title: 'Downloaded', description: downloadFilename });
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
        <div className="flex items-center gap-4">
          <SchemaTypeLegend />
          <Button type="button" variant="outline" size="sm" onClick={() => setDeriveOpen(true)}>
            <FileJson className="h-4 w-4 mr-1" />
            Derive from example
          </Button>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex flex-col p-4">
        <div className="flex-1 flex flex-col min-h-0 rounded-lg border border-border overflow-hidden">
          <div className="flex-1 min-h-0 flex flex-col p-3 overflow-hidden">
            <SchemaEditor fields={fields} onChange={setFields} />
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
                    <SelectItem value="xml">XML</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="button" onClick={handleGenerate}>
                <Sparkles className="h-4 w-4 mr-1" />
                Generate
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPreviewOpen(true)}
                disabled={records.length === 0}
              >
                <Eye className="h-4 w-4 mr-1" />
                Preview
              </Button>
            </div>
            {generateError && (
              <p className="text-sm text-destructive">{generateError}</p>
            )}
          </div>
        </div>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="fixed inset-0 flex h-full w-full max-h-none max-w-none flex-col gap-3 rounded-none border-0 p-4 translate-x-0 translate-y-0 data-[state=open]:slide-in-from-left-0 data-[state=open]:slide-in-from-top-0 data-[state=closed]:slide-out-to-left-0 data-[state=closed]:slide-out-to-top-0 data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100">
          <DialogHeader className="flex-row items-center justify-between space-y-0 pr-8 shrink-0">
            <DialogTitle>Preview</DialogTitle>
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
          </DialogHeader>

          <Tabs
            value={previewTab}
            onValueChange={(v) => setPreviewTab(v as 'json' | 'table')}
            className="flex-1 min-h-0 flex flex-col overflow-hidden"
          >
            <TabsList className="w-fit shrink-0">
              <TabsTrigger value="json">{previewFormatLabel}</TabsTrigger>
              <TabsTrigger value="table">Table</TabsTrigger>
            </TabsList>

            <TabsContent
              value="json"
              className="flex-1 min-h-0 flex flex-col m-0 mt-2 data-[state=inactive]:hidden"
            >
              <div className="flex-1 min-h-0 flex flex-col">
                <JsonEditor
                  value={previewText}
                  onChange={() => {}}
                  readOnly
                  placeholder="Generated output will appear here..."
                />
              </div>
            </TabsContent>

            <TabsContent
              value="table"
              className="flex-1 min-h-0 overflow-auto m-0 mt-2 data-[state=inactive]:hidden"
            >
              {isNested && (
                <p className="text-xs text-muted-foreground mb-2">
                  Nested fields use dot notation (e.g. address.city). Arrays are shown as JSON.
                </p>
              )}
              <DataPreviewTable headers={headers} rows={flatRecords} />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

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

export default JsonGenerator;
