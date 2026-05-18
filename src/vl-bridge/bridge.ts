import { predicateToSelectionStore } from './fromPredicate.js';
import { EXTERNAL_STATE_STORE } from './injectParam.js';
import type { Selection } from '../predicate/types.js';

// Structural types — we only use a tiny surface of each.
// Declared locally so the package has no runtime dependency on olli-js or vega.

export interface OlliHandleLike {
  getSelection(): Selection;
  onSelectionChange(cb: (selection: Selection) => void): () => void;
  /** Optional — when present, the bridge uses focus-drives-highlight. */
  getFocusedNavId?(): string;
  /** Optional — used to compute a predicate for a focused node. */
  fullPredicate?(navId: string): Selection;
  /** Optional — called on focus change; preferred when `fullPredicate` is available. */
  onFocusChange?(cb: (navId: string) => void): () => void;
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

  /**
   * Selection source. Default is `'auto'`: focus-drives-highlight when the
   * handle exposes `fullPredicate` + `onFocusChange`, otherwise the selection
   * signal. Set to `'selection'` to force reading `getSelection()` /
   * subscribing to `onSelectionChange`.
   */
  source?: 'auto' | 'selection' | 'focus';
}

/**
 * Wire an Olli runtime to a compiled Vega-Lite view so that the user's
 * current position in the Olli tree highlights the matching data on the chart.
 *
 * By default (source: 'auto'), the bridge listens to focus changes on the
 * handle and maps the focused nav node to its ancestor predicate via
 * `handle.fullPredicate(navId)`. This matches the umwelt UX where navigating
 * the tree auto-highlights the corresponding subset.
 *
 * When the handle does not expose `fullPredicate`, the bridge falls back to
 * `onSelectionChange` — only explicit `setSelection()` calls will drive
 * highlighting in that mode.
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
  const source = options.source ?? 'auto';

  const push = (selection: Selection) => {
    try {
      const tuple = predicateToSelectionStore(selection);
      view.data(storeName, tuple ? [tuple] : []).run();
    } catch (e) {
      onError(e);
    }
  };

  const canFocus =
    typeof handle.fullPredicate === 'function' &&
    typeof handle.onFocusChange === 'function' &&
    typeof handle.getFocusedNavId === 'function';

  if (source === 'focus' || (source === 'auto' && canFocus)) {
    if (!canFocus) {
      onError(new Error('bridge: source="focus" requires fullPredicate + onFocusChange + getFocusedNavId on the handle'));
      return () => {};
    }
    const fullPredicate = handle.fullPredicate!;
    push(fullPredicate(handle.getFocusedNavId!()));
    return handle.onFocusChange!((navId) => push(fullPredicate(navId)));
  }

  push(handle.getSelection());
  return handle.onSelectionChange(push);
}
