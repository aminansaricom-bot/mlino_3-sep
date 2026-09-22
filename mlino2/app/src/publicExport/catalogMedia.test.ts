import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CatalogMedia } from './catalog';
import { catalogMediaDimensions, loadCatalogMedia, verifyCatalogMediaBytes } from './catalogMedia';
import { swipeIndex } from './catalogArStack';
import { visiblePlusNext } from './catalogCards';

function png(): Uint8Array {
  const bytes = new Uint8Array(45);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  bytes[11] = 13; bytes.set([73, 72, 68, 82], 12);
  bytes.set([0, 0, 3, 32, 0, 0, 2, 88], 16); // 800 x 600
  return bytes;
}
async function meta(bytes: Uint8Array): Promise<CatalogMedia> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes as BufferSource));
  const sha256 = Array.from(digest, (b) => b.toString(16).padStart(2, '0')).join('');
  return { position: 0, path: `media/sha256/${sha256.slice(0, 2)}/${sha256}.png`, sha256,
    media_type: 'image/png', byte_size: bytes.length, width: 800, height: 600,
    alt_text: 'تصویر آزمایشی', placeholder: null };
}
afterEach(() => vi.unstubAllGlobals());

describe('verified catalog media', () => {
  it('checks hash, size, declared type and header dimensions before a blob is shown', async () => {
    const bytes = png(), media = await meta(bytes);
    await expect(verifyCatalogMediaBytes(bytes, media)).resolves.toBeUndefined();
    await expect(verifyCatalogMediaBytes(new Uint8Array([...bytes.slice(0, -1), 1]), media)).rejects.toThrow('CATALOG_MEDIA_INVALID');
    await expect(verifyCatalogMediaBytes(bytes, { ...media, byte_size: bytes.length - 1 })).rejects.toThrow('CATALOG_MEDIA_INVALID');
    await expect(verifyCatalogMediaBytes(bytes, { ...media, media_type: 'image/jpeg' })).rejects.toThrow('CATALOG_MEDIA_INVALID');
    await expect(verifyCatalogMediaBytes(bytes, { ...media, width: 801 })).rejects.toThrow('CATALOG_MEDIA_INVALID');
    await expect(loadCatalogMedia({ ...media, path: '../bad' }, vi.fn() as typeof fetch)).resolves.toEqual({ url: null, alt: media.alt_text });
  });

  it('rejects animation chunks and accepts ANIM text only when it is payload data', () => {
    const base = png();
    const animatedPng = new Uint8Array([...base.slice(0, 33), 0, 0, 0, 0, 97, 99, 84, 76, ...base.slice(33)]);
    expect(() => catalogMediaDimensions(animatedPng, 'image/png')).toThrow('CATALOG_MEDIA_INVALID');
    const webp = new Uint8Array(30);
    webp.set(new TextEncoder().encode('RIFF'), 0); webp[4] = 22;
    webp.set(new TextEncoder().encode('WEBPVP8X'), 8); webp[16] = 10;
    webp[25] = 3; webp[28] = 2; // 769 x 513
    expect(catalogMediaDimensions(webp, 'image/webp')).toEqual([769, 513]);
    webp[20] = 2;
    expect(() => catalogMediaDimensions(webp, 'image/webp')).toThrow('CATALOG_MEDIA_INVALID');
  });

  it('deletes a poisoned cache entry and shows only freshly verified bytes', async () => {
    const bytes = png(), media = await meta(bytes);
    const deleted = vi.fn(async () => true);
    vi.stubGlobal('caches', { open: async () => ({ match: async () => new Response(new Uint8Array([1, 2, 3])), delete: deleted, put: vi.fn() }) });
    const createObjectURL = vi.fn(() => 'blob:verified-test');
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL }));
    const fetcher = vi.fn(async () => new Response(new Uint8Array(bytes)));
    expect(await loadCatalogMedia(media, fetcher as typeof fetch)).toEqual({ url: 'blob:verified-test', alt: media.alt_text });
    expect(deleted).toHaveBeenCalledOnce();
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('returns a neutral placeholder when streaming exceeds the cap', async () => {
    const media = await meta(png());
    const fetcher = vi.fn(async () => new Response(new Uint8Array(1_500_001)));
    expect(await loadCatalogMedia(media, fetcher as typeof fetch)).toEqual({ url: null, alt: media.alt_text });
  });

  it('keeps the neutral frame on hash, declared type, animation and dimension failures', async () => {
    const bytes = png(), base = await meta(bytes);
    const animated = new Uint8Array([...bytes.slice(0, 33), 0, 0, 0, 0, 97, 99, 84, 76, ...bytes.slice(33)]);
    const animatedMeta = await meta(animated);
    const cases: Array<{ bytes: Uint8Array; media: CatalogMedia }> = [
      { bytes: new Uint8Array([...bytes.slice(0, -1), 1]), media: base },
      { bytes, media: { ...base, media_type: 'image/jpeg', path: base.path.replace(/\.png$/, '.jpg') } },
      { bytes: animated, media: animatedMeta },
      { bytes, media: { ...base, width: 801 } },
    ];
    for (const { bytes: candidate, media } of cases) {
      const fetcher = vi.fn(async () => new Response(new Uint8Array(candidate)));
      expect(await loadCatalogMedia(media, fetcher as typeof fetch)).toEqual({ url: null, alt: media.alt_text });
    }
  });
});

describe('catalog presentation order', () => {
  it('loads only visible cards and their immediate successor', () => {
    expect(visiblePlusNext([1, 3], 5)).toEqual([1, 2, 3, 4]);
    expect(visiblePlusNext([], 3)).toEqual([]);
  });
  it('bounds swipe and keyboard movement in artifact order', () => {
    expect(swipeIndex(0, 1, 3)).toBe(1);
    expect(swipeIndex(1, 1, 3)).toBe(2);
    expect(swipeIndex(2, 1, 3)).toBe(2);
    expect(swipeIndex(1, -1, 3)).toBe(0);
  });
});
