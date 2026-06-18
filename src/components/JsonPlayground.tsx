import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Link as RouterLink } from 'react-router-dom';
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Play, Trash2, FileJson, Code2, Terminal, Zap, GitBranch, AlignLeft, Minus, Upload, Link, ListOrdered, Share2, Plus, X, FileDown, LayoutGrid, Download, ArrowDownAZ, HelpCircle, GitCompare, Search, FileUp } from 'lucide-react';
import JsCodeEditor from './JsCodeEditor';
import JsonDiffDialog from './JsonDiffDialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import JsonEditor from './JsonEditor';
import PanelHeader from './PanelHeader';
import OutputPanel, { OutputEntry, ExecutionMeta, OutputHistoryItem } from './OutputPanel';
import JsonTree from './JsonTree';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/hooks/use-toast';
import { CODE_SNIPPETS } from '@/hooks/useAutocomplete';
import { parseJson, sortJsonKeys, jsonStatusFromParse, type JsonParseResult } from '@/lib/json-parse';
import { downloadText } from '@/lib/download';
import { useJsonExecutor } from '@/hooks/useJsonExecutor';
import { buildShareUrl, decodeShare } from '@/lib/share-state';
import { JSON_SAMPLES } from '@/lib/json-samples';
import { jsonToXaml } from '@/lib/xaml-json-convert';
import { jsonToYaml } from '@/lib/yaml-json-convert';
import { jsonToCsv } from '@/lib/csv-json-convert';
import { jsonToToml } from '@/lib/toml-json-convert';
import { jsonToEnv } from '@/lib/env-json-convert';
import { validateAgainstSchema, schemaToDiagnostics } from '@/lib/json-schema-validate';
import type { Diagnostic } from '@codemirror/lint';
import type { PanelId } from '@/lib/playground-types';
import {
  type LayoutNode,
  type LayoutLeaf,
  type LayoutSplit,
  type DropPosition,
  loadLayoutWithMigration,
  saveLayout,
  getDefaultLayout,
  getFirstLeafId,
  findNodeAndParent,
  removeTabFromTree,
  insertTabIntoNode,
  getPanelIdsInTree,
  updateSplitRatio,
} from '@/lib/layout-tree';

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

const STORAGE_KEY = 'json-playground-state';
const SHARE_PARAM = 's';
const HELP_DISMISSED_KEY = 'json-playground-help-dismissed';
const SCHEMA_STORAGE_KEY = 'json-playground-schema';
const SESSION_EXPORT_VERSION = 1;

const PANEL_LABELS: Record<PanelId, string> = {
  json: 'JSON Data',
  tree: 'Tree',
  code: 'Code Editor',
  output: 'Output',
};

const PANEL_ICONS: Record<PanelId, React.ComponentType<{ size?: number; className?: string }>> = {
  json: FileJson as React.ComponentType<{ size?: number; className?: string }>,
  tree: GitBranch as React.ComponentType<{ size?: number; className?: string }>,
  code: Code2 as React.ComponentType<{ size?: number; className?: string }>,
  output: Terminal as React.ComponentType<{ size?: number; className?: string }>,
};

export type { PanelId } from '@/lib/playground-types';

const VALID_PANEL_IDS: PanelId[] = ['json', 'tree', 'code', 'output'];

export type PanelActions = {
  isCollapsed: boolean;
  onCollapse: () => void;
  onExpand: () => void;
};

function DropZoneOverlay({ active }: { active: DropPosition | null }) {
  if (!active) return null;
  return (
    <div
      className="absolute inset-0 z-50 pointer-events-none border-2 border-primary/50 bg-primary/10 transition-all duration-75 rounded-sm"
      style={{
        ...(active === 'center' && { inset: 0 }),
        ...(active === 'left' && { left: 0, top: 0, bottom: 0, width: '33%' }),
        ...(active === 'right' && { right: 0, top: 0, bottom: 0, width: '33%', left: 'auto' }),
        ...(active === 'top' && { top: 0, left: 0, right: 0, height: '33%' }),
        ...(active === 'bottom' && { bottom: 0, left: 0, right: 0, height: '33%', top: 'auto' }),
      }}
    />
  );
}

function DraggableTab({
  tabId,
  active,
  onClick,
  onClose,
}: {
  tabId: PanelId;
  active: boolean;
  onClick: () => void;
  onClose: () => void;
}) {
  const Icon = PANEL_ICONS[tabId];
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('tabId', tabId);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onClick={onClick}
      className={`group flex items-center gap-2 px-3 py-2 text-xs font-medium cursor-pointer border-r border-border min-w-fit select-none relative
          ${active ? 'bg-muted text-foreground' : 'bg-background/80 text-muted-foreground hover:bg-muted/80 hover:text-foreground'}
        `}
    >
      {active && <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary" />}
      {Icon && <Icon size={12} className={active ? 'text-primary' : ''} />}
      <span>{PANEL_LABELS[tabId]}</span>
      <X
        size={12}
        className="ml-1 opacity-0 group-hover:opacity-100 hover:text-destructive"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
      />
    </div>
  );
}

function LeafLayoutNode({
  node,
  onTabClick,
  onAddTab,
  onCloseTab,
  onMoveTab,
  renderContent,
  getPanelActions,
  closedPanelIds: closed,
}: {
  node: LayoutLeaf;
  onTabClick: (nodeId: string, tabId: PanelId) => void;
  onAddTab: (nodeId: string, tabId: PanelId) => void;
  onCloseTab: (nodeId: string, tabId: PanelId) => void;
  onMoveTab: (tabId: PanelId, targetNodeId: string, position: DropPosition) => void;
  renderContent: (id: PanelId, actions: PanelActions) => React.ReactNode;
  getPanelActions: (id: PanelId) => PanelActions;
  closedPanelIds: PanelId[];
}) {
  const [dragOverZone, setDragOverZone] = useState<DropPosition | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const w = rect.width;
    const h = rect.height;
    const edgeThreshold = 0.25;
    if (x < w * edgeThreshold) setDragOverZone('left');
    else if (x > w * (1 - edgeThreshold)) setDragOverZone('right');
    else if (y < h * edgeThreshold) setDragOverZone('top');
    else if (y > h * (1 - edgeThreshold)) setDragOverZone('bottom');
    else setDragOverZone('center');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const tabId = e.dataTransfer.getData('tabId') as PanelId | '';
    if (tabId && VALID_PANEL_IDS.includes(tabId) && dragOverZone) {
      onMoveTab(tabId as PanelId, node.id, dragOverZone);
    }
    setDragOverZone(null);
  };

  const content = node.activeTab
    ? renderContent(node.activeTab, getPanelActions(node.activeTab))
    : (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        {closed.length > 0 ? 'Add a panel using +' : 'No panels'}
      </div>
    );

  return (
    <div
      className="flex flex-col h-full w-full bg-background relative border border-border/50 overflow-hidden rounded-sm"
      onDragOver={handleDragOver}
      onDragLeave={() => setDragOverZone(null)}
      onDrop={handleDrop}
    >
      <DropZoneOverlay active={dragOverZone} />
      <div className="flex bg-muted/50 border-b border-border min-h-[36px] overflow-hidden shrink-0">
        <div className="flex overflow-x-auto flex-1 min-w-0">
          {node.tabs.map((tabId) => (
            <DraggableTab
              key={tabId}
              tabId={tabId}
              active={node.activeTab === tabId}
              onClick={() => onTabClick(node.id, tabId)}
              onClose={() => onCloseTab(node.id, tabId)}
            />
          ))}
          {node.tabs.length === 0 && (
            <span className="px-3 py-2 text-xs text-muted-foreground font-medium uppercase">Empty</span>
          )}
        </div>
        {closed.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="px-2 hover:bg-muted text-muted-foreground border-l border-border flex items-center" aria-label="Add panel">
                <Plus size={14} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {closed.map((id) => (
                <DropdownMenuItem key={id} onClick={() => onAddTab(node.id, id)}>
                  {PANEL_LABELS[id]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
      <div className="flex-1 overflow-hidden relative min-h-0">{content}</div>
    </div>
  );
}

function SplitLayoutNode({
  node,
  onTabClick,
  onAddTab,
  onCloseTab,
  onMoveTab,
  onRatioChange,
  renderContent,
  getPanelActions,
  closedPanelIds,
  panelStorage,
}: {
  node: LayoutSplit;
  onTabClick: (nodeId: string, tabId: PanelId) => void;
  onAddTab: (nodeId: string, tabId: PanelId) => void;
  onCloseTab: (nodeId: string, tabId: PanelId) => void;
  onMoveTab: (tabId: PanelId, targetNodeId: string, position: DropPosition) => void;
  onRatioChange: (splitId: string, ratio: number) => void;
  renderContent: (id: PanelId, actions: PanelActions) => React.ReactNode;
  getPanelActions: (id: PanelId) => PanelActions;
  closedPanelIds: PanelId[];
  panelStorage: (suffix: string) => { getItem: (n: string) => string | null; setItem: (n: string, v: string) => void };
}) {
  const direction = node.direction === 'row' ? 'horizontal' : 'vertical';
  const ratio = Math.max(10, Math.min(90, node.ratio));
  // Do not use onLayout here: it fires on mount and during resize and causes
  // setLayout -> re-render -> onLayout -> setLayout infinite loop.
  // Split sizes are still persisted via the storage prop.

  return (
    <ResizablePanelGroup
      direction={direction}
      id={node.id}
      storage={panelStorage(node.id)}
      className="h-full w-full"
    >
      <ResizablePanel id={`${node.id}-first`} order={1} defaultSize={ratio} minSize={15}>
        <LayoutNodeRenderer
          node={node.first}
          onTabClick={onTabClick}
          onAddTab={onAddTab}
          onCloseTab={onCloseTab}
          onMoveTab={onMoveTab}
          onRatioChange={onRatioChange}
          renderContent={renderContent}
          getPanelActions={getPanelActions}
          closedPanelIds={closedPanelIds}
          panelStorage={panelStorage}
        />
      </ResizablePanel>
      <ResizableHandle className={direction === 'horizontal' ? 'resizer w-1' : 'resizer h-1'} />
      <ResizablePanel id={`${node.id}-second`} order={2} defaultSize={100 - ratio} minSize={15}>
        <LayoutNodeRenderer
          node={node.second}
          onTabClick={onTabClick}
          onAddTab={onAddTab}
          onCloseTab={onCloseTab}
          onMoveTab={onMoveTab}
          onRatioChange={onRatioChange}
          renderContent={renderContent}
          getPanelActions={getPanelActions}
          closedPanelIds={closedPanelIds}
          panelStorage={panelStorage}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

function LayoutNodeRenderer(props: {
  node: LayoutNode;
  onTabClick: (nodeId: string, tabId: PanelId) => void;
  onAddTab: (nodeId: string, tabId: PanelId) => void;
  onCloseTab: (nodeId: string, tabId: PanelId) => void;
  onMoveTab: (tabId: PanelId, targetNodeId: string, position: DropPosition) => void;
  onRatioChange: (splitId: string, ratio: number) => void;
  renderContent: (id: PanelId, actions: PanelActions) => React.ReactNode;
  getPanelActions: (id: PanelId) => PanelActions;
  closedPanelIds: PanelId[];
  panelStorage: (suffix: string) => { getItem: (n: string) => string | null; setItem: (n: string, v: string) => void };
}) {
  if (props.node.type === 'leaf') {
    return (
      <LeafLayoutNode
        node={props.node}
        onTabClick={props.onTabClick}
        onAddTab={props.onAddTab}
        onCloseTab={props.onCloseTab}
        onMoveTab={props.onMoveTab}
        renderContent={props.renderContent}
        getPanelActions={props.getPanelActions}
        closedPanelIds={props.closedPanelIds}
      />
    );
  }
  return (
    <SplitLayoutNode
      node={props.node}
      onTabClick={props.onTabClick}
      onAddTab={props.onAddTab}
      onCloseTab={props.onCloseTab}
      onMoveTab={props.onMoveTab}
      onRatioChange={props.onRatioChange}
      renderContent={props.renderContent}
      getPanelActions={props.getPanelActions}
      closedPanelIds={props.closedPanelIds}
      panelStorage={props.panelStorage}
    />
  );
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
    line?: number;
    column?: number;
    position?: number;
  }>({ valid: true });

  const [parsedJsonData, setParsedJsonData] = useState<unknown>(null);
  const [insertIntoCode, setInsertIntoCode] = useState<string | null>(null);
  const [loadUrlOpen, setLoadUrlOpen] = useState(false);
  const [loadUrlValue, setLoadUrlValue] = useState('');
  const [layout, setLayout] = useState<LayoutNode>(loadLayoutWithMigration);
  const [showHelpBanner, setShowHelpBanner] = useState(() => {
    try {
      return localStorage.getItem(HELP_DISMISSED_KEY) !== '1';
    } catch {
      return true;
    }
  });
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [diffOpen, setDiffOpen] = useState(false);
  const [schemaOpen, setSchemaOpen] = useState(false);
  const [schemaText, setSchemaText] = useState(() => {
    try {
      return localStorage.getItem(SCHEMA_STORAGE_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const [schemaValidateEnabled, setSchemaValidateEnabled] = useState(false);
  const [schemaValid, setSchemaValid] = useState<boolean | null>(null);
  const [treeFilter, setTreeFilter] = useState('');
  const [jumpToPosition, setJumpToPosition] = useState<number | null>(null);
  const [outputHistory, setOutputHistory] = useState<OutputHistoryItem[]>([]);
  const [highlightTreePath, setHighlightTreePath] = useState<string | null>(null);
  const { toast } = useToast();
  const { execute: runCode, cancelStale } = useJsonExecutor();
  const sessionImportRef = useRef<HTMLInputElement>(null);

  const validateJson = useCallback((json: string): JsonParseResult => parseJson(json), []);

  // Restore from URL share param on mount (once)
  const hasRestoredFromUrl = useRef(false);
  useEffect(() => {
    if (hasRestoredFromUrl.current) return;
    const params = new URLSearchParams(window.location.search);
    const share = params.get(SHARE_PARAM);
    if (!share) return;
    hasRestoredFromUrl.current = true;
    try {
      const decoded = decodeShare(share);
      if (decoded) {
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
    saveLayout(layout);
  }, [layout]);

  useEffect(() => {
    const result = validateJson(jsonInput);
    if (result.valid) {
      setParsedJsonData(result.data);
      if (schemaValidateEnabled && schemaText.trim()) {
        const schemaResult = validateAgainstSchema(result.data, schemaText);
        setSchemaValid(schemaResult.valid);
      } else {
        setSchemaValid(null);
      }
    }
  }, [jsonInput, validateJson, schemaValidateEnabled, schemaText]);

  useEffect(() => {
    try {
      localStorage.setItem(SCHEMA_STORAGE_KEY, schemaText);
    } catch {
      /* ignore */
    }
  }, [schemaText]);

  const pushOutputHistory = useCallback((newOutput: OutputEntry[], newMeta: ExecutionMeta) => {
    if (newOutput.length === 0) return;
    setOutputHistory((prev) => [
      { output: newOutput, meta: newMeta, timestamp: new Date() },
      ...prev,
    ].slice(0, 5));
  }, []);

  const executeCode = useCallback(async () => {
    const jsonResult = validateJson(jsonInput);
    setJsonStatus(jsonStatusFromParse(jsonResult));

    setIsExecuting(true);
    try {
      const result = await runCode(jsonInput, codeInput);
      if (!result) return;
      setOutput(result.output);
      setMeta(result.meta);
      pushOutputHistory(result.output, result.meta);
    } finally {
      setIsExecuting(false);
    }
  }, [jsonInput, codeInput, validateJson, runCode, pushOutputHistory]);

  // Debounced execution
  const debouncedExecute = useDebounce(() => {
    if (autoRun) {
      cancelStale();
      void executeCode();
    }
  }, 500);

  // Auto-run on input change
  useEffect(() => {
    if (autoRun) {
      debouncedExecute();
    }
  }, [jsonInput, codeInput, autoRun, debouncedExecute]);

  const handleJsonChange = useCallback((value: string) => {
    setJsonInput(value);
    const result = validateJson(value);
    setJsonStatus(jsonStatusFromParse(result));
  }, [validateJson]);

  const getSchemaDiagnostics = useCallback(
    (text: string): Diagnostic[] => {
      if (!schemaValidateEnabled || !schemaText.trim()) return [];
      return schemaToDiagnostics(schemaText, text);
    },
    [schemaValidateEnabled, schemaText]
  );

  const invalidateToast = useCallback(
    (result: JsonParseResult) => {
      if (result.valid === false) {
        toast({ title: 'Invalid JSON', description: result.error, variant: 'destructive' });
      }
    },
    [toast]
  );

  const downloadJson = useCallback(() => {
    const result = validateJson(jsonInput);
    if (result.valid === false) {
      invalidateToast(result);
      return;
    }
    downloadText('data.json', jsonInput);
    toast({ title: 'Downloaded', description: 'data.json' });
  }, [jsonInput, validateJson, toast, invalidateToast]);

  const sortKeys = useCallback(() => {
    const result = validateJson(jsonInput);
    if (result.valid === false) {
      invalidateToast(result);
      return;
    }
    setJsonInput(JSON.stringify(sortJsonKeys(result.data), null, 2));
    toast({ title: 'Sorted', description: 'Object keys sorted' });
  }, [jsonInput, validateJson, toast, invalidateToast]);

  const applySample = useCallback((sampleId: string) => {
    const sample = JSON_SAMPLES.find((s) => s.id === sampleId);
    if (!sample) return;
    setJsonInput(sample.json);
    if (sample.code) setCodeInput(sample.code);
    toast({ title: 'Sample loaded', description: sample.label });
  }, [toast]);

  const copyConverted = useCallback(
    (format: string, text: string) => {
      navigator.clipboard.writeText(text).then(
        () => toast({ title: 'Copied', description: `JSON converted to ${format} and copied` }),
        () => toast({ title: 'Copy failed', variant: 'destructive' })
      );
    },
    [toast]
  );

  const convertJson = useCallback(
    (format: 'xaml' | 'yaml' | 'csv' | 'toml' | 'env' | 'xml') => {
      const result = validateJson(jsonInput);
      if (result.valid === false) {
        invalidateToast(result);
        return;
      }
      let converted: { ok: true; text: string } | { ok: false; error: string };
      switch (format) {
        case 'xaml':
        case 'xml': {
          const r = jsonToXaml(jsonInput);
          if (r.ok === false) converted = { ok: false, error: r.error };
          else converted = { ok: true, text: r.xaml };
          break;
        }
        case 'yaml': {
          const r = jsonToYaml(jsonInput);
          if (r.ok === false) converted = { ok: false, error: r.error };
          else converted = { ok: true, text: r.yaml };
          break;
        }
        case 'csv': {
          const r = jsonToCsv(jsonInput);
          if (r.ok === false) converted = { ok: false, error: r.error };
          else converted = { ok: true, text: r.csv };
          break;
        }
        case 'toml': {
          const r = jsonToToml(jsonInput);
          if (r.ok === false) converted = { ok: false, error: r.error };
          else converted = { ok: true, text: r.toml };
          break;
        }
        case 'env': {
          const r = jsonToEnv(jsonInput);
          if (r.ok === false) converted = { ok: false, error: r.error };
          else converted = { ok: true, text: r.env };
          break;
        }
      }
      if (converted.ok === false) {
        toast({ title: 'Conversion failed', description: converted.error, variant: 'destructive' });
        return;
      }
      copyConverted(format.toUpperCase(), converted.text);
    },
    [jsonInput, validateJson, toast, copyConverted, invalidateToast]
  );

  const exportSession = useCallback(() => {
    const payload = JSON.stringify(
      { version: SESSION_EXPORT_VERSION, json: jsonInput, code: codeInput },
      null,
      2
    );
    downloadText('session.jsonplayground.json', payload);
    toast({ title: 'Exported', description: 'Session file downloaded' });
  }, [jsonInput, codeInput, toast]);

  const importSession = useCallback(() => {
    sessionImportRef.current?.click();
  }, []);

  const handleSessionImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result as string) as {
            json?: string;
            code?: string;
          };
          if (typeof parsed.json === 'string') setJsonInput(parsed.json);
          if (typeof parsed.code === 'string') setCodeInput(parsed.code);
          toast({ title: 'Imported', description: file.name });
        } catch {
          toast({ title: 'Import failed', description: 'Invalid session file', variant: 'destructive' });
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    },
    [toast]
  );

  const dismissHelp = useCallback((permanent: boolean) => {
    setShowHelpBanner(false);
    if (permanent) {
      try {
        localStorage.setItem(HELP_DISMISSED_KEY, '1');
      } catch {
        /* ignore */
      }
    }
  }, []);

  const sendToJson = useCallback(
    (text: string) => {
      try {
        const parsed = JSON.parse(text);
        setJsonInput(JSON.stringify(parsed, null, 2));
        toast({ title: 'Sent to JSON', description: 'Output loaded in JSON panel' });
      } catch {
        toast({ title: 'Invalid JSON', description: 'Cannot send non-JSON output', variant: 'destructive' });
      }
    },
    [toast]
  );

  const restoreHistory = useCallback((index: number) => {
    const item = outputHistory[index];
    if (!item) return;
    setOutput(item.output);
    setMeta(item.meta);
  }, [outputHistory]);

  const clearOutput = () => {
    setOutput([]);
    setMeta({});
  };

  const formatJson = useCallback(() => {
    const result = validateJson(jsonInput);
    if (result.valid === false) {
      invalidateToast(result);
      return;
    }
    setJsonInput(JSON.stringify(result.data, null, 2));
    toast({ title: 'Formatted', description: 'JSON formatted with 2-space indent' });
  }, [jsonInput, validateJson, toast, invalidateToast]);

  const minifyJson = useCallback(() => {
    const result = validateJson(jsonInput);
    if (result.valid === false) {
      invalidateToast(result);
      return;
    }
    setJsonInput(JSON.stringify(result.data));
    toast({ title: 'Minified', description: 'JSON minified' });
  }, [jsonInput, validateJson, toast, invalidateToast]);

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
      const url = buildShareUrl(window.location.origin, window.location.pathname, {
        j: jsonInput,
        c: codeInput,
      });
      navigator.clipboard.writeText(url).then(
        () => toast({ title: 'Link copied', description: 'Share this URL to open this state' }),
        () => toast({ title: 'Copy failed', variant: 'destructive' })
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg === 'CONTENT_TOO_LARGE') {
        toast({
          title: 'Content too large',
          description: 'Try shortening JSON or code, or export a session file.',
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Share failed', variant: 'destructive' });
      }
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

  const handleMoveTab = useCallback((tabId: PanelId, targetNodeId: string, position: DropPosition) => {
    const { newRoot: rootAfterRemove, removedTabId } = removeTabFromTree(layout, tabId);
    if (!removedTabId) return;
    const targetCheck = findNodeAndParent(rootAfterRemove, targetNodeId);
    if (!targetCheck) return;
    const finalRoot = insertTabIntoNode(rootAfterRemove, targetNodeId, removedTabId, position);
    setLayout(finalRoot);
  }, [layout]);

  const handleTabClick = useCallback((nodeId: string, tabId: PanelId) => {
    const newRoot = JSON.parse(JSON.stringify(layout)) as LayoutNode;
    const result = findNodeAndParent(newRoot, nodeId);
    if (result?.node && result.node.type === 'leaf') {
      (result.node as LayoutLeaf).activeTab = tabId;
      setLayout(newRoot);
    }
  }, [layout]);

  const handleAddTab = useCallback((nodeId: string, tabId: PanelId) => {
    const finalRoot = insertTabIntoNode(layout, nodeId, tabId, 'center');
    setLayout(finalRoot);
  }, [layout]);

  const handleCloseTab = useCallback((_nodeId: string, tabId: PanelId) => {
    const { newRoot } = removeTabFromTree(layout, tabId);
    setLayout(newRoot);
  }, [layout]);

  const handleSplitRatioChange = useCallback((splitId: string, ratio: number) => {
    setLayout((prev) => updateSplitRatio(prev, splitId, ratio));
  }, []);

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

  const getPanelActions = useCallback((_id: PanelId): PanelActions => ({
    isCollapsed: false,
    onCollapse: () => {},
    onExpand: () => {},
  }), []);

  const renderPanelContent = useCallback((id: PanelId, panelActions: PanelActions) => {
    if (panelActions.isCollapsed) {
      return <div className="h-full min-h-0" aria-hidden />;
    }
    switch (id) {
      case 'json':
        return (
          <div className="h-full flex flex-col border-r border-border">
            <PanelHeader
              status={jsonStatus.valid ? 'valid' : 'invalid'}
              statusText={
                jsonStatus.valid
                  ? schemaValid === false
                    ? 'Schema invalid'
                    : schemaValid === true
                      ? '✓ Valid · Schema OK'
                      : '✓ Valid'
                  : undefined
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 text-xs px-2">
                        Samples
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {JSON_SAMPLES.map((sample) => (
                        <DropdownMenuItem key={sample.id} onClick={() => applySample(sample.id)}>
                          {sample.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Dialog open={schemaOpen} onOpenChange={setSchemaOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 text-xs px-2">
                        Schema
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>JSON Schema</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={schemaValidateEnabled}
                            onCheckedChange={setSchemaValidateEnabled}
                            id="schema-validate"
                          />
                          <Label htmlFor="schema-validate">Validate against schema</Label>
                        </div>
                        <Textarea
                          value={schemaText}
                          onChange={(e) => setSchemaText(e.target.value)}
                          placeholder='{"type":"object",...}'
                          className="font-mono text-xs min-h-[160px]"
                        />
                        {schemaValidateEnabled && parsedJsonData != null && (
                          <p className="text-xs text-muted-foreground">
                            {schemaValid === true && 'Data matches schema.'}
                            {schemaValid === false && 'Data does not match schema (see editor diagnostics).'}
                          </p>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={loadFromFile}>
                        <Upload className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Load from file</TooltipContent>
                  </Tooltip>
                  <Dialog open={loadUrlOpen} onOpenChange={setLoadUrlOpen}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Link className="w-3.5 h-3.5" />
                          </Button>
                        </DialogTrigger>
                      </TooltipTrigger>
                      <TooltipContent>Load from URL</TooltipContent>
                    </Tooltip>
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
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={formatJson}>
                        <AlignLeft className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Format JSON</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={minifyJson}>
                        <Minus className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Minify JSON</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={downloadJson}>
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Download JSON</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={sortKeys}>
                        <ArrowDownAZ className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Sort keys</TooltipContent>
                  </Tooltip>
                </div>
              }
            />
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <JsonEditor
                  value={jsonInput}
                  onChange={handleJsonChange}
                  placeholder="Enter your JSON here..."
                  jumpToPosition={jumpToPosition}
                  getExtraDiagnostics={getSchemaDiagnostics}
                />
              </div>
            </div>
            {!jsonStatus.valid && jsonStatus.error && (
              <footer className="shrink-0 px-3 py-2 border-t border-border bg-destructive/10 text-destructive text-xs font-medium flex items-center justify-between gap-2">
                <span>
                  {jsonStatus.line != null && jsonStatus.column != null
                    ? `Line ${jsonStatus.line}, Col ${jsonStatus.column}: `
                    : ''}
                  {jsonStatus.error}
                </span>
                {jsonStatus.position != null && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px] shrink-0"
                    onClick={() => {
                      setJumpToPosition(jsonStatus.position ?? null);
                      setTimeout(() => setJumpToPosition(null), 100);
                    }}
                  >
                    Go to error
                  </Button>
                )}
              </footer>
            )}
          </div>
        );
      case 'tree':
        return (
          <div className="h-full flex flex-col border-r border-border">
            <PanelHeader
              status={jsonStatus.valid ? 'valid' : 'invalid'}
              statusText={jsonStatus.valid ? '✓ Valid' : 'No valid JSON'}
              actions={
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                    <Input
                      value={treeFilter}
                      onChange={(e) => setTreeFilter(e.target.value)}
                      placeholder="Filter..."
                      className="h-7 w-28 pl-7 text-xs"
                    />
                  </div>
                </div>
              }
            />
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              {jsonStatus.valid && parsedJsonData != null ? (
                <div className="flex-1 min-h-0 overflow-auto">
                  <JsonTree
                    data={parsedJsonData}
                    onInsertPath={(path) => setInsertIntoCode(path)}
                    filter={treeFilter}
                  />
                  {highlightTreePath && (
                    <p className="px-2 py-1 text-xs text-muted-foreground border-t border-border">
                      Highlighted: {highlightTreePath}
                    </p>
                  )}
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
              statusText="JavaScript"
              actions={
                <div className="flex items-center gap-2">
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
              <JsCodeEditor
                value={codeInput}
                onChange={setCodeInput}
                placeholder="Write your code here..."
                jsonData={parsedJsonData}
                insertText={insertIntoCode}
                onInsertDone={() => setInsertIntoCode(null)}
              />
            </div>
          </div>
        );
      case 'output':
        return (
          <div className="h-full overflow-hidden">
            <OutputPanel
              entries={output}
              meta={meta}
              isExecuting={isExecuting}
              onSendToJson={sendToJson}
              history={outputHistory}
              onRestoreHistory={restoreHistory}
            />
          </div>
        );
    }
  }, [
    jsonStatus.valid,
    jsonStatus.error,
    jsonStatus.line,
    jsonStatus.column,
    jsonStatus.position,
    jsonInput,
    parsedJsonData,
    schemaValid,
    schemaOpen,
    schemaText,
    schemaValidateEnabled,
    loadUrlOpen,
    loadUrlValue,
    codeInput,
    insertIntoCode,
    output,
    meta,
    isExecuting,
    treeFilter,
    jumpToPosition,
    outputHistory,
    highlightTreePath,
    handleJsonChange,
    getSchemaDiagnostics,
    loadFromFile,
    handleFileChange,
    loadFromUrl,
    formatJson,
    minifyJson,
    downloadJson,
    sortKeys,
    applySample,
    sendToJson,
    restoreHistory,
  ]);

  const closedPanelIds = VALID_PANEL_IDS.filter((id) => !getPanelIdsInTree(layout).has(id));

  return (
    <div className="h-screen flex flex-col bg-background">
      <input
        ref={sessionImportRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleSessionImport}
      />
      <JsonDiffDialog
        open={diffOpen}
        onOpenChange={setDiffOpen}
        leftJson={jsonInput}
        onHighlightPath={setHighlightTreePath}
      />
      <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Keyboard shortcuts</DialogTitle>
          </DialogHeader>
          <ul className="text-sm space-y-2 text-muted-foreground">
            <li><kbd className="px-1 rounded bg-muted">Ctrl/Cmd+Enter</kbd> — Run code</li>
            <li>Format / Minify / Download — JSON panel toolbar</li>
            <li>Live toggle — auto-run on edit</li>
            <li>Share — copy URL with JSON + code state</li>
          </ul>
        </DialogContent>
      </Dialog>
      {/* Header */}
      <header className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-border bg-card px-3">
        <div className="flex min-w-0 shrink-0 items-center gap-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary/20">
            <FileJson className="h-3.5 w-3.5 text-primary" />
          </div>
          <h1 className="truncate text-sm font-semibold text-foreground">
            JSON Playground
          </h1>
          <nav className="ml-1 flex items-center gap-1 border-l border-border pl-2">
            <RouterLink
              to="/xaml"
              className="rounded px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              XAML
            </RouterLink>
            <RouterLink
              to="/"
              className="rounded px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Home
            </RouterLink>
          </nav>
        </div>
        {showRestoreBanner && (
          <div className="flex min-w-0 shrink items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-xs">
            <span className="truncate text-foreground">Restore session?</span>
            <Button variant="outline" size="sm" className="h-6 shrink-0 px-2 text-[11px]" onClick={() => { setShowRestoreBanner(false); savedStateRef.current = null; }}>
              Dismiss
            </Button>
            <Button size="sm" className="h-6 shrink-0 px-2 text-[11px]" onClick={restoreSession}>Restore</Button>
          </div>
        )}
        <div className="flex shrink-0 items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setLayout(getDefaultLayout())}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reset layout</TooltipContent>
          </Tooltip>
          {closedPanelIds.length > 0 && (
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs">
                      <Plus className="h-3.5 w-3.5" />
                      {closedPanelIds.length}
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Add panel</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end">
                {closedPanelIds.map((id) => (
                  <DropdownMenuItem
                    key={id}
                    onClick={() => setLayout(insertTabIntoNode(layout, getFirstLeafId(layout), id, 'center'))}
                  >
                    {PANEL_LABELS[id]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={autoRun ? 'default' : 'outline'}
                size="sm"
                className={`h-7 gap-1 px-2 text-xs ${autoRun ? 'bg-success hover:bg-success/90' : ''}`}
                onClick={() => setAutoRun(!autoRun)}
              >
                <Zap className={`h-3.5 w-3.5 ${autoRun ? 'text-success-foreground' : ''}`} />
                Live
              </Button>
            </TooltipTrigger>
            <TooltipContent>{autoRun ? 'Disable' : 'Enable'} live run</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={clearOutput}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Clear output</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setDiffOpen(true)}>
                <GitCompare className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Compare JSON</TooltipContent>
          </Tooltip>
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs">
                    <FileDown className="h-3.5 w-3.5" />
                    Convert
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Convert JSON</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => convertJson('xaml')}>Copy as XAML</DropdownMenuItem>
              <DropdownMenuItem onClick={() => convertJson('xml')}>Copy as XML</DropdownMenuItem>
              <DropdownMenuItem onClick={() => convertJson('yaml')}>Copy as YAML</DropdownMenuItem>
              <DropdownMenuItem onClick={() => convertJson('csv')}>Copy as CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={() => convertJson('toml')}>Copy as TOML</DropdownMenuItem>
              <DropdownMenuItem onClick={() => convertJson('env')}>Copy as .env</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <RouterLink to="/json-to-yaml">Open YAML converter</RouterLink>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 w-7 p-0">
                    <Share2 className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Share & export</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={shareUrl}>Copy share link</DropdownMenuItem>
              <DropdownMenuItem onClick={exportSession}>Export session file</DropdownMenuItem>
              <DropdownMenuItem onClick={importSession}>Import session file</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setShortcutsOpen(true)}>
                <HelpCircle className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Shortcuts</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={executeCode}
                size="sm"
                className="h-7 gap-1 px-2 text-xs run-button bg-primary hover:bg-primary/90"
              >
                <Play className="h-3.5 w-3.5" />
                Run
              </Button>
            </TooltipTrigger>
            <TooltipContent>Run (Ctrl+Enter)</TooltipContent>
          </Tooltip>
        </div>
      </header>

      {showHelpBanner && (
        <Alert className="mx-3 mt-2 shrink-0 border-primary/30 bg-primary/5">
          <AlertDescription className="flex flex-wrap items-center gap-2 text-xs">
            <span>
              <strong>data</strong> is your parsed JSON. Use <strong>Dump(value)</strong> for output.
              Tree &quot;Use in code&quot; inserts paths. <kbd className="px-1 rounded bg-muted">Ctrl/Cmd+Enter</kbd> runs.
            </span>
            <Button variant="outline" size="sm" className="h-6 text-[11px]" onClick={() => dismissHelp(false)}>
              Dismiss
            </Button>
            <Button size="sm" className="h-6 text-[11px]" onClick={() => dismissHelp(true)}>
              Don&apos;t show again
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content: tree-based layout */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <LayoutNodeRenderer
          node={layout}
          onTabClick={handleTabClick}
          onAddTab={handleAddTab}
          onCloseTab={handleCloseTab}
          onMoveTab={handleMoveTab}
          onRatioChange={handleSplitRatioChange}
          renderContent={renderPanelContent}
          getPanelActions={getPanelActions}
          closedPanelIds={closedPanelIds}
          panelStorage={panelStorage}
        />
      </div>
    </div>
  );
};

export default JsonPlayground;
