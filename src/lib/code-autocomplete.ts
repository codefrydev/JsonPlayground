import type { Completion, CompletionContext, CompletionSource } from '@codemirror/autocomplete';
import { getAllPaths, CODE_SNIPPETS, type AutocompleteSuggestion } from '@/hooks/useAutocomplete';

function suggestionToCompletion(s: AutocompleteSuggestion, from: number): Completion {
  return {
    label: s.displayPath,
    detail: s.type,
    apply: s.insertPath ?? s.path,
    from,
  };
}

export function createJsonDataCompletionSource(jsonData: unknown): CompletionSource {
  const allPaths = (() => {
    try {
      return getAllPaths(jsonData);
    } catch {
      return [];
    }
  })();

  return (context: CompletionContext) => {
    const before = context.state.sliceDoc(0, context.pos);

    if (before.match(/\/\s*$/)) {
      const from = context.pos - (before.match(/\/\s*$/)?.[0].length ?? 1);
      return {
        from,
        options: CODE_SNIPPETS.map((s) => suggestionToCompletion(s, from)),
      };
    }

    const pathMatch = before.match(/(data(?:\.[a-zA-Z_$][\w$]*|\[\d+\])*)\.?([a-zA-Z_$][\w$]*)?$/);
    if (!pathMatch) return null;

    const [, basePath, partialKey = ''] = pathMatch;
    const matchStart = context.pos - pathMatch[0].length;

    const filtered = allPaths.filter((suggestion) => {
      if (!suggestion.path.startsWith(basePath)) return false;
      const remaining = suggestion.path.slice(basePath.length);
      if (!remaining.startsWith('.') && !remaining.startsWith('[')) return false;
      const childPart = remaining.startsWith('.') ? remaining.slice(1) : remaining;
      const immediateChild = childPart.split(/[.[]/)[0];
      if (remaining.startsWith('.')) {
        return immediateChild.toLowerCase().startsWith(partialKey.toLowerCase());
      }
      return partialKey === '' || remaining.startsWith(`[${partialKey}`);
    });

    const unique = new Map<string, AutocompleteSuggestion>();
    filtered.forEach((s) => {
      const remaining = s.path.slice(basePath.length);
      let key: string;
      if (remaining.startsWith('.')) {
        key = remaining.slice(1).split(/[.[]/)[0];
      } else {
        const m = remaining.match(/^\[(\d+)\]/);
        if (!m) return;
        key = `[${m[1]}]`;
      }
      if (!unique.has(key)) {
        unique.set(key, {
          ...s,
          path: basePath + (remaining.startsWith('[') ? key : '.' + key),
          displayPath: key,
        });
      }
    });

    const options = Array.from(unique.values());
    if (options.length === 0) return null;

    const from = matchStart + basePath.length + (partialKey ? 1 : 0);
    return {
      from,
      options: options.map((s) => suggestionToCompletion(s, from)),
    };
  };
}
