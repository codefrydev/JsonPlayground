import React, { useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { EditorView } from '@codemirror/view';
import { jwtHighlight } from '@/lib/jwt-highlighter';

interface JwtEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}

const JwtEditor: React.FC<JwtEditorProps> = ({
  value,
  onChange,
  placeholder = 'Paste JWT here (eyJ...)',
  readOnly = false,
}) => {
  const extensions = useMemo(
    () => [jwtHighlight, EditorView.lineWrapping],
    []
  );

  return (
    <div className="jwt-editor-codemirror csv-editor-codemirror flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md">
      <CodeMirror
        value={value}
        height="100%"
        theme="dark"
        placeholder={placeholder}
        editable={!readOnly}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: true,
          highlightSpecialChars: true,
          history: true,
          drawSelection: true,
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

export default JwtEditor;
