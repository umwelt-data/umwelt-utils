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
  const withOpacity = attachConditionalOpacity(withParam);
  return augmentMarksForHighlight(withOpacity) as T;
}

export function withPointMarks<T extends Record<string, unknown>>(spec: T): T {
  return augmentMarksForHighlight(spec as CompoundSpec) as T;
}

function attachParam(spec: CompoundSpec): CompoundSpec {
  if (!spec || typeof spec !== 'object') return spec;

  if (containsExternalStateParam(spec)) return spec;

  if ('facet' in spec && spec.spec) {
    return { ...spec, spec: attachParam(spec.spec) };
  }

  // Multi-view specs: attach the param to the first child unit rather than
  // the outer wrapper. A top-level interval param in a layered or concat
  // spec gets pushed down to every child scope by the VL compiler, which
  // produces duplicate signal names (external_state_x, external_state_y).
  // Anchoring it to a single leaf avoids the collision while keeping the
  // store name stable.
  for (const key of ['layer', 'concat', 'hconcat', 'vconcat'] as const) {
    const arr = spec[key];
    if (Array.isArray(arr) && arr.length > 0) {
      const updated = arr.slice();
      updated[0] = attachParam(arr[0] as CompoundSpec);
      return { ...spec, [key]: updated };
    }
  }

  const existing = Array.isArray(spec.params) ? spec.params : [];
  const param = {
    name: EXTERNAL_STATE_PARAM,
    select: {
      type: 'point' as const,
      fields: [] as string[],
      toggle: false,
      clear: false,
    },
  };
  return { ...spec, params: [...existing, param] };
}

function containsExternalStateParam(spec: CompoundSpec): boolean {
  if (!spec || typeof spec !== 'object') return false;
  if (Array.isArray(spec.params) && hasExternalStateParam(spec.params)) return true;
  if (spec.spec && containsExternalStateParam(spec.spec)) return true;
  for (const key of ['layer', 'concat', 'hconcat', 'vconcat'] as const) {
    const arr = spec[key];
    if (Array.isArray(arr) && arr.some((s) => containsExternalStateParam(s))) return true;
  }
  return false;
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

function augmentMarksForHighlight(spec: CompoundSpec): CompoundSpec {
  if (!spec || typeof spec !== 'object') return spec;

  if (spec.mark && spec.encoding) {
    return splitIntoLayerWithCircles(spec) ?? spec;
  }

  let next: CompoundSpec = spec;
  if (spec.spec) {
    next = { ...next, spec: augmentMarksForHighlight(spec.spec) };
  }
  for (const key of ['layer', 'concat', 'hconcat', 'vconcat'] as const) {
    const arr = spec[key];
    if (Array.isArray(arr)) {
      next = { ...next, [key]: arr.map((s) => augmentMarksForHighlight(s)) };
    }
  }
  return next;
}

function getMarkType(mark: unknown): string | undefined {
  if (typeof mark === 'string') return mark;
  if (mark && typeof mark === 'object') return (mark as { type?: string }).type;
  return undefined;
}

function splitIntoLayerWithCircles(spec: CompoundSpec): CompoundSpec | null {
  const type = getMarkType(spec.mark);
  if (type !== 'line' && type !== 'area') return null;

  const encoding = spec.encoding ?? {};
  const { mark, encoding: _enc, params, ...rest } = spec as Record<string, unknown>;

  // For area marks, replace per-datum opacity with an expression that checks
  // whether the selection store has data — dims the entire area uniformly.
  let markEncoding = encoding;
  if (type === 'area') {
    const { opacity: _opacity, ...encodingWithoutOpacity } = encoding;
    markEncoding = {
      ...encodingWithoutOpacity,
      opacity: {
        condition: { test: `length(data('${EXTERNAL_STATE_STORE}')) > 0`, value: 0.3 },
        value: 1,
      },
    };
  }

  const circleOpacity = {
    condition: { param: EXTERNAL_STATE_PARAM, empty: false, value: 1 },
    value: 0,
  };
  const circleEncoding = { ...encoding, opacity: circleOpacity };

  const markLayer: CompoundSpec = { mark, encoding: markEncoding } as CompoundSpec;
  const circleLayer: CompoundSpec = { mark: 'circle', encoding: circleEncoding } as CompoundSpec;

  if (params) {
    (markLayer as Record<string, unknown>).params = params;
  }

  return { ...rest, layer: [markLayer, circleLayer] } as CompoundSpec;
}
