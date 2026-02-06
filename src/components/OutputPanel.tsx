import React from 'react';
import { CheckCircle2, XCircle, Clock, Hash, Type, List, Braces } from 'lucide-react';

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

const OutputPanel: React.FC<OutputPanelProps> = ({ entries, meta, isExecuting }) => {
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

  const formatContent = (content: string) => {
    try {
      const parsed = JSON.parse(content);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return content;
    }
  };

  return (
    <div className="h-full flex flex-col bg-editor-bg">
      {/* Status Bar */}
      {meta && (
        <div className="flex items-center gap-4 px-4 py-2 border-b border-border bg-secondary/30 text-xs">
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
        </div>
      )}

      {/* Output Content */}
      <div className="flex-1 overflow-auto editor-scrollbar p-4">
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
            {entries.map((entry, index) => (
              <div
                key={index}
                className={`font-mono text-sm p-3 rounded ${getEntryStyles(entry.type)}`}
              >
                <div className="flex items-start gap-2">
                  {entry.dataType && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded shrink-0">
                      {getTypeIcon(entry.dataType)}
                      {entry.dataType}
                    </span>
                  )}
                  <pre className="whitespace-pre-wrap break-words flex-1">
                    {formatContent(entry.content)}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OutputPanel;
export type { OutputEntry, ExecutionMeta };
