import { createHash } from 'node:crypto';

function compareScalars(left: string, right: string): number {
  const a = Array.from(left, (char) => char.codePointAt(0)!);
  const b = Array.from(right, (char) => char.codePointAt(0)!);
  for (let i = 0; i < Math.min(a.length, b.length); i += 1) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return a.length - b.length;
}

function normalizedString(value: string): string {
  if (/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(value)) {
    throw new Error('PUBLIC_EXPORT_INVALID_UNICODE');
  }
  return value.normalize('NFC');
}

function serialize(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'string') return JSON.stringify(normalizedString(value));
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('PUBLIC_EXPORT_INVALID_NUMBER');
    if (Object.is(value, -0)) return '0';
    if (Number.isInteger(value)) {
      if (!Number.isSafeInteger(value)) throw new Error('PUBLIC_EXPORT_UNSAFE_INTEGER');
      return value.toString(10);
    }
    const fixed = value.toFixed(6);
    if (Number(fixed) !== value) throw new Error('PUBLIC_EXPORT_NUMBER_PRECISION');
    return fixed.replace(/0+$/, '').replace(/\.$/, '');
  }
  if (Array.isArray(value)) return `[${value.map(serialize).join(',')}]`;
  if (typeof value === 'object') {
    const object = value as Record<string, unknown>;
    const entries = Object.keys(object).map((key) => ({ key: normalizedString(key), value: object[key] }));
    entries.sort((a, b) => compareScalars(a.key, b.key));
    if (new Set(entries.map((entry) => entry.key)).size !== entries.length) throw new Error('PUBLIC_EXPORT_DUPLICATE_KEY');
    return `{${entries.map(({ key, value }) => {
      if (value === undefined) throw new Error('PUBLIC_EXPORT_UNDEFINED_VALUE');
      return `${serialize(key)}:${serialize(value)}`;
    }).join(',')}}`;
  }
  throw new Error('PUBLIC_EXPORT_UNSUPPORTED_VALUE');
}

export function canonicalBytes(value: unknown): Buffer {
  return Buffer.from(serialize(value), 'utf8');
}

export function snapshotId(contractVersion: string, records: unknown[]): string {
  return `sha256:${createHash('sha256').update(canonicalBytes({ contract_version: contractVersion, records })).digest('hex')}`;
}

export function utcTimestamp(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error('PUBLIC_EXPORT_INVALID_TIMESTAMP');
  return date.toISOString();
}
