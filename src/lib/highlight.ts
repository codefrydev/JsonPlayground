import hljs from 'highlight.js/lib/core';
import json from 'highlight.js/lib/languages/json';
import javascript from 'highlight.js/lib/languages/javascript';
import plaintext from 'highlight.js/lib/languages/plaintext';

hljs.registerLanguage('json', json);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('plaintext', plaintext);

export type HighlightLanguage = 'json' | 'javascript' | 'plaintext';

/**
 * Highlight code string and return HTML with hljs span classes.
 */
export function highlight(code: string, language: HighlightLanguage): string {
  if (!code) return '';
  if (language === 'plaintext') {
    return hljs.highlight(code, { language: 'plaintext' }).value;
  }
  try {
    return hljs.highlight(code, { language }).value;
  } catch {
    return escapeHtml(code);
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export { hljs };
