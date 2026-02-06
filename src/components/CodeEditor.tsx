import React, { useRef, useEffect, useState, useCallback } from 'react';
import AutocompleteDropdown from './AutocompleteDropdown';
import { useAutocomplete, AutocompleteSuggestion } from '@/hooks/useAutocomplete';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  jsonData?: unknown;
  enableAutocomplete?: boolean;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  placeholder = '',
  readOnly = false,
  jsonData,
  enableAutocomplete = false,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

  const lines = value.split('\n');
  const lineCount = lines.length;

  const {
    isOpen,
    suggestions,
    selectedIndex,
    triggerPosition,
    findSuggestions,
    selectSuggestion,
    moveSelection,
    close,
  } = useAutocomplete(jsonData);

  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const getCaretCoordinates = useCallback(() => {
    if (!textareaRef.current || !containerRef.current) return { top: 0, left: 0 };
    
    const textarea = textareaRef.current;
    const cursorPos = textarea.selectionStart;
    
    // Create a mirror element to measure position
    const mirror = document.createElement('div');
    const style = window.getComputedStyle(textarea);
    
    mirror.style.position = 'absolute';
    mirror.style.visibility = 'hidden';
    mirror.style.whiteSpace = 'pre-wrap';
    mirror.style.wordWrap = 'break-word';
    mirror.style.font = style.font;
    mirror.style.fontSize = style.fontSize;
    mirror.style.fontFamily = style.fontFamily;
    mirror.style.lineHeight = style.lineHeight;
    mirror.style.padding = style.padding;
    mirror.style.width = `${textarea.clientWidth}px`;
    
    document.body.appendChild(mirror);
    
    const textBeforeCursor = value.substring(0, cursorPos);
    const lines = textBeforeCursor.split('\n');
    const currentLineNumber = lines.length;
    const currentLineText = lines[lines.length - 1];
    
    // Calculate approximate position
    const lineHeight = parseFloat(style.lineHeight) || 24;
    const charWidth = 8.4; // Approximate for monospace
    
    const top = (currentLineNumber * lineHeight) - textarea.scrollTop + 8;
    const left = (currentLineText.length * charWidth) + 62; // 62 = gutter width + padding
    
    document.body.removeChild(mirror);
    
    return { top, left: Math.min(left, textarea.clientWidth - 100) };
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    
    if (enableAutocomplete && jsonData) {
      const cursorPos = e.target.selectionStart;
      findSuggestions(newValue, cursorPos);
      setDropdownPosition(getCaretCoordinates());
    }
  };

  const handleSelectSuggestion = useCallback((suggestion: AutocompleteSuggestion) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const cursorPos = textarea.selectionStart;
    const beforeCursor = value.slice(0, cursorPos);
    
    // Find what needs to be replaced
    const pathMatch = beforeCursor.match(/(data(?:\.[a-zA-Z_$][\w$]*|\[\d+\])*)\.?([a-zA-Z_$][\w$]*)?$/);
    
    if (pathMatch) {
      const [fullMatch] = pathMatch;
      const matchStart = cursorPos - fullMatch.length;
      const newValue = value.slice(0, matchStart) + suggestion.path + value.slice(cursorPos);
      onChange(newValue);
      
      // Set cursor after the inserted text
      setTimeout(() => {
        const newCursorPos = matchStart + suggestion.path.length;
        textarea.selectionStart = textarea.selectionEnd = newCursorPos;
        textarea.focus();
      }, 0);
    }
    
    selectSuggestion(suggestion);
  }, [value, onChange, selectSuggestion]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle autocomplete navigation
    if (isOpen && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        moveSelection('down');
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        moveSelection('up');
        return;
      }
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        handleSelectSuggestion(suggestions[selectedIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
    }

    // Original tab handling
    if (e.key === 'Tab' && !isOpen) {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newValue);
      
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  // Close autocomplete when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [close]);

  return (
    <div ref={containerRef} className="relative flex h-full bg-editor-bg rounded-md overflow-hidden">
      {/* Line Numbers */}
      <div
        ref={lineNumbersRef}
        className="flex-shrink-0 bg-editor-gutter py-3 px-2 text-right select-none overflow-hidden"
        style={{ width: '50px' }}
      >
        {Array.from({ length: lineCount }, (_, i) => (
          <div
            key={i + 1}
            className="font-mono text-sm leading-relaxed text-code-lineNumber"
          >
            {i + 1}
          </div>
        ))}
      </div>

      {/* Editor */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        readOnly={readOnly}
        spellCheck={false}
        className="flex-1 bg-transparent text-foreground p-3 resize-none outline-none code-textarea editor-scrollbar placeholder:text-muted-foreground/50"
      />

      {/* Autocomplete Dropdown */}
      {enableAutocomplete && isOpen && suggestions.length > 0 && (
        <AutocompleteDropdown
          suggestions={suggestions}
          selectedIndex={selectedIndex}
          onSelect={handleSelectSuggestion}
          position={dropdownPosition}
        />
      )}
    </div>
  );
};

export default CodeEditor;
