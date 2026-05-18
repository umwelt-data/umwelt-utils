export { predicateToSelectionStore } from './fromPredicate.js';
export { selectionStoreToSelection } from './toPredicate.js';
export {
  withExternalStateParam,
  withPointMarks,
  EXTERNAL_STATE_PARAM,
  EXTERNAL_STATE_STORE,
} from './injectParam.js';
export {
  connectOlliToVegaLite,
  type OlliHandleLike,
  type VegaViewLike,
  type BridgeOptions,
} from './bridge.js';

export {
  TUPLE_ENUM,
  TUPLE_RANGE_INC,
  TUPLE_RANGE_EXC,
  TUPLE_RANGE_LE,
  TUPLE_RANGE_RE,
  TUPLE_PRED_LT,
  TUPLE_PRED_LTE,
  TUPLE_PRED_GT,
  TUPLE_PRED_GTE,
  TUPLE_PRED_VALID,
  TUPLE_PRED_ONE_OF,
  type TupleType,
  type VlSelectionTuple,
  type VlSelectionTupleField,
  type VlSelectionStore,
} from './tupleTypes.js';

export type {
  FieldPredicate,
  FieldEqualPredicate,
  FieldLTPredicate,
  FieldGTPredicate,
  FieldLTEPredicate,
  FieldGTEPredicate,
  FieldRangePredicate,
  FieldOneOfPredicate,
  FieldValidPredicate,
  LogicalAnd,
  LogicalOr,
  LogicalNot,
  LogicalComposition,
  Selection,
  FieldValue,
} from './predicateTypes.js';
