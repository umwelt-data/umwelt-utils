import { describe, expect, it } from 'vitest';
import { filterExprToPredicates } from '../src/predicate/index.js';

describe('filterExprToPredicates', () => {
  it('translates a simple comparison', () => {
    expect(filterExprToPredicates('datum.Value >= 300')).toEqual([{ field: 'Value', gte: 300 }]);
  });

  it('translates computed member access', () => {
    expect(filterExprToPredicates('datum["IMDB Rating"] > 7.5')).toEqual([
      { field: 'IMDB Rating', gt: 7.5 },
    ]);
  });

  it('flips literal-first comparisons', () => {
    expect(filterExprToPredicates('300 <= datum.Value')).toEqual([{ field: 'Value', gte: 300 }]);
  });

  it('collects conjuncts and skips non-comparison clauses', () => {
    expect(
      filterExprToPredicates('isValid(datum.a) && datum.a > 1 && datum.b === "x"'),
    ).toEqual([
      { field: 'a', gt: 1 },
      { field: 'b', equal: 'x' },
    ]);
  });

  it('returns [] for disjunctions and unparsable input', () => {
    expect(filterExprToPredicates('datum.a > 1 || datum.b > 2')).toEqual([]);
    expect(filterExprToPredicates('not an expression ((')).toEqual([]);
  });
});
