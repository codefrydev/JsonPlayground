import React, { useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { xml } from '@codemirror/lang-xml';

interface XamlEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}

const XamlEditor: React.FC<XamlEditorProps> = ({
  value,
  onChange,
  placeholder = 'Enter your XAML here...',
  readOnly = false,
}) => {
  const extensions = useMemo(
    () => [
      xml(),
    ],
    []
  );

  return (
    <div className="xaml-editor-codemirror flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md">
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

export default XamlEditor;
