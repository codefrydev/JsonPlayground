import { useCallback, useRef } from 'react';
import { runJsonScript } from '@/lib/json-execute';
import type { OutputEntry, ExecutionMeta } from '@/components/OutputPanel';

export interface ExecutorResult {
  output: OutputEntry[];
  meta: ExecutionMeta;
}

export function useJsonExecutor() {
  const runIdRef = useRef(0);

  const execute = useCallback(
    (jsonInput: string, codeInput: string): Promise<ExecutorResult | null> => {
      const runId = ++runIdRef.current;
      const startTime = performance.now();
      const result = runJsonScript(jsonInput, codeInput, { startTime });
      if (runId !== runIdRef.current) return Promise.resolve(null);
      return Promise.resolve(result);
    },
    []
  );

  const cancelStale = useCallback(() => {
    runIdRef.current++;
  }, []);

  return { execute, cancelStale };
}
