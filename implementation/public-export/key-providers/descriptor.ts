import { validateKeyId } from './keyId';

export type DescriptorEntry = {
  key_id: string;
  public_key_raw_base64url: string;
  protected_private_pkcs8_base64: string;
  protection: 'dpapi-current-user';
};
export type KeyStoreDescriptor = {
  format: 'mlino.public-export.keystore.v1';
  active_key_id: string;
  keys: DescriptorEntry[];
};

function object(value: unknown, keys: string[], code: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(code);
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some((key) => !keys.includes(key)) || keys.some((key) => !Object.prototype.hasOwnProperty.call(record, key))) throw new Error(code);
  return record;
}

function decode(value: unknown, encoding: 'base64' | 'base64url', code: string): Buffer {
  if (typeof value !== 'string' || !value || !(encoding === 'base64' ? /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/ : /^[A-Za-z0-9_-]+$/).test(value)) throw new Error(code);
  const bytes = Buffer.from(value, encoding);
  if (bytes.toString(encoding) !== value) throw new Error(code);
  return bytes;
}

export function parseDescriptor(input: string | unknown): KeyStoreDescriptor {
  let value: unknown = input;
  if (typeof input === 'string') {
    try { value = JSON.parse(input); } catch { throw new Error('KEY_DESCRIPTOR_SHAPE'); }
  }
  const root = object(value, ['format', 'active_key_id', 'keys'], 'KEY_DESCRIPTOR_SHAPE');
  if (root.format !== 'mlino.public-export.keystore.v1' || typeof root.active_key_id !== 'string' || !Array.isArray(root.keys)) throw new Error('KEY_DESCRIPTOR_SHAPE');
  if (root.keys.length < 1 || root.keys.length > 2) throw new Error('KEY_DESCRIPTOR_KEY_COUNT');
  const ids = new Set<string>();
  const entries: DescriptorEntry[] = root.keys.map((item) => {
    const entry = object(item, ['key_id', 'public_key_raw_base64url', 'protected_private_pkcs8_base64', 'protection'], 'KEY_DESCRIPTOR_SHAPE');
    if (typeof entry.key_id !== 'string' || entry.protection !== 'dpapi-current-user') throw new Error('KEY_DESCRIPTOR_SHAPE');
    if (ids.has(entry.key_id)) throw new Error('KEY_DESCRIPTOR_DUPLICATE_ID');
    ids.add(entry.key_id);
    const publicBytes = decode(entry.public_key_raw_base64url, 'base64url', 'KEY_DESCRIPTOR_PUBLIC_KEY');
    if (publicBytes.length !== 32) throw new Error('KEY_DESCRIPTOR_PUBLIC_KEY');
    decode(entry.protected_private_pkcs8_base64, 'base64', 'KEY_DESCRIPTOR_PROTECTED_KEY');
    validateKeyId(entry.key_id, publicBytes);
    return entry as DescriptorEntry;
  });
  if (!ids.has(root.active_key_id)) throw new Error('KEY_DESCRIPTOR_ACTIVE_MISSING');
  return { format: 'mlino.public-export.keystore.v1', active_key_id: root.active_key_id, keys: entries };
}
