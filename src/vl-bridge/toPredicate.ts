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
import type { FieldPredicate, Selection } from './predicateTypes.js';

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
      return { ...base, range: value, inclusive: true } as FieldPredicate;
    case TUPLE_RANGE_RE:
    case TUPLE_RANGE_EXC:
    case TUPLE_RANGE_LE:
      return { ...base, range: value, inclusive: false } as FieldPredicate;
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
