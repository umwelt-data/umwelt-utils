import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/vl-bridge/index.ts', 'src/bluefish-bridge/index.ts', 'src/data/index.ts', 'src/vega/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  target: 'es2020',
  external: ['bluefish-js'],
});
