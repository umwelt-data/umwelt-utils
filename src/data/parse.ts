import Papa from 'papaparse';

export function inferFormatFromUrl(url: string): string {
  if (url.endsWith('.tsv')) return 'tsv';
  if (url.endsWith('.csv')) return 'csv';
  return 'json';
}

export function parseDelimited(text: string, format?: string): any[] {
  const result = Papa.parse(text, {
    delimiter: format === 'tsv' ? '\t' : undefined,
    header: true,
    dynamicTyping: true,
    skipEmptyLines: 'greedy',
  });
  return result.data as any[];
}

export function parseCsv(text: string): any[] {
  return parseDelimited(text, 'csv');
}

export function parseTsv(text: string): any[] {
  return parseDelimited(text, 'tsv');
}

/**
 * Fetch a dataset URL and parse it by format (explicit `format.type`, else
 * inferred from the extension). json/topojson parse as JSON; csv/tsv parse
 * with headers and dynamic typing.
 */
export async function fetchAndParse(url: string, format?: { type?: string }): Promise<any> {
  const response = await fetch(url);
  const text = await response.text();
  const fmt = format?.type || inferFormatFromUrl(url);

  if (fmt === 'topojson' || fmt === 'json') {
    return JSON.parse(text);
  }
  return parseDelimited(text, fmt);
}
