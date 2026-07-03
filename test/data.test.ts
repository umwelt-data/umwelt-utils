import { describe, expect, it } from 'vitest';
import { isNumeric, typeCoerceData } from '../src/data/index.js';
import { fmtValue } from '../src/description/index.js';

describe('isNumeric', () => {
  it('accepts plain and comma-grouped numbers', () => {
    expect(isNumeric('42')).toBe(true);
    expect(isNumeric('-3.14')).toBe(true);
    expect(isNumeric('1,234,567')).toBe(true);
    expect(isNumeric(' 42 ')).toBe(true);
  });

  it('rejects non-numeric strings', () => {
    expect(isNumeric('foo')).toBe(false);
    expect(isNumeric('12abc')).toBe(false);
  });

  it('rejects empty and whitespace-only strings', () => {
    expect(isNumeric('')).toBe(false);
    expect(isNumeric('   ')).toBe(false);
    expect(isNumeric(',')).toBe(false);
  });

});

describe('typeCoerceData with empty strings', () => {
  it('leaves empty strings alone instead of coercing to 0', () => {
    const data = [{ a: '' }, { a: '5' }];
    const coerced = typeCoerceData(data, [{ name: 'a', type: 'quantitative' }]);
    expect(coerced[0]!.a).toBe('');
    expect(coerced[1]!.a).toBe(5);
  });
});

describe('fmtValue with empty strings', () => {
  it('formats empty quantitative values as empty, not "0"', () => {
    expect(fmtValue('', { field: 'a', type: 'quantitative' })).toBe('');
    expect(fmtValue('5.5', { field: 'a', type: 'quantitative' })).toBe('5.50');
  });
});
