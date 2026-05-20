import React, { useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { ViewPlugin, Decoration, EditorView } from '@codemirror/view';
import type { DecorationSet, ViewUpdate } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';

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
}

const JsonEditor: React.FC<JsonEditorProps> = ({
  value,
  onChange,
  placeholder = 'Enter your JSON here...',
  readOnly = false,
}) => {
  const extensions = useMemo(
    () => [
      json(),
      EditorView.lineWrapping,
      indentedWrapping,
    ],
    []
  );

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
      />
    </div>
  );
};

export default JsonEditor;
