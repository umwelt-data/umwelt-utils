import { looksLikeFips, enrichWithUSGeo } from '../geo/index.js';

// View surface we touch: getter + setter overloads of data() plus runAsync().
// Declared structurally so the package keeps no runtime dependency on vega.
export interface PostprocessViewLike {
  data(name: string): Record<string, unknown>[];
  data(name: string, values: unknown): PostprocessViewLike;
  runAsync(): Promise<unknown>;
}

// Vega-Lite compiles the raw input table(s) of a view to datasets named
// `source_0`, `source_1`, ... and derived (post-transform) datasets to
// `data_0`, etc. We only ever rewrite the SOURCE tables: enriching a source
// makes Vega's dataflow propagate the new columns down to the derived,
// mark-facing datasets on the next run. Writing a derived dataset directly
// would double its rows (our insert plus the source's propagation), so we
// deliberately skip anything that isn't a `source_*` table.
const SOURCE_DATASET = /^source_/;

// Vega tags every tuple with an enumerable Symbol id, which a `{...spread}`
// would copy. Re-inserting tuples that carry their old ids corrupts the
// changeset (remove + re-insert of the same id), dropping the added fields.
// Round-tripping through entries strips Symbol keys, yielding clean rows that
// re-insert as genuinely new tuples.
function stripVegaInternals(d: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(d));
}

/**
 * General data-postprocessing step for a Vega view backing a Vega-Lite chart.
 * Enriches the view's source datasets in place, then re-runs the view once so
 * the new columns propagate to the derived, mark-facing datasets.
 *
 * Takes only the view — dataset names are discovered from the view's runtime
 * data registry, so this works whether the caller compiled the spec themselves
 * or got the view from vega-embed, with no vega/VL dependency in this package.
 *
 * Today it performs US-geo (FIPS) enrichment: any source dataset whose `id`
 * field looks like FIPS codes gains `county_name` / `state_name` / `region`
 * columns, so VL selection predicates referencing those fields match rows on
 * the chart. Add further enrichment by editing the body — the signature stays
 * stable for downstream consumers.
 */
export async function postprocessViewData(view: PostprocessViewLike): Promise<void> {
  // `_runtime.data` is the canonical registry of every named dataset; it is
  // exactly what `view.data(name)` reads from. We filter to source tables.
  const registry =
    (view as unknown as { _runtime?: { data?: Record<string, unknown> } })._runtime?.data ?? {};

  let changed = false;
  for (const name of Object.keys(registry)) {
    if (!SOURCE_DATASET.test(name)) continue;
    try {
      const rows = view.data(name);
      // --- geo enrichment (extend here later) ---
      if (rows?.length && looksLikeFips(rows, 'id')) {
        view.data(name, enrichWithUSGeo(rows, 'id').map(stripVegaInternals));
        changed = true;
      }
    } catch {
      /* dataset may not be queryable — skip it */
    }
  }

  if (changed) await view.runAsync();
}
