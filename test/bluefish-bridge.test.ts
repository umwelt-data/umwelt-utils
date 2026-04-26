import { describe, expect, it, vi } from 'vitest';
import { resolveIds, type SelectionLike } from '../src/bluefish-bridge/predicate.js';
import {
  createBluefishBridge,
  type HandleLike,
  type ScenegraphLike,
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

function makeRect(x: number, y: number, w: number, h: number): DOMRect {
  return { x, y, width: w, height: h, top: y, left: x, right: x + w, bottom: y + h, toJSON: () => ({}) } as DOMRect;
}

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

function makeFakeScenegraph(bboxes: Record<string, DOMRect>): ScenegraphLike {
  return { getBBox: (name) => bboxes[name] ?? null };
}

function makeFakeSvg() {
  const children: { classList: { add: (c: string) => void }; setAttribute: (k: string, v: string) => void; _class?: string }[] = [];
  return {
    element: {
      appendChild: (child: any) => children.push(child),
      querySelectorAll: (sel: string) => {
        if (sel.includes('bluefish-bridge-highlight')) {
          return children.map((c) => ({
            remove: () => { children.splice(children.indexOf(c), 1); },
          }));
        }
        return [];
      },
    } as unknown as SVGSVGElement,
    getChildren: () => children,
  };
}

// Stub document.createElementNS for node environment
function stubCreateElementNS() {
  const original = globalThis.document;
  const doc = {
    createElementNS: (_ns: string, _tag: string) => {
      const attrs: Record<string, string> = {};
      let cls = '';
      return {
        classList: { add: (c: string) => { cls = c; } },
        setAttribute: (k: string, v: string) => { attrs[k] = v; },
        getAttribute: (k: string) => attrs[k] ?? null,
        _class: cls,
        _attrs: attrs,
      };
    },
  };
  (globalThis as any).document = doc;
  return () => { (globalThis as any).document = original; };
}

describe('createBluefishBridge', () => {
  it('highlights on initial focus', () => {
    const restore = stubCreateElementNS();
    try {
      const predicates: Record<string, SelectionLike> = {
        'root/sysA/A': { and: [{ field: 'id', oneOf: ['A', 'l1', 'l2'] }, { field: 'id', equal: 'A' }] },
      };
      const { handle } = makeFakeHandle(predicates);
      (handle as any).getFocusedNavId = () => 'root/sysA/A';
      const scenegraph = makeFakeScenegraph({ A: makeRect(10, 20, 30, 40) });
      const svg = makeFakeSvg();

      createBluefishBridge({ handle, scenegraph, svgElement: svg.element });
      expect(svg.getChildren().length).toBe(1);
    } finally {
      restore();
    }
  });

  it('updates highlights on focus change', () => {
    const restore = stubCreateElementNS();
    try {
      const predicates: Record<string, SelectionLike> = {
        root: { and: [] },
        'root/sysA': { and: [{ field: 'id', oneOf: ['A', 'l1', 'l2'] }] },
        'root/sysA/A': { and: [{ field: 'id', oneOf: ['A', 'l1', 'l2'] }, { field: 'id', equal: 'A' }] },
      };
      const { handle, focus } = makeFakeHandle(predicates);
      const scenegraph = makeFakeScenegraph({
        A: makeRect(10, 20, 30, 40),
        l1: makeRect(50, 60, 10, 100),
        l2: makeRect(70, 80, 10, 100),
      });
      const svg = makeFakeSvg();

      createBluefishBridge({ handle, scenegraph, svgElement: svg.element });
      // root has empty AND → no highlights
      expect(svg.getChildren().length).toBe(0);

      focus('root/sysA');
      expect(svg.getChildren().length).toBe(3);

      focus('root/sysA/A');
      expect(svg.getChildren().length).toBe(1);
    } finally {
      restore();
    }
  });

  it('destroy removes highlights and unsubscribes', () => {
    const restore = stubCreateElementNS();
    try {
      const predicates: Record<string, SelectionLike> = {
        'root/sysA': { and: [{ field: 'id', oneOf: ['A'] }] },
      };
      const { handle, focus, listenerCount } = makeFakeHandle(predicates);
      (handle as any).getFocusedNavId = () => 'root/sysA';
      const scenegraph = makeFakeScenegraph({ A: makeRect(0, 0, 10, 10) });
      const svg = makeFakeSvg();

      const bridge = createBluefishBridge({ handle, scenegraph, svgElement: svg.element });
      expect(svg.getChildren().length).toBe(1);
      expect(listenerCount()).toBe(1);

      bridge.destroy();
      expect(svg.getChildren().length).toBe(0);
      expect(listenerCount()).toBe(0);
    } finally {
      restore();
    }
  });

  it('clears highlights when scenegraph has no bbox for an id', () => {
    const restore = stubCreateElementNS();
    try {
      const predicates: Record<string, SelectionLike> = {
        'root/sysA/missing': { and: [{ field: 'id', equal: 'missing' }] },
      };
      const { handle } = makeFakeHandle(predicates);
      (handle as any).getFocusedNavId = () => 'root/sysA/missing';
      const scenegraph = makeFakeScenegraph({});
      const svg = makeFakeSvg();

      createBluefishBridge({ handle, scenegraph, svgElement: svg.element });
      expect(svg.getChildren().length).toBe(0);
    } finally {
      restore();
    }
  });
});
