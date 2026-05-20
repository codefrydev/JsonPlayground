/**
 * XAML (XML) ↔ JSON conversion.
 * - XAML to JSON: parses XML to a tree { tagName, attributes, children } and returns JSON string.
 * - JSON to XAML: if JSON is tree format, emits XML; otherwise converts generic JSON to XML.
 */

export interface XmlTreeNode {
  tagName: string;
  attributes: Record<string, string>;
  children: XmlTreeNode[];
}

function isTreeFormat(obj: unknown): obj is XmlTreeNode {
  if (typeof obj !== 'object' || obj === null) return false;
  const o = obj as Record<string, unknown>;
  return typeof o.tagName === 'string' && Array.isArray(o.children);
}

function escapeXmlText(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function sanitizeTagName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/** Convert XAML/XML string to JSON string (tree format). */
export function xamlToJson(xaml: string): { ok: true; json: string } | { ok: false; error: string } {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xaml, 'text/xml');
    if (doc.querySelector('parsererror')) {
      return { ok: false, error: 'Invalid or incomplete XML' };
    }
    const root = doc.documentElement;
    if (!root || root.nodeType !== Node.ELEMENT_NODE) {
      return { ok: false, error: 'No document element' };
    }

    function mapElement(el: Element): XmlTreeNode {
      const attributes: Record<string, string> = {};
      for (let i = 0; i < el.attributes.length; i++) {
        const a = el.attributes[i];
        attributes[a.name] = a.value;
      }
      const children: XmlTreeNode[] = [];
      for (let i = 0; i < el.children.length; i++) {
        const child = el.children[i];
        if (child.nodeType === Node.ELEMENT_NODE) {
          children.push(mapElement(child as Element));
        }
      }
      return { tagName: el.tagName, attributes, children };
    }

    const tree = mapElement(root);
    return { ok: true, json: JSON.stringify(tree, null, 2) };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Parse failed',
    };
  }
}

/** Convert tree-format node to XML string. */
function treeNodeToXml(node: XmlTreeNode, indent: string, indentStep: string): string {
  const attrs = Object.entries(node.attributes || {})
    .map(([k, v]) => ` ${k}="${escapeXmlText(String(v))}"`)
    .join('');
  if (node.children.length === 0) {
    return `${indent}<${node.tagName}${attrs} />`;
  }
  const childIndent = indent + indentStep;
  const inner = node.children
    .map((c) => treeNodeToXml(c, childIndent, indentStep))
    .join('\n');
  return `${indent}<${node.tagName}${attrs}>\n${inner}\n${indent}</${node.tagName}>`;
}

/** Convert generic JSON value to XML (element content or subtree). */
function valueToXml(key: string, value: unknown, indent: string, indentStep: string): string {
  const tag = sanitizeTagName(key);
  if (value === null || value === undefined) {
    return `${indent}<${tag} />`;
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return `${indent}<${tag}>${escapeXmlText(String(value))}</${tag}>`;
  }
  if (Array.isArray(value)) {
    return value
      .map((item, i) => {
        if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
          return objectToXml(`item`, item as Record<string, unknown>, indent, indentStep);
        }
        return valueToXml('item', item, indent, indentStep);
      })
      .join('\n');
  }
  if (typeof value === 'object') {
    return objectToXml(tag, value as Record<string, unknown>, indent, indentStep);
  }
  return `${indent}<${tag}>${escapeXmlText(String(value))}</${tag}>`;
}

function objectToXml(
  rootTag: string,
  obj: Record<string, unknown>,
  indent: string,
  indentStep: string
): string {
  const entries = Object.entries(obj);
  if (entries.length === 0) {
    return `${indent}<${sanitizeTagName(rootTag)} />`;
  }
  const childIndent = indent + indentStep;
  const inner = entries
    .map(([k, v]) => valueToXml(k, v, childIndent, indentStep))
    .join('\n');
  return `${indent}<${sanitizeTagName(rootTag)}>\n${inner}\n${indent}</${sanitizeTagName(rootTag)}>`;
}

/** Convert JSON string to XAML/XML string. */
export function jsonToXaml(jsonStr: string): { ok: true; xaml: string } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(jsonStr) as unknown;
    const indentStep = '  ';

    if (isTreeFormat(parsed)) {
      const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' + treeNodeToXml(parsed, '', indentStep);
      return { ok: true, xaml: xml };
    }

    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      const obj = parsed as Record<string, unknown>;
      const keys = Object.keys(obj);
      if (keys.length === 0) {
        return { ok: true, xaml: '<?xml version="1.0" encoding="UTF-8"?>\n<root />' };
      }
      if (keys.length === 1) {
        const [rootKey] = keys;
        const rootValue = obj[rootKey];
        const body =
          typeof rootValue === 'object' && rootValue !== null && !Array.isArray(rootValue)
            ? objectToXml(rootKey, rootValue as Record<string, unknown>, '', indentStep)
            : valueToXml(rootKey, rootValue, '', indentStep);
        return { ok: true, xaml: '<?xml version="1.0" encoding="UTF-8"?>\n' + body };
      }
      const body = objectToXml('root', obj, '', indentStep);
      return { ok: true, xaml: '<?xml version="1.0" encoding="UTF-8"?>\n' + body };
    }

    return { ok: true, xaml: '<?xml version="1.0" encoding="UTF-8"?>\n<root>' + escapeXmlText(JSON.stringify(parsed)) + '</root>' };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Invalid JSON',
    };
  }
}
