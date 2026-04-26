// Structural types matching olli-core's predicate types — no runtime dependency.

export type FieldValue = string | number | boolean | Date | null;

export interface FieldPredicateLike {
  field: string;
  equal?: FieldValue;
  oneOf?: FieldValue[];
}

export interface LogicalAndLike {
  and: SelectionLike[];
}

export interface LogicalOrLike {
  or: SelectionLike[];
}

export interface LogicalNotLike {
  not: SelectionLike;
}

export type SelectionLike =
  | FieldPredicateLike
  | LogicalAndLike
  | LogicalOrLike
  | LogicalNotLike;

function isAnd(s: SelectionLike): s is LogicalAndLike {
  return 'and' in s;
}

function isOr(s: SelectionLike): s is LogicalOrLike {
  return 'or' in s;
}

function isNot(s: SelectionLike): s is LogicalNotLike {
  return 'not' in s;
}

/**
 * Walk a Selection and extract the set of element IDs referenced by
 * `{ field: 'id', equal: ... }` and `{ field: 'id', oneOf: [...] }` predicates.
 *
 * AND → intersection of child ID sets.
 * OR  → union of child ID sets.
 * NOT → ignored (cannot meaningfully resolve to scenegraph names).
 *
 * Returns `null` when the selection contains no id-field predicates,
 * which the caller should treat as "nothing to highlight".
 */
export function resolveIds(selection: SelectionLike): string[] | null {
  if (isAnd(selection)) {
    if (selection.and.length === 0) return null;
    let result: Set<string> | null = null;
    for (const child of selection.and) {
      const childIds = resolveIds(child);
      if (childIds === null) continue;
      if (result === null) {
        result = new Set(childIds);
      } else {
        const childSet = new Set(childIds);
        for (const id of result) {
          if (!childSet.has(id)) result.delete(id);
        }
      }
    }
    return result ? [...result] : null;
  }

  if (isOr(selection)) {
    const result = new Set<string>();
    for (const child of selection.or) {
      const childIds = resolveIds(child);
      if (childIds) for (const id of childIds) result.add(id);
    }
    return result.size > 0 ? [...result] : null;
  }

  if (isNot(selection)) return null;

  if (selection.field !== 'id') return null;
  if ('equal' in selection && typeof selection.equal === 'string') {
    return [selection.equal];
  }
  if ('oneOf' in selection && selection.oneOf) {
    return selection.oneOf.filter((v): v is string => typeof v === 'string');
  }
  return null;
}
