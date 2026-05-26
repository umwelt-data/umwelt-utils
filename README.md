# @umwelt-data/umwelt-utils

Shared utilities for the [Olli](https://github.com/umwelt-data/olli) and [Umwelt](https://github.com/umwelt-data/umwelt) projects.

## Install

```bash
npm install @umwelt-data/umwelt-utils
```

## Modules

The package is organized as subpath exports:

```ts
import { connectOlliToVegaLite } from '@umwelt-data/umwelt-utils/vl-bridge';
```

| Export | Description |
| --- | --- |
| `./vl-bridge` | Syncs an Olli runtime with a Vega-Lite view (selection highlighting) |
| `./bluefish-bridge` | Highlights SVG elements based on Olli navigation focus |
| `./predicate` | Selection predicate types, logical composition, and evaluation |
| `./data` | Data-value types (`MeasureType`, `Datum`, `Dataset`) and type coercion |
| `./vega` | Compute axis tick values from data and encoding config |
| `./description` | Format values and describe fields for human-readable text |

`vega` and `vega-lite` are expected to be present in the host app; they are not bundled so this package works with any embed pipeline.

## Development

```bash
pnpm install
pnpm typecheck
pnpm test            # single run
pnpm test:watch      # watch mode
pnpm build
```

CI (GitHub Actions) runs typecheck, test, and build on every push to `main` and on pull requests.

To publish: `pnpm publish` (the `prepublishOnly` script runs typecheck + test + build automatically).

## License

BSD-3-Clause.
