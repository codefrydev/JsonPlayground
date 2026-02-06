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

/** Resolve a path like "data.posts" or "data.posts[0].title" against the root (data). */
const getValueAtPath = (root: unknown, path: string): unknown => {
  if (!path || path === 'data') return root;
  const rest = path.replace(/^data\.?/, '');
  if (!rest) return root;
  return getValueAtPathFromObj(root, rest);
};

/** Resolve a path like "posts" or "user.name" or "user.settings[0]" on an object (no "data" prefix). */
const getValueAtPathFromObj = (obj: unknown, path: string): unknown => {
  if (!path) return obj;
  const parts = path.split(/\.|\[|\]/).filter(Boolean);
  let current: unknown = obj;
  for (const p of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    if (/^\d+$/.test(p)) {
      current = (current as unknown[])[Number(p)];
    } else {
      current = (current as Record<string, unknown>)[p];
    }
  }
  return current;
};

/** Get suggestions for the immediate keys of an object; path is the key to insert (e.g. "id" or "name"). */
const getKeysSuggestions = (
  value: unknown,
  partialKey: string
): AutocompleteSuggestion[] => {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return [];
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj);
  const lower = partialKey.toLowerCase();
  const filtered = partialKey
    ? keys.filter((k) => k.toLowerCase().startsWith(lower))
    : keys;
  return filtered.map((key) => {
    const val = obj[key];
    return {
      path: key,
      value: val,
      type: getType(val),
      displayPath: key,
    };
  });
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
  // Output & inspection
  { path: 'Dump(data)', value: null, type: 'snippet', displayPath: 'Dump(data) - show full JSON' },
  { path: 'Dump(data.user)', value: null, type: 'snippet', displayPath: 'Dump(data.user) - show user object' },
  { path: 'Dump(Object.keys(data))', value: null, type: 'snippet', displayPath: 'Object.keys(data) - top-level keys' },
  { path: 'Dump(Object.entries(data))', value: null, type: 'snippet', displayPath: 'Object.entries(data) - key/value pairs' },
  // Array: map & pick
  { path: 'const titles = data.posts.map(p => p.title);\nDump(titles)', value: null, type: 'snippet', displayPath: 'Map: get all post titles' },
  { path: 'const items = data.posts.map(p => ({ id: p.id, title: p.title }));\nDump(items)', value: null, type: 'snippet', displayPath: 'Map: pick id and title from posts' },
  { path: 'const names = data.posts.map((p, i) => `${i}: ${p.title}`);\nDump(names)', value: null, type: 'snippet', displayPath: 'Map: index + title' },
  // Array: filter & find
  { path: 'const filtered = data.posts.filter(p => p.id > 0);\nDump(filtered)', value: null, type: 'snippet', displayPath: 'Filter posts by id' },
  { path: 'const found = data.posts.find(p => p.id === 1);\nDump(found)', value: null, type: 'snippet', displayPath: 'Find post by id' },
  { path: 'const first = data.posts[0];\nDump(first)', value: null, type: 'snippet', displayPath: 'First item in array' },
  // Array: reduce & count
  { path: 'const count = data.posts.reduce((acc, p) => acc + 1, 0);\nDump(count)', value: null, type: 'snippet', displayPath: 'Count items in array' },
  { path: 'const sum = data.posts.reduce((acc, p) => acc + (p.id ?? 0), 0);\nDump(sum)', value: null, type: 'snippet', displayPath: 'Sum numeric field (e.g. id)' },
  // Array: sort
  { path: 'const sorted = [...data.posts].sort((a, b) => (a.id ?? 0) - (b.id ?? 0));\nDump(sorted)', value: null, type: 'snippet', displayPath: 'Sort array by id' },
  { path: 'const byTitle = [...data.posts].sort((a, b) => (a.title || "").localeCompare(b.title || ""));\nDump(byTitle)', value: null, type: 'snippet', displayPath: 'Sort array by title' },
  // Nested access & safe access
  { path: 'Dump(data.user?.name)', value: null, type: 'snippet', displayPath: 'Safe access: user name' },
  { path: 'Dump(data.settings?.theme)', value: null, type: 'snippet', displayPath: 'Safe access: nested setting' },
  // Structure helpers
  { path: 'Dump(JSON.stringify(data, null, 2))', value: null, type: 'snippet', displayPath: 'Pretty-print JSON string' },
  { path: 'const flat = data.posts.flatMap(p => [p.id, p.title]);\nDump(flat)', value: null, type: 'snippet', displayPath: 'FlatMap: flatten id + title' },
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
  /** When set, CodeEditor should replace this range with the selected suggestion path (for callback param completion). */
  const [callbackReplaceRange, setCallbackReplaceRange] = useState<{ start: number; end: number } | null>(null);

  const allPaths = useMemo(() => {
    try {
      return getAllPaths(jsonData);
    } catch {
      return [];
    }
  }, [jsonData]);

  const findSuggestions = useCallback((code: string, cursorPosition: number) => {
    const beforeCursor = code.slice(0, cursorPosition);
    setCallbackReplaceRange(null);

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

    // Callback param: data.posts.map(x => x. or data.posts.map(x => x.title or x.user.
    const singleParamMatch = beforeCursor.match(
      /(data(?:\.[a-zA-Z_$][\w$]*|\[\d+\])*)\.(map|filter|find|forEach|flatMap)\s*\(\s*(\w+)\s*=>\s*\3\.([\w.]*)$/
    );
    const reduceMatch = beforeCursor.match(
      /(data(?:\.[a-zA-Z_$][\w$]*|\[\d+\])*)\.reduce\s*\(\s*\(\s*\w+\s*,\s*(\w+)\s*\)\s*=>\s*\2\.([\w.]*)$/
    );
    const sortMatch = beforeCursor.match(
      /(data(?:\.[a-zA-Z_$][\w$]*|\[\d+\])*)\.sort\s*\(\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)\s*=>\s*(\2|\3)\.([\w.]*)$/
    );
    const callbackMatch = singleParamMatch
      ? { arrayPath: singleParamMatch[1], afterParam: singleParamMatch[4] }
      : reduceMatch
        ? { arrayPath: reduceMatch[1], afterParam: reduceMatch[3] }
        : sortMatch
          ? { arrayPath: sortMatch[1], afterParam: sortMatch[5] }
          : null;

    if (callbackMatch && jsonData) {
      const arr = getValueAtPath(jsonData, callbackMatch.arrayPath);
      if (Array.isArray(arr) && arr.length > 0) {
        const elements = arr.slice(0, 10).filter((e): e is Record<string, unknown> => e !== null && typeof e === 'object' && !Array.isArray(e));
        if (elements.length > 0) {
          const mergedKeys = new Set<string>();
          elements.forEach((e) => Object.keys(e).forEach((k) => mergedKeys.add(k)));
          const first = elements[0];
          const afterParam = callbackMatch.afterParam;
          let basePath: string;
          let partialKey: string;
          if (afterParam.endsWith('.')) {
            basePath = afterParam.slice(0, -1);
            partialKey = '';
          } else {
            const lastDot = afterParam.lastIndexOf('.');
            if (lastDot === -1) {
              basePath = '';
              partialKey = afterParam;
            } else {
              basePath = afterParam.slice(0, lastDot);
              partialKey = afterParam.slice(lastDot + 1);
            }
          }
          const subValue = basePath ? getValueAtPathFromObj(first, basePath) : first;
          const lower = partialKey.toLowerCase();
          const keysSuggestions =
            !basePath && mergedKeys.size > 0
              ? Array.from(mergedKeys)
                  .filter((k) => k.toLowerCase().startsWith(lower))
                  .map((key) => ({
                    path: key,
                    value: (first as Record<string, unknown>)[key],
                    type: getType((first as Record<string, unknown>)[key]),
                    displayPath: key,
                  }))
              : getKeysSuggestions(subValue, partialKey);
          if (keysSuggestions.length > 0) {
            const replaceStart = cursorPosition - partialKey.length;
            setSuggestions(keysSuggestions);
            setSelectedIndex(0);
            setTriggerPosition({ start: replaceStart, end: cursorPosition });
            setCallbackReplaceRange({ start: replaceStart, end: cursorPosition });
            setIsOpen(true);
            return;
          }
        }
      }
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
    callbackReplaceRange,
    findSuggestions,
    selectSuggestion,
    moveSelection,
    close,
  };
};

export { getPreview };
