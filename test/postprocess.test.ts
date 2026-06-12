import { describe, it, expect } from 'vitest';
import { postprocessViewData } from '../src/vl-bridge/index.js';

/** Minimal fake of the Vega view surface postprocessViewData relies on. */
function makeFakeView(datasets: Record<string, Record<string, unknown>[]>) {
  let runCount = 0;
  const view = {
    _runtime: { data: Object.fromEntries(Object.keys(datasets).map((n) => [n, {}])) },
    data(name: string, values?: unknown): unknown {
      if (values === undefined) return datasets[name];
      datasets[name] = values as Record<string, unknown>[];
      return view;
    },
    async runAsync() {
      runCount += 1;
      return view;
    },
    get runCount() {
      return runCount;
    },
  };
  return view;
}

describe('postprocessViewData', () => {
  it('enriches FIPS source datasets and re-runs the view once', async () => {
    const datasets = {
      source_0: [
        { id: 6037, rate: 0.1 },
        { id: 17031, rate: 0.05 },
      ],
    };
    const view = makeFakeView(datasets);

    await postprocessViewData(view);

    expect(datasets.source_0[0]!['county']).toBe('Los Angeles');
    expect(datasets.source_0[0]!['state']).toBe('California');
    expect(datasets.source_0[1]!['region']).toBe('Midwest');
    expect(view.runCount).toBe(1);
  });

  it('only writes source_* datasets, leaving derived datasets to propagation', async () => {
    const datasets = {
      source_0: [{ id: 6037, rate: 0.1 }],
      // A derived dataset that also looks like FIPS must NOT be written directly
      // (Vega propagates the enriched source into it), or its rows would double.
      data_0: [{ id: 6037, rate: 0.1 }],
    };
    const view = makeFakeView(datasets);

    await postprocessViewData(view);

    expect(datasets.source_0[0]!['region']).toBe('West');
    expect(datasets.data_0[0]!['region']).toBeUndefined();
    expect(datasets.data_0).toHaveLength(1);
  });

  it('leaves non-FIPS source datasets untouched and does not re-run', async () => {
    const datasets = {
      source_0: [{ id: 'california', rate: 0.1 }],
    };
    const view = makeFakeView(datasets);

    await postprocessViewData(view);

    expect(datasets.source_0[0]!['region']).toBeUndefined();
    expect(view.runCount).toBe(0);
  });

  it('skips source datasets that throw when queried', async () => {
    const view = {
      _runtime: { data: { source_broken: {}, source_0: {} } },
      _store: { source_0: [{ id: 6037 }] } as Record<string, Record<string, unknown>[]>,
      data(name: string, values?: unknown): unknown {
        if (name === 'source_broken') throw new Error('not queryable');
        if (values === undefined) return this._store[name];
        this._store[name] = values as Record<string, unknown>[];
        return this;
      },
      async runAsync() {
        return this;
      },
    };

    await expect(postprocessViewData(view)).resolves.toBeUndefined();
    expect(view._store.source_0[0]!['state']).toBe('California');
  });

  it('derives region for source datasets with a US state column', async () => {
    const datasets = {
      source_0: [
        { zip_code: 501, state: 'NY', city: 'Holtsville' },
        { zip_code: 90001, state: 'CA', city: 'Los Angeles' },
        { zip_code: 0, state: 'XX', city: 'Nowhere' },
      ],
    };
    const view = makeFakeView(datasets);

    await postprocessViewData(view);

    expect(datasets.source_0[0]!['region']).toBe('Northeast');
    expect(datasets.source_0[1]!['region']).toBe('West');
    expect(datasets.source_0[2]!['region']).toBeUndefined();
    expect(view.runCount).toBe(1);
  });

  it('leaves datasets that already have a region column untouched', async () => {
    const datasets = {
      source_0: [{ state: 'NY', region: 'Custom' }],
    };
    const view = makeFakeView(datasets);

    await postprocessViewData(view);

    expect(datasets.source_0[0]!['region']).toBe('Custom');
    expect(view.runCount).toBe(0);
  });

  it('does not re-run when no state resolves to a region', async () => {
    const datasets = {
      source_0: [{ state: 'Ontario' }, { state: 'Quebec' }],
    };
    const view = makeFakeView(datasets);

    await postprocessViewData(view);

    expect(datasets.source_0[0]!['region']).toBeUndefined();
    expect(view.runCount).toBe(0);
  });
});
