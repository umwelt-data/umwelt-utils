import type { MeasureType } from './types.js';
import { isNumeric } from './coerce.js';

/**
 * Normalize a field value for comparison or storage in a selection predicate:
 * temporal values (including arrays, e.g. ranges) become epoch milliseconds,
 * and numeric strings on quantitative fields become numbers.
 */
export function serializeValue(value: unknown, fieldDef: { type?: MeasureType }): unknown {
  if (fieldDef.type === 'temporal') {
    if (Array.isArray(value)) return value.map((v) => new Date(v as string).getTime());
    return new Date(value as string).getTime();
  }
  if (fieldDef.type === 'quantitative' && typeof value === 'string' && isNumeric(value)) {
    return Number(value.replaceAll(',', ''));
  }
  return value;
}
