import { US_STATES, US_COUNTIES } from './us-fips.js';

export type GeoDatum = Record<string, unknown>;
export type GeoDataset = GeoDatum[];

export function enrichWithUSGeo(data: GeoDataset, idField: string): GeoDataset {
  return data.map((d) => {
    const raw = d[idField];
    if (raw == null) return d;
    const id = String(raw).padStart(5, '0');
    const out: GeoDatum = { ...d };

    if (id.length === 5) {
      const county = US_COUNTIES[id];
      if (county) {
        if (out['county'] == null) out['county'] = county.name;
        const state = US_STATES[county.stateFips];
        if (state) {
          if (out['state'] == null) out['state'] = state.name;
          if (out['region'] == null) out['region'] = state.region;
        }
        return out;
      }
    }

    const stateFips = id.length <= 2 ? id.padStart(2, '0') : id.slice(0, 2);
    const state = US_STATES[stateFips];
    if (state) {
      if (out['state'] == null) out['state'] = state.name;
      if (out['region'] == null) out['region'] = state.region;
    }

    return out;
  });
}

// USPS abbreviations -> state FIPS, for data that carries state abbreviations
// (e.g. zipcodes.csv) rather than FIPS ids.
const US_STATE_ABBR_TO_FIPS: Record<string, string> = {
  AL: '01', AK: '02', AZ: '04', AR: '05', CA: '06', CO: '08', CT: '09',
  DE: '10', DC: '11', FL: '12', GA: '13', HI: '15', ID: '16', IL: '17',
  IN: '18', IA: '19', KS: '20', KY: '21', LA: '22', ME: '23', MD: '24',
  MA: '25', MI: '26', MN: '27', MS: '28', MO: '29', MT: '30', NE: '31',
  NV: '32', NH: '33', NJ: '34', NM: '35', NY: '36', NC: '37', ND: '38',
  OH: '39', OK: '40', OR: '41', PA: '42', RI: '44', SC: '45', SD: '46',
  TN: '47', TX: '48', UT: '49', VT: '50', VA: '51', WA: '53', WV: '54',
  WI: '55', WY: '56', AS: '60', GU: '66', MP: '69', PR: '72', VI: '78',
};

let nameToFips: Record<string, string> | undefined;

/**
 * Census region ('Northeast' | 'Midwest' | 'South' | 'West') for a US state
 * given as a USPS abbreviation ('NY') or full name ('New York').
 */
export function regionForUSState(state: string): string | undefined {
  const trimmed = state.trim();
  const byAbbr = US_STATE_ABBR_TO_FIPS[trimmed.toUpperCase()];
  if (byAbbr) return US_STATES[byAbbr]?.region;
  if (!nameToFips) {
    nameToFips = {};
    for (const [fips, s] of Object.entries(US_STATES)) {
      nameToFips[s.name.toLowerCase()] = fips;
    }
  }
  const byName = nameToFips[trimmed.toLowerCase()];
  return byName ? US_STATES[byName]?.region : undefined;
}

export function looksLikeFips(data: GeoDataset, idField: string): boolean {
  if (!data.length) return false;
  const sample = data.slice(0, Math.min(20, data.length));
  return sample.every((d) => {
    const v = d[idField];
    if (v == null) return false;
    const s = String(v);
    return /^\d{1,5}$/.test(s);
  });
}
