import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { catalogTestMedia, generateCatalogTestPng, storeCatalogTestMedia } from '../../../tools/test-seed/catalog-images';
import { parseTestCatalog } from '../../../tools/test-seed/catalog';
import { verifyMediaBytes } from '../../../public-export/media';
import { TestSeedError } from '../../../tools/test-seed/types';

const row = (overrides: Record<string, unknown> = {}) => ({
  test_id: 'vanak-01', item_key: 'test-ui-vanak-coffee', name: 'قهوه (آزمایشی)',
  short_description: 'شرح آزمایشی', price_amount: 85_000, price_currency: 'IRR', on_request: false,
  grouping_label: 'نوشیدنی', display_order: 1, images: [{ alt_text: 'تصویر آزمایشی' }], ...overrides,
});
const code = (value: unknown) => {
  try { parseTestCatalog(value); return 'OK'; } catch (error) { return error instanceof TestSeedError ? error.code : 'WRONG_ERROR'; }
};

describe('K6a deterministic test catalog images', () => {
  test.each([
    ['test-ui-vanak-a', 0, 'c9bd7bdd7300698c215fdc3b7941386a25fe3da2017ee0fdf0d0c8bda563c5f4'],
    ['test-ui-vanak-b', 3, 'd9301c07efc5da81e8b38cc682e64b6086953fb48fb2a54a8448824236576c22'],
  ])('fixed SHA-256 for %s:%i', (key, index, expected) => {
    const first = generateCatalogTestPng(key, index);
    expect(generateCatalogTestPng(key, index)).toEqual(first);
    expect(createHash('sha256').update(first).digest('hex')).toBe(expected);
  });
  test('PNG is accepted by the public-export verifier and contains a visible TEST bitmap band', () => {
    const bytes = generateCatalogTestPng('test-ui-vanak-coffee', 0);
    const media = catalogTestMedia(bytes, 0, 'تصویر آزمایشی');
    expect(() => verifyMediaBytes(bytes, media)).not.toThrow();
    let dark = 0;
    const inflated = require('node:zlib').inflateSync(extractIdat(bytes)) as Buffer;
    for (let y = 282; y < 317; y++) for (let x = 328; x < 460; x++) {
      const at = y * (800 * 3 + 1) + 1 + x * 3;
      if (inflated[at] === 0 && inflated[at + 1] === 0 && inflated[at + 2] === 0) dark++;
    }
    expect(dark).toBeGreaterThan(500);
  });
  test('write-once accepts equal bytes and rejects a poisoned existing hash path', async () => {
    const store = await mkdtemp(path.join(tmpdir(), 'mlino-k6a-'));
    try {
      const bytes = generateCatalogTestPng('test-ui-vanak-write', 0);
      const media = catalogTestMedia(bytes, 0, 'آزمایشی');
      await storeCatalogTestMedia(store, bytes, media);
      await storeCatalogTestMedia(store, bytes, media);
      expect(await readFile(path.join(store, ...media.path.split('/')))).toEqual(bytes);
      const poison = generateCatalogTestPng('test-ui-vanak-poison', 0);
      const poisonMedia = catalogTestMedia(poison, 0, 'آزمایشی');
      const destination = path.join(store, ...poisonMedia.path.split('/'));
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, 'poison');
      await expect(storeCatalogTestMedia(store, poison, poisonMedia)).rejects.toMatchObject({ code: 'TEST_SEED_MEDIA_POISONED' });
    } finally { await rm(store, { recursive: true, force: true }); }
  });
});

describe('K6a strict catalog parser', () => {
  test('accepts Vanak and demo rows matching the external input shape', () => {
    expect(parseTestCatalog([row(), row({ test_id: 'demo-01', item_key: 'test-ui-vanak-demo' })])).toHaveLength(2);
  });
  test.each([
    ['unknown', [row({ extra: true })], 'TEST_SEED_CATALOG_SHAPE'],
    ['id', [row({ test_id: 'other-01' })], 'TEST_SEED_CATALOG_TEST_ID'],
    ['prefix', [row({ item_key: 'other' })], 'TEST_SEED_CATALOG_KEY'],
    ['marker', [row({ name: 'قهوه' })], 'TEST_SEED_CATALOG_NAME'],
    ['price missing', [row({ on_request: false, price_amount: null, price_currency: null })], 'TEST_SEED_CATALOG_PRICE_MODE'],
    ['price on request', [row({ on_request: true })], 'TEST_SEED_CATALOG_PRICE_MODE'],
    ['images', [row({ images: Array.from({ length: 9 }, () => ({ alt_text: 'x' })) })], 'TEST_SEED_CATALOG_IMAGES'],
  ])('%s rejects with fixed code', (_name, input, expected) => expect(code(input)).toBe(expected));
});

function extractIdat(png: Buffer): Buffer {
  const chunks: Buffer[] = [];
  for (let at = 8; at < png.length;) {
    const length = png.readUInt32BE(at), kind = png.toString('ascii', at + 4, at + 8);
    if (kind === 'IDAT') chunks.push(png.subarray(at + 8, at + 8 + length));
    at += 12 + length;
  }
  return Buffer.concat(chunks);
}
