export type MeasureType = 'quantitative' | 'ordinal' | 'nominal' | 'temporal';
export type DataValue = string | number | Date | null;
export type Datum = Record<string, DataValue>;
export type Dataset = Datum[];

export interface FieldSpec {
  name: string;
  type?: MeasureType | undefined;
}

export function isNumeric(value: string): boolean {
  return !isNaN(Number(value.replaceAll(',', '')));
}

export function typeCoerceData(data: Dataset, fields: FieldSpec[]): Dataset {
  const lookup: Record<string, MeasureType | undefined> = Object.fromEntries(
    fields.map((f) => [f.name, f.type]),
  );

  if (data.length === 0) return data;
  const firstDatum = data[0]!;
  const coercedFirstDatum = typeCoerceDatum(lookup, firstDatum);
  if (Object.entries(firstDatum).every(([field, value]) => coercedFirstDatum[field] === value)) {
    return data;
  }

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
