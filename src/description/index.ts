import type { MeasureType } from '../data/index.js';

export interface DescriptionFieldDef {
  field: string;
  type?: MeasureType;
  timeUnit?: string;
  bin?: boolean;
}

export function fmtValue(value: unknown, fieldDef: DescriptionFieldDef, precision?: number): string {
  if (fieldDef.type === 'temporal' && !(value instanceof Date)) {
    value = new Date(value as string | number);
  } else if (fieldDef.type === 'quantitative' && isNumeric(String(value))) {
    value = Number(String(value));
  }
  if (value instanceof Date) {
    return dateToTimeUnit(value, fieldDef.timeUnit);
  }
  if (typeof value === 'number' && !isNaN(value)) {
    if (precision !== undefined) {
      return value.toFixed(precision);
    }
    if (value % 1 !== 0) {
      return value.toFixed(Math.max(2, minPrecisionForValue(value)));
    }
  }
  return String(value);
}

export function dateToTimeUnit(date: Date, timeUnit?: string): string {
  if (!timeUnit) {
    return date.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
  const opts: Intl.DateTimeFormatOptions = {};
  if (timeUnit.includes('year')) opts.year = 'numeric';
  if (timeUnit.includes('month')) opts.month = 'short';
  if (timeUnit.includes('day')) opts.weekday = 'short';
  if (timeUnit.includes('date')) opts.day = 'numeric';
  if (timeUnit.includes('hours')) opts.hour = 'numeric';
  if (timeUnit.includes('minutes')) opts.minute = 'numeric';
  if (timeUnit.includes('seconds')) opts.second = 'numeric';
  if (Object.keys(opts).length === 0) {
    return date.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
  return date.toLocaleString('en-US', opts);
}

export function isNumeric(value: string): boolean {
  return !isNaN(Number(value.replaceAll(',', '')));
}

export function minPrecisionForValue(value: number): number {
  if (value === 0 || Math.abs(value) >= 1) return 0;
  return -Math.floor(Math.log10(Math.abs(value)));
}

export function capitalizeFirst(s: string): string {
  return s.slice(0, 1).toUpperCase() + s.slice(1);
}

export function makeCommaSeparatedString(arr: string[]): string {
  const listStart = arr.slice(0, -1).join(', ');
  const listEnd = arr.slice(-1);
  const conjunction = arr.length <= 1 ? '' : arr.length > 2 ? ', and ' : ' and ';
  return [listStart, listEnd].join(conjunction);
}

export interface DescribeFieldDef {
  field: string;
  bin?: boolean;
  aggregate?: string;
  timeUnit?: string;
}

export function describeField(fieldDef: DescribeFieldDef): string {
  if (fieldDef.aggregate === 'count') return 'count';
  const parts: string[] = [];
  if (fieldDef.bin) parts.push('binned');
  if (fieldDef.aggregate) parts.push(fieldDef.aggregate);
  parts.push(fieldDef.field);
  if (fieldDef.timeUnit) parts.push(`(${fieldDef.timeUnit})`);
  return parts.join(' ');
}
