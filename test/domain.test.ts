import { describe, it, expect } from 'vitest';
import { getDomain, serializeValue } from '../src/data/index.js';
import type { Dataset } from '../src/data/index.js';

describe('getDomain', () => {
  it('returns sorted unique nominal values', () => {
    const data: Dataset = [{ c: 'banana' }, { c: 'apple' }, { c: 'cherry' }, { c: 'apple' }];
    expect(getDomain({ field: 'c', type: 'nominal' }, data)).toEqual(['apple', 'banana', 'cherry']);
  });

  it('returns sorted unique quantitative values', () => {
    const data: Dataset = [{ v: 30 }, { v: 10 }, { v: 20 }, { v: 10 }];
    expect(getDomain({ field: 'v', type: 'quantitative' }, data)).toEqual([10, 20, 30]);
  });

  it('skips null and undefined values', () => {
    const data = [{ v: 1 }, { v: null }, { v: 3 }];
    expect(getDomain({ field: 'v', type: 'quantitative' }, data)).toEqual([1, 3]);
  });

  it('returns empty array for empty dataset', () => {
    expect(getDomain({ field: 'v' }, [])).toEqual([]);
  });

  it('deduplicates dates by getTime()', () => {
    const d1 = new Date('2020-01-01');
    const d2 = new Date('2020-01-01');
    const d3 = new Date('2020-06-01');
    const data: Dataset = [{ t: d1 }, { t: d2 }, { t: d3 }];
    const result = getDomain({ field: 't', type: 'temporal' }, data);
    expect(result).toHaveLength(2);
    expect((result[0] as Date).getTime()).toBe(d1.getTime());
    expect((result[1] as Date).getTime()).toBe(d3.getTime());
  });

  it('sorts dates chronologically', () => {
    const jan = new Date('2020-01-01');
    const mar = new Date('2020-03-01');
    const feb = new Date('2020-02-01');
    const data: Dataset = [{ t: mar }, { t: jan }, { t: feb }];
    const result = getDomain({ field: 't', type: 'temporal' }, data);
    expect((result[0] as Date).getTime()).toBe(jan.getTime());
    expect((result[1] as Date).getTime()).toBe(feb.getTime());
    expect((result[2] as Date).getTime()).toBe(mar.getTime());
  });

  it('deduplicates dates by timeUnit when provided', () => {
    const d1 = new Date('2020-01-15');
    const d2 = new Date('2020-01-20');
    const d3 = new Date('2020-02-10');
    const data: Dataset = [{ t: d1 }, { t: d2 }, { t: d3 }];
    expect(getDomain({ field: 't', type: 'temporal', timeUnit: 'month' }, data)).toHaveLength(2);
  });
});

describe('serializeValue', () => {
  it('converts temporal values to epoch millis', () => {
    expect(serializeValue('2020-01-01', { type: 'temporal' })).toBe(new Date('2020-01-01').getTime());
  });

  it('converts temporal arrays element-wise', () => {
    expect(serializeValue(['2020-01-01', '2021-01-01'], { type: 'temporal' })).toEqual([
      new Date('2020-01-01').getTime(),
      new Date('2021-01-01').getTime(),
    ]);
  });

  it('converts numeric strings on quantitative fields', () => {
    expect(serializeValue('42', { type: 'quantitative' })).toBe(42);
    expect(serializeValue('1,234', { type: 'quantitative' })).toBe(1234);
  });

  it('leaves non-numeric and empty strings alone', () => {
    expect(serializeValue('foo', { type: 'quantitative' })).toBe('foo');
    expect(serializeValue('', { type: 'quantitative' })).toBe('');
  });

  it('passes through nominal values', () => {
    expect(serializeValue('42', { type: 'nominal' })).toBe('42');
    expect(serializeValue('42', {})).toBe('42');
  });
});
