import { describe, it, expect } from 'vitest';
import { computeAxisTicks } from '../src/vega/index.js';

describe('computeAxisTicks', () => {
  it('nominal: returns unique values in data order', () => {
    const data = [{ c: 'B' }, { c: 'A' }, { c: 'C' }, { c: 'A' }];
    const result = computeAxisTicks(data, {
      x: { field: 'c', type: 'nominal' },
    });
    expect(result.x).toEqual(['B', 'A', 'C']);
  });

  it('ordinal: returns unique values in data order', () => {
    const data = [{ size: 'L' }, { size: 'S' }, { size: 'M' }, { size: 'S' }];
    const result = computeAxisTicks(data, {
      x: { field: 'size', type: 'ordinal' },
    });
    expect(result.x).toEqual(['L', 'S', 'M']);
  });

  it('quantitative: includes zero by default', () => {
    const data = Array.from({ length: 20 }, (_, i) => ({ v: 10 + i * 5 }));
    const result = computeAxisTicks(data, {
      y: { field: 'v', type: 'quantitative' },
    });
    expect(result.y).toBeDefined();
    expect(result.y![0]).toBe(0);
    expect(result.y!.every((v: any) => typeof v === 'number')).toBe(true);
  });

  it('quantitative: scaleZero false excludes zero from domain before nicing', () => {
    const data = Array.from({ length: 20 }, (_, i) => ({ v: 200 + i * 5 }));
    const result = computeAxisTicks(data, {
      y: { field: 'v', type: 'quantitative', scaleZero: false },
    });
    expect(result.y).toBeDefined();
    expect(result.y![0]).toBeGreaterThan(0);
  });

  it('quantitative: explicit tickCount controls tick density', () => {
    const data = Array.from({ length: 50 }, (_, i) => ({ v: i }));
    const few = computeAxisTicks(data, {
      y: { field: 'v', type: 'quantitative', tickCount: 3 },
    });
    const many = computeAxisTicks(data, {
      y: { field: 'v', type: 'quantitative', tickCount: 20 },
    });
    expect(few.y!.length).toBeLessThan(many.y!.length);
  });

  it('quantitative: axisSize affects tick count', () => {
    const data = Array.from({ length: 50 }, (_, i) => ({ v: i }));
    const small = computeAxisTicks(data, {
      y: { field: 'v', type: 'quantitative', axisSize: 100 },
    });
    const large = computeAxisTicks(data, {
      y: { field: 'v', type: 'quantitative', axisSize: 800 },
    });
    expect(small.y!.length).toBeLessThanOrEqual(large.y!.length);
  });

  it('quantitative: explicit tickValues override', () => {
    const data = [{ v: 0 }, { v: 100 }];
    const result = computeAxisTicks(data, {
      y: { field: 'v', type: 'quantitative', tickValues: [0, 25, 50, 75, 100] },
    });
    expect(result.y).toEqual([0, 25, 50, 75, 100]);
  });

  it('quantitative binned: returns sorted bin boundaries', () => {
    const data = [
      { bin_maxbins_10_value: 0, bin_maxbins_10_value_end: 10, __count: 5 },
      { bin_maxbins_10_value: 10, bin_maxbins_10_value_end: 20, __count: 8 },
      { bin_maxbins_10_value: 20, bin_maxbins_10_value_end: 30, __count: 3 },
    ];
    const result = computeAxisTicks(data, {
      x: { field: 'bin_maxbins_10_value', type: 'quantitative', bin: true },
    });
    expect(result.x).toEqual([0, 10, 20, 30]);
  });

  it('temporal: returns Date ticks', () => {
    const data = Array.from({ length: 24 }, (_, i) => ({
      date: new Date(2000, i, 1),
    }));
    const result = computeAxisTicks(data, {
      x: { field: 'date', type: 'temporal' },
    });
    expect(result.x).toBeDefined();
    expect(result.x!.length).toBeGreaterThan(0);
    expect(result.x![0]).toBeInstanceOf(Date);
  });

  it('temporal: string dates are parsed', () => {
    const data = [
      { date: '2020-01-01' },
      { date: '2022-06-15' },
    ];
    const result = computeAxisTicks(data, {
      x: { field: 'date', type: 'temporal' },
    });
    expect(result.x).toBeDefined();
    expect(result.x![0]).toBeInstanceOf(Date);
  });

  it('both channels at once', () => {
    const data = [
      { cat: 'A', val: 10 },
      { cat: 'B', val: 50 },
    ];
    const result = computeAxisTicks(data, {
      x: { field: 'cat', type: 'nominal' },
      y: { field: 'val', type: 'quantitative' },
    });
    expect(result.x).toEqual(['A', 'B']);
    expect(result.y).toBeDefined();
    expect(result.y![0]).toBe(0);
  });

  it('empty data returns undefined', () => {
    const result = computeAxisTicks([], {
      x: { field: 'v', type: 'quantitative' },
    });
    expect(result.x).toBeUndefined();
  });

  it('null values in data are filtered out', () => {
    const data = [{ v: null }, { v: 10 }, { v: 50 }, { v: null }];
    const result = computeAxisTicks(data, {
      y: { field: 'v', type: 'quantitative' },
    });
    expect(result.y).toBeDefined();
    expect(result.y!.every((v: any) => typeof v === 'number')).toBe(true);
  });
});
