export const EXTERNAL_STATE_PARAM = 'external_state';
export const EXTERNAL_STATE_STORE = `${EXTERNAL_STATE_PARAM}_store`;

interface CompoundSpec {
  params?: unknown[];
  mark?: unknown;
  encoding?: Record<string, unknown>;
  spec?: CompoundSpec;
  layer?: CompoundSpec[];
  concat?: CompoundSpec[];
  hconcat?: CompoundSpec[];
  vconcat?: CompoundSpec[];
  facet?: unknown;
}

/**
 * Add an `external_state` interval selection param to a Vega-Lite spec,
 * and inject a conditional opacity encoding on every unit so the selected
 * rows stand out and the rest are dimmed.
 *
 * The VL compiler creates a data source named `external_state_store` on
 * the compiled view, which the bridge writes tuples to in order to drive
 * highlighting from an external source (the Olli tree).
 *
 * The param is attached to the outermost level that accepts `params`:
 * a unit spec gets it directly; a layered or concat spec gets it at the
 * top; a faceted spec gets it on the inner `spec`.
 *
 * The conditional opacity is applied to every unit (including each layer
 * and concat child). Matching rows keep their original opacity (or 1);
 * non-matching rows are drawn at opacity 0.3. An empty selection highlights
 * everything (Vega-Lite's `empty: true` default), so the root / "all data"
 * node of an Olli tree shows the chart undimmed.
 *
 * Idempotent — calling twice doesn't duplicate the param, and a unit
 * that already has a conditional opacity on `external_state` is left alone.
 *
 * The input is shallow-cloned on the path we mutate; the caller's spec
 * is not modified.
 */
export function withExternalStateParam<T extends Record<string, unknown>>(spec: T): T {
  const withParam = attachParam(spec as CompoundSpec);
  return attachConditionalOpacity(withParam) as T;
}

function attachParam(spec: CompoundSpec): CompoundSpec {
  if (!spec || typeof spec !== 'object') return spec;

  if ('facet' in spec && spec.spec) {
    return { ...spec, spec: attachParam(spec.spec) };
  }

  const existing = Array.isArray(spec.params) ? spec.params : [];
  if (hasExternalStateParam(existing)) return spec;

  const param = { name: EXTERNAL_STATE_PARAM, select: 'interval' };
  return { ...spec, params: [...existing, param] };
}

function attachConditionalOpacity(spec: CompoundSpec): CompoundSpec {
  if (!spec || typeof spec !== 'object') return spec;

  if (spec.mark && spec.encoding) {
    return { ...spec, encoding: injectOpacity(spec.encoding) };
  }

  let next: CompoundSpec = spec;
  if (spec.spec) {
    next = { ...next, spec: attachConditionalOpacity(spec.spec) };
  }
  for (const key of ['layer', 'concat', 'hconcat', 'vconcat'] as const) {
    const arr = spec[key];
    if (Array.isArray(arr)) {
      next = { ...next, [key]: arr.map((s) => attachConditionalOpacity(s)) };
    }
  }
  return next;
}

function injectOpacity(encoding: Record<string, unknown>): Record<string, unknown> {
  const existing = encoding.opacity;
  if (isConditionalOnExternalState(existing)) return encoding;

  const base =
    existing && typeof existing === 'object'
      ? (existing as Record<string, unknown>)
      : { value: 1 };

  const opacity = {
    condition: { param: EXTERNAL_STATE_PARAM, ...base },
    value: 0.3,
  };
  return { ...encoding, opacity };
}

function isConditionalOnExternalState(encoding: unknown): boolean {
  if (!encoding || typeof encoding !== 'object') return false;
  const condition = (encoding as { condition?: unknown }).condition;
  if (!condition || typeof condition !== 'object') return false;
  return (condition as { param?: unknown }).param === EXTERNAL_STATE_PARAM;
}

function hasExternalStateParam(params: unknown[]): boolean {
  return params.some(
    (p) => typeof p === 'object' && p !== null && (p as { name?: unknown }).name === EXTERNAL_STATE_PARAM,
  );
}
