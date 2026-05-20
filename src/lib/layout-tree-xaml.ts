import type { XamlPanelId } from '@/lib/playground-types';

export type XamlLayoutLeaf = {
  type: 'leaf';
  id: string;
  tabs: XamlPanelId[];
  activeTab: XamlPanelId | null;
};

export type XamlLayoutSplit = {
  type: 'split';
  id: string;
  direction: 'row' | 'col';
  ratio: number;
  first: XamlLayoutNode;
  second: XamlLayoutNode;
};

export type XamlLayoutNode = XamlLayoutLeaf | XamlLayoutSplit;

export type DropPosition = 'center' | 'left' | 'right' | 'top' | 'bottom';

const VALID_PANEL_IDS: XamlPanelId[] = ['xaml', 'tree', 'code', 'output'];

function randomId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 11)}`;
}

export function createLeaf(tabs: XamlPanelId[] = []): XamlLayoutLeaf {
  return {
    type: 'leaf',
    id: randomId('leaf'),
    tabs: [...tabs],
    activeTab: tabs.length > 0 ? tabs[0] : null,
  };
}

export function findNodeAndParent(
  root: XamlLayoutNode,
  targetId: string,
  parent: XamlLayoutSplit | null = null
): { node: XamlLayoutNode; parent: XamlLayoutSplit | null } | null {
  if (!root) return null;
  if (root.id === targetId) return { node: root, parent };
  if (root.type === 'split') {
    const firstRes = findNodeAndParent(root.first, targetId, root);
    if (firstRes) return firstRes;
    const secondRes = findNodeAndParent(root.second, targetId, root);
    if (secondRes) return secondRes;
  }
  return null;
}

function findLeafWithTab(node: XamlLayoutNode, tabId: XamlPanelId): XamlLayoutLeaf | null {
  if (node.type === 'leaf') {
    if (node.tabs.includes(tabId)) return node;
    return null;
  }
  const f = findLeafWithTab(node.first, tabId);
  if (f) return f;
  return findLeafWithTab(node.second, tabId);
}

export function removeTabFromTree(
  root: XamlLayoutNode,
  tabId: XamlPanelId
): { newRoot: XamlLayoutNode; removedTabId: XamlPanelId | null } {
  const newRoot = JSON.parse(JSON.stringify(root)) as XamlLayoutNode;
  const targetLeaf = findLeafWithTab(newRoot, tabId);
  if (!targetLeaf) return { newRoot, removedTabId: null };

  targetLeaf.tabs = targetLeaf.tabs.filter((t) => t !== tabId);
  if (targetLeaf.activeTab === tabId) {
    targetLeaf.activeTab = targetLeaf.tabs.length > 0 ? targetLeaf.tabs[0] : null;
  }

  if (targetLeaf.tabs.length > 0) return { newRoot, removedTabId: tabId };

  if (newRoot.type === 'leaf') return { newRoot, removedTabId: tabId };

  const result = findNodeAndParent(newRoot, targetLeaf.id);
  if (!result) return { newRoot, removedTabId: tabId };
  const { parent } = result;

  if (parent) {
    const sibling = parent.first.id === targetLeaf.id ? parent.second : parent.first;
    const grandparentResult = findNodeAndParent(newRoot, parent.id);
    if (!grandparentResult?.parent) {
      return { newRoot: sibling, removedTabId: tabId };
    }
    const grandparent = grandparentResult.parent;
    if (grandparent.first.id === parent.id) grandparent.first = sibling;
    else grandparent.second = sibling;
  }
  return { newRoot, removedTabId: tabId };
}

export function insertTabIntoNode(
  root: XamlLayoutNode,
  targetNodeId: string,
  tabId: XamlPanelId,
  position: DropPosition
): XamlLayoutNode {
  const newRoot = JSON.parse(JSON.stringify(root)) as XamlLayoutNode;
  const searchResult = findNodeAndParent(newRoot, targetNodeId);
  if (!searchResult) return newRoot;

  const { node, parent } = searchResult;
  if (!node || node.type !== 'leaf') return newRoot;

  const leaf = node as XamlLayoutLeaf;

  if (position === 'center') {
    leaf.tabs.push(tabId);
    leaf.activeTab = tabId;
    return newRoot;
  }

  const newLeaf = createLeaf([tabId]);
  const isRow = position === 'left' || position === 'right';
  const newSplit: XamlLayoutSplit = {
    type: 'split',
    id: randomId('split'),
    direction: isRow ? 'row' : 'col',
    ratio: 50,
    first: position === 'left' || position === 'top' ? newLeaf : leaf,
    second: position === 'left' || position === 'top' ? leaf : newLeaf,
  };

  if (!parent) return newSplit;
  if (parent.first.id === node.id) parent.first = newSplit;
  else parent.second = newSplit;
  return newRoot;
}

export function getPanelIdsInTree(root: XamlLayoutNode): Set<XamlPanelId> {
  const set = new Set<XamlPanelId>();
  function walk(node: XamlLayoutNode) {
    if (node.type === 'leaf') {
      node.tabs.forEach((id) => set.add(id));
    } else {
      walk(node.first);
      walk(node.second);
    }
  }
  walk(root);
  return set;
}

export function getFirstLeafId(root: XamlLayoutNode): string {
  if (root.type === 'leaf') return root.id;
  return getFirstLeafId(root.first);
}

export function getDefaultLayout(): XamlLayoutNode {
  return {
    type: 'split',
    id: 'root-split',
    direction: 'row',
    ratio: 40,
    first: createLeaf(['xaml', 'tree']),
    second: {
      type: 'split',
      id: 'right-split',
      direction: 'col',
      ratio: 70,
      first: createLeaf(['code']),
      second: createLeaf(['output']),
    },
  };
}

function isLayoutLeaf(node: unknown): node is XamlLayoutLeaf {
  return (
    typeof node === 'object' &&
    node !== null &&
    (node as XamlLayoutLeaf).type === 'leaf' &&
    typeof (node as XamlLayoutLeaf).id === 'string' &&
    Array.isArray((node as XamlLayoutLeaf).tabs) &&
    ((node as XamlLayoutLeaf).activeTab === null ||
      VALID_PANEL_IDS.includes((node as XamlLayoutLeaf).activeTab as XamlPanelId))
  );
}

function isLayoutSplit(node: unknown): node is XamlLayoutSplit {
  if (
    typeof node !== 'object' ||
    node === null ||
    (node as XamlLayoutSplit).type !== 'split' ||
    typeof (node as XamlLayoutSplit).id !== 'string' ||
    typeof (node as XamlLayoutSplit).ratio !== 'number' ||
    ((node as XamlLayoutSplit).direction !== 'row' && (node as XamlLayoutSplit).direction !== 'col')
  )
    return false;
  const n = node as XamlLayoutSplit;
  return (
    (isLayoutLeaf(n.first) || isLayoutSplit(n.first)) &&
    (isLayoutLeaf(n.second) || isLayoutSplit(n.second))
  );
}

function validateAndNormalizeTabs(tabs: unknown): XamlPanelId[] {
  if (!Array.isArray(tabs)) return [];
  return tabs.filter((id): id is XamlPanelId => VALID_PANEL_IDS.includes(id as XamlPanelId));
}

function validateNode(raw: unknown): XamlLayoutNode | null {
  if (isLayoutLeaf(raw)) {
    const leaf = raw as XamlLayoutLeaf;
    const tabs = validateAndNormalizeTabs(leaf.tabs);
    const activeTab =
      leaf.activeTab && VALID_PANEL_IDS.includes(leaf.activeTab) ? leaf.activeTab : null;
    return { type: 'leaf', id: leaf.id, tabs, activeTab: tabs.length ? activeTab ?? tabs[0] : null };
  }
  if (isLayoutSplit(raw)) {
    const split = raw as XamlLayoutSplit;
    const first = validateNode(split.first);
    const second = validateNode(split.second);
    if (!first || !second) return null;
    return {
      type: 'split',
      id: split.id,
      direction: split.direction,
      ratio: Math.max(10, Math.min(90, Number(split.ratio) || 50)),
      first,
      second,
    };
  }
  return null;
}

const LAYOUT_TREE_KEY = 'xaml-playground-layout-tree';

export function loadLayout(): XamlLayoutNode | null {
  try {
    const raw = localStorage.getItem(LAYOUT_TREE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return validateNode(parsed);
  } catch {
    return null;
  }
}

export function loadLayoutWithMigration(): XamlLayoutNode {
  const tree = loadLayout();
  return tree ?? getDefaultLayout();
}

export function saveLayout(layout: XamlLayoutNode): void {
  try {
    localStorage.setItem(LAYOUT_TREE_KEY, JSON.stringify(layout));
  } catch {
    // ignore
  }
}

export function updateSplitRatio(
  root: XamlLayoutNode,
  splitId: string,
  ratio: number
): XamlLayoutNode {
  const next = JSON.parse(JSON.stringify(root)) as XamlLayoutNode;
  const result = findNodeAndParent(next, splitId);
  if (!result || result.node.type !== 'split') return next;
  (result.node as XamlLayoutSplit).ratio = Math.max(10, Math.min(90, ratio));
  return next;
}
