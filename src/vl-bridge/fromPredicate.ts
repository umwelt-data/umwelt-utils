import {
  TUPLE_ENUM,
  TUPLE_PRED_GT,
  TUPLE_PRED_GTE,
  TUPLE_PRED_LT,
  TUPLE_PRED_LTE,
  TUPLE_PRED_ONE_OF,
  TUPLE_PRED_VALID,
  TUPLE_RANGE_INC,
  TUPLE_RANGE_RE,
  type TupleType,
  type VlSelectionTuple,
  type VlSelectionTupleField,
} from './tupleTypes.js';
import {
  isFieldPredicate,
  isLogicalAnd,
  isLogicalNot,
  isLogicalOr,
  type FieldPredicate,
  type Selection,
} from './predicateTypes.js';

function fieldPredicateToTupleType(p: FieldPredicate): TupleType {
  if ('equal' in p) return TUPLE_ENUM;
  if ('lt' in p) return TUPLE_PRED_LT;
  if ('gt' in p) return TUPLE_PRED_GT;
  if ('lte' in p) return TUPLE_PRED_LTE;
  if ('gte' in p) return TUPLE_PRED_GTE;
  if ('range' in p) {
    return p.inclusive === false ? TUPLE_RANGE_RE : TUPLE_RANGE_INC;
  }
  if ('oneOf' in p) return TUPLE_PRED_ONE_OF;
  if ('valid' in p) return TUPLE_PRED_VALID;
  return TUPLE_ENUM;
}

function fieldPredicateValue(p: FieldPredicate): unknown {
  if ('equal' in p) return p.equal;
  if ('lt' in p) return p.lt;
  if ('gt' in p) return p.gt;
  if ('lte' in p) return p.lte;
  if ('gte' in p) return p.gte;
  if ('range' in p) return p.range;
  if ('oneOf' in p) return p.oneOf;
  if ('valid' in p) return p.valid;
  return undefined;
}

/**
 * Convert an Olli-style selection predicate to a Vega-Lite selection-store tuple.
 *
 * The returned tuple is what you write to a `*_store` data source on a VL view:
 *
 *     view.data('external_state_store', [tuple]).run()
 *
 * Returns `undefined` for an empty selection (empty AND, or a logical composition
 * with no field predicates to encode). The caller should write `undefined` in
 * that case, which clears the store.
 *
 * `or` / `not` are not representable in the selection-store format and are
 * silently skipped (with an empty tuple returned if the entire predicate is
 * made of them). This matches the VL runtime's own limitations.
 */
export function predicateToSelectionStore(predicate: Selection | null | undefined): VlSelectionTuple | undefined {
  if (!predicate) return undefined;

  const { fields, values } = collect(predicate);
  if (fields.length === 0) return undefined;

  return { unit: '', fields, values };
}

function collect(predicate: Selection): { fields: VlSelectionTupleField[]; values: unknown[] } {
  if (isLogicalAnd(predicate)) {
    const fields: VlSelectionTupleField[] = [];
    const values: unknown[] = [];
    for (const inner of predicate.and) {
      const sub = collect(inner);
      fields.push(...sub.fields);
      values.push(...sub.values);
    }
    return { fields, values };
  }
  if (isLogicalOr(predicate) || isLogicalNot(predicate)) {
    // Not representable in VL's selection-store tuple format.
    return { fields: [], values: [] };
  }
  if (isFieldPredicate(predicate)) {
    return {
      fields: [{ type: fieldPredicateToTupleType(predicate), field: predicate.field }],
      values: [fieldPredicateValue(predicate)],
    };
  }
  return { fields: [], values: [] };
}
