import type { PanelId } from '@/lib/playground-types';

export type LayoutLeaf = {
  type: 'leaf';
  id: string;
  tabs: PanelId[];
  activeTab: PanelId | null;
};

export type LayoutSplit = {
  type: 'split';
  id: string;
  direction: 'row' | 'col';
  ratio: number;
  first: LayoutNode;
  second: LayoutNode;
};

export type LayoutNode = LayoutLeaf | LayoutSplit;

export type DropPosition = 'center' | 'left' | 'right' | 'top' | 'bottom';

const VALID_PANEL_IDS: PanelId[] = ['json', 'tree', 'code', 'output'];

function randomId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 11)}`;
}

export function createLeaf(tabs: PanelId[] = []): LayoutLeaf {
  return {
    type: 'leaf',
    id: randomId('leaf'),
    tabs: [...tabs],
    activeTab: tabs.length > 0 ? tabs[0] : null,
  };
}

export function findNodeAndParent(
  root: LayoutNode,
  targetId: string,
  parent: LayoutSplit | null = null
): { node: LayoutNode; parent: LayoutSplit | null } | null {
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

function findLeafWithTab(node: LayoutNode, tabId: PanelId): LayoutLeaf | null {
  if (node.type === 'leaf') {
    if (node.tabs.includes(tabId)) return node;
    return null;
  }
  const f = findLeafWithTab(node.first, tabId);
  if (f) return f;
  return findLeafWithTab(node.second, tabId);
}

export function removeTabFromTree(
  root: LayoutNode,
  tabId: PanelId
): { newRoot: LayoutNode; removedTabId: PanelId | null } {
  const newRoot = JSON.parse(JSON.stringify(root)) as LayoutNode;
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
  root: LayoutNode,
  targetNodeId: string,
  tabId: PanelId,
  position: DropPosition
): LayoutNode {
  const newRoot = JSON.parse(JSON.stringify(root)) as LayoutNode;
  const searchResult = findNodeAndParent(newRoot, targetNodeId);
  if (!searchResult) return newRoot;

  const { node, parent } = searchResult;
  if (!node || node.type !== 'leaf') return newRoot;

  const leaf = node as LayoutLeaf;

  if (position === 'center') {
    leaf.tabs.push(tabId);
    leaf.activeTab = tabId;
    return newRoot;
  }

  const newLeaf = createLeaf([tabId]);
  const isRow = position === 'left' || position === 'right';
  const newSplit: LayoutSplit = {
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

export function getPanelIdsInTree(root: LayoutNode): Set<PanelId> {
  const set = new Set<PanelId>();
  function walk(node: LayoutNode) {
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

export function getFirstLeafId(root: LayoutNode): string {
  if (root.type === 'leaf') return root.id;
  return getFirstLeafId(root.first);
}

export function getDefaultLayout(): LayoutNode {
  return {
    type: 'split',
    id: 'root-split',
    direction: 'row',
    ratio: 40,
    first: createLeaf(['json', 'tree']),
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

function isLayoutLeaf(node: unknown): node is LayoutLeaf {
  return (
    typeof node === 'object' &&
    node !== null &&
    (node as LayoutLeaf).type === 'leaf' &&
    typeof (node as LayoutLeaf).id === 'string' &&
    Array.isArray((node as LayoutLeaf).tabs) &&
    ((node as LayoutLeaf).activeTab === null ||
      VALID_PANEL_IDS.includes((node as LayoutLeaf).activeTab as PanelId))
  );
}

function isLayoutSplit(node: unknown): node is LayoutSplit {
  if (
    typeof node !== 'object' ||
    node === null ||
    (node as LayoutSplit).type !== 'split' ||
    typeof (node as LayoutSplit).id !== 'string' ||
    typeof (node as LayoutSplit).ratio !== 'number' ||
    ((node as LayoutSplit).direction !== 'row' && (node as LayoutSplit).direction !== 'col')
  )
    return false;
  const n = node as LayoutSplit;
  return (
    (isLayoutLeaf(n.first) || isLayoutSplit(n.first)) &&
    (isLayoutLeaf(n.second) || isLayoutSplit(n.second))
  );
}

function validateAndNormalizeTabs(tabs: unknown): PanelId[] {
  if (!Array.isArray(tabs)) return [];
  return tabs.filter((id): id is PanelId => VALID_PANEL_IDS.includes(id as PanelId));
}

function validateNode(raw: unknown): LayoutNode | null {
  if (isLayoutLeaf(raw)) {
    const leaf = raw as LayoutLeaf;
    const tabs = validateAndNormalizeTabs(leaf.tabs);
    const activeTab =
      leaf.activeTab && VALID_PANEL_IDS.includes(leaf.activeTab) ? leaf.activeTab : null;
    return { type: 'leaf', id: leaf.id, tabs, activeTab: tabs.length ? activeTab ?? tabs[0] : null };
  }
  if (isLayoutSplit(raw)) {
    const split = raw as LayoutSplit;
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

const LAYOUT_TREE_KEY = 'json-playground-layout-tree';
const PANEL_ORDER_KEY = 'json-playground-panel-order';
const LAYOUT_MODE_KEY = 'json-playground-layout-mode';

export function loadLayout(): LayoutNode | null {
  try {
    const raw = localStorage.getItem(LAYOUT_TREE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return validateNode(parsed);
  } catch {
    return null;
  }
}

function buildTreeFromLegacy(order: PanelId[], mode: string): LayoutNode {
  const [a, b, c, d] = order;
  const horizontal = (ids: PanelId[]) => ({
    type: 'split' as const,
    id: randomId('split'),
    direction: 'row' as const,
    ratio: 50,
    first: createLeaf(ids.slice(0, 2)),
    second: createLeaf(ids.slice(2, 4)),
  });
  const vertical = (ids: PanelId[]) => ({
    type: 'split' as const,
    id: randomId('split'),
    direction: 'col' as const,
    ratio: 50,
    first: createLeaf(ids.slice(0, 2)),
    second: createLeaf(ids.slice(2, 4)),
  });
  switch (mode) {
    case 'horizontal':
      return {
        type: 'split',
        id: 'root',
        direction: 'row',
        ratio: 25,
        first: createLeaf([a]),
        second: {
          type: 'split',
          id: randomId('split'),
          direction: 'row',
          ratio: 33.33,
          first: createLeaf([b]),
          second: {
            type: 'split',
            id: randomId('split'),
            direction: 'row',
            ratio: 50,
            first: createLeaf([c]),
            second: createLeaf([d]),
          },
        },
      };
    case 'vertical':
      return {
        type: 'split',
        id: 'root',
        direction: 'col',
        ratio: 25,
        first: createLeaf([a]),
        second: {
          type: 'split',
          id: randomId('split'),
          direction: 'col',
          ratio: 33.33,
          first: createLeaf([b]),
          second: {
            type: 'split',
            id: randomId('split'),
            direction: 'col',
            ratio: 50,
            first: createLeaf([c]),
            second: createLeaf([d]),
          },
        },
      };
    case 'grid-2x2':
      return {
        type: 'split',
        id: 'root',
        direction: 'col',
        ratio: 50,
        first: horizontal([a, b]),
        second: horizontal([c, d]),
      };
    case 'split-left':
      return {
        type: 'split',
        id: 'root',
        direction: 'row',
        ratio: 50,
        first: vertical([a, b]),
        second: vertical([c, d]),
      };
    case 'split-right':
      return {
        type: 'split',
        id: 'root',
        direction: 'row',
        ratio: 33,
        first: createLeaf([a]),
        second: {
          type: 'split',
          id: randomId('split'),
          direction: 'col',
          ratio: 50,
          first: createLeaf([b]),
          second: { type: 'split', id: randomId('split'), direction: 'col', ratio: 50, first: createLeaf([c]), second: createLeaf([d]) },
        },
      };
    case 'split-three-left':
      return {
        type: 'split',
        id: 'root',
        direction: 'row',
        ratio: 66,
        first: {
          type: 'split',
          id: randomId('split'),
          direction: 'col',
          ratio: 50,
          first: createLeaf([a]),
          second: { type: 'split', id: randomId('split'), direction: 'col', ratio: 50, first: createLeaf([b]), second: createLeaf([c]) },
        },
        second: createLeaf([d]),
      };
    case 'top-bottom':
      return {
        type: 'split',
        id: 'root',
        direction: 'col',
        ratio: 50,
        first: horizontal([a, b]),
        second: horizontal([c, d]),
      };
    case 'bottom-top':
      return {
        type: 'split',
        id: 'root',
        direction: 'col',
        ratio: 50,
        first: createLeaf([a]),
        second: horizontal([b, c, d]),
      };
    case 'three-top':
      return {
        type: 'split',
        id: 'root',
        direction: 'col',
        ratio: 50,
        first: horizontal([a, b, c]),
        second: createLeaf([d]),
      };
    default:
      return getDefaultLayout();
  }
}

export function loadLayoutWithMigration(): LayoutNode {
  const tree = loadLayout();
  if (tree) return tree;
  try {
    const orderRaw = localStorage.getItem(PANEL_ORDER_KEY);
    const modeRaw = localStorage.getItem(LAYOUT_MODE_KEY);
    const order: PanelId[] = orderRaw
      ? (JSON.parse(orderRaw) as unknown[]).filter((id): id is PanelId =>
          VALID_PANEL_IDS.includes(id as PanelId)
        )
      : ['json', 'tree', 'code', 'output'];
    if (order.length !== 4) return getDefaultLayout();
    const mode = modeRaw && ['horizontal', 'vertical', 'grid-2x2', 'split-left', 'split-right', 'split-three-left', 'top-bottom', 'bottom-top', 'three-top'].includes(modeRaw) ? modeRaw : 'split-right';
    return buildTreeFromLegacy(order, mode);
  } catch {
    return getDefaultLayout();
  }
}

export function saveLayout(layout: LayoutNode): void {
  try {
    localStorage.setItem(LAYOUT_TREE_KEY, JSON.stringify(layout));
  } catch {
    // ignore
  }
}

export function updateSplitRatio(
  root: LayoutNode,
  splitId: string,
  ratio: number
): LayoutNode {
  const next = JSON.parse(JSON.stringify(root)) as LayoutNode;
  const result = findNodeAndParent(next, splitId);
  if (!result || result.node.type !== 'split') return next;
  (result.node as LayoutSplit).ratio = Math.max(10, Math.min(90, ratio));
  return next;
}
