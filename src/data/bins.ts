import type { Dataset, DataValue, MeasureType } from './types.js';
import { getDomain } from './domain.js';

export interface BinFieldDef {
  field: string;
  type?: MeasureType;
  bin?: boolean;
}

/**
 * Simple equal-width binning without external dependencies.
 * Approximates vega-statistics bin({maxbins, extent}).
 *
 * When `ticks` are given (e.g. a chart's axis ticks), bins are the intervals
 * between consecutive ticks, so interior bin boundaries always line up with
 * the ticks; intervals wholly outside the data domain are dropped, and the
 * outermost bins are clipped/extended to the data domain so no bin is
 * degenerate.
 */
export function getBins(fieldDef: BinFieldDef, data: Dataset, ticks?: DataValue[]): [number, number][] {
  const field = fieldDef.field;
  const domain = getDomain(fieldDef, data);
  if (domain.length === 0) return [];

  if (fieldDef.bin && field.startsWith('bin_')) {
    // field holds pre-binned starts (vega-lite convention): pair with the ends
    return domain.map((v) => {
      const end = data.find((d) => d[field] === v)?.[field + '_end'];
      return [Number(v), Number(end)] as [number, number];
    });
  }

  let tickValues: number[] | undefined;

  if (ticks) {
    tickValues = ticks.map(Number).filter((n) => !isNaN(n));
  } else if (fieldDef.type === 'temporal') {
    const min = Number(domain[0]);
    const max = Number(domain[domain.length - 1]!);
    const n = 6;
    const step = (max - min) / n;
    tickValues = [];
    for (let i = 0; i <= n; i++) tickValues.push(min + step * i);
  } else {
    const min = Number(domain[0]);
    const max = Number(domain[domain.length - 1]!);
    const step = niceStep(min, max, 10);
    const start = Math.floor(min / step) * step;
    const stop = Math.ceil(max / step) * step;
    tickValues = [];
    for (let v = start; v <= stop + step * 0.001; v += step) tickValues.push(v);
  }

  const domMin = Number(domain[0]);
  const domMax = Number(domain[domain.length - 1]!);

  const bins: [number, number][] = [];
  for (let i = 0; i < tickValues.length - 1; i++) {
    const start = tickValues[i]!;
    const end = tickValues[i + 1]!;
    if (end <= domMin || start >= domMax) continue;
    bins.push([start, end]);
  }
  if (bins.length === 0) return [];
  bins[0]![0] = domMin;
  bins[bins.length - 1]![1] = domMax;
  return bins;
}

function niceStep(min: number, max: number, maxBins: number): number {
  const range = max - min;
  if (range === 0) return 1;
  const rawStep = range / maxBins;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const residual = rawStep / mag;
  let nice: number;
  if (residual <= 1.5) nice = 1;
  else if (residual <= 3) nice = 2;
  else if (residual <= 7) nice = 5;
  else nice = 10;
  return nice * mag;
}
