import { describe, it, expect } from 'vitest';
import { fmtValue, minPrecisionForValue } from '../src/description/index.js';

describe('fmtValue', () => {
  it('formats numbers', () => {
    expect(fmtValue(42, { field: 'x', type: 'quantitative' })).toBe('42');
  });

  it('formats strings', () => {
    expect(fmtValue('hello', { field: 'x', type: 'nominal' })).toBe('hello');
  });

  it('formats dates', () => {
    const result = fmtValue(new Date('2020-06-15'), { field: 'x', type: 'temporal' });
    expect(result).toContain('2020');
  });
});

describe('fmtValue with precision', () => {
  it('uses provided precision for numbers', () => {
    expect(fmtValue(0.53, { field: 'x', type: 'quantitative' }, 1)).toBe('0.5');
  });

  it('applies precision even to integer values', () => {
    expect(fmtValue(20, { field: 'x', type: 'quantitative' }, 1)).toBe('20.0');
  });

  it('falls back to toFixed(2) without precision', () => {
    expect(fmtValue(3.14159, { field: 'x', type: 'quantitative' })).toBe('3.14');
  });
});

describe('fmtValue default precision for tiny values', () => {
  it('extends precision for tiny decimals', () => {
    expect(fmtValue(0.00002, { field: 'x', type: 'quantitative' })).toBe('0.00002');
  });

  it('still caps normal decimals at 2', () => {
    expect(fmtValue(1.23456, { field: 'x', type: 'quantitative' })).toBe('1.23');
  });
});

describe('minPrecisionForValue', () => {
  it('returns 0 for zero', () => {
    expect(minPrecisionForValue(0)).toBe(0);
  });

  it('returns 0 for values >= 1', () => {
    expect(minPrecisionForValue(1)).toBe(0);
    expect(minPrecisionForValue(42)).toBe(0);
    expect(minPrecisionForValue(3.14)).toBe(0);
  });

  it('returns correct precision for small values', () => {
    expect(minPrecisionForValue(0.5)).toBe(1);
    expect(minPrecisionForValue(0.1)).toBe(1);
    expect(minPrecisionForValue(0.01)).toBe(2);
    expect(minPrecisionForValue(0.001)).toBe(3);
    expect(minPrecisionForValue(0.00002)).toBe(5);
  });

  it('handles negative values', () => {
    expect(minPrecisionForValue(-0.00002)).toBe(5);
    expect(minPrecisionForValue(-5)).toBe(0);
  });
});
