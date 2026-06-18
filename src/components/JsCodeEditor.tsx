import React, { useEffect, useMemo, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { autocompletion } from '@codemirror/autocomplete';
import { EditorView } from '@codemirror/view';
import { createJsonDataCompletionSource } from '@/lib/code-autocomplete';

interface JsCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  jsonData?: unknown;
  insertText?: string | null;
  onInsertDone?: () => void;
}

const JsCodeEditor: React.FC<JsCodeEditorProps> = ({
  value,
  onChange,
  placeholder = '',
  readOnly = false,
  jsonData,
  insertText,
  onInsertDone,
}) => {
  const viewRef = useRef<EditorView | null>(null);
  const lastInsertRef = useRef<string | null>(null);

  const extensions = useMemo(() => {
    const exts = [javascript(), EditorView.lineWrapping];
    if (jsonData !== undefined) {
      exts.push(autocompletion({ override: [createJsonDataCompletionSource(jsonData)] }));
    }
    return exts;
  }, [jsonData]);

  useEffect(() => {
    if (!insertText || !viewRef.current || !onInsertDone) return;
    if (lastInsertRef.current === insertText) return;
    lastInsertRef.current = insertText;
    const view = viewRef.current;
    const { from, to } = view.state.selection.main;
    view.dispatch({
      changes: { from, to, insert: insertText },
      selection: { anchor: from + insertText.length },
    });
    onInsertDone();
    view.focus();
    lastInsertRef.current = null;
  }, [insertText, onInsertDone]);

  return (
    <div className="js-code-editor-codemirror flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
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
          highlightActiveLine: true,
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
          autocompletion: false,
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

export default JsCodeEditor;
