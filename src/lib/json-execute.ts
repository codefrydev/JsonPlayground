import Queryable from '@/lib/Queryable';
import { parseJson } from '@/lib/json-parse';

export interface OutputEntry {
  type: 'log' | 'error' | 'result' | 'info';
  content: string;
  timestamp: Date;
  dataType?: string;
}

export interface ExecutionMeta {
  executionTime?: number;
  jsonValid?: boolean;
  dataShape?: string;
}

export interface RunJsonScriptResult {
  output: OutputEntry[];
  meta: ExecutionMeta;
}

const getDataType = (value: unknown): string => {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
};

export const getDataShape = (data: unknown): string => {
  if (data === null) return 'null';
  if (Array.isArray(data)) {
    return `Array[${data.length}]`;
  }
  if (typeof data === 'object') {
    const keys = Object.keys(data as object);
    if (keys.length <= 3) {
      return `{ ${keys.join(', ')} }`;
    }
    return `Object { ${keys.length} keys }`;
  }
  return typeof data;
};

function formatHelpfulError(error: string): string {
  if (error.includes('is not defined')) {
    const varName = error.split(' ')[0];
    return `${error}\n\n💡 Tip: Use 'data.${varName}' to access JSON properties.`;
  }
  if (error.includes('Cannot read properties of undefined')) {
    return `${error}\n\n💡 Tip: The property path doesn't exist in your JSON. Check the structure.`;
  }
  if (error.includes('is not a function')) {
    return `${error}\n\n💡 Tip: You're trying to call something that isn't a function.`;
  }
  return error;
}

function createCustomConsole() {
  const logs: { type: 'log' | 'error'; content: string; dataType: string }[] = [];
  const customConsole = {
    log: (...args: unknown[]) => {
      args.forEach((arg) => {
        const formatted = typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg);
        logs.push({ type: 'log', content: formatted, dataType: getDataType(arg) });
      });
    },
    error: (...args: unknown[]) => {
      args.forEach((arg) => {
        const formatted = typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg);
        logs.push({ type: 'error', content: `Error: ${formatted}`, dataType: 'error' });
      });
    },
    info: (...args: unknown[]) => {
      args.forEach((arg) => {
        const formatted = typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg);
        logs.push({ type: 'log', content: formatted, dataType: getDataType(arg) });
      });
    },
  };
  return { logs, customConsole };
}

function logsToOutput(
  logs: { type: 'log' | 'error'; content: string; dataType: string }[],
  newOutput: OutputEntry[]
): void {
  logs.forEach((log) => {
    newOutput.push({
      type: log.type,
      content: log.content,
      timestamp: new Date(),
      dataType: log.dataType,
    });
  });
}

function valuesToOutput(values: unknown[], newOutput: OutputEntry[]): void {
  for (const value of values) {
    const resultStr =
      typeof value === 'object' && value !== null ? JSON.stringify(value, null, 2) : String(value);
    newOutput.push({
      type: 'result',
      content: resultStr,
      timestamp: new Date(),
      dataType: getDataType(value),
    });
  }
}

export function runJsonScript(
  jsonInput: string,
  codeInput: string,
  options?: { startTime?: number }
): RunJsonScriptResult {
  const startTime = options?.startTime ?? performance.now();
  const newOutput: OutputEntry[] = [];

  const jsonResult = parseJson(jsonInput);

  if (jsonResult.valid === false) {
    const endTime = performance.now();
    newOutput.push({
      type: 'error',
      content: `JSON Parse Error: ${jsonResult.error}\n\nTip: Check for missing commas, quotes, or brackets.`,
      timestamp: new Date(),
    });
    return {
      output: newOutput,
      meta: {
        executionTime: endTime - startTime,
        jsonValid: false,
      },
    };
  }

  const data = jsonResult.data;

  try {
    const { logs, customConsole } = createCustomConsole();
    const code = codeInput;

    if (!code.trim()) {
      return {
        output: [
          {
            type: 'info',
            content:
              '// Write some code to see results\n// Use Dump(value) to display output. Example: Dump(data.user.name)',
            timestamp: new Date(),
          },
        ],
        meta: {
          jsonValid: true,
          dataShape: getDataShape(data),
        },
      };
    }

    const usesDump = code.includes('Dump(');

    if (usesDump) {
      const dumpValues: unknown[] = [];
      const Dump = (...args: unknown[]) => {
        args.forEach((v) => dumpValues.push(v));
      };
      try {
        const fn = new Function(
          'data',
          'console',
          'Dump',
          'Queryable',
          `"use strict";\n${code}`
        ) as (
          d: unknown,
          c: typeof customConsole,
          Dump: (...args: unknown[]) => void,
          Q: unknown
        ) => void;
        fn(data, customConsole, Dump, Queryable);

        const endTime = performance.now();
        logsToOutput(logs, newOutput);
        valuesToOutput(dumpValues, newOutput);
        if (newOutput.length === 0) {
          newOutput.push({
            type: 'info',
            content: 'No output. Use Dump(value) to display results.',
            timestamp: new Date(),
          });
        }
        return {
          output: newOutput,
          meta: {
            executionTime: endTime - startTime,
            jsonValid: true,
            dataShape: getDataShape(data),
          },
        };
      } catch (e) {
        const endTime = performance.now();
        const error = e instanceof Error ? e.message : 'Execution error';
        newOutput.push({
          type: 'error',
          content: formatHelpfulError(error),
          timestamp: new Date(),
        });
        return {
          output: newOutput,
          meta: {
            executionTime: endTime - startTime,
            jsonValid: true,
            dataShape: getDataShape(data),
          },
        };
      }
    }

    const lines = code
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const hasExplicitReturn = code.includes('return');
    const multiResult = !hasExplicitReturn && lines.length > 1;

    type ExecFn = (d: unknown, c: typeof customConsole, Q: unknown) => unknown;
    let fn: ExecFn;
    if (hasExplicitReturn) {
      fn = new Function('data', 'console', 'Queryable', `"use strict";\n${code}`) as ExecFn;
    } else if (lines.length === 1) {
      fn = new Function('data', 'console', 'Queryable', `"use strict";\nreturn (${lines[0]})`) as ExecFn;
    } else {
      fn = new Function('data', 'console', 'Queryable', `"use strict";\nreturn (undefined)`) as ExecFn;
    }

    let results: unknown[];
    if (multiResult) {
      results = [];
      for (const line of lines) {
        const lineFn = new Function(
          'data',
          'console',
          'Queryable',
          `"use strict"; return (${line})`
        ) as ExecFn;
        results.push(lineFn(data, customConsole, Queryable));
      }
    } else {
      const single = fn(data, customConsole, Queryable);
      results = single !== undefined ? [single] : [];
    }

    const endTime = performance.now();
    logsToOutput(logs, newOutput);
    valuesToOutput(results, newOutput);
    if (newOutput.length === 0) {
      newOutput.push({
        type: 'info',
        content: 'undefined',
        timestamp: new Date(),
        dataType: 'undefined',
      });
    }
    return {
      output: newOutput,
      meta: {
        executionTime: endTime - startTime,
        jsonValid: true,
        dataShape: getDataShape(data),
      },
    };
  } catch (e) {
    const endTime = performance.now();
    const error = e instanceof Error ? e.message : 'Execution error';
    newOutput.push({
      type: 'error',
      content: formatHelpfulError(error),
      timestamp: new Date(),
    });
    return {
      output: newOutput,
      meta: {
        executionTime: endTime - startTime,
        jsonValid: true,
        dataShape: getDataShape(data),
      },
    };
  }
}
