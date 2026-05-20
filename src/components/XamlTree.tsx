import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Copy, Tag } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export interface XamlElementNode {
  tagName: string;
  attributes: Record<string, string>;
  children: XamlElementNode[];
}

export function parseXamlToTree(xaml: string): XamlElementNode | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xaml, 'text/xml');
    const parseError = doc.querySelector('parsererror');
    if (parseError) return null;

    function mapElement(el: Element): XamlElementNode {
      const attributes: Record<string, string> = {};
      for (let i = 0; i < el.attributes.length; i++) {
        const a = el.attributes[i];
        attributes[a.name] = a.value;
      }
      const children: XamlElementNode[] = [];
      for (let i = 0; i < el.children.length; i++) {
        const child = el.children[i];
        if (child.nodeType === Node.ELEMENT_NODE) {
          children.push(mapElement(child as Element));
        }
      }
      return {
        tagName: el.tagName,
        attributes,
        children,
      };
    }

    const root = doc.documentElement;
    if (!root || root.nodeType !== Node.ELEMENT_NODE) return null;
    return mapElement(root);
  } catch {
    return null;
  }
}

interface XamlTreeNodeProps {
  node: XamlElementNode;
  depth: number;
  path: string;
  defaultOpen?: boolean;
}

const XamlTreeNode: React.FC<XamlTreeNodeProps> = ({
  node,
  depth,
  path,
  defaultOpen = false,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const { toast } = useToast();
  const hasChildren = node.children.length > 0;
  const attrPreview =
    Object.keys(node.attributes).length > 0
      ? ' ' + Object.entries(node.attributes)
          .slice(0, 2)
          .map(([k, v]) => `${k}="${v.length > 12 ? v.slice(0, 12) + '…' : v}"`)
          .join(' ')
      : '';

  const paddingLeft = 12 + depth * 16;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(path).then(
      () => toast({ title: 'Path copied', description: path }),
      () => toast({ title: 'Copy failed', variant: 'destructive' })
    );
  };

  if (!hasChildren) {
    return (
      <div
        className="group flex items-center gap-1.5 py-0.5 px-1 rounded hover:bg-muted/50 font-mono text-sm"
        style={{ paddingLeft }}
      >
        <span className="w-4 shrink-0" />
        <Tag className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="text-code-keyword">&lt;{node.tagName}</span>
        {attrPreview && <span className="text-code-property">{attrPreview}</span>}
        <span className="text-code-keyword"> /&gt;</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 ml-auto opacity-0 group-hover:opacity-100"
          onClick={handleCopy}
          title="Copy path"
        >
          <Copy className="w-3 h-3" />
        </Button>
      </div>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div
        className="font-mono text-sm group flex items-center rounded hover:bg-muted/50"
        style={{ paddingLeft }}
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex flex-1 min-w-0 items-center gap-1.5 py-0.5 px-1 rounded text-left"
          >
            <span className="shrink-0 w-4 flex items-center justify-center">
              {open ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </span>
            <Tag className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-code-keyword">&lt;{node.tagName}</span>
            {attrPreview && (
              <span className="text-code-property truncate">{attrPreview}</span>
            )}
            <span className="text-code-keyword">&gt;</span>
            <span className="text-muted-foreground text-xs ml-1">
              {node.children.length} child{node.children.length !== 1 ? 'ren' : ''}
            </span>
          </button>
        </CollapsibleTrigger>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0"
          onClick={handleCopy}
          title="Copy path"
        >
          <Copy className="w-3 h-3" />
        </Button>
      </div>
      <CollapsibleContent>
        {node.children.map((child, index) => (
          <XamlTreeNode
            key={`${path}/${child.tagName}[${index}]`}
            node={child}
            depth={depth + 1}
            path={`${path}/${child.tagName}[${index}]`}
            defaultOpen={depth < 1}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
};

interface XamlTreeProps {
  xamlContent: string;
}

const XamlTree: React.FC<XamlTreeProps> = ({ xamlContent }) => {
  const root = useMemo(
    () => parseXamlToTree(xamlContent),
    [xamlContent]
  );

  if (!xamlContent.trim()) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        Enter XAML in the editor to see the tree.
      </div>
    );
  }

  if (!root) {
    return (
      <div className="p-4 text-center text-destructive text-sm">
        Invalid or incomplete XML. Check for unclosed tags or syntax errors.
      </div>
    );
  }

  return (
    <div className="overflow-auto editor-scrollbar py-2">
      <XamlTreeNode
        node={root}
        depth={0}
        path={`/${root.tagName}`}
        defaultOpen={true}
      />
    </div>
  );
};

export default XamlTree;
