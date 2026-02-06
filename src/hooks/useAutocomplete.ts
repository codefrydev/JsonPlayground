import { useState, useCallback, useMemo } from 'react';

export interface AutocompleteSuggestion {
  path: string;
  value: unknown;
  type: string;
  displayPath: string;
  /** When in bracket notation (data["key"), use this for insertion instead of path. */
  insertPath?: string;
}

const getType = (value: unknown): string => {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
};

const getPreview = (value: unknown): string => {
  if (value === null) return 'null';
  if (typeof value === 'string') return `"${value.slice(0, 30)}${value.length > 30 ? '...' : ''}"`;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return `[${value.length} items]`;
  if (typeof value === 'object') {
    const keys = Object.keys(value as object);
    return `{${keys.length} keys}`;
  }
  return String(value);
};

export const CODE_SNIPPETS: AutocompleteSuggestion[] = [
  { path: 'data.map(item => item)', value: null, type: 'snippet', displayPath: 'Map array' },
  { path: 'data.filter(item => )', value: null, type: 'snippet', displayPath: 'Filter array' },
  { path: 'data.reduce((acc, item) => acc + item, 0)', value: null, type: 'snippet', displayPath: 'Reduce' },
  { path: 'data.forEach(item => console.log(item))', value: null, type: 'snippet', displayPath: 'ForEach + log' },
  { path: 'console.log(data)', value: null, type: 'snippet', displayPath: 'Log data' },
];

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
    const beforeCursor = code.slice(0, cursorPosition);

    // Snippet trigger: type "/" to get code snippets
    const snippetMatch = beforeCursor.match(/\/\s*$/);
    if (snippetMatch) {
      const matchStart = cursorPosition - snippetMatch[0].length;
      setSuggestions(CODE_SNIPPETS);
      setSelectedIndex(0);
      setTriggerPosition({ start: matchStart, end: cursorPosition });
      setIsOpen(true);
      return;
    }

    // Bracket notation: data[" or data["key or data[' or data['key
    const bracketMatch = beforeCursor.match(/(data(?:\.[a-zA-Z_$][\w$]*|\[\d+\])*)\[(["'])([^"']*)?$/);
    if (bracketMatch) {
      const [, basePath, quote, partialKey = ''] = bracketMatch;
      const fullMatch = bracketMatch[0];
      const matchStart = cursorPosition - fullMatch.length;

      const filtered = allPaths.filter((suggestion) => {
        if (!suggestion.path.startsWith(basePath)) return false;
        const remaining = suggestion.path.slice(basePath.length);
        if (!remaining.startsWith('.') && !remaining.startsWith('[')) return false;
        const childPart = remaining.startsWith('.') ? remaining.slice(1) : remaining;
        const immediateChild = childPart.split(/[.\[]/)[0];
        if (remaining.startsWith('[')) {
          const numMatch = remaining.match(/^\[(\d+)\]/);
          if (numMatch) return partialKey === '' || String(numMatch[1]).startsWith(partialKey);
        }
        return immediateChild.toLowerCase().startsWith(partialKey.toLowerCase());
      });

      const uniqueSuggestions = new Map<string, AutocompleteSuggestion>();
      filtered.forEach((s) => {
        const remaining = s.path.slice(basePath.length);
        let key: string;
        let displayPath: string;
        if (remaining.startsWith('.')) {
          const parts = remaining.slice(1).split(/[.\[]/);
          key = parts[0];
          displayPath = parts[0];
        } else {
          const numMatch = remaining.match(/^\[(\d+)\]/);
          if (!numMatch) return;
          key = `[${numMatch[1]}]`;
          displayPath = key;
        }
        const insertPath =
          key.startsWith('[') ? basePath + key : basePath + '[' + quote + key.replace(quote === '"' ? /"/g : /'/g, quote === '"' ? '\\"' : "\\'") + quote + ']';
        if (!uniqueSuggestions.has(key)) {
          uniqueSuggestions.set(key, {
            ...s,
            path: basePath + (remaining.startsWith('[') ? key : '.' + key),
            displayPath,
            insertPath,
          });
        }
      });

      const finalSuggestions = Array.from(uniqueSuggestions.values());
      if (finalSuggestions.length > 0) {
        setSuggestions(finalSuggestions);
        setSelectedIndex(0);
        setTriggerPosition({ start: matchStart + basePath.length + 2 + partialKey.length, end: cursorPosition });
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
      return;
    }

    // Dot notation: "data", "data.", "data.user", "data.user.", "data.posts[0]."
    const pathMatch = beforeCursor.match(/(data(?:\.[a-zA-Z_$][\w$]*|\[\d+\])*)\.?([a-zA-Z_$][\w$]*)?$/);
    if (!pathMatch) {
      setIsOpen(false);
      return;
    }

    const [fullMatch, basePath, partialKey = ''] = pathMatch;
    const matchStart = cursorPosition - fullMatch.length;

    const filtered = allPaths.filter((suggestion) => {
      if (!suggestion.path.startsWith(basePath)) return false;
      const remaining = suggestion.path.slice(basePath.length);
      if (!remaining.startsWith('.') && !remaining.startsWith('[')) return false;
      const childPart = remaining.startsWith('.') ? remaining.slice(1) : remaining;
      const immediateChild = childPart.split(/[.\[]/)[0];
      if (remaining.startsWith('.')) {
        return immediateChild.toLowerCase().startsWith(partialKey.toLowerCase());
      }
      return partialKey === '' || remaining.startsWith(`[${partialKey}`);
    });

    const uniqueSuggestions = new Map<string, AutocompleteSuggestion>();
    filtered.forEach((s) => {
      const remaining = s.path.slice(basePath.length);
      let key: string;
      let displayPath: string;
      if (remaining.startsWith('.')) {
        const parts = remaining.slice(1).split(/[.\[]/);
        key = parts[0];
        displayPath = parts[0];
      } else {
        const match = remaining.match(/^\[(\d+)\]/);
        if (!match) return;
        key = `[${match[1]}]`;
        displayPath = key;
      }
      if (!uniqueSuggestions.has(key)) {
        uniqueSuggestions.set(key, {
          ...s,
          path: basePath + (remaining.startsWith('[') ? key : '.' + key),
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
        end: cursorPosition,
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
