import { describe, expect, it, vi } from 'vitest';
import {
  connectOlliToVegaLite,
  type OlliHandleLike,
  type Selection,
  type VegaViewLike,
} from '../src/vl-bridge/index.js';

function makeFakeHandle(initial: Selection) {
  let current = initial;
  const listeners = new Set<(s: Selection) => void>();
  const handle: OlliHandleLike = {
    getSelection: () => current,
    onSelectionChange: (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
  };
  const emit = (s: Selection) => {
    current = s;
    for (const l of listeners) l(s);
  };
  return { handle, emit, listenerCount: () => listeners.size };
}

function makeFakeView() {
  const calls: { name: string; values: unknown }[] = [];
  const view: VegaViewLike = {
    data: (name, values) => {
      calls.push({ name, values });
      return view;
    },
    run: () => view,
  };
  return { view, calls };
}

describe('connectOlliToVegaLite', () => {
  it('pushes initial selection on connect', () => {
    const { handle } = makeFakeHandle({ field: 'a', equal: 1 });
    const { view, calls } = makeFakeView();
    connectOlliToVegaLite(handle, view);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.name).toBe('external_state_store');
    const values = calls[0]!.values as unknown[];
    expect(values).toHaveLength(1);
    expect((values[0] as { fields: { field: string }[] }).fields[0]!.field).toBe('a');
  });

  it('pushes empty array for empty selection', () => {
    const { handle } = makeFakeHandle({ and: [] });
    const { view, calls } = makeFakeView();
    connectOlliToVegaLite(handle, view);
    expect(calls[0]!.values).toEqual([]);
  });

  it('pushes on subsequent selection changes', () => {
    const { handle, emit } = makeFakeHandle({ and: [] });
    const { view, calls } = makeFakeView();
    connectOlliToVegaLite(handle, view);
    emit({ field: 'x', equal: 42 });
    expect(calls).toHaveLength(2);
    const values = calls[1]!.values as unknown[];
    expect((values[0] as { fields: { field: string }[] }).fields[0]!.field).toBe('x');
  });

  it('dispose stops future pushes', () => {
    const { handle, emit, listenerCount } = makeFakeHandle({ and: [] });
    const { view, calls } = makeFakeView();
    const dispose = connectOlliToVegaLite(handle, view);
    expect(listenerCount()).toBe(1);
    dispose();
    expect(listenerCount()).toBe(0);
    emit({ field: 'x', equal: 1 });
    expect(calls).toHaveLength(1);
  });

  it('honors custom storeName', () => {
    const { handle } = makeFakeHandle({ field: 'a', equal: 1 });
    const { view, calls } = makeFakeView();
    connectOlliToVegaLite(handle, view, { storeName: 'custom_store' });
    expect(calls[0]!.name).toBe('custom_store');
  });

  it('calls onError if view.data throws', () => {
    const { handle, emit } = makeFakeHandle({ and: [] });
    const throwing: VegaViewLike = {
      data: () => {
        throw new Error('boom');
      },
      run: () => throwing,
    };
    const onError = vi.fn();
    connectOlliToVegaLite(handle, throwing, { onError });
    // initial push errored
    expect(onError).toHaveBeenCalledTimes(1);
    emit({ field: 'x', equal: 1 });
    expect(onError).toHaveBeenCalledTimes(2);
  });

  describe('focus-driven highlighting', () => {
    function makeFocusHandle(initialNavId: string, predicates: Record<string, Selection>) {
      let focused = initialNavId;
      const listeners = new Set<(id: string) => void>();
      const selectionListeners = new Set<(s: Selection) => void>();
      const handle: OlliHandleLike = {
        getSelection: () => ({ and: [] }),
        onSelectionChange: (cb) => {
          selectionListeners.add(cb);
          return () => selectionListeners.delete(cb);
        },
        getFocusedNavId: () => focused,
        fullPredicate: (id) => predicates[id] ?? { and: [] },
        onFocusChange: (cb) => {
          listeners.add(cb);
          return () => listeners.delete(cb);
        },
      };
      const focus = (id: string) => {
        focused = id;
        for (const l of listeners) l(id);
      };
      return { handle, focus, focusListenerCount: () => listeners.size };
    }

    it('auto mode uses focus when handle exposes fullPredicate + onFocusChange', () => {
      const { handle, focus } = makeFocusHandle('root', {
        root: { and: [] },
        'root/B': { field: 'category', equal: 'B' },
      });
      const { view, calls } = makeFakeView();
      connectOlliToVegaLite(handle, view);
      // initial push: root → empty
      expect(calls[0]!.values).toEqual([]);
      focus('root/B');
      expect(calls).toHaveLength(2);
      const values = calls[1]!.values as unknown[];
      expect((values[0] as { fields: { field: string }[] }).fields[0]!.field).toBe('category');
    });

    it('auto mode falls back to selection when focus API is missing', () => {
      const { handle, emit } = makeFakeHandle({ and: [] });
      const { view, calls } = makeFakeView();
      connectOlliToVegaLite(handle, view);
      emit({ field: 'x', equal: 1 });
      expect(calls).toHaveLength(2);
    });

    it('source: selection forces selection subscription even with focus API present', () => {
      const { handle, focus, focusListenerCount } = makeFocusHandle('root', {
        root: { and: [] },
        'root/B': { field: 'category', equal: 'B' },
      });
      const { view, calls } = makeFakeView();
      connectOlliToVegaLite(handle, view, { source: 'selection' });
      focus('root/B');
      // focus change should not push because we forced selection mode
      expect(calls).toHaveLength(1);
      expect(focusListenerCount()).toBe(0);
    });

    it('dispose unsubscribes the focus listener', () => {
      const { handle, focus, focusListenerCount } = makeFocusHandle('root', {
        root: { and: [] },
        'root/B': { field: 'category', equal: 'B' },
      });
      const { view, calls } = makeFakeView();
      const dispose = connectOlliToVegaLite(handle, view);
      expect(focusListenerCount()).toBe(1);
      dispose();
      expect(focusListenerCount()).toBe(0);
      focus('root/B');
      expect(calls).toHaveLength(1);
    });
  });
});
