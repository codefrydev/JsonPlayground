import React from 'react';
import CodeMirror from '@uiw/react-codemirror';

interface EnvEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}

const EnvEditor: React.FC<EnvEditorProps> = ({
  value,
  onChange,
  placeholder = 'KEY=value\nKEY2="quoted value"',
  readOnly = false,
}) => {
  return (
    <div className="env-editor-codemirror flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md">
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
        extensions={[]}
        onChange={onChange}
      />
    </div>
  );
};

export default EnvEditor;
