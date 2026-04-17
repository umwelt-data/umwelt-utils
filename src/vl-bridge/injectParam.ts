export const EXTERNAL_STATE_PARAM = 'external_state';
export const EXTERNAL_STATE_STORE = `${EXTERNAL_STATE_PARAM}_store`;

interface SpecWithParams {
  params?: unknown[];
  spec?: SpecWithParams;
  layer?: SpecWithParams[];
  concat?: SpecWithParams[];
  hconcat?: SpecWithParams[];
  vconcat?: SpecWithParams[];
  facet?: unknown;
}

/**
 * Add an `external_state` interval selection param to a Vega-Lite spec.
 * The VL compiler then creates a data source named `external_state_store`
 * on the compiled view, which the bridge writes tuples to in order to
 * drive highlighting from an external source (the Olli tree).
 *
 * The param is attached to the outermost level that accepts `params`:
 * a unit spec gets it directly; a layered or concat spec gets it at the
 * top; a faceted spec gets it on the inner `spec`.
 *
 * Idempotent — calling twice doesn't duplicate the param.
 *
 * The input is shallow-cloned on the path we mutate; the caller's spec
 * is not modified.
 */
export function withExternalStateParam<T extends Record<string, unknown>>(spec: T): T {
  return attachParam(spec as SpecWithParams) as T;
}

function attachParam(spec: SpecWithParams): SpecWithParams {
  if (!spec || typeof spec !== 'object') return spec;

  // Faceted spec: params go on the inner `spec`.
  if ('facet' in spec && spec.spec) {
    return { ...spec, spec: attachParam(spec.spec) };
  }

  const existing = Array.isArray(spec.params) ? spec.params : [];
  if (hasExternalStateParam(existing)) return spec;

  const param = { name: EXTERNAL_STATE_PARAM, select: 'interval' };
  return { ...spec, params: [...existing, param] };
}

function hasExternalStateParam(params: unknown[]): boolean {
  return params.some(
    (p) => typeof p === 'object' && p !== null && (p as { name?: unknown }).name === EXTERNAL_STATE_PARAM,
  );
}
