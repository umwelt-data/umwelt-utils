import { parseExpression } from 'vega-expression';
import type { FieldPredicate } from './types.js';

/**
 * Translate a vega filter expression into simple field predicates, e.g. for
 * surfacing a filtered annotation layer ("datum.Value >= 300") as a data
 * highlight. Returns one predicate per translatable conjunct; non-comparison
 * clauses (isValid guards, function calls) are skipped.
 */
export function filterExprToPredicates(expr: string): FieldPredicate[] {
  let ast: any;
  try {
    ast = parseExpression(expr);
  } catch {
    return [];
  }

  const out: FieldPredicate[] = [];
  const collect = (node: any) => {
    if (!node) return;
    if (node.type === 'LogicalExpression' && node.operator === '&&') {
      collect(node.left);
      collect(node.right);
      return;
    }
    if (node.type === 'BinaryExpression') {
      const pred = comparisonToPredicate(node);
      if (pred) out.push(pred);
    }
  };
  collect(ast);
  return out;
}

function datumFieldName(node: any): string | undefined {
  if (node?.type !== 'MemberExpression') return undefined;
  if (node.object?.type !== 'Identifier' || node.object.name !== 'datum') return undefined;
  if (node.computed) {
    return node.property?.type === 'Literal' ? String(node.property.value) : undefined;
  }
  return node.property?.name;
}

function comparisonToPredicate(node: any): FieldPredicate | undefined {
  const OPS: Record<string, string> = { '>=': 'gte', '<=': 'lte', '>': 'gt', '<': 'lt', '==': 'equal', '===': 'equal' };
  const FLIPPED: Record<string, string> = { gte: 'lte', lte: 'gte', gt: 'lt', lt: 'gt', equal: 'equal' };
  const op = OPS[node.operator];
  if (!op) return undefined;

  const leftField = datumFieldName(node.left);
  const rightField = datumFieldName(node.right);
  if (leftField && node.right?.type === 'Literal') {
    return { field: leftField, [op]: node.right.value } as FieldPredicate;
  }
  if (rightField && node.left?.type === 'Literal') {
    return { field: rightField, [FLIPPED[op]!]: node.left.value } as FieldPredicate;
  }
  return undefined;
}
