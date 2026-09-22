import type { CatalogMedia } from './catalog';

const CAP = 1_500_000;
const CACHE_NAME = 'mlino-catalog-verified-v1';
function invalid(): never { throw new Error('CATALOG_MEDIA_INVALID'); }
function ascii(bytes: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...bytes.subarray(start, end));
}
function be16(b: Uint8Array, i: number): number { return (b[i] << 8) | b[i + 1]; }
function be32(b: Uint8Array, i: number): number { return ((b[i] * 0x1000000) + (b[i + 1] << 16) + (b[i + 2] << 8) + b[i + 3]) >>> 0; }
function le16(b: Uint8Array, i: number): number { return b[i] | (b[i + 1] << 8); }
function le32(b: Uint8Array, i: number): number { return (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0; }

export function catalogMediaDimensions(bytes: Uint8Array, type: CatalogMedia['media_type']): [number, number] {
  if (type === 'image/png') {
    if (bytes.length < 24 || ascii(bytes, 0, 8) !== '\x89PNG\r\n\x1a\n' || ascii(bytes, 12, 16) !== 'IHDR') invalid();
    for (let i = 8; i + 12 <= bytes.length;) {
      const n = be32(bytes, i);
      if (i + 12 + n > bytes.length) invalid();
      if (ascii(bytes, i + 4, i + 8) === 'acTL') invalid();
      i += 12 + n;
    }
    return [be32(bytes, 16), be32(bytes, 20)];
  }
  if (type === 'image/jpeg') {
    if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) invalid();
    for (let i = 2; i + 4 < bytes.length;) {
      if (bytes[i] !== 0xff) invalid();
      while (bytes[i] === 0xff) i++;
      const marker = bytes[i++];
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (i + 2 > bytes.length) break;
      const n = be16(bytes, i);
      if (n < 2 || i + n > bytes.length) invalid();
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        if (n < 7) invalid();
        return [be16(bytes, i + 5), be16(bytes, i + 3)];
      }
      i += n;
    }
    invalid();
  }
  if (type === 'image/webp') {
    if (bytes.length < 30 || ascii(bytes, 0, 4) !== 'RIFF' || ascii(bytes, 8, 12) !== 'WEBP' || le32(bytes, 4) + 8 !== bytes.length) invalid();
    const first = ascii(bytes, 12, 16);
    for (let i = 12; i < bytes.length;) {
      if (i + 8 > bytes.length) invalid();
      const kind = ascii(bytes, i, i + 4), n = le32(bytes, i + 4);
      if (i + 8 + n > bytes.length) invalid();
      if (kind === 'ANIM' || (kind === 'VP8X' && n > 0 && (bytes[i + 8] & 2))) invalid();
      i += 8 + n + n % 2;
    }
    if (first === 'VP8X') return [1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16),
      1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16)];
    if (first === 'VP8L' && bytes[20] === 0x2f) return [1 + (((bytes[22] & 0x3f) << 8) | bytes[21]),
      1 + (((bytes[24] & 0x0f) << 10) | (bytes[23] << 2) | ((bytes[22] & 0xc0) >> 6))];
    if (first === 'VP8 ' && bytes[23] === 0x9d && bytes[24] === 1 && bytes[25] === 0x2a) return [le16(bytes, 26) & 0x3fff, le16(bytes, 28) & 0x3fff];
    invalid();
  }
  if (type !== 'image/avif') invalid();
  let brand = false; let dimensions: [number, number] | null = null;
  const boxes = (start: number, end: number, parent = ''): void => {
    for (let i = start; i < end;) {
      if (i + 8 > end) invalid();
      const n = be32(bytes, i), kind = ascii(bytes, i + 4, i + 8);
      if (n < 8 || i + n > end) invalid();
      if (kind === 'ftyp' && parent === '') {
        if (n < 16 || ascii(bytes, i + 8, i + 12) !== 'avif') invalid();
        for (let j = i + 16; j + 4 <= i + n; j += 4) if (ascii(bytes, j, j + 4) === 'avis') invalid();
        brand = true;
      }
      if (kind === 'ispe' && parent === 'ipco') {
        if (n !== 20 || dimensions) invalid();
        dimensions = [be32(bytes, i + 12), be32(bytes, i + 16)];
      }
      if (kind === 'meta' || kind === 'iprp' || kind === 'ipco') boxes(i + 8 + (kind === 'meta' ? 4 : 0), i + n, kind);
      i += n;
    }
  };
  boxes(0, bytes.length);
  if (!brand || !dimensions) invalid();
  return dimensions;
}

export async function verifyCatalogMediaBytes(bytes: Uint8Array, media: CatalogMedia): Promise<void> {
  if (bytes.length < 1 || bytes.length > CAP || bytes.length !== media.byte_size) invalid();
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(bytes) as BufferSource));
  const hex = Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');
  if (hex !== media.sha256) invalid();
  const [width, height] = catalogMediaDimensions(bytes, media.media_type);
  if (width !== media.width || height !== media.height || width < 320 || width > 4096 || height < 320 || height > 4096 || width * height > 16_000_000) invalid();
}

async function readCapped(response: Response): Promise<Uint8Array> {
  if (!response.ok || !response.body) invalid();
  const length = response.headers.get('content-length');
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > CAP)) invalid();
  const reader = response.body.getReader(); const parts: Uint8Array[] = []; let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > CAP) { await reader.cancel(); invalid(); }
      parts.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.length; }
  return bytes;
}

export type MediaLoadResult = { url: string; alt: string } | { url: null; alt: string };
export async function loadCatalogMedia(media: CatalogMedia, fetcher: typeof fetch = fetch): Promise<MediaLoadResult> {
  const relative = `media/sha256/${media.sha256.slice(0, 2)}/${media.sha256}.${{ 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/avif': 'avif' }[media.media_type]}`;
  if (media.path !== relative) return { url: null, alt: media.alt_text };
  const url = `/public-export/${relative}`;
  let cache: Cache | null = null;
  try { if (typeof caches !== 'undefined') cache = await caches.open(CACHE_NAME); } catch { /* Cache is optional. */ }
  const request = cache ? new Request(new URL(url, globalThis.location?.href ?? 'https://mlino.invalid').href, { method: 'GET' }) : null;
  if (cache && request) {
    try {
      const hit = await cache.match(request);
      if (hit) {
        const bytes = await readCapped(hit);
        await verifyCatalogMediaBytes(bytes, media);
        return { url: URL.createObjectURL(new Blob([new Uint8Array(bytes) as BlobPart], { type: media.media_type })), alt: media.alt_text };
      }
    } catch { try { await cache.delete(request); } catch { /* Fail closed. */ } }
  }
  try {
    const response = await fetcher(url, { cache: 'no-store' });
    const bytes = await readCapped(response);
    await verifyCatalogMediaBytes(bytes, media);
    if (cache && request) try { await cache.put(request, new Response(new Uint8Array(bytes) as BodyInit, { headers: { 'content-type': media.media_type } })); } catch { /* Cache is optional. */ }
    return { url: URL.createObjectURL(new Blob([new Uint8Array(bytes) as BlobPart], { type: media.media_type })), alt: media.alt_text };
  } catch { return { url: null, alt: media.alt_text }; }
}
