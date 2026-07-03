declare module 'vega-statistics' {
  export function bin(options: Record<string, unknown>): { start: number; stop: number; step: number };
}
