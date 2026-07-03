import type { Dataset, DataValue, MeasureType } from './types.js';
import { dateToTimeUnit } from '../description/format.js';

export interface DomainFieldDef {
  field: string;
  type?: MeasureType;
  timeUnit?: string;
}

/**
 * Unique values of a field, sorted. Dates are deduplicated by their timeUnit
 * bucket when the field has one (e.g. two dates in the same month count once
 * for timeUnit 'month'), otherwise by timestamp. Nulls are dropped.
 */
export function getDomain(fieldDef: DomainFieldDef, data: Dataset): Exclude<DataValue, null>[] {
  const unique = new Set<Exclude<DataValue, null>>();

  if (fieldDef.timeUnit) {
    const seen = new Set<string>();
    for (const d of data) {
      const v = d[fieldDef.field];
      if (v instanceof Date) {
        const key = dateToTimeUnit(v, fieldDef.timeUnit);
        if (!seen.has(key)) {
          seen.add(key);
          unique.add(v);
        }
      }
    }
  } else {
    const seenTimes = new Set<number>();
    for (const d of data) {
      const v = d[fieldDef.field];
      if (v == null) continue;
      if (v instanceof Date) {
        const t = v.getTime();
        if (!seenTimes.has(t)) {
          seenTimes.add(t);
          unique.add(v);
        }
      } else {
        unique.add(v);
      }
    }
  }

  return [...unique]
    .filter((x) => x != null)
    .sort((a, b) => {
      if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
      if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b);
      return (a as number) - (b as number);
    });
}
