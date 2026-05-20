import React, { useEffect, useRef } from 'react';
import { Hash, Type, List, Braces, Circle, Zap, FileCode } from 'lucide-react';
import { AutocompleteSuggestion, getPreview } from '@/hooks/useAutocomplete';

interface AutocompleteDropdownProps {
  suggestions: AutocompleteSuggestion[];
  selectedIndex: number;
  onSelect: (suggestion: AutocompleteSuggestion) => void;
  position: { top: number; left: number };
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'string':
      return <Type className="w-3 h-3 text-code-string" />;
    case 'number':
      return <Hash className="w-3 h-3 text-code-number" />;
    case 'array':
      return <List className="w-3 h-3 text-code-keyword" />;
    case 'object':
      return <Braces className="w-3 h-3 text-code-property" />;
    case 'boolean':
      return <Circle className="w-3 h-3 text-warning" />;
    case 'method':
      return <Zap className="w-3 h-3 text-accent" />;
    case 'snippet':
      return <FileCode className="w-3 h-3 text-primary" />;
    default:
      return <Circle className="w-3 h-3 text-muted-foreground" />;
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'string':
      return 'text-code-string';
    case 'number':
      return 'text-code-number';
    case 'array':
      return 'text-code-keyword';
    case 'object':
      return 'text-code-property';
    case 'boolean':
      return 'text-warning';
    case 'method':
      return 'text-accent';
    case 'snippet':
      return 'text-primary';
    default:
      return 'text-muted-foreground';
  }
};

const AutocompleteDropdown: React.FC<AutocompleteDropdownProps> = ({
  suggestions,
  selectedIndex,
  onSelect,
  position,
}) => {
  const listRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedRef.current && listRef.current) {
      selectedRef.current.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [selectedIndex]);

  return (
    <div
      className="absolute z-50 bg-card border border-border rounded-lg shadow-xl overflow-hidden min-w-[280px] max-w-[400px]"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      <div className="px-3 py-2 bg-secondary/50 border-b border-border">
        <span className="text-xs text-muted-foreground font-medium">
          Suggestions • {suggestions.length} available
        </span>
      </div>
      <div
        ref={listRef}
        className="max-h-[200px] overflow-y-auto editor-scrollbar"
      >
        {suggestions.map((suggestion, index) => {
          const preview =
            suggestion.type === 'snippet' ? 'snippet' : suggestion.type !== 'method' ? getPreview(suggestion.value) : '';

          return (
            <div
              key={suggestion.path}
              ref={index === selectedIndex ? selectedRef : null}
              className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
                index === selectedIndex
                  ? 'bg-primary/20 text-foreground'
                  : 'hover:bg-secondary/50 text-foreground/90'
              }`}
              onClick={() => onSelect(suggestion)}
            >
              <span className="flex-shrink-0">
                {getTypeIcon(suggestion.type)}
              </span>
              <span className="font-mono text-sm font-medium truncate">
                {suggestion.displayPath}
              </span>
              <span className={`text-xs font-mono ml-auto truncate max-w-[120px] ${getTypeColor(suggestion.type)}`}>
                {preview}
              </span>
            </div>
          );
        })}
      </div>
      <div className="px-3 py-2 bg-secondary/30 border-t border-border text-xs text-muted-foreground flex gap-3">
        <span>↑↓ Navigate</span>
        <span>Tab/Enter Select</span>
        <span>Esc Close</span>
      </div>
    </div>
  );
};

export default AutocompleteDropdown;
