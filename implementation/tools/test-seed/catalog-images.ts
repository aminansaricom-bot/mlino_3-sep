import { createHash, randomBytes } from 'node:crypto';
import { constants, deflateSync } from 'node:zlib';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { validateMediaStore, verifyMediaBytes, CatalogMedia } from '../../public-export/media';
import { TestSeedError } from './types';

const WIDTH = 800;
const HEIGHT = 600;
const FONT: Record<string, string[]> = {
  T: ['11111','00100','00100','00100','00100','00100','00100'],
  E: ['11111','10000','10000','11110','10000','10000','11111'],
  S: ['01111','10000','10000','01110','00001','00001','11110'],
};
const TABLE = (() => {
  const result: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
    result[n] = c >>> 0;
  }
  return result;
})();
function chunk(kind: string, bytes: Buffer): Buffer {
  const name = Buffer.from(kind, 'ascii');
  const length = Buffer.alloc(4); length.writeUInt32BE(bytes.length);
  let crc = 0xffffffff;
  for (const b of Buffer.concat([name, bytes])) crc = TABLE[(crc ^ b) & 255] ^ (crc >>> 8);
  const check = Buffer.alloc(4); check.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([length, name, bytes, check]);
}

/** Deterministic RGB PNG. The white stripe contains an embedded 5x7 bitmap TEST mark. */
export function generateCatalogTestPng(itemKey: string, index: number): Buffer {
  if (!itemKey.startsWith('test-ui-vanak-') || !Number.isSafeInteger(index) || index < 0 || index > 7) {
    throw new TestSeedError('TEST_SEED_IMAGE_INPUT');
  }
  const seed = createHash('sha256').update(`${itemKey}:${index}`, 'utf8').digest();
  const raw = Buffer.alloc(HEIGHT * (WIDTH * 3 + 1));
  for (let y = 0; y < HEIGHT; y++) {
    const row = y * (WIDTH * 3 + 1);
    for (let x = 0; x < WIDTH; x++) {
      const at = row + 1 + x * 3;
      const tile = seed[(Math.floor(x / 80) + Math.floor(y / 75) * 10) % seed.length];
      const band = y >= 270 && y < 330;
      const base = band ? 255 : 50 + (tile % 120);
      raw[at] = base;
      raw[at + 1] = band ? 255 : 70 + (seed[(x >> 5) % 32] % 110);
      raw[at + 2] = band ? 255 : 85 + (seed[(y >> 5) % 32] % 100);
    }
  }
  for (const [letterIndex, letter] of [...'TEST'].entries()) {
    for (let gy = 0; gy < 7; gy++) for (let gx = 0; gx < 5; gx++) {
      if (FONT[letter][gy][gx] !== '1') continue;
      for (let sy = 0; sy < 5; sy++) for (let sx = 0; sx < 5; sx++) {
        const x = 328 + letterIndex * 36 + gx * 5 + sx;
        const y = 282 + gy * 5 + sy;
        const at = y * (WIDTH * 3 + 1) + 1 + x * 3;
        raw[at] = raw[at + 1] = raw[at + 2] = 0;
      }
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(WIDTH, 0); header.writeUInt32BE(HEIGHT, 4);
  header[8] = 8; header[9] = 2; // 8-bit RGB, no palette or animation.
  const compressed = deflateSync(raw, { level: 9, strategy: constants.Z_FIXED });
  return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', header), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}

export function catalogTestMedia(bytes: Buffer, position: number, altText: string): CatalogMedia {
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const media: CatalogMedia = { position, path: `media/sha256/${sha256.slice(0, 2)}/${sha256}.png`, sha256,
    media_type: 'image/png', byte_size: bytes.length, width: WIDTH, height: HEIGHT, alt_text: altText, placeholder: null };
  verifyMediaBytes(bytes, media);
  return media;
}

/** Publish bytes by exclusive hard link: no overwrite, with a verified existing-file path. */
export async function storeCatalogTestMedia(store: string, bytes: Buffer, media: CatalogMedia): Promise<void> {
  const base = await validateMediaStore(store);
  verifyMediaBytes(bytes, media);
  const parent = path.join(base, 'media', 'sha256', media.sha256.slice(0, 2));
  await fs.mkdir(parent, { recursive: true });
  const resolvedParent = await fs.realpath(parent);
  const relation = path.relative(base, resolvedParent);
  if (relation.startsWith('..') || path.isAbsolute(relation)) throw new TestSeedError('TEST_SEED_MEDIA_STORE_UNSAFE');
  const destination = path.join(parent, `${media.sha256}.png`);
  const temporary = path.join(parent, `.staging-${randomBytes(12).toString('hex')}`);
  const handle = await fs.open(temporary, 'wx', 0o600);
  try { await handle.writeFile(bytes); await handle.sync(); } finally { await handle.close(); }
  try {
    await fs.link(temporary, destination);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    const existing = await fs.readFile(destination);
    if (createHash('sha256').update(existing).digest('hex') !== media.sha256) throw new TestSeedError('TEST_SEED_MEDIA_POISONED');
    verifyMediaBytes(existing, media);
  } finally { await fs.unlink(temporary).catch(() => undefined); }
}
