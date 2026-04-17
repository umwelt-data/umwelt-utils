export const TUPLE_ENUM = 'E';
export const TUPLE_RANGE_INC = 'R';
export const TUPLE_RANGE_EXC = 'R-E';
export const TUPLE_RANGE_LE = 'R-LE';
export const TUPLE_RANGE_RE = 'R-RE';
export const TUPLE_PRED_LT = 'LT';
export const TUPLE_PRED_LTE = 'LTE';
export const TUPLE_PRED_GT = 'GT';
export const TUPLE_PRED_GTE = 'GTE';
export const TUPLE_PRED_VALID = 'VALID';
export const TUPLE_PRED_ONE_OF = 'ONE';

export type TupleType =
  | typeof TUPLE_ENUM
  | typeof TUPLE_RANGE_INC
  | typeof TUPLE_RANGE_EXC
  | typeof TUPLE_RANGE_LE
  | typeof TUPLE_RANGE_RE
  | typeof TUPLE_PRED_LT
  | typeof TUPLE_PRED_LTE
  | typeof TUPLE_PRED_GT
  | typeof TUPLE_PRED_GTE
  | typeof TUPLE_PRED_VALID
  | typeof TUPLE_PRED_ONE_OF;

export interface VlSelectionTupleField {
  type: TupleType;
  field: string;
}

export interface VlSelectionTuple {
  unit: string;
  fields: VlSelectionTupleField[];
  values: unknown[];
}

export type VlSelectionStore = VlSelectionTuple[];
