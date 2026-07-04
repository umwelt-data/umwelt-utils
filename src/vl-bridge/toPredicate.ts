import {
  TUPLE_ENUM,
  TUPLE_PRED_GT,
  TUPLE_PRED_GTE,
  TUPLE_PRED_LT,
  TUPLE_PRED_LTE,
  TUPLE_PRED_ONE_OF,
  TUPLE_PRED_VALID,
  TUPLE_RANGE_EXC,
  TUPLE_RANGE_INC,
  TUPLE_RANGE_LE,
  TUPLE_RANGE_RE,
  type TupleType,
  type VlSelectionStore,
  type VlSelectionTupleField,
} from './tupleTypes.js';
import type { FieldPredicate, Selection } from '../predicate/types.js';

// Vega stores an interval extent in the scale's own order, so a selection over
// an inverted scale (e.g. a y axis, where higher data values sit at smaller
// pixel coordinates) arrives descending: [max, min]. A range predicate is
// [min, max] by contract, so normalize to ascending — swapping the endpoint
// inclusivity along with the bounds — otherwise every consumer (predicate eval,
// olli) tests `value >= max && value <= min` and matches nothing.
function rangePredicate(base: { field: string }, value: unknown, leftInc: boolean, rightInc: boolean): FieldPredicate {
  let [lo, hi] = value as [unknown, unknown];
  let inclusiveLeft = leftInc;
  let inclusiveRight = rightInc;
  const nLo = lo instanceof Date ? lo.getTime() : lo;
  const nHi = hi instanceof Date ? hi.getTime() : hi;
  if (typeof nLo === 'number' && typeof nHi === 'number' && nLo > nHi) {
    [lo, hi] = [hi, lo];
    [inclusiveLeft, inclusiveRight] = [rightInc, leftInc];
  }
  return { ...base, range: [lo, hi], inclusiveLeft, inclusiveRight } as FieldPredicate;
}

function buildFieldPredicate(field: VlSelectionTupleField, value: unknown): FieldPredicate {
  const base = { field: field.field };
  switch (field.type as TupleType) {
    case TUPLE_ENUM:
      return { ...base, equal: value as FieldPredicate extends { equal: infer V } ? V : never } as FieldPredicate;
    case TUPLE_PRED_LT:
      return { ...base, lt: value } as FieldPredicate;
    case TUPLE_PRED_LTE:
      return { ...base, lte: value } as FieldPredicate;
    case TUPLE_PRED_GT:
      return { ...base, gt: value } as FieldPredicate;
    case TUPLE_PRED_GTE:
      return { ...base, gte: value } as FieldPredicate;
    case TUPLE_RANGE_INC:
      return rangePredicate(base, value, true, true);
    case TUPLE_RANGE_RE:
      return rangePredicate(base, value, true, false);
    case TUPLE_RANGE_LE:
      return rangePredicate(base, value, false, true);
    case TUPLE_RANGE_EXC:
      return rangePredicate(base, value, false, false);
    case TUPLE_PRED_ONE_OF:
      return { ...base, oneOf: value } as FieldPredicate;
    case TUPLE_PRED_VALID:
      return { ...base, valid: value } as FieldPredicate;
    default:
      return { ...base, equal: value } as FieldPredicate;
  }
}

/**
 * Inverse of `predicateToSelectionStore`.
 *
 * Converts a Vega-Lite selection store (the value you get from
 * `view.data('*_store')`) back into a selection predicate.
 *
 * A store with no tuples or no fields maps to the empty AND `{ and: [] }`.
 * A store with one field produces a bare FieldPredicate.
 * A store with multiple fields produces a top-level AND.
 *
 * Only the first tuple is inspected: VL selection-store tuples share a
 * field schema, and the VL runtime itself treats multi-tuple stores as
 * an OR over points with the same shape — which is outside the bridge's
 * current scope.
 */
export function selectionStoreToSelection(store: VlSelectionStore | null | undefined): Selection {
  if (!store || store.length === 0) return { and: [] };
  const tuple = store[0];
  if (!tuple || !tuple.fields.length) return { and: [] };

  const predicates: FieldPredicate[] = tuple.fields.map((field, i) =>
    buildFieldPredicate(field, tuple.values[i]),
  );

  if (predicates.length === 1) return predicates[0]!;
  return { and: predicates };
}
