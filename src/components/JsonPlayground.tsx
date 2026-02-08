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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Play, Trash2, FileJson, Code2, Terminal, Zap, GitBranch, AlignLeft, Minus, Upload, Link, ListOrdered, Share2, Plus, X } from 'lucide-react';
import CodeEditor from './CodeEditor';
import JsonEditor from './JsonEditor';
import PanelHeader from './PanelHeader';
import OutputPanel, { OutputEntry, ExecutionMeta } from './OutputPanel';
import JsonTree from './JsonTree';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/hooks/use-toast';
import { CODE_SNIPPETS } from '@/hooks/useAutocomplete';
import Queryable from '@/lib/Queryable';
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
const SHARE_PARAM = 's';
const MAX_SHARE_LENGTH = 1800;

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
  }>({ valid: true });

  const [parsedJsonData, setParsedJsonData] = useState<unknown>(null);
  const [insertIntoCode, setInsertIntoCode] = useState<string | null>(null);
  const [loadUrlOpen, setLoadUrlOpen] = useState(false);
  const [loadUrlValue, setLoadUrlValue] = useState('');
  const [layout, setLayout] = useState<LayoutNode>(loadLayoutWithMigration);
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
    saveLayout(layout);
  }, [layout]);

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
              title="JSON Data"
              status={jsonStatus.valid ? 'valid' : 'neutral'}
              statusText={jsonStatus.valid ? '✓ Valid' : undefined}
              actions={
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    onChange={handleFileChange}
                  />
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
            {!jsonStatus.valid && jsonStatus.error && (
              <footer className="shrink-0 px-3 py-2 border-t border-border bg-destructive/10 text-destructive text-xs font-medium">
                {jsonStatus.error}
              </footer>
            )}
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
          <div className="h-full overflow-hidden">
            <OutputPanel
              entries={output}
              meta={meta}
              isExecuting={isExecuting}
            />
          </div>
        );
    }
  }, [
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

  const closedPanelIds = VALID_PANEL_IDS.filter((id) => !getPanelIdsInTree(layout).has(id));

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
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setLayout(getDefaultLayout())}
            title="Reset to default layout"
          >
            Reset layout
          </Button>
          {closedPanelIds.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2" title="Add a closed panel">
                  Add panel ({closedPanelIds.length})
                </Button>
              </DropdownMenuTrigger>
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
