import { describe, it, expect } from 'vitest';
import { computeGuideTicks } from '../src/vega/index.js';

describe('computeGuideTicks', () => {
  it('nominal: returns unique values in data order', () => {
    const data = [{ c: 'B' }, { c: 'A' }, { c: 'C' }, { c: 'A' }];
    const result = computeGuideTicks(data, {
      field: 'c', type: 'nominal',
    });
    expect(result).toEqual(['B', 'A', 'C']);
  });

  it('ordinal: returns unique values in data order', () => {
    const data = [{ size: 'L' }, { size: 'S' }, { size: 'M' }, { size: 'S' }];
    const result = computeGuideTicks(data, {
      field: 'size', type: 'ordinal',
    });
    expect(result).toEqual(['L', 'S', 'M']);
  });

  it('quantitative: includes zero by default', () => {
    const data = Array.from({ length: 20 }, (_, i) => ({ v: 10 + i * 5 }));
    const result = computeGuideTicks(data, {
      field: 'v', type: 'quantitative',
    });
    expect(result).toBeDefined();
    expect(result![0]).toBe(0);
    expect(result!.every((v: any) => typeof v === 'number')).toBe(true);
  });

  it('quantitative: scaleZero false excludes zero from domain before nicing', () => {
    const data = Array.from({ length: 20 }, (_, i) => ({ v: 200 + i * 5 }));
    const result = computeGuideTicks(data, {
      field: 'v', type: 'quantitative', scaleZero: false,
    });
    expect(result).toBeDefined();
    expect(result![0]).toBeGreaterThan(0);
  });

  it('quantitative: explicit tickCount controls tick density', () => {
    const data = Array.from({ length: 50 }, (_, i) => ({ v: i }));
    const few = computeGuideTicks(data, {
      field: 'v', type: 'quantitative', tickCount: 3,
    });
    const many = computeGuideTicks(data, {
      field: 'v', type: 'quantitative', tickCount: 20,
    });
    expect(few!.length).toBeLessThan(many!.length);
  });

  it('quantitative: axisSize affects tick count', () => {
    const data = Array.from({ length: 50 }, (_, i) => ({ v: i }));
    const small = computeGuideTicks(data, {
      field: 'v', type: 'quantitative', axisSize: 100,
    });
    const large = computeGuideTicks(data, {
      field: 'v', type: 'quantitative', axisSize: 800,
    });
    expect(small!.length).toBeLessThanOrEqual(large!.length);
  });

  it('quantitative: explicit tickValues override', () => {
    const data = [{ v: 0 }, { v: 100 }];
    const result = computeGuideTicks(data, {
      field: 'v', type: 'quantitative', tickValues: [0, 25, 50, 75, 100],
    });
    expect(result).toEqual([0, 25, 50, 75, 100]);
  });

  it('quantitative binned: returns sorted bin boundaries', () => {
    const data = [
      { bin_maxbins_10_value: 0, bin_maxbins_10_value_end: 10, __count: 5 },
      { bin_maxbins_10_value: 10, bin_maxbins_10_value_end: 20, __count: 8 },
      { bin_maxbins_10_value: 20, bin_maxbins_10_value_end: 30, __count: 3 },
    ];
    const result = computeGuideTicks(data, {
      field: 'bin_maxbins_10_value', type: 'quantitative', bin: true,
    });
    expect(result).toEqual([0, 10, 20, 30]);
  });

  it('temporal: returns Date ticks', () => {
    const data = Array.from({ length: 24 }, (_, i) => ({
      date: new Date(2000, i, 1),
    }));
    const result = computeGuideTicks(data, {
      field: 'date', type: 'temporal',
    });
    expect(result).toBeDefined();
    expect(result!.length).toBeGreaterThan(0);
    expect(result![0]).toBeInstanceOf(Date);
  });

  it('temporal: string dates are parsed', () => {
    const data = [
      { date: '2020-01-01' },
      { date: '2022-06-15' },
    ];
    const result = computeGuideTicks(data, {
      field: 'date', type: 'temporal',
    });
    expect(result).toBeDefined();
    expect(result![0]).toBeInstanceOf(Date);
  });

  it('both channels at once', () => {
    const data = [
      { cat: 'A', val: 10 },
      { cat: 'B', val: 50 },
    ];
    const xResult = computeGuideTicks(data, {
      field: 'cat', type: 'nominal',
    });
    const yResult = computeGuideTicks(data, {
      field: 'val', type: 'quantitative',
    });
    expect(xResult).toEqual(['A', 'B']);
    expect(yResult).toBeDefined();
    expect(yResult![0]).toBe(0);
  });

  it('empty data returns undefined', () => {
    const result = computeGuideTicks([], {
      field: 'v', type: 'quantitative',
    });
    expect(result).toBeUndefined();
  });

  it('null values in data are filtered out', () => {
    const data = [{ v: null }, { v: 10 }, { v: 50 }, { v: null }];
    const result = computeGuideTicks(data, {
      field: 'v', type: 'quantitative',
    });
    expect(result).toBeDefined();
    expect(result!.every((v: any) => typeof v === 'number')).toBe(true);
  });
});
