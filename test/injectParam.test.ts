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

  it('injects conditional opacity on a unit spec', () => {
    const spec = {
      mark: 'bar',
      encoding: { x: { field: 'a', type: 'quantitative' } },
    };
    const out = withExternalStateParam(spec) as {
      encoding: { opacity: { condition: { param: string; value: number }; value: number } };
    };
    expect(out.encoding.opacity).toEqual({
      condition: { param: 'external_state', value: 1 },
      value: 0.3,
    });
  });

  it('preserves existing opacity as the matched branch of the condition', () => {
    const spec = {
      mark: 'bar',
      encoding: {
        x: { field: 'a', type: 'quantitative' },
        opacity: { field: 'o', type: 'quantitative' },
      },
    };
    const out = withExternalStateParam(spec) as {
      encoding: {
        opacity: {
          condition: { param: string; field: string; type: string };
          value: number;
        };
      };
    };
    expect(out.encoding.opacity.condition).toEqual({
      param: 'external_state',
      field: 'o',
      type: 'quantitative',
    });
    expect(out.encoding.opacity.value).toBe(0.3);
  });

  it('is idempotent for the conditional opacity', () => {
    const spec = { mark: 'bar', encoding: { x: { field: 'a' } } };
    const once = withExternalStateParam(spec);
    const twice = withExternalStateParam(once);
    expect(twice).toEqual(once);
  });

  it('injects conditional opacity into each layer', () => {
    const spec = {
      layer: [
        { mark: 'bar', encoding: { x: { field: 'a' } } },
        { mark: 'line', encoding: { x: { field: 'a' } } },
      ],
    };
    const out = withExternalStateParam(spec) as { layer: Array<{ encoding: { opacity: unknown } }> };
    for (const unit of out.layer) {
      expect((unit.encoding.opacity as { condition: { param: string } }).condition.param).toBe('external_state');
    }
  });

  it('injects conditional opacity into hconcat children', () => {
    const spec = {
      hconcat: [
        { mark: 'bar', encoding: { x: { field: 'a' } } },
        { mark: 'line', encoding: { x: { field: 'a' } } },
      ],
    };
    const out = withExternalStateParam(spec) as { hconcat: Array<{ encoding: { opacity: unknown } }> };
    for (const unit of out.hconcat) {
      expect((unit.encoding.opacity as { condition: { param: string } }).condition.param).toBe('external_state');
    }
  });

  it('injects conditional opacity into the inner spec of a faceted chart', () => {
    const spec = {
      facet: { field: 'category', type: 'nominal' },
      spec: { mark: 'bar', encoding: { x: { field: 'a' } } },
    };
    const out = withExternalStateParam(spec) as { spec: { encoding: { opacity: unknown } } };
    expect((out.spec.encoding.opacity as { condition: { param: string } }).condition.param).toBe('external_state');
  });
});
