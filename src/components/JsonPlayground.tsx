import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Play, Trash2, FileJson, Code2, Terminal, Zap, FileCode, GitBranch, AlignLeft, Minus, Upload, Link, ListOrdered, Share2 } from 'lucide-react';
import CodeEditor from './CodeEditor';
import JsonEditor from './JsonEditor';
import PanelHeader from './PanelHeader';
import OutputPanel, { OutputEntry, ExecutionMeta } from './OutputPanel';
import JsonTree from './JsonTree';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/hooks/use-toast';
import { CODE_SNIPPETS } from '@/hooks/useAutocomplete';

const DEFAULT_JSON = `{
  "user": {
    "name": "John Doe",
    "age": 28,
    "email": "john@example.com"
  },
  "posts": [
    { "id": 1, "title": "Hello World" },
    { "id": 2, "title": "Learning JSON" }
  ],
  "settings": {
    "theme": "dark",
    "notifications": true
  }
}`;

const DEFAULT_CODE = `// Access your JSON data using 'data' object
// Results appear automatically as you type!

// Try these examples:
data.user.name
// data.posts.map(p => p.title)
// data.settings`;

const getDataType = (value: unknown): string => {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
};

const getDataShape = (data: unknown): string => {
  if (data === null) return 'null';
  if (Array.isArray(data)) {
    return `Array[${data.length}]`;
  }
  if (typeof data === 'object') {
    const keys = Object.keys(data as object);
    if (keys.length <= 3) {
      return `{ ${keys.join(', ')} }`;
    }
    return `Object { ${keys.length} keys }`;
  }
  return typeof data;
};

const STORAGE_KEY = 'json-playground-state';
const JSON_PANEL_TAB_KEY = 'json-playground-json-panel-tab';
const SHARE_PARAM = 's';
const MAX_SHARE_LENGTH = 1800;

function loadSavedState(): { json: string; code: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { json?: string; code?: string };
    if (typeof parsed?.json === 'string' && typeof parsed?.code === 'string') return { json: parsed.json, code: parsed.code };
    return null;
  } catch {
    return null;
  }
}

function getInitialJsonPanelTab(): 'editor' | 'tree' {
  const saved = localStorage.getItem(JSON_PANEL_TAB_KEY);
  if (saved === 'editor' || saved === 'tree') return saved;
  try {
    const state = loadSavedState();
    JSON.parse(state?.json ?? DEFAULT_JSON);
    return 'tree';
  } catch {
    return 'editor';
  }
}

const JsonPlayground: React.FC = () => {
  const [jsonInput, setJsonInput] = useState(DEFAULT_JSON);
  const [codeInput, setCodeInput] = useState(DEFAULT_CODE);
  const [showRestoreBanner, setShowRestoreBanner] = useState(false);
  const savedStateRef = useRef<{ json: string; code: string } | null>(null);
  const [output, setOutput] = useState<OutputEntry[]>([]);
  const [meta, setMeta] = useState<ExecutionMeta>({});
  const [isExecuting, setIsExecuting] = useState(false);
  const [autoRun, setAutoRun] = useState(true);
  const [jsonStatus, setJsonStatus] = useState<{
    valid: boolean;
    error?: string;
  }>({ valid: true });

  const [parsedJsonData, setParsedJsonData] = useState<unknown>(null);
  const [jsonPanelTab, setJsonPanelTab] = useState<'editor' | 'tree'>(getInitialJsonPanelTab);
  const [insertIntoCode, setInsertIntoCode] = useState<string | null>(null);
  const [loadUrlOpen, setLoadUrlOpen] = useState(false);
  const [loadUrlValue, setLoadUrlValue] = useState('');
  const { toast } = useToast();
  const executionRunIdRef = useRef(0);
  const executionTimedOutRef = useRef(false);
  const EXECUTION_TIMEOUT_MS = 5000;

  const validateJson = useCallback((json: string): { valid: boolean; data?: unknown; error?: string } => {
    try {
      const data = JSON.parse(json);
      return { valid: true, data };
    } catch (e) {
      const error = e instanceof Error ? e.message : 'Invalid JSON';
      return { valid: false, error };
    }
  }, []);

  // Restore from URL share param on mount (once)
  const hasRestoredFromUrl = useRef(false);
  useEffect(() => {
    if (hasRestoredFromUrl.current) return;
    const params = new URLSearchParams(window.location.search);
    const share = params.get(SHARE_PARAM);
    if (!share) return;
    hasRestoredFromUrl.current = true;
    try {
      const decoded = JSON.parse(decodeURIComponent(atob(share))) as { j?: string; c?: string };
      if (typeof decoded?.j === 'string' && typeof decoded?.c === 'string') {
        setJsonInput(decoded.j);
        setCodeInput(decoded.c);
        window.history.replaceState({}, '', window.location.pathname);
        toast({ title: 'Loaded', description: 'Shared state restored from URL' });
      }
    } catch {
      /* ignore invalid share param */
    }
  }, [toast]);

  // Offer to restore previous session on mount
  useEffect(() => {
    if (hasRestoredFromUrl.current) return;
    const saved = loadSavedState();
    if (saved) {
      savedStateRef.current = saved;
      setShowRestoreBanner(true);
    }
  }, []);

  const jsonCodeRef = useRef({ json: jsonInput, code: codeInput });
  jsonCodeRef.current = { json: jsonInput, code: codeInput };
  const debouncedSave = useDebounce(() => {
    try {
      const { json, code } = jsonCodeRef.current;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ json, code }));
    } catch {
      /* ignore */
    }
  }, 800);
  useEffect(() => {
    debouncedSave();
  }, [jsonInput, codeInput, debouncedSave]);

  // Keep parsed JSON data in sync for autocomplete
  useEffect(() => {
    const result = validateJson(jsonInput);
    if (result.valid) {
      setParsedJsonData(result.data);
    }
  }, [jsonInput, validateJson]);

  const executeCode = useCallback(() => {
    const startTime = performance.now();
    const newOutput: OutputEntry[] = [];

    const jsonResult = validateJson(jsonInput);
    setJsonStatus({ valid: jsonResult.valid, error: jsonResult.error });

    if (!jsonResult.valid) {
      const endTime = performance.now();
      newOutput.push({
        type: 'error',
        content: `JSON Parse Error: ${jsonResult.error}\n\nTip: Check for missing commas, quotes, or brackets.`,
        timestamp: new Date(),
      });
      setOutput(newOutput);
      setMeta({
        executionTime: endTime - startTime,
        jsonValid: false,
      });
      return;
    }

    const data = jsonResult.data;

    try {
      // Create custom console
      const logs: { type: 'log' | 'error'; content: string; dataType: string }[] = [];
      const customConsole = {
        log: (...args: unknown[]) => {
          args.forEach((arg) => {
            const formatted = typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg);
            logs.push({ type: 'log', content: formatted, dataType: getDataType(arg) });
          });
        },
        error: (...args: unknown[]) => {
          args.forEach((arg) => {
            const formatted = typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg);
            logs.push({ type: 'error', content: `Error: ${formatted}`, dataType: 'error' });
          });
        },
        info: (...args: unknown[]) => {
          args.forEach((arg) => {
            const formatted = typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg);
            logs.push({ type: 'log', content: formatted, dataType: getDataType(arg) });
          });
        },
      };

      // Clean up code - remove comments that are just comments
      const cleanCode = codeInput
        .split('\n')
        .filter(line => {
          const trimmed = line.trim();
          return trimmed && !trimmed.startsWith('//');
        })
        .join('\n');

      if (!cleanCode.trim()) {
        setOutput([{
          type: 'info',
          content: '// Write some code to see results\n// Example: data.user.name',
          timestamp: new Date(),
        }]);
        setMeta({
          jsonValid: true,
          dataShape: getDataShape(data),
        });
        return;
      }

      // Build function(s): if no return, run each line and display every expression's result
      const lines = cleanCode
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      const hasExplicitReturn = cleanCode.includes('return');
      const multiResult = !hasExplicitReturn && lines.length > 1;

      let fn: (d: unknown, c: typeof customConsole) => unknown;
      if (hasExplicitReturn) {
        fn = new Function('data', 'console', `"use strict";\n${cleanCode}`) as (d: unknown, c: typeof customConsole) => unknown;
      } else if (lines.length === 1) {
        fn = new Function('data', 'console', `"use strict";\nreturn (${lines[0]})`) as (d: unknown, c: typeof customConsole) => unknown;
      } else {
        fn = new Function('data', 'console', `"use strict";\nreturn (undefined)`) as (d: unknown, c: typeof customConsole) => unknown;
      }

      const runId = ++executionRunIdRef.current;
      executionTimedOutRef.current = false;
      setIsExecuting(true);

      const timeoutId = setTimeout(() => {
        if (executionRunIdRef.current !== runId) return;
        executionTimedOutRef.current = true;
        setOutput((prev) => [
          ...prev,
          {
            type: 'error',
            content: `Execution timed out (${EXECUTION_TIMEOUT_MS / 1000}s).`,
            timestamp: new Date(),
          },
        ]);
        setMeta((m) => ({ ...m, jsonValid: true, dataShape: getDataShape(data) }));
        setIsExecuting(false);
      }, EXECUTION_TIMEOUT_MS);

      setTimeout(() => {
        try {
          let results: unknown[];
          if (multiResult) {
            results = [];
            for (const line of lines) {
              const lineFn = new Function('data', 'console', `"use strict"; return (${line})`) as (d: unknown, c: typeof customConsole) => unknown;
              results.push(lineFn(data, customConsole));
            }
          } else {
            const single = fn(data, customConsole);
            results = single !== undefined ? [single] : [];
          }

          const endTime = performance.now();
          if (executionTimedOutRef.current) return;

          logs.forEach((log) => {
            newOutput.push({
              type: log.type,
              content: log.content,
              timestamp: new Date(),
              dataType: log.dataType,
            });
          });
          for (const result of results) {
            const resultStr = typeof result === 'object' && result !== null ? JSON.stringify(result, null, 2) : String(result);
            newOutput.push({
              type: 'result',
              content: resultStr,
              timestamp: new Date(),
              dataType: getDataType(result),
            });
          }
          if (newOutput.length === 0) {
            newOutput.push({
              type: 'info',
              content: 'undefined',
              timestamp: new Date(),
              dataType: 'undefined',
            });
          }
          setOutput(newOutput);
          setMeta({
            executionTime: endTime - startTime,
            jsonValid: true,
            dataShape: getDataShape(data),
          });
        } catch (e) {
          if (executionTimedOutRef.current) return;
          const endTime = performance.now();
          const error = e instanceof Error ? e.message : 'Execution error';
          let helpfulMessage = error;
          if (error.includes('is not defined')) {
            const varName = error.split(' ')[0];
            helpfulMessage = `${error}\n\n💡 Tip: Use 'data.${varName}' to access JSON properties.`;
          } else if (error.includes('Cannot read properties of undefined')) {
            helpfulMessage = `${error}\n\n💡 Tip: The property path doesn't exist in your JSON. Check the structure.`;
          } else if (error.includes('is not a function')) {
            helpfulMessage = `${error}\n\n💡 Tip: You're trying to call something that isn't a function.`;
          }
          newOutput.push({
            type: 'error',
            content: helpfulMessage,
            timestamp: new Date(),
          });
          setOutput(newOutput);
          setMeta({
            executionTime: endTime - startTime,
            jsonValid: true,
            dataShape: getDataShape(data),
          });
        } finally {
          clearTimeout(timeoutId);
          if (!executionTimedOutRef.current) setIsExecuting(false);
        }
      }, 0);
      return;
    } catch (e) {
      const endTime = performance.now();
      const error = e instanceof Error ? e.message : 'Execution error';
      let helpfulMessage = error;
      if (error.includes('is not defined')) {
        const varName = error.split(' ')[0];
        helpfulMessage = `${error}\n\n💡 Tip: Use 'data.${varName}' to access JSON properties.`;
      } else if (error.includes('Cannot read properties of undefined')) {
        helpfulMessage = `${error}\n\n💡 Tip: The property path doesn't exist in your JSON. Check the structure.`;
      } else if (error.includes('is not a function')) {
        helpfulMessage = `${error}\n\n💡 Tip: You're trying to call something that isn't a function.`;
      }
      newOutput.push({
        type: 'error',
        content: helpfulMessage,
        timestamp: new Date(),
      });
      setOutput(newOutput);
      setMeta({
        executionTime: endTime - startTime,
        jsonValid: true,
        dataShape: getDataShape(data),
      });
    }

    setIsExecuting(false);
  }, [jsonInput, codeInput, validateJson]);

  // Debounced execution
  const debouncedExecute = useDebounce(() => {
    if (autoRun) {
      setIsExecuting(true);
      // Small delay for visual feedback
      setTimeout(executeCode, 50);
    }
  }, 500);

  // Auto-run on input change
  useEffect(() => {
    if (autoRun) {
      debouncedExecute();
    }
  }, [jsonInput, codeInput, autoRun, debouncedExecute]);

  const handleJsonChange = (value: string) => {
    setJsonInput(value);
    const result = validateJson(value);
    setJsonStatus({ valid: result.valid, error: result.error });
  };

  const clearOutput = () => {
    setOutput([]);
    setMeta({});
  };

  const formatJson = useCallback(() => {
    const result = validateJson(jsonInput);
    if (!result.valid) {
      toast({ title: 'Invalid JSON', description: result.error, variant: 'destructive' });
      return;
    }
    setJsonInput(JSON.stringify(result.data, null, 2));
    toast({ title: 'Formatted', description: 'JSON formatted with 2-space indent' });
  }, [jsonInput, validateJson, toast]);

  const minifyJson = useCallback(() => {
    const result = validateJson(jsonInput);
    if (!result.valid) {
      toast({ title: 'Invalid JSON', description: result.error, variant: 'destructive' });
      return;
    }
    setJsonInput(JSON.stringify(result.data));
    toast({ title: 'Minified', description: 'JSON minified' });
  }, [jsonInput, validateJson, toast]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadFromFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        try {
          JSON.parse(text);
          setJsonInput(text);
          toast({ title: 'Loaded', description: file.name });
        } catch {
          toast({ title: 'Invalid JSON', description: 'The file does not contain valid JSON.', variant: 'destructive' });
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    },
    [toast]
  );

  const loadFromUrl = useCallback(async () => {
    const url = loadUrlValue.trim();
    if (!url) return;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      try {
        JSON.parse(text);
        setJsonInput(text);
        setLoadUrlOpen(false);
        setLoadUrlValue('');
        toast({ title: 'Loaded', description: 'JSON loaded from URL' });
      } catch {
        toast({ title: 'Invalid JSON', description: 'The URL response is not valid JSON.', variant: 'destructive' });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const isCors = msg.includes('Failed to fetch') || msg.includes('NetworkError');
      toast({
        title: 'Load failed',
        description: isCors ? 'Could not fetch URL (CORS may block this request). Try a JSON CORS proxy or load the file manually.' : msg,
        variant: 'destructive',
      });
    }
  }, [loadUrlValue, toast]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        executeCode();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [executeCode]);

  const shareUrl = useCallback(() => {
    try {
      const payload = btoa(encodeURIComponent(JSON.stringify({ j: jsonInput, c: codeInput })));
      if (payload.length > MAX_SHARE_LENGTH) {
        toast({ title: 'Content too large', description: 'Try shortening JSON or code to share via URL.', variant: 'destructive' });
        return;
      }
      const url = `${window.location.origin}${window.location.pathname}?${SHARE_PARAM}=${encodeURIComponent(payload)}`;
      navigator.clipboard.writeText(url).then(
        () => toast({ title: 'Link copied', description: 'Share this URL to open this state' }),
        () => toast({ title: 'Copy failed', variant: 'destructive' })
      );
    } catch {
      toast({ title: 'Share failed', variant: 'destructive' });
    }
  }, [jsonInput, codeInput, toast]);

  const restoreSession = useCallback(() => {
    const saved = savedStateRef.current;
    if (saved) {
      setJsonInput(saved.json);
      setCodeInput(saved.code);
      setShowRestoreBanner(false);
      savedStateRef.current = null;
      toast({ title: 'Restored', description: 'Previous session restored' });
    }
  }, [toast]);

  return (
    <div className="h-screen flex flex-col bg-background">
      {showRestoreBanner && (
        <div className="flex items-center justify-between gap-4 px-4 py-2 bg-primary/10 border-b border-border text-sm">
          <span className="text-foreground">Restore previous session?</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setShowRestoreBanner(false); savedStateRef.current = null; }}>
              Dismiss
            </Button>
            <Button size="sm" onClick={restoreSession}>Restore</Button>
          </div>
        </div>
      )}
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <FileJson className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            JSON Playground
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant={autoRun ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoRun(!autoRun)}
            className={`gap-2 ${autoRun ? 'bg-success hover:bg-success/90' : ''}`}
          >
            <Zap className={`w-4 h-4 ${autoRun ? 'text-success-foreground' : ''}`} />
            Live
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clearOutput}
            className="gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </Button>
          <Button variant="outline" size="sm" onClick={shareUrl} className="gap-2" title="Copy shareable link">
            <Share2 className="w-4 h-4" />
            Share
          </Button>
          <Button
            onClick={executeCode}
            size="sm"
            className="gap-2 run-button bg-primary hover:bg-primary/90"
          >
            <Play className="w-4 h-4" />
            Run
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* Left Side - JSON & Code */}
          <ResizablePanel defaultSize={50} minSize={30}>
            <ResizablePanelGroup direction="vertical">
              {/* JSON Panel */}
              <ResizablePanel defaultSize={50} minSize={20}>
                <div className="h-full flex flex-col border-r border-border">
                  <PanelHeader
                    title="JSON Data"
                    status={jsonStatus.valid ? 'valid' : 'invalid'}
                    statusText={
                      jsonStatus.valid ? '✓ Valid' : `✗ ${jsonStatus.error?.split(':')[0]}`
                    }
                    actions={
                      <div className="flex items-center gap-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".json,application/json"
                          className="hidden"
                          onChange={handleFileChange}
                        />
                        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={loadFromFile} title="Load from file">
                          <Upload className="w-3.5 h-3.5" />
                          Load file
                        </Button>
                        <Dialog open={loadUrlOpen} onOpenChange={setLoadUrlOpen}>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" title="Load from URL">
                              <Link className="w-3.5 h-3.5" />
                              Load URL
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Load JSON from URL</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              <div className="grid gap-2">
                                <Label htmlFor="load-url">URL</Label>
                                <Input
                                  id="load-url"
                                  placeholder="https://example.com/data.json"
                                  value={loadUrlValue}
                                  onChange={(e) => setLoadUrlValue(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && loadFromUrl()}
                                />
                              </div>
                              <Button onClick={loadFromUrl}>Load</Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={formatJson} title="Format JSON">
                          <AlignLeft className="w-3.5 h-3.5" />
                          Format
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={minifyJson} title="Minify JSON">
                          <Minus className="w-3.5 h-3.5" />
                          Minify
                        </Button>
                        <Tabs
                          value={jsonPanelTab}
                          onValueChange={(v) => {
                            const tab = v as 'editor' | 'tree';
                            setJsonPanelTab(tab);
                            try {
                              localStorage.setItem(JSON_PANEL_TAB_KEY, tab);
                            } catch {
                              /* ignore */
                            }
                          }}
                          className="w-auto"
                        >
                          <TabsList className="h-8">
                            <TabsTrigger value="editor" className="gap-1.5 text-xs px-2">
                              <FileCode className="w-3.5 h-3.5" />
                              Editor
                            </TabsTrigger>
                            <TabsTrigger value="tree" className="gap-1.5 text-xs px-2" disabled={!jsonStatus.valid}>
                              <GitBranch className="w-3.5 h-3.5" />
                              Tree
                            </TabsTrigger>
                          </TabsList>
                        </Tabs>
                      </div>
                    }
                  />
                  <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                    {jsonPanelTab === 'editor' ? (
                      <>
                        {jsonStatus.valid && (
                          <div className="flex-shrink-0 flex items-center gap-2 px-2 py-1 border-b border-border bg-muted/30">
                            <span className="text-xs text-muted-foreground">Use the fold icons in the gutter to collapse nodes, or</span>
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-xs font-medium"
                              onClick={() => {
                                setJsonPanelTab('tree');
                                try {
                                  localStorage.setItem(JSON_PANEL_TAB_KEY, 'tree');
                                } catch {
                                  /* ignore */
                                }
                              }}
                            >
                              switch to Tree view
                            </Button>
                          </div>
                        )}
                        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                          <JsonEditor
                            value={jsonInput}
                            onChange={handleJsonChange}
                            placeholder="Enter your JSON here..."
                          />
                        </div>
                      </>
                    ) : (
                      <div className="flex-1 min-h-0 overflow-auto">
                        <JsonTree
                          data={parsedJsonData}
                          onInsertPath={(path) => setInsertIntoCode(path)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </ResizablePanel>

              <ResizableHandle className="resizer h-1" />

              {/* Code Panel */}
              <ResizablePanel defaultSize={50} minSize={20}>
                <div className="h-full flex flex-col border-r border-border">
                  <PanelHeader
                    title="Code Editor"
                    statusText="JavaScript"
                    actions={
                      <div className="flex items-center gap-1">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" title="Insert snippet">
                              <ListOrdered className="w-3.5 h-3.5" />
                              Snippets
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            {CODE_SNIPPETS.map((snippet) => (
                              <DropdownMenuItem
                                key={snippet.path}
                                onClick={() => setInsertIntoCode(snippet.path)}
                              >
                                {snippet.displayPath}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Code2 className="w-4 h-4 text-muted-foreground" />
                      </div>
                    }
                  />
                  <div className="flex-1 overflow-hidden">
                    <CodeEditor
                      value={codeInput}
                      onChange={setCodeInput}
                      placeholder="Write your code here..."
                      language="javascript"
                      jsonData={parsedJsonData}
                      enableAutocomplete={true}
                      insertText={insertIntoCode}
                      onInsertDone={() => setInsertIntoCode(null)}
                    />
                  </div>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          <ResizableHandle className="resizer w-1" />

          {/* Right Side - Output */}
          <ResizablePanel defaultSize={50} minSize={25}>
            <div className="h-full flex flex-col">
              <PanelHeader
                title="Output"
                actions={<Terminal className="w-4 h-4 text-muted-foreground" />}
              />
              <div className="flex-1 overflow-hidden">
                <OutputPanel 
                  entries={output} 
                  meta={meta}
                  isExecuting={isExecuting}
                />
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
};

export default JsonPlayground;
