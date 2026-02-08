import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Play, Trash2, FileJson, Code2, Terminal, Zap, GitBranch, AlignLeft, Minus, Upload, Link, ListOrdered, Share2, LayoutGrid, PanelRightClose, PanelLeftClose } from 'lucide-react';
import CodeEditor from './CodeEditor';
import JsonEditor from './JsonEditor';
import PanelHeader from './PanelHeader';
import OutputPanel, { OutputEntry, ExecutionMeta } from './OutputPanel';
import JsonTree from './JsonTree';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/hooks/use-toast';
import { CODE_SNIPPETS } from '@/hooks/useAutocomplete';
import Queryable from '@/lib/Queryable';
import type { PanelId, LayoutMode } from '@/lib/playground-types';

const LAYOUT_OPTIONS: { value: LayoutMode; label: string; title: string }[] = [
  { value: 'horizontal', label: 'Row', title: '4 panels in one row' },
  { value: 'vertical', label: 'Column', title: '4 panels in one column' },
  { value: 'grid-2x2', label: '2×2 Grid', title: '2 rows × 2 columns' },
  { value: 'split-left', label: '2 left, 2 right', title: 'Vertical split: 2 panels left, 2 right' },
  { value: 'split-right', label: '1 left, 3 right', title: 'Vertical split: 1 panel left, 3 right' },
  { value: 'split-three-left', label: '3 left, 1 right', title: 'Vertical split: 3 panels left, 1 right' },
  { value: 'top-bottom', label: '2 top, 2 bottom', title: 'Horizontal split: 2 panels top, 2 bottom' },
  { value: 'bottom-top', label: '1 top, 3 bottom', title: 'Horizontal split: 1 panel top, 3 bottom' },
  { value: 'three-top', label: '3 top, 1 bottom', title: 'Horizontal split: 3 panels top, 1 bottom' },
];

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

const DEFAULT_CODE = `// Use Dump(value) to see output. Multi-line code is supported.
const names = data.posts.map(p => p.title);
Dump(names);
// LINQ-style (C#-friendly):
Dump(Queryable.From(data.posts).Where(p => p.id==1).ToArray());`;

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
const PANEL_ORDER_KEY = 'json-playground-panel-order';
const LAYOUT_MODE_KEY = 'json-playground-layout-mode';
const COLLAPSED_PANELS_KEY = 'json-playground-collapsed-panels';
const SHARE_PARAM = 's';
const MAX_SHARE_LENGTH = 1800;

const PANEL_LABELS: Record<PanelId, string> = {
  json: 'JSON Data',
  tree: 'Tree',
  code: 'Code Editor',
  output: 'Output',
};

function loadCollapsedPanels(): PanelId[] {
  try {
    const raw = localStorage.getItem(COLLAPSED_PANELS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is PanelId => VALID_PANEL_IDS.includes(id as PanelId));
  } catch {
    return [];
  }
}

export type { PanelId, LayoutMode } from '@/lib/playground-types';

const DEFAULT_PANEL_ORDER: PanelId[] = ['json', 'tree', 'code', 'output'];
const VALID_PANEL_IDS: PanelId[] = ['json', 'tree', 'code', 'output'];

function loadPanelOrder(): PanelId[] {
  try {
    const raw = localStorage.getItem(PANEL_ORDER_KEY);
    if (!raw) return [...DEFAULT_PANEL_ORDER];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [...DEFAULT_PANEL_ORDER];
    const order = parsed.filter((id): id is PanelId => VALID_PANEL_IDS.includes(id as PanelId));
    if (order.length === 4) {
      const seen = new Set<PanelId>();
      for (const id of order) {
        if (seen.has(id)) return [...DEFAULT_PANEL_ORDER];
        seen.add(id);
      }
      return order;
    }
    // Migrate old 3-panel saved order: insert 'tree' after 'json'
    if (order.length === 3) {
      const migrated: PanelId[] = [];
      for (const id of order) {
        migrated.push(id);
        if (id === 'json') migrated.push('tree');
      }
      if (migrated.length === 4) return migrated;
    }
    return [...DEFAULT_PANEL_ORDER];
  } catch {
    return [...DEFAULT_PANEL_ORDER];
  }
}

const VALID_LAYOUT_MODES: LayoutMode[] = [
  'horizontal', 'vertical', 'grid-2x2', 'split-left', 'split-right', 'split-three-left', 'top-bottom', 'bottom-top', 'three-top',
];

function getLayoutPanelDescription(
  mode: LayoutMode,
  panelOrder: PanelId[],
  labels: Record<PanelId, string>
): string {
  const a = labels[panelOrder[0]];
  const b = labels[panelOrder[1]];
  const c = labels[panelOrder[2]];
  const d = labels[panelOrder[3]];
  switch (mode) {
    case 'horizontal':
      return `${a} | ${b} | ${c} | ${d} (left to right)`;
    case 'vertical':
      return `${a} → ${b} → ${c} → ${d} (top to bottom)`;
    case 'grid-2x2':
      return `Top: ${a}, ${b}. Bottom: ${c}, ${d}.`;
    case 'split-left':
      return `Left: ${a}, ${b}. Right: ${c}, ${d}.`;
    case 'split-right':
      return `Left: ${a}. Right: ${b}, ${c}, ${d}.`;
    case 'split-three-left':
      return `Left: ${a}, ${b}, ${c}. Right: ${d}.`;
    case 'top-bottom':
      return `Top: ${a}, ${b}. Bottom: ${c}, ${d}.`;
    case 'bottom-top':
      return `Top: ${a}. Bottom: ${b}, ${c}, ${d}.`;
    case 'three-top':
      return `Top: ${a}, ${b}, ${c}. Bottom: ${d}.`;
    default:
      return '';
  }
}

function loadLayoutMode(): LayoutMode {
  try {
    const saved = localStorage.getItem(LAYOUT_MODE_KEY);
    if (saved === 'split') return 'split-left'; // migrate old value
    if (saved && VALID_LAYOUT_MODES.includes(saved as LayoutMode)) return saved as LayoutMode;
    return 'split-right'; // default: one left, two right
  } catch {
    return 'split-right';
  }
}

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
  const [insertIntoCode, setInsertIntoCode] = useState<string | null>(null);
  const [loadUrlOpen, setLoadUrlOpen] = useState(false);
  const [loadUrlValue, setLoadUrlValue] = useState('');
  const [panelOrder, setPanelOrder] = useState<PanelId[]>(loadPanelOrder);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(loadLayoutMode);
  const [collapsedPanels, setCollapsedPanels] = useState<Set<PanelId>>(
    () => new Set(loadCollapsedPanels())
  );
  const panelRefs = useRef<Record<PanelId, { collapse: () => void; expand: (minSize?: number) => void } | null>>({
    json: null,
    tree: null,
    code: null,
    output: null,
  });
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

  useEffect(() => {
    try {
      localStorage.setItem(PANEL_ORDER_KEY, JSON.stringify(panelOrder));
    } catch {
      /* ignore */
    }
  }, [panelOrder]);

  useEffect(() => {
    try {
      localStorage.setItem(LAYOUT_MODE_KEY, layoutMode);
    } catch {
      /* ignore */
    }
  }, [layoutMode]);

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSED_PANELS_KEY, JSON.stringify([...collapsedPanels]));
    } catch {
      /* ignore */
    }
  }, [collapsedPanels]);

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
          content: '// Write some code to see results\n// Use Dump(value) to display output. Example: Dump(data.user.name)',
          timestamp: new Date(),
        }]);
        setMeta({
          jsonValid: true,
          dataShape: getDataShape(data),
        });
        return;
      }

      const usesDump = cleanCode.includes('Dump(');

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

      if (usesDump) {
        // Dump-only path: run full script with Dump injected; output only what's passed to Dump (and console)
        const dumpValues: unknown[] = [];
        const Dump = (...args: unknown[]) => {
          args.forEach((v) => dumpValues.push(v));
        };
        setTimeout(() => {
          try {
            const fn = new Function('data', 'console', 'Dump', 'Queryable', `"use strict";\n${cleanCode}`) as (d: unknown, c: typeof customConsole, Dump: (...args: unknown[]) => void, Q: unknown) => void;
            fn(data, customConsole, Dump, Queryable);

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
            for (const value of dumpValues) {
              const resultStr = typeof value === 'object' && value !== null ? JSON.stringify(value, null, 2) : String(value);
              newOutput.push({
                type: 'result',
                content: resultStr,
                timestamp: new Date(),
                dataType: getDataType(value),
              });
            }
            if (newOutput.length === 0) {
              newOutput.push({
                type: 'info',
                content: 'No output. Use Dump(value) to display results.',
                timestamp: new Date(),
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
      }

      // Legacy path: no Dump in code — single return or per-line results
      const lines = cleanCode
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      const hasExplicitReturn = cleanCode.includes('return');
      const multiResult = !hasExplicitReturn && lines.length > 1;

      type ExecFn = (d: unknown, c: typeof customConsole, Q: unknown) => unknown;
      let fn: ExecFn;
      if (hasExplicitReturn) {
        fn = new Function('data', 'console', 'Queryable', `"use strict";\n${cleanCode}`) as ExecFn;
      } else if (lines.length === 1) {
        fn = new Function('data', 'console', 'Queryable', `"use strict";\nreturn (${lines[0]})`) as ExecFn;
      } else {
        fn = new Function('data', 'console', 'Queryable', `"use strict";\nreturn (undefined)`) as ExecFn;
      }

      setTimeout(() => {
        try {
          let results: unknown[];
          if (multiResult) {
            results = [];
            for (const line of lines) {
              const lineFn = new Function('data', 'console', 'Queryable', `"use strict"; return (${line})`) as ExecFn;
              results.push(lineFn(data, customConsole, Queryable));
            }
          } else {
            const single = fn(data, customConsole, Queryable);
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

  const panelStorage = useCallback((suffix: string) => ({
    getItem: (name: string) => {
      try {
        return localStorage.getItem(`json-playground-layout-${suffix}-${name}`) ?? null;
      } catch {
        return null;
      }
    },
    setItem: (name: string, value: string) => {
      try {
        localStorage.setItem(`json-playground-layout-${suffix}-${name}`, value);
      } catch {
        /* ignore */
      }
    },
  }), []);

  type PanelActions = {
    isCollapsed: boolean;
    onCollapse: () => void;
    onExpand: () => void;
  };

  useEffect(() => {
    collapsedPanels.forEach((id) => panelRefs.current[id]?.collapse());
  }, [collapsedPanels]);

  const expandPanel = useCallback((id: PanelId) => {
    setCollapsedPanels((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    requestAnimationFrame(() => panelRefs.current[id]?.expand());
  }, []);

  const getPanelActions = useCallback((id: PanelId): PanelActions => ({
    isCollapsed: collapsedPanels.has(id),
    onCollapse: () => setCollapsedPanels((prev) => new Set(prev).add(id)),
    onExpand: () => expandPanel(id),
  }), [collapsedPanels, expandPanel]);

  const renderPanelContent = useCallback((id: PanelId, panelActions: PanelActions) => {
    if (panelActions.isCollapsed) {
      return <div className="h-full min-h-0" aria-hidden />;
    }
    switch (id) {
      case 'json':
        return (
          <div className="h-full flex flex-col border-r border-border">
            <PanelHeader
              title="JSON Data"
              status={jsonStatus.valid ? 'valid' : 'invalid'}
              statusText={
                jsonStatus.valid ? '✓ Valid' : `✗ ${jsonStatus.error?.split(':')[0]}`
              }
              actions={
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={panelActions.onCollapse} title="Hide panel">
                    <PanelRightClose className="w-3.5 h-3.5" />
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <Button variant="ghost" size="sm" className="h-8 gap-2 text-xs" onClick={loadFromFile} title="Load from file">
                    <Upload className="w-3.5 h-3.5" />
                    Load file
                  </Button>
                  <Dialog open={loadUrlOpen} onOpenChange={setLoadUrlOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 gap-2 text-xs" title="Load from URL">
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
                  <Button variant="ghost" size="sm" className="h-8 gap-2 text-xs" onClick={formatJson} title="Format JSON">
                    <AlignLeft className="w-3.5 h-3.5" />
                    Format
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 gap-2 text-xs" onClick={minifyJson} title="Minify JSON">
                    <Minus className="w-3.5 h-3.5" />
                    Minify
                  </Button>
                </div>
              }
            />
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <JsonEditor
                  value={jsonInput}
                  onChange={handleJsonChange}
                  placeholder="Enter your JSON here..."
                />
              </div>
            </div>
          </div>
        );
      case 'tree':
        return (
          <div className="h-full flex flex-col border-r border-border">
            <PanelHeader
              title="Tree"
              status={jsonStatus.valid ? 'valid' : 'invalid'}
              statusText={
                jsonStatus.valid ? '✓ Valid' : 'No valid JSON'
              }
              actions={
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={panelActions.onCollapse} title="Hide panel">
                    <PanelRightClose className="w-3.5 h-3.5" />
                  </Button>
                  <GitBranch className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              }
            />
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              {jsonStatus.valid && parsedJsonData != null ? (
                <div className="flex-1 min-h-0 overflow-auto">
                  <JsonTree
                    data={parsedJsonData}
                    onInsertPath={(path) => setInsertIntoCode(path)}
                  />
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center p-4 text-center text-muted-foreground text-sm">
                  Enter valid JSON in the JSON Data panel to see the tree.
                </div>
              )}
            </div>
          </div>
        );
      case 'code':
        return (
          <div className="h-full flex flex-col border-r border-border">
            <PanelHeader
              title="Code Editor"
              statusText="JavaScript"
              actions={
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={panelActions.onCollapse} title="Hide panel">
                    <PanelRightClose className="w-3.5 h-3.5" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 gap-2 text-xs" title="Insert snippet">
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
                  <Code2 className="w-3.5 h-3.5 text-muted-foreground" />
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
        );
      case 'output':
        return (
          <div className="h-full flex flex-col">
            <PanelHeader
              title="Output"
              actions={
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={panelActions.onCollapse} title="Hide panel">
                    <PanelRightClose className="w-3.5 h-3.5" />
                  </Button>
                  <Terminal className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              }
            />
            <div className="flex-1 overflow-hidden">
              <OutputPanel
                entries={output}
                meta={meta}
                isExecuting={isExecuting}
              />
            </div>
          </div>
        );
    }
  }, [
    collapsedPanels,
    getPanelActions,
    jsonStatus.valid,
    jsonStatus.error,
    jsonInput,
    parsedJsonData,
    loadUrlOpen,
    loadUrlValue,
    codeInput,
    insertIntoCode,
    output,
    meta,
    isExecuting,
    handleJsonChange,
    loadFromFile,
    handleFileChange,
    loadFromUrl,
    setLoadUrlOpen,
    setLoadUrlValue,
    formatJson,
    minifyJson,
    setCodeInput,
    setInsertIntoCode,
  ]);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between gap-4 px-6 py-4 border-b border-border bg-card">
        <div className="flex shrink-0 items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <FileJson className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            JSON Playground
          </h1>
        </div>
        {showRestoreBanner && (
          <div className="flex min-w-0 shrink items-center gap-2 rounded-md bg-primary/10 px-3 py-1.5 text-sm">
            <span className="truncate text-foreground">Restore previous session?</span>
            <Button variant="outline" size="sm" className="h-8 shrink-0 gap-1.5 text-xs" onClick={() => { setShowRestoreBanner(false); savedStateRef.current = null; }}>
              Dismiss
            </Button>
            <Button size="sm" className="h-8 shrink-0 gap-1.5 text-xs" onClick={restoreSession}>Restore</Button>
          </div>
        )}
        <div className="flex shrink-0 items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                title={`Panel layout. Order: ${panelOrder.map((id) => PANEL_LABELS[id]).join(' → ')}`}
                aria-label="Panel layout"
              >
                <LayoutGrid className="w-4 h-4" />
                Layout
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              {LAYOUT_OPTIONS.map((opt) => (
                <DropdownMenuItem
                  key={opt.value}
                  onClick={() => setLayoutMode(opt.value)}
                  title={getLayoutPanelDescription(opt.value, panelOrder, PANEL_LABELS)}
                  className="flex flex-col items-start gap-0.5 py-2"
                >
                  <span className="font-medium">{opt.label}</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    {getLayoutPanelDescription(opt.value, panelOrder, PANEL_LABELS)}
                  </span>
                </DropdownMenuItem>
              ))}
              {collapsedPanels.size > 0 && (
                <>
                  <DropdownMenuSeparator />
                  {([...collapsedPanels]).map((id) => (
                    <DropdownMenuItem
                      key={id}
                      onClick={() => expandPanel(id)}
                      title={`Show ${PANEL_LABELS[id]} panel`}
                    >
                      <PanelLeftClose className="w-3.5 h-3.5 mr-2" />
                      Show {PANEL_LABELS[id]}
                    </DropdownMenuItem>
                  ))}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
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

      {/* Main Content: panels in user order — layout matches selected mode */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {layoutMode === 'horizontal' && (
          <ResizablePanelGroup
            direction="horizontal"
            id="playground-horizontal"
            storage={panelStorage('horizontal')}
          >
            {panelOrder.map((id, i) => (
              <React.Fragment key={id}>
                <ResizablePanel
                  ref={(r) => { if (r) panelRefs.current[id] = r; }}
                  id={id}
                  order={i + 1}
                  defaultSize={100 / 4}
                  minSize={20}
                  collapsible
                  collapsedSize={0}
                >
                  {renderPanelContent(id, getPanelActions(id))}
                </ResizablePanel>
                {i < panelOrder.length - 1 && <ResizableHandle className="resizer w-1" />}
              </React.Fragment>
            ))}
          </ResizablePanelGroup>
        )}
        {layoutMode === 'vertical' && (
          <ResizablePanelGroup
            direction="vertical"
            id="playground-vertical"
            storage={panelStorage('vertical')}
          >
            {panelOrder.map((id, i) => (
              <React.Fragment key={id}>
                <ResizablePanel
                  ref={(r) => { if (r) panelRefs.current[id] = r; }}
                  id={id}
                  order={i + 1}
                  defaultSize={100 / 4}
                  minSize={15}
                  collapsible
                  collapsedSize={0}
                >
                  {renderPanelContent(id, getPanelActions(id))}
                </ResizablePanel>
                {i < panelOrder.length - 1 && <ResizableHandle className="resizer h-1" />}
              </React.Fragment>
            ))}
          </ResizablePanelGroup>
        )}
        {layoutMode === 'grid-2x2' && (
          <ResizablePanelGroup
            direction="vertical"
            id="playground-grid-2x2-root"
            storage={panelStorage('grid-2x2-root')}
          >
            <ResizablePanel id="grid-2x2-top" order={1} defaultSize={50} minSize={25}>
              <ResizablePanelGroup
                direction="horizontal"
                id="playground-grid-2x2-top"
                storage={panelStorage('grid-2x2-top')}
              >
                <ResizablePanel
                  ref={(r) => { if (r) panelRefs.current[panelOrder[0]] = r; }}
                  id={panelOrder[0]}
                  order={1}
                  defaultSize={50}
                  minSize={20}
                  collapsible
                  collapsedSize={0}
                >
                  {renderPanelContent(panelOrder[0], getPanelActions(panelOrder[0]))}
                </ResizablePanel>
                <ResizableHandle className="resizer w-1" />
                <ResizablePanel
                  ref={(r) => { if (r) panelRefs.current[panelOrder[1]] = r; }}
                  id={panelOrder[1]}
                  order={2}
                  defaultSize={50}
                  minSize={20}
                  collapsible
                  collapsedSize={0}
                >
                  {renderPanelContent(panelOrder[1], getPanelActions(panelOrder[1]))}
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>
            <ResizableHandle className="resizer h-1" />
            <ResizablePanel id="grid-2x2-bottom" order={2} defaultSize={50} minSize={25}>
              <ResizablePanelGroup
                direction="horizontal"
                id="playground-grid-2x2-bottom"
                storage={panelStorage('grid-2x2-bottom')}
              >
                <ResizablePanel
                  ref={(r) => { if (r) panelRefs.current[panelOrder[2]] = r; }}
                  id={panelOrder[2]}
                  order={1}
                  defaultSize={50}
                  minSize={20}
                  collapsible
                  collapsedSize={0}
                >
                  {renderPanelContent(panelOrder[2], getPanelActions(panelOrder[2]))}
                </ResizablePanel>
                <ResizableHandle className="resizer w-1" />
                <ResizablePanel
                  ref={(r) => { if (r) panelRefs.current[panelOrder[3]] = r; }}
                  id={panelOrder[3]}
                  order={2}
                  defaultSize={50}
                  minSize={20}
                  collapsible
                  collapsedSize={0}
                >
                  {renderPanelContent(panelOrder[3], getPanelActions(panelOrder[3]))}
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
        {layoutMode === 'split-left' && (
          <ResizablePanelGroup
            direction="horizontal"
            id="playground-split-left-root"
            storage={panelStorage('split-left-root')}
          >
            <ResizablePanel id="split-left-group" order={1} defaultSize={50} minSize={30}>
              <ResizablePanelGroup
                direction="vertical"
                id="playground-split-left"
                storage={panelStorage('split-left')}
              >
                {panelOrder.slice(0, 2).map((id, i) => (
                  <React.Fragment key={id}>
                    <ResizablePanel
                      ref={(r) => { if (r) panelRefs.current[id] = r; }}
                      id={id}
                      order={i + 1}
                      defaultSize={50}
                      minSize={20}
                      collapsible
                      collapsedSize={0}
                    >
                      {renderPanelContent(id, getPanelActions(id))}
                    </ResizablePanel>
                    {i === 0 && <ResizableHandle className="resizer h-1" />}
                  </React.Fragment>
                ))}
              </ResizablePanelGroup>
            </ResizablePanel>
            <ResizableHandle className="resizer w-1" />
            <ResizablePanel id="split-left-right-group" order={2} defaultSize={50} minSize={30}>
              <ResizablePanelGroup
                direction="vertical"
                id="playground-split-left-right"
                storage={panelStorage('split-left-right')}
              >
                {panelOrder.slice(2, 4).map((id, i) => (
                  <React.Fragment key={id}>
                    <ResizablePanel
                      ref={(r) => { if (r) panelRefs.current[id] = r; }}
                      id={id}
                      order={i + 1}
                      defaultSize={50}
                      minSize={20}
                      collapsible
                      collapsedSize={0}
                    >
                      {renderPanelContent(id, getPanelActions(id))}
                    </ResizablePanel>
                    {i === 0 && <ResizableHandle className="resizer h-1" />}
                  </React.Fragment>
                ))}
              </ResizablePanelGroup>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
        {layoutMode === 'split-right' && (
          <ResizablePanelGroup
            direction="horizontal"
            id="playground-split-right-root"
            storage={panelStorage('split-right-root')}
          >
            <ResizablePanel
              ref={(r) => { if (r) panelRefs.current[panelOrder[0]] = r; }}
              id={panelOrder[0]}
              order={1}
              defaultSize={50}
              minSize={25}
              collapsible
              collapsedSize={0}
            >
              {renderPanelContent(panelOrder[0], getPanelActions(panelOrder[0]))}
            </ResizablePanel>
            <ResizableHandle className="resizer w-1" />
            <ResizablePanel id="split-right-group" order={2} defaultSize={50} minSize={30}>
              <ResizablePanelGroup
                direction="vertical"
                id="playground-split-right"
                storage={panelStorage('split-right')}
              >
                {panelOrder.slice(1, 4).map((id, i) => (
                  <React.Fragment key={id}>
                    <ResizablePanel
                      ref={(r) => { if (r) panelRefs.current[id] = r; }}
                      id={id}
                      order={i + 1}
                      defaultSize={100 / 3}
                      minSize={15}
                      collapsible
                      collapsedSize={0}
                    >
                      {renderPanelContent(id, getPanelActions(id))}
                    </ResizablePanel>
                    {i < 2 && <ResizableHandle className="resizer h-1" />}
                  </React.Fragment>
                ))}
              </ResizablePanelGroup>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
        {layoutMode === 'split-three-left' && (
          <ResizablePanelGroup
            direction="horizontal"
            id="playground-split-three-left-root"
            storage={panelStorage('split-three-left-root')}
          >
            <ResizablePanel id="split-three-left-group" order={1} defaultSize={50} minSize={30}>
              <ResizablePanelGroup
                direction="vertical"
                id="playground-split-three-left"
                storage={panelStorage('split-three-left')}
              >
                {panelOrder.slice(0, 3).map((id, i) => (
                  <React.Fragment key={id}>
                    <ResizablePanel
                      ref={(r) => { if (r) panelRefs.current[id] = r; }}
                      id={id}
                      order={i + 1}
                      defaultSize={100 / 3}
                      minSize={15}
                      collapsible
                      collapsedSize={0}
                    >
                      {renderPanelContent(id, getPanelActions(id))}
                    </ResizablePanel>
                    {i < 2 && <ResizableHandle className="resizer h-1" />}
                  </React.Fragment>
                ))}
              </ResizablePanelGroup>
            </ResizablePanel>
            <ResizableHandle className="resizer w-1" />
            <ResizablePanel
              ref={(r) => { if (r) panelRefs.current[panelOrder[3]] = r; }}
              id={panelOrder[3]}
              order={2}
              defaultSize={50}
              minSize={25}
              collapsible
              collapsedSize={0}
            >
              {renderPanelContent(panelOrder[3], getPanelActions(panelOrder[3]))}
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
        {layoutMode === 'top-bottom' && (
          <ResizablePanelGroup
            direction="vertical"
            id="playground-top-bottom-root"
            storage={panelStorage('top-bottom-root')}
          >
            <ResizablePanel id="top-group" order={1} defaultSize={50} minSize={30}>
              <ResizablePanelGroup
                direction="horizontal"
                id="playground-top-bottom-top"
                storage={panelStorage('top-bottom-top')}
              >
                <ResizablePanel
                  ref={(r) => { if (r) panelRefs.current[panelOrder[0]] = r; }}
                  id={panelOrder[0]}
                  order={1}
                  defaultSize={50}
                  minSize={20}
                  collapsible
                  collapsedSize={0}
                >
                  {renderPanelContent(panelOrder[0], getPanelActions(panelOrder[0]))}
                </ResizablePanel>
                <ResizableHandle className="resizer w-1" />
                <ResizablePanel
                  ref={(r) => { if (r) panelRefs.current[panelOrder[1]] = r; }}
                  id={panelOrder[1]}
                  order={2}
                  defaultSize={50}
                  minSize={20}
                  collapsible
                  collapsedSize={0}
                >
                  {renderPanelContent(panelOrder[1], getPanelActions(panelOrder[1]))}
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>
            <ResizableHandle className="resizer h-1" />
            <ResizablePanel id="top-bottom-bottom-group" order={2} defaultSize={50} minSize={30}>
              <ResizablePanelGroup
                direction="horizontal"
                id="playground-top-bottom-bottom"
                storage={panelStorage('top-bottom-bottom')}
              >
                {panelOrder.slice(2, 4).map((id, i) => (
                  <React.Fragment key={id}>
                    <ResizablePanel
                      ref={(r) => { if (r) panelRefs.current[id] = r; }}
                      id={id}
                      order={i + 1}
                      defaultSize={50}
                      minSize={20}
                      collapsible
                      collapsedSize={0}
                    >
                      {renderPanelContent(id, getPanelActions(id))}
                    </ResizablePanel>
                    {i === 0 && <ResizableHandle className="resizer w-1" />}
                  </React.Fragment>
                ))}
              </ResizablePanelGroup>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
        {layoutMode === 'bottom-top' && (
          <ResizablePanelGroup
            direction="vertical"
            id="playground-bottom-top-root"
            storage={panelStorage('bottom-top-root')}
          >
            <ResizablePanel
              ref={(r) => { if (r) panelRefs.current[panelOrder[0]] = r; }}
              id={panelOrder[0]}
              order={1}
              defaultSize={50}
              minSize={25}
              collapsible
              collapsedSize={0}
            >
              {renderPanelContent(panelOrder[0], getPanelActions(panelOrder[0]))}
            </ResizablePanel>
            <ResizableHandle className="resizer h-1" />
            <ResizablePanel id="bottom-group" order={2} defaultSize={50} minSize={30}>
              <ResizablePanelGroup
                direction="horizontal"
                id="playground-bottom-top-bottom"
                storage={panelStorage('bottom-top-bottom')}
              >
                {panelOrder.slice(1, 4).map((id, i) => (
                  <React.Fragment key={id}>
                    <ResizablePanel
                      ref={(r) => { if (r) panelRefs.current[id] = r; }}
                      id={id}
                      order={i + 1}
                      defaultSize={100 / 3}
                      minSize={15}
                      collapsible
                      collapsedSize={0}
                    >
                      {renderPanelContent(id, getPanelActions(id))}
                    </ResizablePanel>
                    {i < 2 && <ResizableHandle className="resizer w-1" />}
                  </React.Fragment>
                ))}
              </ResizablePanelGroup>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
        {layoutMode === 'three-top' && (
          <ResizablePanelGroup
            direction="vertical"
            id="playground-three-top-root"
            storage={panelStorage('three-top-root')}
          >
            <ResizablePanel id="three-top-top-group" order={1} defaultSize={50} minSize={30}>
              <ResizablePanelGroup
                direction="horizontal"
                id="playground-three-top-top"
                storage={panelStorage('three-top-top')}
              >
                {panelOrder.slice(0, 3).map((id, i) => (
                  <React.Fragment key={id}>
                    <ResizablePanel
                      ref={(r) => { if (r) panelRefs.current[id] = r; }}
                      id={id}
                      order={i + 1}
                      defaultSize={100 / 3}
                      minSize={15}
                      collapsible
                      collapsedSize={0}
                    >
                      {renderPanelContent(id, getPanelActions(id))}
                    </ResizablePanel>
                    {i < 2 && <ResizableHandle className="resizer w-1" />}
                  </React.Fragment>
                ))}
              </ResizablePanelGroup>
            </ResizablePanel>
            <ResizableHandle className="resizer h-1" />
            <ResizablePanel
              ref={(r) => { if (r) panelRefs.current[panelOrder[3]] = r; }}
              id={panelOrder[3]}
              order={2}
              defaultSize={50}
              minSize={25}
              collapsible
              collapsedSize={0}
            >
              {renderPanelContent(panelOrder[3], getPanelActions(panelOrder[3]))}
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>
    </div>
  );
};

export default JsonPlayground;
