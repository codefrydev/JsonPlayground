import React, { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { FileCode, FileJson, Home } from 'lucide-react';
import YamlEditor from '@/components/YamlEditor';
import JsonEditor from '@/components/JsonEditor';
import DesktopOnly from '@/components/DesktopOnly';
import { yamlToJson } from '@/lib/yaml-json-convert';
import { useDebounce } from '@/hooks/useDebounce';

const DEFAULT_YAML = `name: app
version: 1.0
features:
  - json
  - yaml`;

const YamlToJsonPage: React.FC = () => {
  const [yamlInput, setYamlInput] = useState(DEFAULT_YAML);
  const [jsonOutput, setJsonOutput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const convert = useCallback(() => {
    const result = yamlToJson(yamlInput);
    if (result.ok) {
      setJsonOutput(result.json);
      setError(null);
    } else {
      setJsonOutput('');
      setError(result.error);
    }
  }, [yamlInput]);

  const debouncedConvert = useDebounce(convert, 400);
  useEffect(() => {
    debouncedConvert();
  }, [yamlInput, debouncedConvert]);

  return (
    <DesktopOnly>
      <div className="h-screen flex flex-col bg-background">
        <header className="flex items-center justify-between gap-4 px-6 py-4 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <FileCode className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">YAML to JSON</h1>
            <Link
              to="/"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <Home className="w-4 h-4" />
              Home
            </Link>
          </div>
          <Button variant="outline" size="sm" onClick={convert}>
            Convert
          </Button>
        </header>

        <div className="flex-1 min-h-0 flex flex-col p-4">
          <ResizablePanelGroup direction="horizontal" className="flex-1 rounded-lg border border-border overflow-hidden">
            <ResizablePanel defaultSize={50} minSize={20} className="flex flex-col min-w-0">
              <div className="px-3 py-2 border-b border-border bg-muted/50 text-sm font-medium shrink-0">
                YAML (input)
              </div>
              <div className="flex-1 min-h-0 flex flex-col">
                <YamlEditor
                  value={yamlInput}
                  onChange={setYamlInput}
                  placeholder="Paste or type YAML here..."
                />
              </div>
            </ResizablePanel>
            <ResizableHandle className="bg-border" />
            <ResizablePanel defaultSize={50} minSize={20} className="flex flex-col min-w-0">
              <div className="px-3 py-2 border-b border-border bg-muted/50 text-sm font-medium shrink-0">
                JSON (output)
              </div>
              <div className="flex-1 min-h-0 flex flex-col">
                <JsonEditor
                  value={error ? `// Error: ${error}` : jsonOutput}
                  onChange={() => {}}
                  placeholder="JSON output appears here..."
                  readOnly={true}
                />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    </DesktopOnly>
  );
};

export default YamlToJsonPage;
