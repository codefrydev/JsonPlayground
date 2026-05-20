import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { FileCode, Home } from 'lucide-react';
import TomlEditor from '@/components/TomlEditor';
import JsonTree from '@/components/JsonTree';
import DesktopOnly from '@/components/DesktopOnly';
import * as toml from '@iarna/toml';

const DEFAULT_TOML = `[package]
name = "my-app"
version = "1.0.0"

[dependencies]
serde = "1.0"

[profile.release]
opt-level = 3`;

const TomlPage: React.FC = () => {
  const [tomlContent, setTomlContent] = useState(DEFAULT_TOML);

  const parsedData = useMemo(() => {
    try {
      return toml.parse(tomlContent);
    } catch {
      return null;
    }
  }, [tomlContent]);

  return (
    <DesktopOnly>
      <div className="h-screen flex flex-col bg-background">
        <header className="flex items-center justify-between gap-4 px-6 py-4 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <FileCode className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">TOML Playground</h1>
            <Link
              to="/"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <Home className="w-4 h-4" />
              Home
            </Link>
          </div>
        </header>

        <div className="flex-1 min-h-0 flex flex-col p-4">
          <ResizablePanelGroup direction="horizontal" className="flex-1 rounded-lg border border-border overflow-hidden">
            <ResizablePanel defaultSize={50} minSize={20} className="flex flex-col min-w-0">
              <div className="px-3 py-2 border-b border-border bg-muted/50 text-sm font-medium shrink-0">
                TOML (input)
              </div>
              <div className="flex-1 min-h-0 flex flex-col">
                <TomlEditor
                  value={tomlContent}
                  onChange={setTomlContent}
                  placeholder="Paste TOML here..."
                />
              </div>
            </ResizablePanel>
            <ResizableHandle className="bg-border" />
            <ResizablePanel defaultSize={50} minSize={20} className="flex flex-col min-w-0">
              <div className="px-3 py-2 border-b border-border bg-muted/50 text-sm font-medium shrink-0">
                Tree view
              </div>
              <div className="flex-1 min-h-0 overflow-auto p-2">
                {parsedData === null ? (
                  <p className="text-sm text-muted-foreground">Enter valid TOML to see tree.</p>
                ) : (
                  <JsonTree data={parsedData} />
                )}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    </DesktopOnly>
  );
};

export default TomlPage;
