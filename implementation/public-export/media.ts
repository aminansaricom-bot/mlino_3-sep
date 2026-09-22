import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export type CatalogMedia = {
  position: number; path: string; sha256: string;
  media_type: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/avif';
  byte_size: number; width: number; height: number; alt_text: string;
  placeholder: null | { schema_version: string; value: string };
};

const EXT: Record<CatalogMedia['media_type'], string> = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/avif': 'avif',
};
function fail(code: string): never { throw new Error(code); }
function inside(parent: string, child: string): boolean {
  const rel = path.relative(parent, child);
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel));
}
function repository(): string {
  return path.resolve(__dirname, path.basename(path.resolve(__dirname, '..')) === 'dist' ? '../../..' : '../..');
}
export function mediaPath(meta: CatalogMedia): string {
  if (!/^[0-9a-f]{64}$/.test(meta.sha256) || !Object.prototype.hasOwnProperty.call(EXT, meta.media_type)) fail('CATALOG_MEDIA_METADATA');
  const expected = `media/sha256/${meta.sha256.slice(0, 2)}/${meta.sha256}.${EXT[meta.media_type]}`;
  if (meta.path !== expected) fail('CATALOG_MEDIA_PATH');
  return expected;
}
export async function validateMediaStore(store: string): Promise<string> {
  if (!path.isAbsolute(store)) fail('CATALOG_MEDIA_STORE');
  const resolved = await fs.realpath(store).catch(() => fail('CATALOG_MEDIA_STORE'));
  const stat = await fs.lstat(store);
  if (!stat.isDirectory() || stat.isSymbolicLink() || inside(repository(), resolved)) fail('CATALOG_MEDIA_STORE');
  return resolved;
}
function dimensions(bytes: Buffer, type: CatalogMedia['media_type']): [number, number] {
  if (type === 'image/png') {
    if (bytes.length < 24 || !bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')) || bytes.toString('ascii', 12, 16) !== 'IHDR') fail('CATALOG_MEDIA_TYPE');
    for (let i = 8; i + 12 <= bytes.length;) {
      const length = bytes.readUInt32BE(i);
      if (i + 12 + length > bytes.length) fail('CATALOG_MEDIA_TYPE');
      if (bytes.toString('ascii', i + 4, i + 8) === 'acTL') fail('CATALOG_MEDIA_ANIMATED');
      i += 12 + length;
    }
    return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
  }
  if (type === 'image/jpeg') {
    if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) fail('CATALOG_MEDIA_TYPE');
    for (let i = 2; i + 4 < bytes.length;) {
      if (bytes[i] !== 0xff) fail('CATALOG_MEDIA_TYPE');
      while (bytes[i] === 0xff) i++;
      const marker = bytes[i++];
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (i + 2 > bytes.length) break;
      const length = bytes.readUInt16BE(i);
      if (length < 2 || i + length > bytes.length) fail('CATALOG_MEDIA_TYPE');
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        if (length < 7) fail('CATALOG_MEDIA_TYPE');
        return [bytes.readUInt16BE(i + 5), bytes.readUInt16BE(i + 3)];
      }
      i += length;
    }
    fail('CATALOG_MEDIA_TYPE');
  }
  if (type === 'image/webp') {
    if (bytes.length < 30 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP') fail('CATALOG_MEDIA_TYPE');
    if (bytes.readUInt32LE(4) + 8 !== bytes.length) fail('CATALOG_MEDIA_TYPE');
    const chunk = bytes.toString('ascii', 12, 16);
    for (let offset = 12; offset < bytes.length;) {
      if (offset + 8 > bytes.length) fail('CATALOG_MEDIA_TYPE');
      const name = bytes.toString('ascii', offset, offset + 4);
      const length = bytes.readUInt32LE(offset + 4);
      const end = offset + 8 + length;
      if (end > bytes.length) fail('CATALOG_MEDIA_TYPE');
      if (name === 'ANIM' || (name === 'VP8X' && length > 0 && (bytes[offset + 8] & 0x02))) fail('CATALOG_MEDIA_ANIMATED');
      offset = end + (length % 2);
    }
    if (chunk === 'VP8X') {
      if (bytes[20] & 0x02) fail('CATALOG_MEDIA_ANIMATED');
      return [1 + bytes.readUIntLE(24, 3), 1 + bytes.readUIntLE(27, 3)];
    }
    if (chunk === 'VP8L') {
      if (bytes[20] !== 0x2f) fail('CATALOG_MEDIA_TYPE');
      return [1 + (((bytes[22] & 0x3f) << 8) | bytes[21]), 1 + (((bytes[24] & 0x0f) << 10) | (bytes[23] << 2) | ((bytes[22] & 0xc0) >> 6))];
    }
    if (chunk === 'VP8 ' && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) return [bytes.readUInt16LE(26) & 0x3fff, bytes.readUInt16LE(28) & 0x3fff];
    fail('CATALOG_MEDIA_TYPE');
  }
  let foundFtyp = false;
  let foundIspe: [number, number] | null = null;
  function boxes(start: number, end: number, parent = ''): void {
    for (let offset = start; offset < end;) {
      if (offset + 8 > end) fail('CATALOG_MEDIA_TYPE');
      const size = bytes.readUInt32BE(offset);
      const type = bytes.toString('ascii', offset + 4, offset + 8);
      if (size < 8 || offset + size > end) fail('CATALOG_MEDIA_TYPE');
      if (type === 'ftyp' && parent === '') {
        if (size < 16 || bytes.toString('ascii', offset + 8, offset + 12) !== 'avif') fail('CATALOG_MEDIA_TYPE');
        for (let brand = offset + 16; brand + 4 <= offset + size; brand += 4) {
          if (bytes.toString('ascii', brand, brand + 4) === 'avis') fail('CATALOG_MEDIA_ANIMATED');
        }
        foundFtyp = true;
      }
      if (type === 'ispe' && parent === 'ipco') {
        if (size !== 20 || foundIspe) fail('CATALOG_MEDIA_TYPE');
        foundIspe = [bytes.readUInt32BE(offset + 12), bytes.readUInt32BE(offset + 16)];
      }
      if (type === 'meta' || type === 'iprp' || type === 'ipco') {
        const inner = offset + 8 + (type === 'meta' ? 4 : 0);
        if (inner > offset + size) fail('CATALOG_MEDIA_TYPE');
        boxes(inner, offset + size, type);
      }
      offset += size;
    }
  }
  boxes(0, bytes.length);
  if (!foundFtyp || !foundIspe) fail('CATALOG_MEDIA_TYPE');
  return foundIspe;
}
export function verifyMediaBytes(bytes: Buffer, meta: CatalogMedia): void {
  mediaPath(meta);
  if (!Number.isInteger(meta.byte_size) || bytes.length !== meta.byte_size || bytes.length < 1 || bytes.length > 1_500_000) fail('CATALOG_MEDIA_SIZE');
  if (createHash('sha256').update(bytes).digest('hex') !== meta.sha256) fail('CATALOG_MEDIA_HASH');
  const [width, height] = dimensions(bytes, meta.media_type);
  if (width !== meta.width || height !== meta.height || width < 320 || width > 4096 || height < 320 || height > 4096 || width * height > 16_000_000) fail('CATALOG_MEDIA_DIMENSIONS');
}
export async function readVerifiedMedia(store: string, meta: CatalogMedia): Promise<Buffer> {
  const base = await validateMediaStore(store);
  const rel = mediaPath(meta);
  const absolute = path.join(base, ...rel.split('/'));
  if (!inside(base, absolute)) fail('CATALOG_MEDIA_PATH');
  let current = base;
  for (const component of rel.split('/')) {
    current = path.join(current, component);
    const stat = await fs.lstat(current).catch(() => fail('CATALOG_MEDIA_MISSING'));
    if (stat.isSymbolicLink()) fail('CATALOG_MEDIA_PATH');
    if (current !== absolute && !stat.isDirectory()) fail('CATALOG_MEDIA_PATH');
    if (current === absolute && (!stat.isFile() || stat.size > 1_500_000)) fail('CATALOG_MEDIA_SIZE');
  }
  const bytes = await fs.readFile(absolute);
  verifyMediaBytes(bytes, meta);
  return bytes;
}
