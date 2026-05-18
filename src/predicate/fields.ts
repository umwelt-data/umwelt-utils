import type { Selection } from './types.js';
import { isLogicalAnd, isLogicalOr, isLogicalNot, isFieldPredicate } from './types.js';

export function predicateToFields(predicate: Selection): string[] {
  if (isLogicalAnd(predicate)) {
    return predicate.and.flatMap((p) => predicateToFields(p));
  }
  if (isLogicalOr(predicate)) {
    return predicate.or.flatMap((p) => predicateToFields(p));
  }
  if (isLogicalNot(predicate)) {
    return predicateToFields(predicate.not);
  }
  if (isFieldPredicate(predicate)) {
    return [predicate.field];
  }
  return [];
}
