import { describe, expect, it } from 'vitest';
import * as vega from 'vega';
import * as vegaLite from 'vega-lite';
import { EXTERNAL_STATE_PARAM, EXTERNAL_STATE_STORE, withExternalStateParam, withPointMarks } from '../src/vl-bridge/index.js';

function findExternalStateParam(params: unknown[] | undefined): unknown {
  if (!Array.isArray(params)) return undefined;
  return params.find((p) => (p as { name?: unknown }).name === EXTERNAL_STATE_PARAM);
}

describe('withExternalStateParam', () => {
  it('adds a point param with empty fields to a unit spec', () => {
    const spec = {
      data: { values: [{ a: 1 }] },
      mark: 'bar',
      encoding: { x: { field: 'a', type: 'quantitative' } },
    };
    const out = withExternalStateParam(spec);
    const p = findExternalStateParam((out as { params?: unknown[] }).params);
    expect(p).toEqual({
      name: 'external_state',
      select: {
        type: 'point',
        fields: [],
        toggle: false,
        clear: false,
      },
    });
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

  it('adds param to the first layer rather than the outer spec', () => {
    const spec = {
      data: { values: [] },
      layer: [
        { mark: 'bar', encoding: {} },
        { mark: 'line', encoding: {} },
      ],
    };
    const out = withExternalStateParam(spec) as {
      params?: unknown[];
      layer: Array<{ params?: unknown[] }>;
    };
    expect(findExternalStateParam(out.params)).toBeUndefined();
    expect(findExternalStateParam(out.layer[0].params)).toBeDefined();
    expect(findExternalStateParam(out.layer[1].params)).toBeUndefined();
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

  it('adds param to the first hconcat child rather than the outer spec', () => {
    const spec = {
      hconcat: [
        { mark: 'bar', encoding: {} },
        { mark: 'line', encoding: {} },
      ],
    };
    const out = withExternalStateParam(spec) as {
      params?: unknown[];
      hconcat: Array<{ params?: unknown[] }>;
    };
    expect(findExternalStateParam(out.params)).toBeUndefined();
    expect(findExternalStateParam(out.hconcat[0].params)).toBeDefined();
    expect(findExternalStateParam(out.hconcat[1].params)).toBeUndefined();
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
    const out = withExternalStateParam(spec) as any;
    // bar gets direct opacity
    expect(out.layer[0].encoding.opacity.condition.param).toBe('external_state');
    // line gets split into nested layer; the line sublayer has opacity
    expect(out.layer[1].layer[0].encoding.opacity.condition.param).toBe('external_state');
  });

  it('injects conditional opacity into hconcat children', () => {
    const spec = {
      hconcat: [
        { mark: 'bar', encoding: { x: { field: 'a' } } },
        { mark: 'line', encoding: { x: { field: 'a' } } },
      ],
    };
    const out = withExternalStateParam(spec) as any;
    expect(out.hconcat[0].encoding.opacity.condition.param).toBe('external_state');
    expect(out.hconcat[1].layer[0].encoding.opacity.condition.param).toBe('external_state');
  });

  it('injects conditional opacity into the inner spec of a faceted chart', () => {
    const spec = {
      facet: { field: 'category', type: 'nominal' },
      spec: { mark: 'bar', encoding: { x: { field: 'a' } } },
    };
    const out = withExternalStateParam(spec) as { spec: { encoding: { opacity: unknown } } };
    expect((out.spec.encoding.opacity as { condition: { param: string } }).condition.param).toBe('external_state');
  });

  it('splits line unit into layer with line + hidden circle overlay', () => {
    const spec = { mark: 'line', encoding: { x: { field: 'a' } } };
    const out = withExternalStateParam(spec) as any;
    expect(out.layer).toHaveLength(2);
    expect(out.layer[0].mark).toBe('line');
    expect(out.layer[0].encoding.opacity.condition.param).toBe('external_state');
    expect(out.layer[1].mark).toBe('circle');
    expect(out.layer[1].encoding.opacity).toEqual({
      condition: { param: 'external_state', empty: false, value: 1 },
      value: 0,
    });
  });

  it('splits area unit into layer with area (store-based opacity) + hidden circle overlay', () => {
    const spec = { mark: 'area', encoding: { x: { field: 'a' } } };
    const out = withExternalStateParam(spec) as any;
    expect(out.layer).toHaveLength(2);
    expect(out.layer[0].mark).toBe('area');
    expect(out.layer[0].encoding.opacity).toEqual({
      condition: { test: "length(data('external_state_store')) > 0", value: 0.3 },
      value: 1,
    });
    expect(out.layer[1].mark).toBe('circle');
    expect(out.layer[1].encoding.opacity).toEqual({
      condition: { param: 'external_state', empty: false, value: 1 },
      value: 0,
    });
  });

  it('preserves line mark object properties in the line layer', () => {
    const spec = { mark: { type: 'line', strokeWidth: 2 }, encoding: { x: { field: 'a' } } };
    const out = withExternalStateParam(spec) as any;
    expect(out.layer[0].mark).toEqual({ type: 'line', strokeWidth: 2 });
  });

  it('keeps the selection param on the mark layer', () => {
    const spec = { mark: 'line', encoding: { x: { field: 'a' } } };
    const out = withExternalStateParam(spec) as any;
    expect(findExternalStateParam(out.layer[0].params)).toBeDefined();
    expect(out.layer[1].params).toBeUndefined();
  });

  it('circle layer inherits encoding channels from the original unit', () => {
    const spec = { mark: 'line', encoding: { x: { field: 'a' }, y: { field: 'b' }, color: { field: 'c' } } };
    const out = withExternalStateParam(spec) as any;
    expect(out.layer[1].encoding.x).toEqual({ field: 'a' });
    expect(out.layer[1].encoding.y).toEqual({ field: 'b' });
    expect(out.layer[1].encoding.color).toEqual({ field: 'c' });
  });

  it('does not modify bar or point marks', () => {
    const barSpec = { mark: 'bar', encoding: { x: { field: 'a' } } };
    const pointSpec = { mark: 'point', encoding: { x: { field: 'a' } } };
    expect((withExternalStateParam(barSpec) as any).mark).toBe('bar');
    expect((withExternalStateParam(pointSpec) as any).mark).toBe('point');
  });

  it('splits line marks within existing layers (nested layer)', () => {
    const spec = {
      layer: [
        { mark: 'line', encoding: { x: { field: 'a' } } },
        { mark: 'bar', encoding: { x: { field: 'a' } } },
      ],
    };
    const out = withExternalStateParam(spec) as any;
    expect(out.layer[0].layer).toHaveLength(2);
    expect(out.layer[0].layer[0].mark).toBe('line');
    expect(out.layer[0].layer[1].mark).toBe('circle');
    expect(out.layer[1].mark).toBe('bar');
  });

  it('splits area marks within faceted specs', () => {
    const spec = {
      facet: { field: 'category', type: 'nominal' },
      spec: { mark: 'area', encoding: { x: { field: 'a' } } },
    };
    const out = withExternalStateParam(spec) as any;
    expect(out.spec.layer).toHaveLength(2);
    expect(out.spec.layer[0].mark).toBe('area');
    expect(out.spec.layer[1].mark).toBe('circle');
  });

  it('preserves data and other top-level properties on the outer spec', () => {
    const spec = { mark: 'line', encoding: { x: { field: 'a' } }, data: { values: [{ a: 1 }] }, width: 400 };
    const out = withExternalStateParam(spec) as any;
    expect(out.data).toEqual({ values: [{ a: 1 }] });
    expect(out.width).toBe(400);
  });
});

describe('withPointMarks', () => {
  it('splits line unit into layer with circle overlay (no params)', () => {
    const spec = { mark: 'line', encoding: { x: { field: 'a' } } };
    const out = withPointMarks(spec) as any;
    expect(out.layer).toHaveLength(2);
    expect(out.layer[0].mark).toBe('line');
    expect(out.layer[1].mark).toBe('circle');
    expect(out.layer[0].params).toBeUndefined();
  });

  it('splits area unit into layer with circle overlay', () => {
    const spec = { mark: 'area', encoding: { x: { field: 'a' } } };
    const out = withPointMarks(spec) as any;
    expect(out.layer).toHaveLength(2);
    expect(out.layer[0].mark).toBe('area');
    expect(out.layer[1].mark).toBe('circle');
  });
});

describe('withExternalStateParam on composite marks', () => {
  const boxplotSpec = () => ({
    data: {
      values: [
        { Species: 'Adelie', mass: 3700 },
        { Species: 'Adelie', mass: 3800 },
        { Species: 'Adelie', mass: 9000 },
        { Species: 'Gentoo', mass: 5000 },
        { Species: 'Gentoo', mass: 5100 },
      ],
    },
    mark: 'boxplot',
    encoding: {
      x: { field: 'Species', type: 'nominal' },
      y: { field: 'mass', type: 'quantitative' },
    },
  });

  it('returns the spec unchanged without a normalizer', () => {
    const spec = boxplotSpec();
    const out = withExternalStateParam(spec);
    expect(out).toBe(spec);
  });

  it('detects composite marks nested in layers', () => {
    const spec = { layer: [{ mark: 'point', encoding: {} }, boxplotSpec()] };
    expect(withExternalStateParam(spec)).toBe(spec);
  });

  it('with a normalizer, the injected spec compiles and parses', async () => {
    const injected = withExternalStateParam(boxplotSpec() as any, { normalize: vegaLite.normalize });
    const compiled = vegaLite.compile(injected as any).spec;
    expect((compiled.data ?? []).some((d: any) => d.name === EXTERNAL_STATE_STORE)).toBe(true);
    expect(() => vega.parse(compiled)).not.toThrow();
  });

  it('with a normalizer, a category tuple dims the other categories at runtime', async () => {
    const injected = withExternalStateParam(boxplotSpec() as any, { normalize: vegaLite.normalize });
    const compiled = vegaLite.compile(injected as any).spec;
    const view = new vega.View(vega.parse(compiled), { renderer: 'none' });
    await view.runAsync();

    const opacitiesBySpecies = () => {
      const out = new Map<string, Set<number>>();
      const walk = (item: any) => {
        if (item?.items) item.items.forEach(walk);
        const species = item?.datum?.Species;
        if (item?.opacity !== undefined && species) {
          if (!out.has(species)) out.set(species, new Set());
          out.get(species)!.add(item.opacity);
        }
      };
      walk(view.scenegraph().root);
      return out;
    };

    // empty selection: nothing dimmed
    let bySpecies = opacitiesBySpecies();
    expect([...bySpecies.get('Adelie')!]).toEqual([1]);
    expect([...bySpecies.get('Gentoo')!]).toEqual([1]);

    view.data(EXTERNAL_STATE_STORE, [
      { unit: '', fields: [{ type: 'E', field: 'Species' }], values: ['Adelie'] },
    ]);
    await view.runAsync();

    bySpecies = opacitiesBySpecies();
    expect([...bySpecies.get('Adelie')!]).toEqual([1]);
    expect([...bySpecies.get('Gentoo')!]).toEqual([0.3]);
  });
});
