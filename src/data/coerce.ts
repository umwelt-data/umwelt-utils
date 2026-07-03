import type { Dataset, Datum, DataValue, FieldSpec, MeasureType } from './types.js';

export function isNumeric(value: string): boolean {
  const cleaned = value.replaceAll(',', '').trim();
  return cleaned !== '' && !isNaN(Number(cleaned));
}

export function typeCoerceData(data: Dataset, fields: FieldSpec[]): Dataset {
  const lookup: Record<string, MeasureType | undefined> = Object.fromEntries(
    fields.map((f) => [f.name, f.type]),
  );

  if (data.length === 0) return data;

  // Skip the map when the data already carries the target types. Sample the
  // first non-null value per field — sampling only the first row would let a
  // null or empty value there disable coercion for the whole column.
  const needsCoercion = fields.some((f) => {
    if (f.type !== 'temporal' && f.type !== 'quantitative') return false;
    for (const datum of data) {
      const value = datum[f.name];
      if (value === null || value === undefined) continue;
      return f.type === 'temporal' ? !(value instanceof Date) : typeof value !== 'number';
    }
    return false;
  });
  if (!needsCoercion) return data;

  return data.map((datum) => typeCoerceDatum(lookup, datum));
}

function typeCoerceDatum(
  lookup: Record<string, MeasureType | undefined>,
  datum: Datum,
): Datum {
  return Object.fromEntries(
    Object.entries(datum).map(([field, value]: [string, DataValue]) => {
      if (!lookup[field]) return [field, value];
      if (value === null || value === undefined) return [field, value];
      switch (lookup[field]) {
        case 'temporal':
          if (field.toLowerCase() === 'year') {
            if (typeof value === 'number' || (typeof value === 'string' && isNumeric(value))) {
              return [field, new Date(Number(value), 0, 1)];
            } else if (typeof value === 'string') {
              return [field, new Date(value)];
            }
          }
          return [field, new Date(value as string | number)];
        case 'quantitative':
          if (value instanceof Date) {
            return [field, value.getTime()];
          }
          if (typeof value === 'string' && isNumeric(value)) {
            return [field, Number(value)];
          }
      }
      return [field, value];
    }),
  );
}
