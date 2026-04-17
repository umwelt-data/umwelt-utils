# @umwelt-data/umwelt-utils

Shared utilities for the [Olli](https://github.com/umwelt-data/olli) and [Umwelt](https://github.com/umwelt-data/umwelt) projects.

The first module is **`vl-bridge`** — glue that syncs an [olli-js](https://www.npmjs.com/package/olli-js) runtime with a [Vega-Lite](https://vega.github.io/vega-lite/) view, so that navigating an Olli tree visibly highlights the matching data on the chart.

## Install

```bash
npm install @umwelt-data/umwelt-utils
```

`vega` and `vega-lite` are expected to be present in the host app; they are not declared as dependencies so this package can also be used with a custom embed pipeline.

## Usage — `vl-bridge`

```ts
import { olli } from 'olli-js';
import * as vega from 'vega';
import { compile } from 'vega-lite';
import { withExternalStateParam, connectOlliToVegaLite } from '@umwelt-data/umwelt-utils';

// 1. Inject the interval param the bridge writes to.
const spec = withExternalStateParam(myVlSpec);

// 2. Compile + render the chart.
const { spec: vgSpec } = compile(spec);
const view = await new vega.View(vega.parse(vgSpec), { renderer: 'svg' })
  .initialize(chartContainer)
  .runAsync();

// 3. Mount Olli.
const handle = olli(graph, treeContainer);

// 4. Wire them together. Returns a cleanup fn.
const dispose = connectOlliToVegaLite(handle, view);

// Later, on unmount:
dispose();
handle.destroy();
view.finalize();
```

The bridge subscribes to `handle.onSelectionChange`, converts the Olli selection predicate to a Vega-Lite selection-store tuple, and writes it to the view's `external_state_store` data source. `withExternalStateParam` adds the matching `external_state` interval param to the spec so the store exists on the compiled view.

### Options

```ts
connectOlliToVegaLite(handle, view, {
  storeName: 'my_store',        // default: 'external_state_store'
  onError: (e) => reportSomewhere(e),
});
```

### Lower-level helpers

If you have your own plumbing and just need the predicate ↔ store conversion:

```ts
import { predicateToSelectionStore, selectionStoreToSelection } from '@umwelt-data/umwelt-utils';

const tuple = predicateToSelectionStore(olliSelection);
view.data('my_store', tuple ? [tuple] : []).run();

// Going the other way, from a brush store back to a predicate:
view.addDataListener('brush_store', (_, store) => {
  const predicate = selectionStoreToSelection(store);
  // ... push into your app state
});
```

## Status

Pre-1.0. The `vl-bridge` surface is stable; predicate types will migrate to a shared module once a second consumer appears.

## Development

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

Publishing is automated: push a `v*.*.*` tag whose version matches `package.json`, and the `publish` workflow runs the test suite and publishes to npm.

## License

BSD-3-Clause.
