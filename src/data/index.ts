export type { MeasureType, DataValue, Datum, Dataset, FieldSpec } from './types.js';
export { isNumeric, typeCoerceData } from './coerce.js';
export { typeInference } from './typeInference.js';
export { getDomain, type DomainFieldDef } from './domain.js';
export { serializeValue } from './serialize.js';
export { inferFormatFromUrl, parseDelimited, parseCsv, parseTsv, fetchAndParse } from './parse.js';
