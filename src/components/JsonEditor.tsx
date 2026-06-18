import React, { useEffect, useMemo, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { json, jsonParseLinter } from '@codemirror/lang-json';
import { linter, type Diagnostic } from '@codemirror/lint';
import { ViewPlugin, Decoration, EditorView } from '@codemirror/view';
import type { DecorationSet, ViewUpdate } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import type { JsonParseResult } from '@/lib/json-parse';
import { parseJson } from '@/lib/json-parse';

function buildIndentDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  for (const { from, to } of view.visibleRanges) {
    let pos = from;
    while (pos <= to) {
      const line = view.state.doc.lineAt(pos);
      const indent = line.text.search(/\S/);
      if (indent > 0) {
        builder.add(
          line.from,
          line.from,
          Decoration.line({
            attributes: {
              style: `padding-left:${indent}ch;text-indent:-${indent}ch`,
            },
          }),
        );
      }
      pos = line.to + 1;
    }
  }
  return builder.finish();
}

const indentedWrapping = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildIndentDecorations(view);
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildIndentDecorations(update.view);
      }
    }
  },
  { decorations: (v) => v.decorations },
);

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  onParseError?: (result: JsonParseResult) => void;
  jumpToPosition?: number | null;
  getExtraDiagnostics?: (text: string) => Diagnostic[];
}

const JsonEditor: React.FC<JsonEditorProps> = ({
  value,
  onChange,
  placeholder = 'Enter your JSON here...',
  readOnly = false,
  onParseError,
  jumpToPosition,
  getExtraDiagnostics,
}) => {
  const viewRef = useRef<EditorView | null>(null);

  const extensions = useMemo(() => {
    const parseLinter = jsonParseLinter();
    return [
      json(),
      EditorView.lineWrapping,
      indentedWrapping,
      linter((view) => {
        const parseDiags = parseLinter(view);
        if (!getExtraDiagnostics) return parseDiags;
        return [...parseDiags, ...getExtraDiagnostics(view.state.doc.toString())];
      }),
    ];
  }, [getExtraDiagnostics]);

  useEffect(() => {
    onParseError?.(parseJson(value));
  }, [value, onParseError]);

  useEffect(() => {
    if (jumpToPosition == null || !viewRef.current) return;
    const view = viewRef.current;
    const pos = Math.max(0, Math.min(jumpToPosition, view.state.doc.length));
    view.dispatch({
      selection: { anchor: pos },
      scrollIntoView: true,
    });
  }, [jumpToPosition]);

  return (
    <div className="json-editor-codemirror flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md">
      <CodeMirror
        value={value}
        height="100%"
        theme="dark"
        placeholder={placeholder}
        editable={!readOnly}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          highlightActiveLineGutter: true,
          highlightSpecialChars: true,
          history: true,
          drawSelection: true,
          indentOnInput: true,
          syntaxHighlighting: true,
          bracketMatching: true,
          closeBrackets: true,
          foldKeymap: true,
          defaultKeymap: true,
          searchKeymap: true,
          historyKeymap: true,
        }}
        extensions={extensions}
        onChange={onChange}
        onCreateEditor={(view) => {
          viewRef.current = view;
        }}
      />
    </div>
  );
};

export default JsonEditor;
