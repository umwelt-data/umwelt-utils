import { describe, expect, it } from 'vitest';
import { resolveIds, type SelectionLike } from '../src/bluefish-bridge/predicate.js';
import {
  createBluefishBridge,
  type HandleLike,
} from '../src/bluefish-bridge/index.js';

// ---------------------------------------------------------------------------
// predicate resolution
// ---------------------------------------------------------------------------

describe('resolveIds', () => {
  it('extracts id from equal predicate', () => {
    expect(resolveIds({ field: 'id', equal: 'A' })).toEqual(['A']);
  });

  it('extracts ids from oneOf predicate', () => {
    expect(resolveIds({ field: 'id', oneOf: ['A', 'l1', 'l2'] })).toEqual([
      'A',
      'l1',
      'l2',
    ]);
  });

  it('ignores predicates on non-id fields', () => {
    expect(resolveIds({ field: 'Origin', equal: 'USA' })).toBeNull();
  });

  it('AND intersects child id sets', () => {
    const sel: SelectionLike = {
      and: [
        { field: 'id', oneOf: ['A', 'l1', 'l2'] },
        { field: 'id', equal: 'A' },
      ],
    };
    expect(resolveIds(sel)).toEqual(['A']);
  });

  it('AND with single child returns that child', () => {
    const sel: SelectionLike = {
      and: [{ field: 'id', oneOf: ['A', 'l1', 'l2'] }],
    };
    expect(resolveIds(sel)).toEqual(['A', 'l1', 'l2']);
  });

  it('empty AND returns null', () => {
    expect(resolveIds({ and: [] })).toBeNull();
  });

  it('AND skips non-id predicates during intersection', () => {
    const sel: SelectionLike = {
      and: [
        { field: 'id', oneOf: ['A', 'l1'] },
        { field: 'Origin', equal: 'USA' },
      ],
    };
    expect(resolveIds(sel)).toEqual(['A', 'l1']);
  });

  it('OR unions child id sets', () => {
    const sel: SelectionLike = {
      or: [
        { field: 'id', equal: 'A' },
        { field: 'id', equal: 'B' },
      ],
    };
    expect(resolveIds(sel)).toEqual(['A', 'B']);
  });

  it('NOT returns null', () => {
    expect(resolveIds({ not: { field: 'id', equal: 'A' } })).toBeNull();
  });

  it('nested AND within OR', () => {
    const sel: SelectionLike = {
      or: [
        { and: [{ field: 'id', oneOf: ['A', 'B'] }, { field: 'id', equal: 'A' }] },
        { field: 'id', equal: 'C' },
      ],
    };
    expect(resolveIds(sel)).toEqual(['A', 'C']);
  });
});

// ---------------------------------------------------------------------------
// bridge lifecycle (mocked DOM)
// ---------------------------------------------------------------------------

function makeFakeHandle(predicates: Record<string, SelectionLike>) {
  let focused = 'root';
  const listeners = new Set<(navId: string) => void>();
  const handle: HandleLike = {
    getFocusedNavId: () => focused,
    fullPredicate: (navId) => predicates[navId] ?? { and: [] },
    onFocusChange: (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
  };
  const focus = (navId: string) => {
    focused = navId;
    for (const l of listeners) l(navId);
  };
  return { handle, focus, listenerCount: () => listeners.size };
}

function makeFakeSvg(ids: string[]) {
  const elements = ids.map((id) => ({
    getAttribute: (attr: string) => (attr === 'data-bluefish-id' ? id : null),
    style: { opacity: '' },
  }));
  return {
    element: {
      querySelectorAll: (sel: string) =>
        sel === '[data-bluefish-id]' ? elements : [],
    } as unknown as SVGSVGElement,
    getOpacity: (id: string) =>
      elements.find((e) => e.getAttribute('data-bluefish-id') === id)?.style.opacity ?? '',
  };
}

describe('createBluefishBridge', () => {
  it('highlights matching element and dims others on initial focus', () => {
    const predicates: Record<string, SelectionLike> = {
      'root/sysA/A': { and: [{ field: 'id', oneOf: ['A', 'l1', 'l2'] }, { field: 'id', equal: 'A' }] },
    };
    const { handle } = makeFakeHandle(predicates);
    (handle as any).getFocusedNavId = () => 'root/sysA/A';
    const svg = makeFakeSvg(['A', 'l1', 'l2']);

    createBluefishBridge({ handle, svgElement: svg.element });
    expect(svg.getOpacity('A')).toBe('1');
    expect(svg.getOpacity('l1')).toBe('0.3');
    expect(svg.getOpacity('l2')).toBe('0.3');
  });

  it('updates opacity on focus change', () => {
    const predicates: Record<string, SelectionLike> = {
      root: { and: [] },
      'root/sysA': { and: [{ field: 'id', oneOf: ['A', 'l1', 'l2'] }] },
      'root/sysA/A': { and: [{ field: 'id', oneOf: ['A', 'l1', 'l2'] }, { field: 'id', equal: 'A' }] },
    };
    const { handle, focus } = makeFakeHandle(predicates);
    const svg = makeFakeSvg(['A', 'l1', 'l2']);

    createBluefishBridge({ handle, svgElement: svg.element });
    // root has empty AND → clearHighlight resets opacity
    expect(svg.getOpacity('A')).toBe('');
    expect(svg.getOpacity('l1')).toBe('');
    expect(svg.getOpacity('l2')).toBe('');

    focus('root/sysA');
    // all 3 elements match → all at full opacity
    expect(svg.getOpacity('A')).toBe('1');
    expect(svg.getOpacity('l1')).toBe('1');
    expect(svg.getOpacity('l2')).toBe('1');

    focus('root/sysA/A');
    // only A matches → others dimmed
    expect(svg.getOpacity('A')).toBe('1');
    expect(svg.getOpacity('l1')).toBe('0.3');
    expect(svg.getOpacity('l2')).toBe('0.3');
  });

  it('destroy clears opacity and unsubscribes', () => {
    const predicates: Record<string, SelectionLike> = {
      'root/sysA': { and: [{ field: 'id', oneOf: ['A'] }] },
    };
    const { handle, listenerCount } = makeFakeHandle(predicates);
    (handle as any).getFocusedNavId = () => 'root/sysA';
    const svg = makeFakeSvg(['A', 'B']);

    const bridge = createBluefishBridge({ handle, svgElement: svg.element });
    expect(svg.getOpacity('A')).toBe('1');
    expect(svg.getOpacity('B')).toBe('0.3');
    expect(listenerCount()).toBe(1);

    bridge.destroy();
    expect(svg.getOpacity('A')).toBe('');
    expect(svg.getOpacity('B')).toBe('');
    expect(listenerCount()).toBe(0);
  });

  it('dims all elements when no dom element matches resolved id', () => {
    const predicates: Record<string, SelectionLike> = {
      'root/sysA/missing': { and: [{ field: 'id', equal: 'missing' }] },
    };
    const { handle } = makeFakeHandle(predicates);
    (handle as any).getFocusedNavId = () => 'root/sysA/missing';
    const svg = makeFakeSvg(['A', 'B']);

    createBluefishBridge({ handle, svgElement: svg.element });
    // 'missing' id resolves but no DOM element has that id → all elements dim
    expect(svg.getOpacity('A')).toBe('0.3');
    expect(svg.getOpacity('B')).toBe('0.3');
  });

  it('respects custom dimOpacity option', () => {
    const predicates: Record<string, SelectionLike> = {
      'root/sysA/A': { and: [{ field: 'id', equal: 'A' }] },
    };
    const { handle } = makeFakeHandle(predicates);
    (handle as any).getFocusedNavId = () => 'root/sysA/A';
    const svg = makeFakeSvg(['A', 'B']);

    createBluefishBridge({ handle, svgElement: svg.element, dimOpacity: 0.1 });
    expect(svg.getOpacity('A')).toBe('1');
    expect(svg.getOpacity('B')).toBe('0.1');
  });
});
