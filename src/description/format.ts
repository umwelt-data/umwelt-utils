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
