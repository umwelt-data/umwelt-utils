import { describe, expect, it } from 'vitest';
import {
  predicateToSelectionStore,
  selectionStoreToSelection,
  type FieldPredicate,
  type Selection,
} from '../src/vl-bridge/index.js';

function roundTrip(p: Selection): Selection {
  const tuple = predicateToSelectionStore(p);
  return selectionStoreToSelection(tuple ? [tuple] : []);
}

describe('predicate <-> selection-store round-trip', () => {
  it('equal', () => {
    const p: FieldPredicate = { field: 'country', equal: 'USA' };
    expect(roundTrip(p)).toEqual(p);
  });

  it('lt', () => {
    const p: FieldPredicate = { field: 'x', lt: 10 };
    expect(roundTrip(p)).toEqual(p);
  });

  it('lte', () => {
    const p: FieldPredicate = { field: 'x', lte: 10 };
    expect(roundTrip(p)).toEqual(p);
  });

  it('gt', () => {
    const p: FieldPredicate = { field: 'x', gt: 10 };
    expect(roundTrip(p)).toEqual(p);
  });

  it('gte', () => {
    const p: FieldPredicate = { field: 'x', gte: 10 };
    expect(roundTrip(p)).toEqual(p);
  });

  it('range fully inclusive [lo, hi]', () => {
    const p: FieldPredicate = { field: 'year', range: [1990, 2000], inclusiveLeft: true, inclusiveRight: true };
    expect(roundTrip(p)).toEqual(p);
  });

  it('range right-exclusive [lo, hi)', () => {
    const p: FieldPredicate = { field: 'year', range: [1990, 2000], inclusiveLeft: true, inclusiveRight: false };
    expect(roundTrip(p)).toEqual(p);
  });

  it('range left-exclusive (lo, hi]', () => {
    const p: FieldPredicate = { field: 'year', range: [1990, 2000], inclusiveLeft: false, inclusiveRight: true };
    expect(roundTrip(p)).toEqual(p);
  });

  it('range fully exclusive (lo, hi)', () => {
    const p: FieldPredicate = { field: 'year', range: [1990, 2000], inclusiveLeft: false, inclusiveRight: false };
    expect(roundTrip(p)).toEqual(p);
  });

  it('oneOf', () => {
    const p: FieldPredicate = { field: 'country', oneOf: ['USA', 'CAN', 'MEX'] };
    expect(roundTrip(p)).toEqual(p);
  });

  it('valid', () => {
    const p: FieldPredicate = { field: 'price', valid: true };
    expect(roundTrip(p)).toEqual(p);
  });

  it('multi-field AND', () => {
    const p: Selection = {
      and: [
        { field: 'country', equal: 'USA' },
        { field: 'year', range: [1990, 2000], inclusiveLeft: true, inclusiveRight: true },
      ],
    };
    expect(roundTrip(p)).toEqual(p);
  });

  it('empty AND -> empty AND', () => {
    expect(roundTrip({ and: [] })).toEqual({ and: [] });
  });

  it('normalizes a descending range from an inverted scale to ascending', () => {
    // Vega stores an interval extent in the scale's own order, so a brush over
    // an inverted (e.g. y) axis arrives as [max, min]. The predicate must come
    // out ascending or every consumer tests `v >= max && v <= min` and matches
    // nothing.
    const store = [
      {
        unit: '',
        fields: [{ type: 'R' as const, field: 'Horsepower' }],
        values: [[184.5, 99.8]],
      },
    ];
    expect(selectionStoreToSelection(store)).toEqual({
      field: 'Horsepower',
      range: [99.8, 184.5],
      inclusiveLeft: true,
      inclusiveRight: true,
    });
  });

  it('swaps endpoint inclusivity when reversing an asymmetric range', () => {
    // right-exclusive [true, false] over a descending extent becomes
    // left-exclusive [false, true] once the bounds are put in ascending order
    const store = [
      {
        unit: '',
        fields: [{ type: 'R-RE' as const, field: 'y' }],
        values: [[10, 0]],
      },
    ];
    expect(selectionStoreToSelection(store)).toEqual({
      field: 'y',
      range: [0, 10],
      inclusiveLeft: false,
      inclusiveRight: true,
    });
  });

  it('undefined -> empty store -> empty AND', () => {
    expect(predicateToSelectionStore(undefined)).toBeUndefined();
    expect(selectionStoreToSelection(undefined)).toEqual({ and: [] });
  });
});

describe('predicateToSelectionStore tuple shape', () => {
  it('produces VL selection-store tuple with parallel fields/values', () => {
    const p: Selection = {
      and: [
        { field: 'a', equal: 1 },
        { field: 'b', lt: 5 },
      ],
    };
    const tuple = predicateToSelectionStore(p);
    expect(tuple).toBeDefined();
    expect(tuple!.unit).toBe('');
    expect(tuple!.fields).toEqual([
      { type: 'E', field: 'a' },
      { type: 'LT', field: 'b' },
    ]);
    expect(tuple!.values).toEqual([1, 5]);
  });

  it('range inclusive values are passed through as arrays', () => {
    const p: FieldPredicate = { field: 'year', range: [1990, 2000], inclusiveLeft: true, inclusiveRight: true };
    const tuple = predicateToSelectionStore(p);
    expect(tuple!.fields[0]).toEqual({ type: 'R', field: 'year' });
    expect(tuple!.values[0]).toEqual([1990, 2000]);
  });

  it('right-exclusive range uses R-RE', () => {
    const p: FieldPredicate = { field: 'y', range: [0, 10], inclusiveLeft: true, inclusiveRight: false };
    const tuple = predicateToSelectionStore(p);
    expect(tuple!.fields[0]!.type).toBe('R-RE');
  });

  it('left-exclusive range uses R-LE', () => {
    const p: FieldPredicate = { field: 'y', range: [0, 10], inclusiveLeft: false, inclusiveRight: true };
    const tuple = predicateToSelectionStore(p);
    expect(tuple!.fields[0]!.type).toBe('R-LE');
  });

  it('fully exclusive range uses R-E', () => {
    const p: FieldPredicate = { field: 'y', range: [0, 10], inclusiveLeft: false, inclusiveRight: false };
    const tuple = predicateToSelectionStore(p);
    expect(tuple!.fields[0]!.type).toBe('R-E');
  });

  it('or / not are skipped silently', () => {
    const or: Selection = { or: [{ field: 'a', equal: 1 }] };
    expect(predicateToSelectionStore(or)).toBeUndefined();

    const not: Selection = { not: { field: 'a', equal: 1 } };
    expect(predicateToSelectionStore(not)).toBeUndefined();
  });

  it('flattens nested AND', () => {
    const p: Selection = {
      and: [
        { and: [{ field: 'a', equal: 1 }] },
        { field: 'b', equal: 2 },
      ],
    };
    const tuple = predicateToSelectionStore(p);
    expect(tuple!.fields.map((f) => f.field)).toEqual(['a', 'b']);
    expect(tuple!.values).toEqual([1, 2]);
  });
});
