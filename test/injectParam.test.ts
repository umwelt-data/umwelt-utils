import { describe, expect, it } from 'vitest';
import { EXTERNAL_STATE_PARAM, withExternalStateParam } from '../src/vl-bridge/index.js';

function findExternalStateParam(params: unknown[] | undefined): unknown {
  if (!Array.isArray(params)) return undefined;
  return params.find((p) => (p as { name?: unknown }).name === EXTERNAL_STATE_PARAM);
}

describe('withExternalStateParam', () => {
  it('adds an interval param to a unit spec', () => {
    const spec = {
      data: { values: [{ a: 1 }] },
      mark: 'bar',
      encoding: { x: { field: 'a', type: 'quantitative' } },
    };
    const out = withExternalStateParam(spec);
    const p = findExternalStateParam((out as { params?: unknown[] }).params);
    expect(p).toEqual({ name: 'external_state', select: 'interval' });
  });

  it('preserves existing params', () => {
    const spec = {
      mark: 'bar',
      params: [{ name: 'brush', select: 'interval' }],
      encoding: {},
    };
    const out = withExternalStateParam(spec) as { params: unknown[] };
    expect(out.params).toHaveLength(2);
    expect((out.params[0] as { name: string }).name).toBe('brush');
    expect((out.params[1] as { name: string }).name).toBe('external_state');
  });

  it('is idempotent', () => {
    const spec = { mark: 'bar', encoding: {} };
    const once = withExternalStateParam(spec);
    const twice = withExternalStateParam(once);
    const params = (twice as { params: unknown[] }).params;
    const matches = params.filter((p) => (p as { name?: unknown }).name === 'external_state');
    expect(matches).toHaveLength(1);
  });

  it('does not mutate the input', () => {
    const spec = { mark: 'bar', encoding: {} } as Record<string, unknown>;
    const before = JSON.stringify(spec);
    withExternalStateParam(spec);
    expect(JSON.stringify(spec)).toBe(before);
  });

  it('adds param to a layered spec at the top level', () => {
    const spec = {
      data: { values: [] },
      layer: [
        { mark: 'bar', encoding: {} },
        { mark: 'line', encoding: {} },
      ],
    };
    const out = withExternalStateParam(spec);
    expect(findExternalStateParam((out as { params?: unknown[] }).params)).toBeDefined();
  });

  it('adds param to inner spec for faceted specs', () => {
    const spec = {
      data: { values: [] },
      facet: { field: 'category', type: 'nominal' },
      spec: {
        mark: 'bar',
        encoding: {},
      },
    };
    const out = withExternalStateParam(spec) as { params?: unknown[]; spec: { params?: unknown[] } };
    expect(findExternalStateParam(out.params)).toBeUndefined();
    expect(findExternalStateParam(out.spec.params)).toBeDefined();
  });

  it('adds param to a hconcat spec at the top level', () => {
    const spec = {
      hconcat: [
        { mark: 'bar', encoding: {} },
        { mark: 'line', encoding: {} },
      ],
    };
    const out = withExternalStateParam(spec);
    expect(findExternalStateParam((out as { params?: unknown[] }).params)).toBeDefined();
  });
});
