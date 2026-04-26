import { resolveIds, type SelectionLike } from './predicate.js';
import {
  clearHighlights,
  renderHighlights,
  DEFAULT_HIGHLIGHT_STYLE,
  type HighlightStyle,
} from './highlight.js';

// Structural types — declared locally so the package has no runtime dependency
// on olli-core, olli-js, or bluefish-solid.

export interface HandleLike {
  getFocusedNavId(): string;
  fullPredicate(navId: string): SelectionLike;
  onFocusChange(cb: (navId: string) => void): () => void;
}

export interface ScenegraphLike {
  getBBox(name: string): DOMRect | null;
}

export interface BluefishBridgeOptions {
  handle: HandleLike;
  scenegraph: ScenegraphLike;
  svgElement: SVGSVGElement;
  highlightStyle?: Partial<HighlightStyle>;
}

export function createBluefishBridge(options: BluefishBridgeOptions): {
  destroy: () => void;
} {
  const { handle, scenegraph, svgElement } = options;
  const style: HighlightStyle = { ...DEFAULT_HIGHLIGHT_STYLE, ...options.highlightStyle };

  const update = (navId: string) => {
    const selection = handle.fullPredicate(navId);
    const ids = resolveIds(selection);

    if (!ids || ids.length === 0) {
      clearHighlights(svgElement);
      return;
    }

    const bboxes: DOMRect[] = [];
    for (const id of ids) {
      const bbox = scenegraph.getBBox(id);
      if (bbox) bboxes.push(bbox);
    }

    renderHighlights(svgElement, bboxes, style);
  };

  update(handle.getFocusedNavId());
  const unsubscribe = handle.onFocusChange(update);

  return {
    destroy: () => {
      unsubscribe();
      clearHighlights(svgElement);
    },
  };
}

export { resolveIds, type SelectionLike } from './predicate.js';
export { DEFAULT_HIGHLIGHT_STYLE, type HighlightStyle } from './highlight.js';
