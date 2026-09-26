import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { CoreIdentity, testDelivery } from '../../identity';
import { ChatModule } from '../../chat';
import { createHandler } from '../../http/api/app';
import { VISUAL_SCHEMA_SQL, VisualError, VisualSearchModule, checkImage } from '../../visual';
import { preprocess, l2normalize, type EmbeddingModel } from '../../visual/model';
import { dropTestOrg, pools, resetSchemas } from './support';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const sharp = require('sharp') as typeof import('sharp').default;
const { core, chat } = pools();

/** A small stand-in model that uses the REAL preprocessing, so both sides of the pipeline are the same function. */
class ProjectionModel implements EmbeddingModel {
  readonly dims = 32;
  private readonly w: Float32Array;
  calls = 0;
  constructor(readonly id = 'test-projection@1', readonly preprocess = 'test-pre@1') {
    this.w = new Float32Array(this.dims * 3 * 16);
    let s = 7; for (let i = 0; i < this.w.length; i += 1) { s = (s * 1103515245 + 12345) & 0x7fffffff; this.w[i] = (s / 0x7fffffff) - 0.5; }
  }
  async embed(image: Buffer): Promise<Float32Array> {
    this.calls += 1;
    const x = await preprocess(image);
    // 4×4 average pool per channel → 48 features → projection.
    const feats = new Float32Array(48);
    for (let c = 0; c < 3; c += 1) for (let by = 0; by < 4; by += 1) for (let bx = 0; bx < 4; bx += 1) {
      let sum = 0; for (let y = by * 56; y < by * 56 + 56; y += 1) for (let xx = bx * 56; xx < bx * 56 + 56; xx += 1) sum += x[c * 224 * 224 + y * 224 + xx];
      feats[c * 16 + by * 4 + bx] = sum / (56 * 56);
    }
    const v = new Float32Array(this.dims);
    for (let d = 0; d < this.dims; d += 1) { let t = 0; for (let i = 0; i < 48; i += 1) t += this.w[d * 48 + i] * feats[i]; v[d] = t; }
    return l2normalize(v);
  }
}

const shape = async (bg: string, fg: string, kind: 'circle' | 'bars') => {
  const svg = kind === 'circle'
    ? `<svg width="400" height="400"><rect width="400" height="400" fill="${bg}"/><circle cx="200" cy="200" r="120" fill="${fg}"/></svg>`
    : `<svg width="400" height="400"><rect width="400" height="400" fill="${bg}"/><rect x="40" y="0" width="60" height="400" fill="${fg}"/><rect x="220" y="0" width="60" height="400" fill="${fg}"/></svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer();
};

describe('Visual product search (D-91)', () => {
  let dir: string; let catalogPath: string; let publishedPath: string;
  const images: Record<string, Buffer> = {};
  const media = (name: string) => { const b = images[name]; const sha = crypto.createHash('sha256').update(b).digest('hex'); return { sha, path: `media/sha256/${sha.slice(0, 2)}/${sha}.jpg` }; };
  const put = (name: string) => { const m = media(name); fs.mkdirSync(path.join(dir, path.dirname(m.path)), { recursive: true }); fs.writeFileSync(path.join(dir, m.path), images[name]); return m; };
  const item = (id: string, name: string, price: string, imgs: string[], extra: Record<string, unknown> = {}) => ({
    catalog_item_id: id, item_key: id, name, price_amount: price, price_currency: 'IRR', on_request: false, available_from: null, available_until: null, grouping_label: null,
    media: imgs.map((n, i) => { const m = put(n); return { path: m.path, sha256: m.sha, position: i, media_type: 'image/jpeg' }; }), ...extra,
  });
  const writeCatalog = (records: unknown[], published: string[]) => {
    fs.writeFileSync(catalogPath, JSON.stringify({ records }));
    fs.writeFileSync(publishedPath, JSON.stringify({ records: published.map((id) => ({ business: { organization_id: id, name: `کسب‌وکار ${id}` } })) }));
    const t = new Date(Date.now() + Math.floor(Math.random() * 1000) * 1000); fs.utimesSync(catalogPath, t, t); fs.utimesSync(publishedPath, t, t);
  };
  const standard = () => writeCatalog([
    { organization_id: 'org-a', items: [item('a-red', 'فنجان قرمز', '100000', ['red1', 'red2']), item('a-blue', 'بشقاب آبی', '300000', ['blue'])] },
    { organization_id: 'org-b', items: [item('b-red', 'فنجان قرمز دیگر', '150000', ['red1'])] },
    { organization_id: 'org-hidden', items: [item('h-red', 'پنهان', '100000', ['red2'])] },
  ], ['org-a', 'org-b']);

  beforeAll(async () => {
    images.red1 = await shape('#ffffff', '#c0392b', 'circle');
    images.red2 = await shape('#f4f4f4', '#b03a2e', 'circle');
    images.blue = await shape('#ffffff', '#2471a3', 'bars');
    images.green = await shape('#000000', '#27ae60', 'bars');
  });
  beforeEach(async () => {
    await resetSchemas(core, chat);
    await chat.query(VISUAL_SCHEMA_SQL);
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mlino-visual-'));
    catalogPath = path.join(dir, 'public-catalog.v1.json'); publishedPath = path.join(dir, 'public-business.v1.json');
    standard();
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));
  afterAll(async () => { await dropTestOrg(core); await core.end(); await chat.end(); });

  const make = (model: EmbeddingModel = new ProjectionModel(), minSimilarity = 0.9) => {
    const v = new VisualSearchModule(chat, { catalogPath, publishedPath, mediaRoot: dir, minSimilarity });
    v.setModel(model);
    return v;
  };
  const q = { limit: 12, offset: 0 };

  it('checks the file itself: type by content, size, pixels, too small; name and extension are not trusted', async () => {
    await expect(checkImage(Buffer.from('not an image at all, only text bytes'))).rejects.toMatchObject({ code: 'IMAGE_INVALID' });
    const gif = await sharp({ create: { width: 64, height: 64, channels: 3, background: '#fff' } }).gif().toBuffer();
    await expect(checkImage(gif)).rejects.toMatchObject({ code: 'IMAGE_UNSUPPORTED' });
    await expect(checkImage(Buffer.alloc(3 * 1024 * 1024 + 1))).rejects.toMatchObject({ code: 'IMAGE_TOO_LARGE' });
    const tiny = await sharp({ create: { width: 10, height: 10, channels: 3, background: '#fff' } }).png().toBuffer();
    await expect(checkImage(tiny)).rejects.toMatchObject({ code: 'IMAGE_TOO_SMALL' });
    const wide = await sharp({ create: { width: 5000, height: 40, channels: 3, background: '#fff' } }).png().toBuffer();
    await expect(checkImage(wide)).rejects.toMatchObject({ code: 'IMAGE_TOO_LARGE' });
    for (const fmt of ['jpeg', 'png', 'webp'] as const) {
      const b = await sharp({ create: { width: 64, height: 64, channels: 3, background: '#abc' } })[fmt]().toBuffer();
      await expect(checkImage(b)).resolves.toMatchObject({ format: fmt });
    }
  });

  it('indexes each published image once; running again (backfill) adds nothing', async () => {
    const model = new ProjectionModel();
    const v = make(model);
    const first = await v.indexPass();
    expect(first).toMatchObject({ embedded: 3, failed: 0 }); // red1 (shared by two items), red2, blue — not the hidden business's only copy twice
    const again = await v.indexPass();
    expect(again).toMatchObject({ embedded: 0, failed: 0, remaining: 0 });
    const rows = (await chat.query('SELECT count(*)::int AS n FROM visual_image_embeddings')).rows[0].n;
    expect(rows).toBe(3);
    const refs = (await chat.query('SELECT organization_id, catalog_item_id FROM visual_image_refs ORDER BY 1, 2')).rows;
    expect(refs.map((r) => `${r.organization_id}/${r.catalog_item_id}`)).toEqual(['org-a/a-blue', 'org-a/a-red', 'org-a/a-red', 'org-b/b-red']);
    expect(model.calls).toBe(3);
  });

  it('only published, visible products come back; each product once, with its best-matching image', async () => {
    const v = make();
    await v.indexPass();
    const out = await v.search(images.red1, q);
    const ids = out.results.map((r) => r.catalogItemId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('a-red'); expect(ids).toContain('b-red');
    expect(ids).not.toContain('h-red'); // business not published
    expect(ids).not.toContain('a-blue'); // not similar
    const aRed = out.results.find((r) => r.catalogItemId === 'a-red')!;
    expect(aRed.matchedImagePath).toBe(media('red1').path);
    expect(aRed).toMatchObject({ kind: 'visually_similar', organizationId: 'org-a', businessName: 'کسب‌وکار org-a', priceAmount: '100000', priceCurrency: 'IRR' });
    expect(Object.keys(aRed)).not.toContain('score');
    expect(out.scope).toBe('all');
  });

  it('withdrawn, deleted, not-yet-available items and a changed image drop out at once (the vector alone is not enough)', async () => {
    const v = make();
    await v.indexPass();
    // business withdrawn
    writeCatalog([{ organization_id: 'org-a', items: [item('a-red', 'فنجان قرمز', '100000', ['red1'])] }, { organization_id: 'org-b', items: [item('b-red', 'x', '1', ['red1'])] }], ['org-a']);
    expect((await v.search(images.red1, q)).results.map((r) => r.catalogItemId)).toEqual(['a-red']);
    // item deleted
    writeCatalog([{ organization_id: 'org-a', items: [] }], ['org-a']);
    expect((await v.search(images.red1, q)).results).toEqual([]);
    // not yet available
    writeCatalog([{ organization_id: 'org-a', items: [item('a-red', 'x', '1', ['red1'], { available_from: new Date(Date.now() + 86400_000).toISOString() })] }], ['org-a']);
    expect((await v.search(images.red1, q)).results).toEqual([]);
    // image changed: the old picture no longer finds the item; after the next pass the new one does
    writeCatalog([{ organization_id: 'org-a', items: [item('a-red', 'x', '1', ['green'])] }], ['org-a']);
    expect((await v.search(images.red1, q)).results).toEqual([]);
    expect((await v.search(images.green, q)).results).toEqual([]); // not indexed yet
    await v.indexPass();
    expect((await v.search(images.green, q)).results.map((r) => r.catalogItemId)).toEqual(['a-red']);
  });

  it('never compares vectors of another model or preprocessing version', async () => {
    const v1 = make(new ProjectionModel('test-projection@1', 'test-pre@1'));
    await v1.indexPass();
    const v2 = make(new ProjectionModel('test-projection@1', 'test-pre@2'));
    expect((await v2.search(images.red1, q)).results).toEqual([]); // nothing indexed for pre@2
    const v3 = make(new ProjectionModel('other-model@1', 'test-pre@1'));
    expect((await v3.search(images.red1, q)).results).toEqual([]);
    await v2.indexPass();
    expect((await v2.search(images.red1, q)).results.length).toBeGreaterThan(0);
    const versions = (await chat.query('SELECT DISTINCT preprocess_version FROM visual_image_embeddings ORDER BY 1')).rows.map((r) => r.preprocess_version);
    expect(versions).toEqual(['test-pre@1', 'test-pre@2']);
  });

  it('filters (the phone\'s business ids, price) apply before ranking; threshold gives «nothing similar»', async () => {
    const v = make();
    await v.indexPass();
    const onlyB = await v.search(images.red1, { ...q, organizationIds: ['org-b'] });
    expect(onlyB.results.map((r) => r.catalogItemId)).toEqual(['b-red']);
    expect(onlyB.scope).toBe('subset');
    const cheap = await v.search(images.red1, { ...q, maxPrice: 120000 });
    expect(cheap.results.map((r) => r.catalogItemId)).toEqual(['a-red']);
    expect((await v.search(images.green, q)).results).toEqual([]);
    const page = await v.search(images.red1, { limit: 1, offset: 1 });
    expect(page.results).toHaveLength(1); expect(page.total).toBe(2);
  });

  it('a catalog image is read only from the export directory and only if its bytes match its hash', async () => {
    const v = make();
    const m = media('blue');
    fs.writeFileSync(path.join(dir, m.path), images.green); // bytes changed behind the catalog's back
    const out = await v.indexPass();
    expect(out.failed).toBe(1);
    const row = (await chat.query('SELECT status, error, attempts FROM visual_image_embeddings WHERE image_sha256 = $1', [m.sha])).rows[0];
    expect(row).toMatchObject({ status: 'failed', attempts: 1 });
    expect(row.error).toMatch(/do not match/);
  });

  it('no network call at all while indexing or searching', async () => {
    const f = jest.spyOn(globalThis, 'fetch'); const h = jest.spyOn(http, 'request'); const s = jest.spyOn(https, 'request');
    const v = make();
    await v.indexPass(); await v.search(images.red1, q);
    expect(f).not.toHaveBeenCalled(); expect(h).not.toHaveBeenCalled(); expect(s).not.toHaveBeenCalled();
    f.mockRestore(); h.mockRestore(); s.mockRestore();
  });

  it('refuses honestly when the model is not there (no made-up results)', async () => {
    const v = new VisualSearchModule(chat, { catalogPath, publishedPath, mediaRoot: dir, minSimilarity: 0.5 });
    v.setModelState('missing', 'no model file');
    await expect(v.search(images.red1, q)).rejects.toBeInstanceOf(VisualError);
    expect((await v.status()).ready).toBe(false);
  });

  it('API: v2 only, photo bytes only (no URL), bounded filters, clear errors, no score in the answer', async () => {
    const v = make();
    await v.indexPass();
    const identity = new CoreIdentity(core, { pepper: crypto.randomBytes(32), delivery: testDelivery });
    const handler = createHandler({ identity, chat: new ChatModule(chat), visual: v, config: { hosts: new Map([['explore.test', 'v2' as const], ['business.test', 'business' as const]]), cookieSecure: false, publishedPath } });
    const server = http.createServer((a, b) => void handler(a, b));
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const post = async (url: string, body: Buffer | string, type: string, host = 'explore.test', csrf = true) => {
      const res = await fetch(base + url, { method: 'POST', headers: { 'x-forwarded-host': host, 'content-type': type, ...(csrf ? { 'x-mlino-csrf': '1' } : {}) }, body });
      return { status: res.status, json: await res.json() as Record<string, any> };
    };
    try {
      const ok = await post('/api/visual/search?limit=5', images.red1, 'image/jpeg');
      expect(ok.status).toBe(200);
      expect(ok.json.results.map((r: any) => r.catalogItemId).sort()).toEqual(['a-red', 'b-red']);
      expect(JSON.stringify(ok.json)).not.toMatch(/score|similarity/);
      expect((await post('/api/visual/search', JSON.stringify({ url: 'https://example.com/x.jpg' }), 'application/json')).status).toBe(415);
      expect((await post('/api/visual/search', Buffer.alloc(3 * 1024 * 1024 + 10), 'image/jpeg')).status).toBe(413);
      expect((await post('/api/visual/search', Buffer.from('garbage bytes pretending to be a jpeg'), 'image/jpeg')).json.error).toBe('IMAGE_INVALID');
      expect((await post('/api/visual/search?limit=500', images.red1, 'image/jpeg')).json.error).toBe('BAD_FILTER');
      expect((await post('/api/visual/search?orgs=a;b', images.red1, 'image/jpeg')).json.error).toBe('BAD_FILTER');
      expect((await post('/api/visual/search', images.red1, 'image/jpeg', 'business.test')).status).toBe(404);
      expect((await post('/api/visual/search', images.red1, 'image/jpeg', 'explore.test', false)).status).toBe(403);
    } finally { server.close(); }
  });

  // The real model (when the pinned weights are present). onnxruntime builds its outputs in Node's main realm, which
  // the test runner's sandbox does not accept, so this check runs the real model.ts in a plain Node child process.
  const modelDir = process.env.VISUAL_MODEL_DIR;
  (modelDir ? it : it.skip)('real DINOv2 (plain Node): same bytes → same 384-d vector; similar photo closer than a different one', () => {
    const { execFileSync } = require('node:child_process') as typeof import('node:child_process'); // eslint-disable-line @typescript-eslint/no-var-requires
    for (const n of ['red1', 'red2', 'blue']) fs.writeFileSync(path.join(dir, `${n}.jpg`), images[n]);
    const script = `
      const fs = require('fs'); const ts = require('typescript');
      require.extensions['.ts'] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, 'utf8'), { compilerOptions: { module: 1, target: 9, esModuleInterop: true } }).outputText, f);
      const { OnnxDinoV2Model } = require(${JSON.stringify(path.resolve(__dirname, '../../visual/model.ts'))});
      (async () => {
        const m = await OnnxDinoV2Model.load(${JSON.stringify(modelDir)}, 1);
        const img = (n) => fs.readFileSync(require('path').join(${JSON.stringify(dir)}, n + '.jpg'));
        const a = await m.embed(img('red1')), a2 = await m.embed(img('red1')), r2 = await m.embed(img('red2')), b = await m.embed(img('blue'));
        const dot = (x, y) => x.reduce((s, v, i) => s + v * y[i], 0);
        process.stdout.write(JSON.stringify({ dims: a.length, same: a.every((v, i) => v === a2[i]), norm: Math.sqrt(dot(a, a)), similar: dot(a, r2), different: dot(a, b), id: m.id, pre: m.preprocess }));
      })().catch((e) => { process.stdout.write(JSON.stringify({ error: e.message })); });`;
    const out = JSON.parse(execFileSync(process.execPath, ['-e', script], { cwd: path.resolve(__dirname, '../..'), encoding: 'utf8', timeout: 60_000 }));
    expect(out.error).toBeUndefined();
    expect(out).toMatchObject({ dims: 384, same: true, id: 'dinov2-small@facebook-ed25f3a+onnx-community-8b1f705', pre: 'exif-white-cubic256-center224-imagenet-cls-l2-v1' });
    expect(Math.abs(out.norm - 1)).toBeLessThan(1e-4);
    expect(out.similar).toBeGreaterThan(out.different);
  }, 90_000);
});
