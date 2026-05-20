/**
 * CodeMirror 6 extension to highlight JWT token parts: header, payload, signature.
 */

import { Decoration, ViewPlugin, type DecorationSet, type EditorView } from '@codemirror/view';

function buildJwtDecorations(view: EditorView): DecorationSet {
  const doc = view.state.doc.toString();
  const firstDot = doc.indexOf('.');
  const secondDot = doc.indexOf('.', firstDot + 1);
  if (firstDot < 0 || secondDot <= firstDot) return Decoration.none;

  const headerEnd = firstDot;
  const payloadEnd = secondDot;
  const decos = [
    Decoration.mark({ class: 'cm-jwt-header' }).range(0, headerEnd),
    Decoration.mark({ class: 'cm-jwt-payload' }).range(headerEnd + 1, payloadEnd),
    Decoration.mark({ class: 'cm-jwt-signature' }).range(payloadEnd + 1, doc.length),
  ];
  return Decoration.set(decos, true);
}

export const jwtHighlight = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildJwtDecorations(view);
    }
    update(update: { docChanged: boolean; view: EditorView }) {
      if (update.docChanged) this.decorations = buildJwtDecorations(update.view);
    }
  },
  { decorations: (v) => v.decorations }
);
