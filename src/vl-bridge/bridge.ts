import { predicateToSelectionStore } from './fromPredicate.js';
import { EXTERNAL_STATE_STORE } from './injectParam.js';
import type { Selection } from './predicateTypes.js';

// Structural types — we only use a tiny surface of each.
// Declared locally so the package has no runtime dependency on olli-js or vega.

export interface OlliHandleLike {
  getSelection(): Selection;
  onSelectionChange(cb: (selection: Selection) => void): () => void;
}

export interface VegaViewLike {
  data(name: string, values: unknown): VegaViewLike;
  run(): VegaViewLike;
}

export interface BridgeOptions {
  /**
   * Name of the VL selection store to push tuples into.
   * Defaults to `external_state_store` — matches `withExternalStateParam`.
   */
  storeName?: string;

  /**
   * Called when writing to the view throws. Defaults to `console.error`.
   */
  onError?: (err: unknown) => void;
}

/**
 * Wire an Olli runtime to a compiled Vega-Lite view so that the user's
 * current selection in the Olli tree highlights the matching data on the chart.
 *
 * Usage:
 *
 *     const spec = withExternalStateParam(myVlSpec);
 *     const view = await new vega.View(vega.parse(vl.compile(spec).spec)).runAsync();
 *     const handle = olli(graph, container);
 *     const dispose = connectOlliToVegaLite(handle, view);
 *     // ... later:
 *     dispose();
 *
 * The returned dispose function unsubscribes the Olli listener. It does NOT
 * finalize the Vega view or destroy the Olli handle — the caller owns both.
 */
export function connectOlliToVegaLite(
  handle: OlliHandleLike,
  view: VegaViewLike,
  options: BridgeOptions = {},
): () => void {
  const storeName = options.storeName ?? EXTERNAL_STATE_STORE;
  const onError = options.onError ?? ((e: unknown) => console.error('[umwelt-utils vl-bridge]', e));

  const push = (selection: Selection) => {
    try {
      const tuple = predicateToSelectionStore(selection);
      view.data(storeName, tuple ? [tuple] : []).run();
    } catch (e) {
      onError(e);
    }
  };

  push(handle.getSelection());
  return handle.onSelectionChange(push);
}
