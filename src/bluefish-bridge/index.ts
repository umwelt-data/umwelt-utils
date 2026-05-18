import { resolveIds, type SelectionLike } from './predicate.js';
import { applyHighlight, clearHighlight } from './highlight.js';

export interface HandleLike {
  getFocusedNavId(): string;
  fullPredicate(navId: string): SelectionLike;
  onFocusChange(cb: (navId: string) => void): () => void;
}

export interface BluefishBridgeOptions {
  handle: HandleLike;
  svgElement: SVGSVGElement;
  dimOpacity?: number;
}

export function createBluefishBridge(options: BluefishBridgeOptions): {
  destroy: () => void;
} {
  const { handle, svgElement, dimOpacity = 0.3 } = options;

  const update = (navId: string) => {
    const selection = handle.fullPredicate(navId);
    const ids = resolveIds(selection);

    if (!ids || ids.length === 0) {
      clearHighlight(svgElement);
      return;
    }

    applyHighlight(svgElement, ids, dimOpacity);
  };

  update(handle.getFocusedNavId());
  const unsubscribe = handle.onFocusChange(update);

  return {
    destroy: () => {
      unsubscribe();
      clearHighlight(svgElement);
    },
  };
}

export { resolveIds, type SelectionLike } from './predicate.js';
