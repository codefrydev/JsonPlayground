import React, { useState, useCallback, useMemo } from 'react';
import { CheckCircle2, XCircle, Clock, Hash, Type, List, Braces, ChevronDown, ChevronRight, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { highlight, type HighlightLanguage } from '@/lib/highlight';

interface OutputEntry {
  type: 'log' | 'error' | 'result' | 'info';
  content: string;
  timestamp: Date;
  dataType?: string;
}

interface ExecutionMeta {
  executionTime?: number;
  jsonValid?: boolean;
  dataShape?: string;
}

const TRUNCATE_CHARS = 500;
const TRUNCATE_LINES = 10;

interface OutputPanelProps {
  entries: OutputEntry[];
  meta?: ExecutionMeta;
  isExecuting?: boolean;
}

const getTypeIcon = (dataType?: string) => {
  switch (dataType) {
    case 'string':
      return <Type className="w-3 h-3" />;
    case 'number':
      return <Hash className="w-3 h-3" />;
    case 'array':
      return <List className="w-3 h-3" />;
    case 'object':
      return <Braces className="w-3 h-3" />;
    default:
      return null;
  }
};

function formatContent(content: string): string {
  try {
    const parsed = JSON.parse(content);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return content;
  }
}

function truncateContent(content: string, maxChars: number, maxLines: number): { truncated: string; isLong: boolean } {
  const lines = content.split('\n');
  const isLong = content.length > maxChars || lines.length > maxLines;
  if (!isLong) return { truncated: content, isLong: false };
  const truncated =
    content.length > maxChars
      ? content.slice(0, maxChars) + '\n...'
      : lines.slice(0, maxLines).join('\n') + '\n...';
  return { truncated, isLong: true };
}

function getOutputLanguage(content: string): HighlightLanguage {
  try {
    JSON.parse(content);
    return 'json';
  } catch {
    return 'plaintext';
  }
}

const OutputPanel: React.FC<OutputPanelProps> = ({ entries, meta, isExecuting }) => {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  const copyToClipboard = useCallback(
    (text: string, label: string) => {
      navigator.clipboard.writeText(text).then(
        () => toast({ title: 'Copied', description: label }),
        () => toast({ title: 'Copy failed', variant: 'destructive' })
      );
    },
    [toast]
  );

  const copyAll = useCallback(() => {
    const text = entries.map((e) => formatContent(e.content)).join('\n\n');
    copyToClipboard(text, 'Output copied');
  }, [entries, copyToClipboard]);

  const getEntryStyles = (type: OutputEntry['type']) => {
    switch (type) {
      case 'error':
        return 'text-destructive bg-destructive/10 border-l-2 border-destructive';
      case 'result':
        return 'text-success bg-success/5 border-l-2 border-success';
      case 'info':
        return 'text-primary bg-primary/5 border-l-2 border-primary';
      default:
        return 'text-foreground border-l-2 border-muted';
    }
  };

  const toggleExpanded = useCallback((index: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const collapsibleIndices = useMemo(
    () =>
      entries
        .map((e, i) => (e.content.length > TRUNCATE_CHARS || e.content.split('\n').length > TRUNCATE_LINES ? i : -1))
        .filter((i) => i >= 0),
    [entries]
  );

  const expandAll = useCallback(() => {
    setExpanded(new Set(collapsibleIndices));
  }, [collapsibleIndices]);

  const collapseAll = useCallback(() => {
    setExpanded(new Set());
  }, []);

  return (
    <div className="h-full flex flex-col bg-editor-bg">
      {/* Status Bar */}
      {meta && (
        <div className="flex items-center gap-4 px-4 py-2 border-b border-border bg-secondary/50 text-xs flex-wrap">
          {meta.jsonValid !== undefined && (
            <div className={`flex items-center gap-1.5 ${meta.jsonValid ? 'text-success' : 'text-destructive'}`}>
              {meta.jsonValid ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <XCircle className="w-3.5 h-3.5" />
              )}
              <span>JSON {meta.jsonValid ? 'Valid' : 'Invalid'}</span>
            </div>
          )}
          {meta.executionTime !== undefined && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span>{meta.executionTime.toFixed(2)}ms</span>
            </div>
          )}
          {meta.dataShape && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Braces className="w-3.5 h-3.5" />
              <span>{meta.dataShape}</span>
            </div>
          )}
          {entries.length > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={copyAll}>
              <Copy className="w-3 h-3" />
              Copy all
            </Button>
          )}
          {collapsibleIndices.length > 0 && (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={expandAll}>
                Expand all
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={collapseAll}>
                Collapse all
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Output Content */}
      <div className="flex-1 overflow-auto editor-scrollbar p-3">
        {isExecuting ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm font-mono">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            Running...
          </div>
        ) : entries.length === 0 ? (
          <div className="text-muted-foreground/50 text-sm font-mono space-y-2">
            <p>// Output will appear here automatically</p>
            <p>// Start typing to see live results</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry, index) => {
              const formatted = formatContent(entry.content);
              const { truncated, isLong } = truncateContent(formatted, TRUNCATE_CHARS, TRUNCATE_LINES);
              const isExpanded = expanded.has(index);
              const showFull = !isLong || isExpanded;
              const displayText = showFull ? formatted : truncated;
              const lang = getOutputLanguage(entry.content);
              const highlightedHtml = highlight(displayText, lang);
              return (
                <div
                  key={index}
                  className={`font-mono text-sm p-3 rounded ${getEntryStyles(entry.type)}`}
                >
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    {entry.dataType && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded shrink-0">
                        {getTypeIcon(entry.dataType)}
                        {entry.dataType}
                      </span>
                    )}
                    <div className="flex items-center gap-1 flex-1 justify-end min-w-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 shrink-0"
                        onClick={() => copyToClipboard(formatted, 'Entry copied')}
                        title="Copy"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      {isLong && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1 shrink-0"
                          onClick={() => toggleExpanded(index)}
                        >
                          {isExpanded ? (
                            <>
                              <ChevronDown className="w-3 h-3" />
                              Collapse
                            </>
                          ) : (
                            <>
                              <ChevronRight className="w-3 h-3" />
                              Expand
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                  <pre className="whitespace-pre-wrap break-words mt-0">
                    <code
                      className="hljs"
                      dangerouslySetInnerHTML={{ __html: highlightedHtml }}
                    />
                  </pre>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default OutputPanel;
export type { OutputEntry, ExecutionMeta };
