import React, { useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { EditorView } from '@codemirror/view';

const LINE_HEIGHT_PX = 22;
const MIN_HEIGHT_PX = 48;
const MAX_HEIGHT_PX = 400;

function computeHeight(value: string): string {
  const lines = Math.max(value.split('\n').length, 1);
  const px = Math.min(Math.max(lines * LINE_HEIGHT_PX + 4, MIN_HEIGHT_PX), MAX_HEIGHT_PX);
  return `${px}px`;
}

interface OutputJsonViewProps {
  value: string;
}

const OutputJsonView: React.FC<OutputJsonViewProps> = ({ value }) => {
  const height = useMemo(() => computeHeight(value), [value]);

  const extensions = useMemo(
    () => [json(), EditorView.lineWrapping, EditorView.editable.of(false)],
    []
  );

  return (
    <div className="output-json-codemirror -mx-1 mt-0.5 rounded overflow-hidden">
      <CodeMirror
        value={value}
        height={height}
        theme="dark"
        editable={false}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          highlightActiveLineGutter: false,
          highlightActiveLine: false,
          highlightSpecialChars: true,
          syntaxHighlighting: true,
          bracketMatching: true,
          foldKeymap: true,
          defaultKeymap: true,
        }}
        extensions={extensions}
        onChange={() => {}}
      />
    </div>
  );
};

export default OutputJsonView;
