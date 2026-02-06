import { useState, useCallback, useMemo } from 'react';

export interface AutocompleteSuggestion {
  path: string;
  value: unknown;
  type: string;
  displayPath: string;
}

const getType = (value: unknown): string => {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
};

const getPreview = (value: unknown): string => {
  if (value === null) return 'null';
  if (typeof value === 'string') return `"${value.slice(0, 20)}${value.length > 20 ? '...' : ''}"`;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return `[${value.length} items]`;
  if (typeof value === 'object') {
    const keys = Object.keys(value as object);
    return `{${keys.length} keys}`;
  }
  return String(value);
};

export const getAllPaths = (obj: unknown, prefix = 'data'): AutocompleteSuggestion[] => {
  const paths: AutocompleteSuggestion[] = [];
  
  if (obj === null || obj === undefined) return paths;
  
  if (typeof obj === 'object') {
    if (Array.isArray(obj)) {
      // Add array methods
      paths.push({
        path: `${prefix}.length`,
        value: obj.length,
        type: 'number',
        displayPath: 'length',
      });
      paths.push({
        path: `${prefix}.map()`,
        value: 'function',
        type: 'method',
        displayPath: 'map()',
      });
      paths.push({
        path: `${prefix}.filter()`,
        value: 'function',
        type: 'method',
        displayPath: 'filter()',
      });
      paths.push({
        path: `${prefix}.find()`,
        value: 'function',
        type: 'method',
        displayPath: 'find()',
      });
      paths.push({
        path: `${prefix}.reduce()`,
        value: 'function',
        type: 'method',
        displayPath: 'reduce()',
      });
      paths.push({
        path: `${prefix}.forEach()`,
        value: 'function',
        type: 'method',
        displayPath: 'forEach()',
      });
      
      // Add indexed access for first few items
      obj.slice(0, 3).forEach((item, index) => {
        paths.push({
          path: `${prefix}[${index}]`,
          value: item,
          type: getType(item),
          displayPath: `[${index}]`,
        });
        // Recurse into array items
        if (typeof item === 'object' && item !== null) {
          paths.push(...getAllPaths(item, `${prefix}[${index}]`));
        }
      });
    } else {
      Object.entries(obj as Record<string, unknown>).forEach(([key, value]) => {
        const newPath = `${prefix}.${key}`;
        paths.push({
          path: newPath,
          value,
          type: getType(value),
          displayPath: key,
        });
        // Recurse into nested objects
        if (typeof value === 'object' && value !== null) {
          paths.push(...getAllPaths(value, newPath));
        }
      });
    }
  }
  
  return paths;
};

export const useAutocomplete = (jsonData: unknown) => {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [triggerPosition, setTriggerPosition] = useState({ start: 0, end: 0 });

  const allPaths = useMemo(() => {
    try {
      return getAllPaths(jsonData);
    } catch {
      return [];
    }
  }, [jsonData]);

  const findSuggestions = useCallback((code: string, cursorPosition: number) => {
    // Find the current word/path being typed
    const beforeCursor = code.slice(0, cursorPosition);
    
    // Match patterns like "data", "data.", "data.user", "data.user.", "data.posts[0]."
    const pathMatch = beforeCursor.match(/(data(?:\.[a-zA-Z_$][\w$]*|\[\d+\])*)\.?([a-zA-Z_$][\w$]*)?$/);
    
    if (!pathMatch) {
      setIsOpen(false);
      return;
    }

    const [fullMatch, basePath, partialKey = ''] = pathMatch;
    const matchStart = cursorPosition - fullMatch.length;
    
    // Filter suggestions based on the base path and partial key
    const filtered = allPaths.filter(suggestion => {
      // Check if suggestion starts with the base path
      if (!suggestion.path.startsWith(basePath)) return false;
      
      // Get the remaining part after the base path
      const remaining = suggestion.path.slice(basePath.length);
      
      // Should be a direct child (starts with . or [)
      if (!remaining.startsWith('.') && !remaining.startsWith('[')) return false;
      
      // Get the immediate child part
      const childPart = remaining.startsWith('.') ? remaining.slice(1) : remaining;
      const immediateChild = childPart.split(/[.\[]/)[0];
      
      // Check if it's a direct child and matches the partial key
      if (remaining.startsWith('.')) {
        return immediateChild.toLowerCase().startsWith(partialKey.toLowerCase());
      } else if (remaining.startsWith('[')) {
        return partialKey === '' || remaining.startsWith(`[${partialKey}`);
      }
      
      return false;
    });

    // Deduplicate and get only immediate children
    const uniqueSuggestions = new Map<string, AutocompleteSuggestion>();
    filtered.forEach(s => {
      const remaining = s.path.slice(basePath.length);
      let key: string;
      let displayPath: string;
      
      if (remaining.startsWith('.')) {
        const parts = remaining.slice(1).split(/[.\[]/);
        key = parts[0];
        displayPath = parts[0];
      } else if (remaining.startsWith('[')) {
        const match = remaining.match(/^\[(\d+)\]/);
        if (match) {
          key = `[${match[1]}]`;
          displayPath = key;
        } else {
          return;
        }
      } else {
        return;
      }
      
      if (!uniqueSuggestions.has(key)) {
        uniqueSuggestions.set(key, {
          ...s,
          path: basePath + (remaining.startsWith('[') ? key : `.${key}`),
          displayPath,
        });
      }
    });

    const finalSuggestions = Array.from(uniqueSuggestions.values());
    
    if (finalSuggestions.length > 0) {
      setSuggestions(finalSuggestions);
      setSelectedIndex(0);
      setTriggerPosition({ 
        start: matchStart + basePath.length + (partialKey ? 1 : 0), 
        end: cursorPosition 
      });
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [allPaths]);

  const selectSuggestion = useCallback((suggestion: AutocompleteSuggestion) => {
    setIsOpen(false);
    return suggestion;
  }, []);

  const moveSelection = useCallback((direction: 'up' | 'down') => {
    setSelectedIndex(prev => {
      if (direction === 'up') {
        return prev > 0 ? prev - 1 : suggestions.length - 1;
      } else {
        return prev < suggestions.length - 1 ? prev + 1 : 0;
      }
    });
  }, [suggestions.length]);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    suggestions,
    selectedIndex,
    triggerPosition,
    findSuggestions,
    selectSuggestion,
    moveSelection,
    close,
  };
};

export { getPreview };
