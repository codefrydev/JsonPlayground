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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileCode, GitBranch, Terminal, Code2, Upload, AlignLeft, Minus, Link, Share2, Plus, X, Play, Trash2, FileDown } from 'lucide-react';
import XamlEditor from '@/components/XamlEditor';
import XamlTree from '@/components/XamlTree';
import CodeEditor from '@/components/CodeEditor';
import OutputPanel, { type OutputEntry, type ExecutionMeta } from '@/components/OutputPanel';
import PanelHeader from '@/components/PanelHeader';
import Queryable from '@/lib/Queryable';
import type { XamlElementNode } from '@/components/XamlTree';
import type { XamlPanelId } from '@/lib/playground-types';
import type {
  XamlLayoutNode,
  XamlLayoutLeaf,
  XamlLayoutSplit,
  DropPosition,
} from '@/lib/layout-tree-xaml';
import {
  loadLayoutWithMigration,
  saveLayout,
  getDefaultLayout,
  getFirstLeafId,
  findNodeAndParent,
  removeTabFromTree,
  insertTabIntoNode,
  getPanelIdsInTree,
  updateSplitRatio,
} from '@/lib/layout-tree-xaml';
import { useToast } from '@/hooks/use-toast';
import { xamlToJson } from '@/lib/xaml-json-convert';

const DEFAULT_XAML = `<Page xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation">
  <StackPanel>
    <TextBlock Text="Hello, XAML!" />
  </StackPanel>
</Page>`;

const DEFAULT_CODE = `// doc = XML Document (DOM), data = tree { tagName, attributes, children }
// Use Dump(value) to see output.
Dump(data.tagName);
// DOM: doc.querySelectorAll('TextBlock')
Dump(Array.from(doc.querySelectorAll('TextBlock')).map(el => el.getAttribute('Text') || el.textContent));
// LINQ-style: Queryable.From(collection)
Dump(Queryable.From(data.children).Select(n => n.tagName).ToArray());`;

function parseXaml(xaml: string): { doc: Document; data: XamlElementNode } | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xaml, 'text/xml');
    if (doc.querySelector('parsererror')) return null;
    const root = doc.documentElement;
    if (!root || root.nodeType !== Node.ELEMENT_NODE) return null;
    function mapElement(el: Element): XamlElementNode {
      const attributes: Record<string, string> = {};
      for (let i = 0; i < el.attributes.length; i++) {
        const a = el.attributes[i];
        attributes[a.name] = a.value;
      }
      const children: XamlElementNode[] = [];
      for (let i = 0; i < el.children.length; i++) {
        const child = el.children[i];
        if (child.nodeType === Node.ELEMENT_NODE) {
          children.push(mapElement(child as Element));
        }
      }
      return { tagName: el.tagName, attributes, children };
    }
    return { doc, data: mapElement(root) };
  } catch {
    return null;
  }
}

function getDataType(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function getDataShape(data: unknown): string {
  if (data === null) return 'null';
  if (Array.isArray(data)) return `Array[${(data as unknown[]).length}]`;
  if (typeof data === 'object') {
    const obj = data as { tagName?: string; children?: unknown[] };
    if (obj.tagName) return `<${obj.tagName}>`;
    const keys = Object.keys(data as object);
    return `Object { ${keys.length} keys }`;
  }
  return typeof data;
}

function formatXml(xaml: string, indentSize = 2): string {
  const indentStr = ' '.repeat(indentSize);
  const parts = xaml.replace(/>\s*</g, '>\n<').split('\n');
  let depth = 0;
  const result: string[] = [];
  for (const line of parts) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('</') || trimmed.endsWith('/>')) {
      depth = Math.max(0, depth - 1);
    }
    result.push(indentStr.repeat(depth) + trimmed);
    if (
      trimmed.startsWith('<') &&
      !trimmed.startsWith('</') &&
      !trimmed.endsWith('/>')
    ) {
      depth++;
    }
  }
  return result.join('\n');
}

const VALID_PANEL_IDS: XamlPanelId[] = ['xaml', 'tree', 'code', 'output'];

const PANEL_LABELS: Record<XamlPanelId, string> = {
  xaml: 'XAML',
  tree: 'Tree',
  code: 'Code',
  output: 'Output',
};

const PANEL_ICONS: Record<XamlPanelId, React.ComponentType<{ size?: number; className?: string }>> = {
  xaml: FileCode as React.ComponentType<{ size?: number; className?: string }>,
  tree: GitBranch as React.ComponentType<{ size?: number; className?: string }>,
  code: Code2 as React.ComponentType<{ size?: number; className?: string }>,
  output: Terminal as React.ComponentType<{ size?: number; className?: string }>,
};

type PanelActions = {
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
  tabId: XamlPanelId;
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
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
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
  node: XamlLayoutLeaf;
  onTabClick: (nodeId: string, tabId: XamlPanelId) => void;
  onAddTab: (nodeId: string, tabId: XamlPanelId) => void;
  onCloseTab: (nodeId: string, tabId: XamlPanelId) => void;
  onMoveTab: (tabId: XamlPanelId, targetNodeId: string, position: DropPosition) => void;
  renderContent: (id: XamlPanelId, actions: PanelActions) => React.ReactNode;
  getPanelActions: (id: XamlPanelId) => PanelActions;
  closedPanelIds: XamlPanelId[];
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
    const tabId = e.dataTransfer.getData('tabId') as XamlPanelId | '';
    if (tabId && VALID_PANEL_IDS.includes(tabId) && dragOverZone) {
      onMoveTab(tabId, node.id, dragOverZone);
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
            <span className="px-3 py-2 text-xs text-muted-foreground font-medium uppercase">
              Empty
            </span>
          )}
        </div>
        {closed.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="px-2 hover:bg-muted text-muted-foreground border-l border-border flex items-center"
                aria-label="Add panel"
              >
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
  node: XamlLayoutSplit;
  onTabClick: (nodeId: string, tabId: XamlPanelId) => void;
  onAddTab: (nodeId: string, tabId: XamlPanelId) => void;
  onCloseTab: (nodeId: string, tabId: XamlPanelId) => void;
  onMoveTab: (tabId: XamlPanelId, targetNodeId: string, position: DropPosition) => void;
  onRatioChange: (splitId: string, ratio: number) => void;
  renderContent: (id: XamlPanelId, actions: PanelActions) => React.ReactNode;
  getPanelActions: (id: XamlPanelId) => PanelActions;
  closedPanelIds: XamlPanelId[];
  panelStorage: (suffix: string) => {
    getItem: (n: string) => string | null;
    setItem: (n: string, v: string) => void;
  };
}) {
  const direction = node.direction === 'row' ? 'horizontal' : 'vertical';
  const ratio = Math.max(10, Math.min(90, node.ratio));

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
      <ResizableHandle
        className={direction === 'horizontal' ? 'resizer w-1' : 'resizer h-1'}
      />
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
  node: XamlLayoutNode;
  onTabClick: (nodeId: string, tabId: XamlPanelId) => void;
  onAddTab: (nodeId: string, tabId: XamlPanelId) => void;
  onCloseTab: (nodeId: string, tabId: XamlPanelId) => void;
  onMoveTab: (tabId: XamlPanelId, targetNodeId: string, position: DropPosition) => void;
  onRatioChange: (splitId: string, ratio: number) => void;
  renderContent: (id: XamlPanelId, actions: PanelActions) => React.ReactNode;
  getPanelActions: (id: XamlPanelId) => PanelActions;
  closedPanelIds: XamlPanelId[];
  panelStorage: (suffix: string) => {
    getItem: (n: string) => string | null;
    setItem: (n: string, v: string) => void;
  };
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

const STORAGE_KEY = 'xaml-playground-state';
const SHARE_PARAM = 's';
const MAX_SHARE_LENGTH = 1800;

const EXECUTION_TIMEOUT_MS = 5000;

const XamlPlayground: React.FC = () => {
  const [xamlContent, setXamlContent] = useState(DEFAULT_XAML);
  const [codeInput, setCodeInput] = useState(DEFAULT_CODE);
  const [output, setOutput] = useState<OutputEntry[]>([]);
  const [meta, setMeta] = useState<ExecutionMeta>({});
  const [isExecuting, setIsExecuting] = useState(false);
  const [loadUrlOpen, setLoadUrlOpen] = useState(false);
  const [loadUrlValue, setLoadUrlValue] = useState('');
  const [layout, setLayout] = useState<XamlLayoutNode>(loadLayoutWithMigration);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const executionRunIdRef = useRef(0);
  const executionTimedOutRef = useRef(false);
  const { toast } = useToast();

  useEffect(() => {
    saveLayout(layout);
  }, [layout]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ xaml: xamlContent, code: codeInput })
      );
    } catch {
      /* ignore */
    }
  }, [xamlContent, codeInput]);

  // Restore from URL share param or localStorage on mount
  const hasRestoredFromUrl = useRef(false);
  useEffect(() => {
    if (hasRestoredFromUrl.current) return;
    const params = new URLSearchParams(window.location.search);
    const share = params.get(SHARE_PARAM);
    if (share) {
      hasRestoredFromUrl.current = true;
      try {
        const decoded = JSON.parse(decodeURIComponent(atob(share))) as {
          x?: string;
          c?: string;
        };
        if (typeof decoded?.x === 'string') {
          setXamlContent(decoded.x);
          if (typeof decoded?.c === 'string') setCodeInput(decoded.c);
          window.history.replaceState({}, '', window.location.pathname);
          toast({ title: 'Loaded', description: 'Shared state restored from URL' });
        }
      } catch {
        /* ignore */
      }
      return;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { xaml?: string; code?: string };
      if (typeof parsed?.xaml === 'string') setXamlContent(parsed.xaml);
      if (typeof parsed?.code === 'string') setCodeInput(parsed.code);
    } catch {
      /* ignore */
    }
  }, [toast]);

  const handleFormat = useCallback(() => {
    try {
      const formatted = formatXml(xamlContent);
      setXamlContent(formatted);
      toast({
        title: 'Formatted',
        description: 'XAML formatted with 2-space indent',
      });
    } catch {
      toast({
        title: 'Format failed',
        description: 'Could not format XAML.',
        variant: 'destructive',
      });
    }
  }, [xamlContent, toast]);

  const handleMinify = useCallback(() => {
    try {
      const minified = xamlContent.replace(/\s+/g, ' ').trim();
      setXamlContent(minified);
      toast({ title: 'Minified', description: 'XAML minified' });
    } catch {
      toast({
        title: 'Minify failed',
        variant: 'destructive',
      });
    }
  }, [xamlContent, toast]);

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
        setXamlContent(text);
        toast({ title: 'Loaded', description: file.name });
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
      setXamlContent(text);
      setLoadUrlOpen(false);
      setLoadUrlValue('');
      toast({ title: 'Loaded', description: 'XAML loaded from URL' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({
        title: 'Load failed',
        description: msg,
        variant: 'destructive',
      });
    }
  }, [loadUrlValue, toast]);

  const executeCode = useCallback(() => {
    const startTime = performance.now();
    const newOutput: OutputEntry[] = [];
    const parsed = parseXaml(xamlContent);

    if (!parsed) {
      newOutput.push({
        type: 'error',
        content: 'Invalid or incomplete XAML. Fix the XML to run code.',
        timestamp: new Date(),
      });
      setOutput(newOutput);
      setMeta({ executionTime: performance.now() - startTime, jsonValid: false });
      return;
    }

    const { doc, data } = parsed;

    try {
      const logs: { type: 'log' | 'error'; content: string; dataType: string }[] = [];
      const customConsole = {
        log: (...args: unknown[]) => {
          args.forEach((arg) => {
            const formatted =
              typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg);
            logs.push({ type: 'log', content: formatted, dataType: getDataType(arg) });
          });
        },
        error: (...args: unknown[]) => {
          args.forEach((arg) => {
            const formatted =
              typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg);
            logs.push({ type: 'error', content: `Error: ${formatted}`, dataType: 'error' });
          });
        },
        info: (...args: unknown[]) => {
          args.forEach((arg) => {
            const formatted =
              typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg);
            logs.push({ type: 'log', content: formatted, dataType: getDataType(arg) });
          });
        },
      };

      const cleanCode = codeInput
        .split('\n')
        .filter((line) => {
          const trimmed = line.trim();
          return trimmed && !trimmed.startsWith('//');
        })
        .join('\n');

      if (!cleanCode.trim()) {
        setOutput([
          {
            type: 'info',
            content:
              '// Use Dump(value) to see output. doc = DOM, data = tree { tagName, attributes, children }',
            timestamp: new Date(),
          },
        ]);
        setMeta({ jsonValid: true, dataShape: getDataShape(data) });
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
        const dumpValues: unknown[] = [];
        const Dump = (...args: unknown[]) => {
          args.forEach((v) => dumpValues.push(v));
        };
        setTimeout(() => {
          try {
            const fn = new Function(
              'doc',
              'data',
              'console',
              'Dump',
              'Queryable',
              `"use strict";\n${cleanCode}`
            ) as (
              doc: Document,
              data: XamlElementNode,
              c: typeof customConsole,
              Dump: (...args: unknown[]) => void,
              Q: unknown
            ) => void;
            fn(doc, data, customConsole, Dump, Queryable);

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
              const resultStr =
                typeof value === 'object' && value !== null
                  ? JSON.stringify(value, null, 2)
                  : String(value);
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
            const error = e instanceof Error ? e.message : 'Execution error';
            newOutput.push({
              type: 'error',
              content: error,
              timestamp: new Date(),
            });
            setOutput(newOutput);
            setMeta({
              executionTime: performance.now() - startTime,
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

      const lines = cleanCode.split('\n').map((l) => l.trim()).filter(Boolean);
      const hasExplicitReturn = cleanCode.includes('return');
      const multiResult = !hasExplicitReturn && lines.length > 1;
      type ExecFn = (
        doc: Document,
        data: XamlElementNode,
        c: typeof customConsole,
        Q: unknown
      ) => unknown;
      let fn: ExecFn;
      if (hasExplicitReturn) {
        fn = new Function(
          'doc',
          'data',
          'console',
          'Queryable',
          `"use strict";\n${cleanCode}`
        ) as ExecFn;
      } else if (lines.length === 1) {
        fn = new Function(
          'doc',
          'data',
          'console',
          'Queryable',
          `"use strict";\nreturn (${lines[0]})`
        ) as ExecFn;
      } else {
        fn = new Function(
          'doc',
          'data',
          'console',
          'Queryable',
          `"use strict";\nreturn (undefined)`
        ) as ExecFn;
      }

      setTimeout(() => {
        try {
          let results: unknown[];
          if (multiResult) {
            results = [];
            for (const line of lines) {
              const lineFn = new Function(
                'doc',
                'data',
                'console',
                'Queryable',
                `"use strict"; return (${line})`
              ) as ExecFn;
              results.push(lineFn(doc, data, customConsole, Queryable));
            }
          } else {
            const single = fn(doc, data, customConsole, Queryable);
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
            const resultStr =
              typeof result === 'object' && result !== null
                ? JSON.stringify(result, null, 2)
                : String(result);
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
          const error = e instanceof Error ? e.message : 'Execution error';
          newOutput.push({
            type: 'error',
            content: error,
            timestamp: new Date(),
          });
          setOutput(newOutput);
          setMeta({
            executionTime: performance.now() - startTime,
            jsonValid: true,
            dataShape: getDataShape(data),
          });
        } finally {
          clearTimeout(timeoutId);
          if (!executionTimedOutRef.current) setIsExecuting(false);
        }
      }, 0);
    } catch (e) {
      const error = e instanceof Error ? e.message : 'Execution error';
      setOutput([
        {
          type: 'error',
          content: error,
          timestamp: new Date(),
        },
      ]);
      setMeta({
        executionTime: performance.now() - startTime,
        jsonValid: true,
      });
    }
    setIsExecuting(false);
  }, [xamlContent, codeInput]);

  const clearOutput = useCallback(() => {
    setOutput([]);
    setMeta({});
  }, []);

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

  const convertToJson = useCallback(() => {
    const result = xamlToJson(xamlContent);
    if (!result.ok) {
      toast({ title: 'Conversion failed', description: result.error, variant: 'destructive' });
      return;
    }
    navigator.clipboard.writeText(result.json).then(
      () => toast({ title: 'Copied as JSON', description: 'XAML tree copied to clipboard' }),
      () => toast({ title: 'Copy failed', variant: 'destructive' })
    );
  }, [xamlContent, toast]);

  const shareUrl = useCallback(() => {
    try {
      const payload = btoa(
        encodeURIComponent(JSON.stringify({ x: xamlContent, c: codeInput }))
      );
      if (payload.length > MAX_SHARE_LENGTH) {
        toast({
          title: 'Content too large',
          description: 'Try shortening XAML or code to share via URL.',
          variant: 'destructive',
        });
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
  }, [xamlContent, codeInput, toast]);

  const handleMoveTab = useCallback(
    (tabId: XamlPanelId, targetNodeId: string, position: DropPosition) => {
      const { newRoot: rootAfterRemove, removedTabId } = removeTabFromTree(
        layout,
        tabId
      );
      if (!removedTabId) return;
      const targetCheck = findNodeAndParent(rootAfterRemove, targetNodeId);
      if (!targetCheck) return;
      const finalRoot = insertTabIntoNode(
        rootAfterRemove,
        targetNodeId,
        removedTabId,
        position
      );
      setLayout(finalRoot);
    },
    [layout]
  );

  const handleTabClick = useCallback(
    (nodeId: string, tabId: XamlPanelId) => {
      const newRoot = JSON.parse(JSON.stringify(layout)) as XamlLayoutNode;
      const result = findNodeAndParent(newRoot, nodeId);
      if (result?.node && result.node.type === 'leaf') {
        (result.node as XamlLayoutLeaf).activeTab = tabId;
        setLayout(newRoot);
      }
    },
    [layout]
  );

  const handleAddTab = useCallback(
    (nodeId: string, tabId: XamlPanelId) => {
      const finalRoot = insertTabIntoNode(layout, nodeId, tabId, 'center');
      setLayout(finalRoot);
    },
    [layout]
  );

  const handleCloseTab = useCallback(
    (_nodeId: string, tabId: XamlPanelId) => {
      const { newRoot } = removeTabFromTree(layout, tabId);
      setLayout(newRoot);
    },
    [layout]
  );

  const handleSplitRatioChange = useCallback((splitId: string, ratio: number) => {
    setLayout((prev) => updateSplitRatio(prev, splitId, ratio));
  }, []);

  const panelStorage = useCallback(
    (suffix: string) => ({
      getItem: (name: string) => {
        try {
          return (
            localStorage.getItem(`xaml-playground-layout-${suffix}-${name}`) ?? null
          );
        } catch {
          return null;
        }
      },
      setItem: (name: string, value: string) => {
        try {
          localStorage.setItem(
            `xaml-playground-layout-${suffix}-${name}`,
            value
          );
        } catch {
          /* ignore */
        }
      },
    }),
    []
  );

  const getPanelActions = useCallback(
    (_id: XamlPanelId): PanelActions => ({
      isCollapsed: false,
      onCollapse: () => {},
      onExpand: () => {},
    }),
    []
  );

  const renderPanelContent = useCallback(
    (id: XamlPanelId, _panelActions: PanelActions) => {
      switch (id) {
        case 'xaml':
          return (
            <div className="h-full flex flex-col border-r border-border">
              <PanelHeader
                title="XAML"
                status="neutral"
                statusText="XML"
                actions={
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xaml,application/xaml+xml,text/xml"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={loadFromFile}
                        >
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
                          <DialogTitle>Load XAML from URL</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <Label htmlFor="load-url-xaml">URL</Label>
                            <Input
                              id="load-url-xaml"
                              placeholder="https://example.com/file.xaml"
                              value={loadUrlValue}
                              onChange={(e) => setLoadUrlValue(e.target.value)}
                              onKeyDown={(e) =>
                                e.key === 'Enter' && loadFromUrl()
                              }
                            />
                          </div>
                          <Button onClick={loadFromUrl}>Load</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={handleFormat}
                        >
                          <AlignLeft className="w-3.5 h-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Format XAML</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={handleMinify}
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Minify XAML</TooltipContent>
                    </Tooltip>
                  </div>
                }
              />
              <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  <XamlEditor
                    value={xamlContent}
                    onChange={setXamlContent}
                    placeholder="Enter your XAML here..."
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
                status="neutral"
                statusText="Element tree"
                actions={
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                }
              />
              <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                <div className="flex-1 min-h-0 overflow-auto">
                  <XamlTree xamlContent={xamlContent} />
                </div>
              </div>
            </div>
          );
        case 'code':
          return (
            <div className="h-full flex flex-col border-r border-border">
              <PanelHeader
                title="Code"
                status="neutral"
                statusText="JavaScript"
                actions={
                  <div className="flex items-center gap-2">
                    <Code2 className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                }
              />
              <div className="flex-1 overflow-hidden">
                <CodeEditor
                  value={codeInput}
                  onChange={setCodeInput}
                  placeholder="doc = DOM, data = tree. Use Dump(value) to see output."
                  language="javascript"
                  jsonData={parseXaml(xamlContent)?.data ?? undefined}
                  enableAutocomplete={true}
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
    },
    [
      xamlContent,
      codeInput,
      output,
      meta,
      isExecuting,
      loadUrlOpen,
      loadUrlValue,
      handleFormat,
      handleMinify,
      loadFromFile,
      handleFileChange,
      loadFromUrl,
      setLoadUrlOpen,
      setCodeInput,
    ]
  );

  const closedPanelIds = VALID_PANEL_IDS.filter(
    (id) => !getPanelIdsInTree(layout).has(id)
  );

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="flex items-center justify-between gap-4 px-6 py-4 border-b border-border bg-card">
        <div className="flex shrink-0 items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <FileCode className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            XAML Playground
          </h1>
          <RouterLink
            to="/json"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            JSON
          </RouterLink>
          <RouterLink
            to="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Home
          </RouterLink>
        </div>
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
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  title="Add a closed panel"
                >
                  Add panel ({closedPanelIds.length})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {closedPanelIds.map((id) => (
                  <DropdownMenuItem
                    key={id}
                    onClick={() =>
                      setLayout(
                        insertTabIntoNode(
                          layout,
                          getFirstLeafId(layout),
                          id,
                          'center'
                        )
                      )
                    }
                  >
                    {PANEL_LABELS[id]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={clearOutput}
            className="gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={convertToJson}
              >
                <FileDown className="w-4 h-4" />
                To JSON
              </Button>
            </TooltipTrigger>
            <TooltipContent>Convert XAML to JSON tree and copy to clipboard</TooltipContent>
          </Tooltip>
          <Button
            variant="outline"
            size="sm"
            onClick={shareUrl}
            className="gap-2"
            title="Copy shareable link"
          >
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

export default XamlPlayground;
