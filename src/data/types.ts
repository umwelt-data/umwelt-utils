export type MeasureType = 'quantitative' | 'ordinal' | 'nominal' | 'temporal';
export type DataValue = string | number | Date | null;
export type Datum = Record<string, DataValue>;
export type Dataset = Datum[];

export interface FieldSpec {
  name: string;
  type?: MeasureType | undefined;
}
