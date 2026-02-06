import React, { useState, useCallback, useEffect } from 'react';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { Play, Trash2, FileJson, Code2, Terminal, Zap } from 'lucide-react';
import CodeEditor from './CodeEditor';
import PanelHeader from './PanelHeader';
import OutputPanel, { OutputEntry, ExecutionMeta } from './OutputPanel';
import { useDebounce } from '@/hooks/useDebounce';

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

const JsonPlayground: React.FC = () => {
  const [jsonInput, setJsonInput] = useState(DEFAULT_JSON);
  const [codeInput, setCodeInput] = useState(DEFAULT_CODE);
  const [output, setOutput] = useState<OutputEntry[]>([]);
  const [meta, setMeta] = useState<ExecutionMeta>({});
  const [isExecuting, setIsExecuting] = useState(false);
  const [autoRun, setAutoRun] = useState(true);
  const [jsonStatus, setJsonStatus] = useState<{
    valid: boolean;
    error?: string;
  }>({ valid: true });

  const [parsedJsonData, setParsedJsonData] = useState<unknown>(null);

  const validateJson = useCallback((json: string): { valid: boolean; data?: unknown; error?: string } => {
    try {
      const data = JSON.parse(json);
      return { valid: true, data };
    } catch (e) {
      const error = e instanceof Error ? e.message : 'Invalid JSON';
      return { valid: false, error };
    }
  }, []);

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

      // Create function with data in scope
      const fn = new Function(
        'data',
        'console',
        `"use strict";
        ${cleanCode.includes('return') ? cleanCode : `return (${cleanCode})`}`
      );

      const result = fn(data, customConsole);
      const endTime = performance.now();

      // Add console outputs
      logs.forEach((log) => {
        newOutput.push({
          type: log.type,
          content: log.content,
          timestamp: new Date(),
          dataType: log.dataType,
        });
      });

      // Add return value
      if (result !== undefined) {
        const resultStr = typeof result === 'object'
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

      setMeta({
        executionTime: endTime - startTime,
        jsonValid: true,
        dataShape: getDataShape(data),
      });
    } catch (e) {
      const endTime = performance.now();
      const error = e instanceof Error ? e.message : 'Execution error';
      
      // Provide helpful error messages
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
      
      setMeta({
        executionTime: endTime - startTime,
        jsonValid: true,
        dataShape: getDataShape(data),
      });
    }

    setOutput(newOutput);
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

  return (
    <div className="h-screen flex flex-col bg-background">
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
                      <FileJson className="w-4 h-4 text-muted-foreground" />
                    }
                  />
                  <div className="flex-1 overflow-hidden">
                    <CodeEditor
                      value={jsonInput}
                      onChange={handleJsonChange}
                      placeholder="Enter your JSON here..."
                    />
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
                    actions={<Code2 className="w-4 h-4 text-muted-foreground" />}
                  />
                  <div className="flex-1 overflow-hidden">
                    <CodeEditor
                      value={codeInput}
                      onChange={setCodeInput}
                      placeholder="Write your code here..."
                      jsonData={parsedJsonData}
                      enableAutocomplete={true}
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
