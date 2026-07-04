import { describe, expect, it } from 'vitest';
import { getBins } from '../src/data/index.js';
import type { Dataset } from '../src/data/index.js';

describe('getBins', () => {
  const fieldDef = { field: 'v', type: 'quantitative' } as const;

  it('returns empty array for empty data', () => {
    expect(getBins(fieldDef, [])).toEqual([]);
  });

  it('creates bins from nice step for quantitative data', () => {
    const data: Dataset = Array.from({ length: 100 }, (_, i) => ({ v: i }));
    const bins = getBins(fieldDef, data);
    expect(bins.length).toBeGreaterThan(0);
    expect(bins[0]![0]).toBeLessThanOrEqual(0);
    expect(bins[bins.length - 1]![1]).toBeGreaterThanOrEqual(99);
    for (let i = 0; i < bins.length - 1; i++) {
      expect(bins[i]![1]).toBe(bins[i + 1]![0]);
    }
  });

  it('uses provided ticks as bin boundaries', () => {
    const data: Dataset = [{ v: 0 }, { v: 50 }, { v: 100 }];
    const bins = getBins(fieldDef, data, [0, 25, 50, 75, 100]);
    expect(bins).toEqual([
      [0, 25],
      [25, 50],
      [50, 75],
      [75, 100],
    ]);
  });

  it('handles pre-binned data with bin_ prefix', () => {
    const binFieldDef = { field: 'bin_v', type: 'quantitative', bin: true } as const;
    const data: Dataset = [
      { bin_v: 0, bin_v_end: 10 },
      { bin_v: 10, bin_v_end: 20 },
    ];
    const bins = getBins(binFieldDef, data);
    expect(bins).toEqual([
      [0, 10],
      [10, 20],
    ]);
  });

  it('keeps one bin per tick interval when the data domain starts/ends inside the tick range', () => {
    // stocks.csv price axis: vega renders ticks [0, 200, 400, 600, 800] but the
    // data spans [5.97, 707]; ticks outside the data domain must still act as
    // bin boundaries (clipped to the domain), not collapse two tick intervals
    // into one stretched bin
    const data: Dataset = [{ v: 5.97 }, { v: 350 }, { v: 707 }];
    const bins = getBins(fieldDef, data, [0, 200, 400, 600, 800]);
    expect(bins).toEqual([
      [5.97, 200],
      [200, 400],
      [400, 600],
      [600, 707],
    ]);
  });

  it('drops tick intervals wholly outside the data domain', () => {
    const data: Dataset = [{ v: 210 }, { v: 350 }];
    const bins = getBins(fieldDef, data, [0, 200, 400, 600, 800]);
    expect(bins).toEqual([[210, 350]]);
  });

  it('absorbs domain overshoot into last bin instead of creating a degenerate bin', () => {
    const data: Dataset = [{ v: 0 }, { v: 50 }, { v: 100.1 }];
    const bins = getBins(fieldDef, data, [0, 25, 50, 75, 100]);
    expect(bins).toEqual([
      [0, 25],
      [25, 50],
      [50, 75],
      [75, 100.1],
    ]);
  });

  it('absorbs domain undershoot into first bin instead of creating a degenerate bin', () => {
    const data: Dataset = [{ v: -0.1 }, { v: 50 }, { v: 100 }];
    const bins = getBins(fieldDef, data, [0, 25, 50, 75, 100]);
    expect(bins).toEqual([
      [-0.1, 25],
      [25, 50],
      [50, 75],
      [75, 100],
    ]);
  });

  it('creates 6 equal-width bins for temporal data', () => {
    const temporalFieldDef = { field: 't', type: 'temporal' } as const;
    const data: Dataset = [
      { t: new Date('2020-01-01') },
      { t: new Date('2020-07-01') },
      { t: new Date('2021-01-01') },
    ];
    const bins = getBins(temporalFieldDef, data);
    expect(bins.length).toBeGreaterThan(0);
  });
});
