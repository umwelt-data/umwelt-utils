import { scaleLinear, scaleUtc } from 'd3-scale';
import { extent } from 'd3-array';

export interface GuideTicksConfig {
  field: string;
  type: 'quantitative' | 'ordinal' | 'nominal' | 'temporal';
  bin?: boolean;
  timeUnit?: string;
  scaleDomain?: any[];
  scaleZero?: boolean;
  axisSize?: number;
  tickCount?: number;
  tickValues?: any[];
}

const VL_DEFAULT_SIZE = 200;
const PIXELS_PER_TICK = 40;

export function computeGuideTicks(
  data: Record<string, any>[],
  config: GuideTicksConfig,
): any[] | undefined {
  if (config.tickValues) return config.tickValues;

  const { field, type, bin, timeUnit, scaleDomain, scaleZero, axisSize, tickCount: explicitCount } = config;
  const size = axisSize ?? VL_DEFAULT_SIZE;
  const values = data.map((d) => d[field]).filter((v) => v != null);
  if (values.length === 0) return undefined;

  switch (type) {
    case 'nominal':
    case 'ordinal': {
      const seen = new Set<any>();
      const unique: any[] = [];
      for (const v of values) {
        if (!seen.has(v)) {
          seen.add(v);
          unique.push(v);
        }
      }
      return unique;
    }

    case 'quantitative': {
      if (bin) {
        const starts = [...new Set(values.map(Number))].sort((a, b) => a - b);
        const endField = field + '_end';
        const ends = data.filter((d) => d[field] != null && d[endField] != null).map((d) => Number(d[endField]));
        if (ends.length) {
          const lastEnd = Math.max(...ends);
          if (!starts.includes(lastEnd)) starts.push(lastEnd);
        }
        return starts;
      }

      const nums = values.map(Number).filter((n) => !isNaN(n));
      if (nums.length === 0) return undefined;
      const [dataMin, dataMax] = extent(nums) as [number, number];
      let domMin = dataMin;
      let domMax = dataMax;

      if (scaleDomain) {
        domMin = scaleDomain[0];
        domMax = scaleDomain[1];
      } else if (scaleZero !== false) {
        domMin = Math.min(0, domMin);
        domMax = Math.max(0, domMax);
      }

      const count = explicitCount ?? Math.ceil(size / PIXELS_PER_TICK);
      return scaleLinear().domain([domMin, domMax]).nice(count).ticks(count);
    }

    case 'temporal': {
      const dates = values.map((v) => (v instanceof Date ? v : new Date(v)));
      const [minDate, maxDate] = extent(dates) as [Date, Date];

      const domain = scaleDomain ? scaleDomain.map((v: any) => new Date(v)) : [minDate, maxDate];
      const count = explicitCount ?? Math.ceil(size / PIXELS_PER_TICK);
      return scaleUtc().domain(domain).nice(count).ticks(count);
    }

    default:
      return undefined;
  }
}
