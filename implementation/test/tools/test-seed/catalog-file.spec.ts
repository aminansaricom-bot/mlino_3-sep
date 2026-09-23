import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { catalogFileMedia, parseTestCatalog } from '../../../tools/test-seed/catalog';
import { generateCatalogTestPng, storeCatalogTestMedia } from '../../../tools/test-seed/catalog-images';

const row = (images: unknown[]) => ({
  test_id: 'demo-07', item_key: 'test-ui-vanak-demo-menu-07-latte', name: 'لاته (آزمایشی)',
  short_description: 'ترکیبی نرم از اسپرسو و شیر گرم.', price_amount: 120000, price_currency: 'IRR',
  on_request: false, grouping_label: 'قهوه', display_order: 10, images,
});
const photo = (over: Record<string, unknown> = {}) => ({ alt_text: 'عکس نمونهٔ لاته', file: 'C:/mlino code/_TEST_DATA/demo_photos/processed/cafe-latte.jpg', width: 1200, height: 900, ...over });

// Smallest JPEG the shared media verifier accepts: SOI, a baseline SOF0 declaring 1200x900, EOI.
function tinyJpeg(width = 1200, height = 900): Buffer {
  const sof = Buffer.from([0xff, 0xc0, 0x00, 0x11, 0x08, height >> 8, height & 255, width >> 8, width & 255, 0x03,
    0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01]);
  return Buffer.concat([Buffer.from([0xff, 0xd8]), sof, Buffer.from([0xff, 0xd9])]);
}

describe('catalog seed: prepared photo files', () => {
  test('accepts generated-image rows and photo-file rows', () => {
    expect(parseTestCatalog([row([{ alt_text: 'تصویر آزمایشی' }])])[0].images).toHaveLength(1);
    expect(parseTestCatalog([row([photo()])])[0].images[0].file).toContain('cafe-latte.jpg');
  });

  test.each([
    ['missing size', { width: undefined }],
    ['relative path', { file: 'demo_photos/cafe-latte.jpg' }],
    ['parent traversal', { file: 'C:/mlino code/_TEST_DATA/../secret/cafe.jpg' }],
    ['unsupported extension', { file: 'C:/mlino code/_TEST_DATA/demo_photos/cafe.gif' }],
    ['non-integer size', { width: 1200.5 }],
  ])('rejects a photo row with %s', (_label, over) => {
    const image = photo(over);
    for (const key of Object.keys(image)) if ((image as Record<string, unknown>)[key] === undefined) delete (image as Record<string, unknown>)[key];
    expect(() => parseTestCatalog([row([image])])).toThrow('TEST_SEED_CATALOG_IMAGES');
  });

  test('rejects an extra key next to a photo', () => {
    expect(() => parseTestCatalog([row([{ ...photo(), caption: 'x' }])])).toThrow('TEST_SEED_CATALOG_IMAGES');
  });

  test('media type comes from the bytes: JPEG -> .jpg, PNG -> .png', () => {
    const jpeg = catalogFileMedia(tinyJpeg(), 0, 'عکس', 1200, 900);
    expect(jpeg.media_type).toBe('image/jpeg');
    expect(jpeg.path).toMatch(/^media\/sha256\/[0-9a-f]{2}\/[0-9a-f]{64}\.jpg$/);
    const png = catalogFileMedia(generateCatalogTestPng('test-ui-vanak-demo-x', 0), 1, 'عکس', 800, 600);
    expect(png.media_type).toBe('image/png');
    expect(png.path.endsWith('.png')).toBe(true);
  });

  test('declared size must match the file header, and non-images are rejected', () => {
    expect(() => catalogFileMedia(tinyJpeg(), 0, 'عکس', 1000, 750)).toThrow();
    expect(() => catalogFileMedia(Buffer.from('not an image at all'), 0, 'عکس', 1200, 900)).toThrow('TEST_SEED_CATALOG_IMAGE_TYPE');
  });

  test('the media store keeps the real extension for a photo', async () => {
    const store = await fs.mkdtemp(path.join(os.tmpdir(), 'mlino-seed-photo-'));
    try {
      const bytes = tinyJpeg();
      const media = catalogFileMedia(bytes, 0, 'عکس', 1200, 900);
      await storeCatalogTestMedia(store, bytes, media);
      const stored = await fs.readFile(path.join(store, ...media.path.split('/')));
      expect(stored.equals(bytes)).toBe(true);
      await storeCatalogTestMedia(store, bytes, media); // write-once rerun is accepted
    } finally { await fs.rm(store, { recursive: true, force: true }); }
  });
});
