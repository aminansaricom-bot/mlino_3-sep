import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import type { AddressInfo } from 'node:net';
import { CoreIdentity, testDelivery } from '../../identity';
import { CHAT_PERMISSION, ChatModule } from '../../chat';
import { createHandler } from '../../http/api/app';
import { seedDemoMembers } from '../../http/api/seed-demo-members';
import { prisma } from '../../foundation/prisma-client';
import { MembershipService } from '../../core/membership-service';
import { PermissionGrantService } from '../../core/permission-grant-service';
import { CatalogItemService } from '../../core/catalog-item-service';
import { BusinessProfileService } from '../../core/business-profile-service';
import { PublicationService } from '../../core/publication-service';
import { contextFor } from '../../http/api/core-routes';
import { TEST_ORG, createTestOrg, dropTestOrg, pools, resetSchemas } from './support';

const { core, chat: chatDb } = pools();
const BIZ = 'business.test';

/** A real, plain 320×320 PNG (no text or EXIF chunks). */
function png(): Buffer {
  const chunk = (name: string, data: Buffer) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(name, 'ascii'), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(body) >>> 0);
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(320, 0); ihdr.writeUInt32BE(320, 4); ihdr[8] = 8; ihdr[9] = 2;
  const rows = Buffer.alloc(320 * (1 + 320 * 3), 0x7f); for (let y = 0; y < 320; y++) rows[y * (1 + 320 * 3)] = 0;
  return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]);
}
/** A JPEG header that still carries an EXIF block (as a phone camera writes it). */
function jpegWithExif(): Buffer {
  const app1 = Buffer.concat([Buffer.from([0xff, 0xe1, 0x00, 0x10]), Buffer.from('Exif\0\0GPSDATA!!', 'ascii').subarray(0, 14)]);
  const sof = Buffer.from([0xff, 0xc0, 0x00, 0x11, 0x08, 0x01, 0x40, 0x01, 0x40, 0x03, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1]);
  return Buffer.concat([Buffer.from([0xff, 0xd8]), app1, sof, Buffer.from([0xff, 0xda, 0x00, 0x02, 0xff, 0xd9])]);
}

describe('products and storefront from the panel — Core services, publishing by a person (D-52)', () => {
  let server: http.Server;
  let base: string;
  const published = path.join(os.tmpdir(), `mlino-published-catalog-${process.pid}.json`);
  const store = fs.mkdtempSync(path.join(os.tmpdir(), 'mlino-media-'));
  let profileId = '';

  beforeAll(async () => {
    await resetSchemas(core, chatDb);
    await createTestOrg(core);
    fs.writeFileSync(published, JSON.stringify({ records: [{ business: { organization_id: TEST_ORG, name: 'کافه آزمون' }, capabilities: [] }] }));
    const identity = new CoreIdentity(core, { pepper: crypto.randomBytes(32), delivery: testDelivery });
    await seedDemoMembers(core, identity, '09000000090');
    const owner = await identity.ensureTestPerson('09000000090');
    const profiles = new BusinessProfileService(prisma);
    const p = await profiles.create(contextFor(owner, TEST_ORG), { organizationId: TEST_ORG, name: 'کافه آزمون', description: 'قدیمی' });
    profileId = p.id;
    const members = { prisma, identity, memberships: new MembershipService(prisma), grants: new PermissionGrantService(prisma, undefined, [CHAT_PERMISSION]) };
    const catalog = { prisma, catalog: new CatalogItemService(prisma), profiles, publications: new PublicationService(prisma), mediaStore: store };
    const handler = createHandler({ identity, chat: new ChatModule(chatDb), members, catalog, config: { hosts: new Map([[BIZ, 'business']]), cookieSecure: false, publishedPath: published } });
    server = http.createServer((q, s) => void handler(q, s));
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(async () => {
    server.close(); fs.rmSync(published, { force: true }); fs.rmSync(store, { recursive: true, force: true });
    await prisma.$disconnect();
    await dropTestOrg(core); await core.end(); await chatDb.end();
  });

  const call = async (method: string, url: string, body?: unknown, cookie?: string, raw?: { bytes: Buffer; alt: string }) => {
    const res = await fetch(base + url, { method, headers: { 'x-forwarded-host': BIZ, 'content-type': raw ? 'application/octet-stream' : 'application/json', ...(method !== 'GET' ? { 'x-mlino-csrf': '1' } : {}), ...(cookie ? { cookie } : {}), ...(raw ? { 'x-alt-text': encodeURIComponent(raw.alt) } : {}) }, body: raw ? raw.bytes : body === undefined ? undefined : JSON.stringify(body) });
    const type = res.headers.get('content-type') ?? '';
    return { status: res.status, type, json: type.includes('json') ? await res.json() as Record<string, any> : {}, bytes: type.includes('json') ? null : Buffer.from(await res.arrayBuffer()) };
  };
  const login = async (phone: string) => {
    const start = await call('POST', '/api/auth/otp/start', { phone });
    const done = await fetch(`${base}/api/auth/otp/verify`, { method: 'POST', headers: { 'x-forwarded-host': BIZ, 'content-type': 'application/json', 'x-mlino-csrf': '1' }, body: JSON.stringify({ challengeId: start.json.challengeId, code: start.json.testCode }) });
    return (done.headers.get('set-cookie') ?? '').split(';')[0];
  };
  const org = `/api/biz/${TEST_ORG}`;

  let owner = '';
  let staff = '';
  let outsider = '';
  beforeAll(async () => {
    owner = await login('09000000090');
    await call('POST', `${org}/members`, { phone: '09000000071' }, owner);
    staff = await login('09000000071');
    outsider = await login('09000000072');
  });

  it('a product is made as an invisible draft, published by a tap, edited without customers seeing it until republished, then removed', async () => {
    const made = await call('POST', `${org}/catalog`, { name: 'برگر ویژه', shortDescription: 'با نان تازه', priceAmount: '۲۹۰٬۰۰۰', groupingLabel: 'برگر' }, owner);
    expect(made.status).toBe(200);
    let list = await call('GET', `${org}/catalog`, undefined, owner);
    expect(list.json.items.find((i: any) => i.id === made.json.id)).toMatchObject({ status: 'UNPUBLISHED', lifecycle: 'ACTIVE', priceAmount: '290000', onRequest: false, groupingLabel: 'برگر' });

    expect((await call('POST', `${org}/catalog/${made.json.id}/publish`, {}, owner)).json.outcome).toBe('PUBLISHED');
    expect((await call('POST', `${org}/catalog/${made.json.id}`, { name: 'برگر ویژه‌ی دوبل', priceAmount: '' }, owner)).status).toBe(200);
    list = await call('GET', `${org}/catalog`, undefined, owner);
    expect(list.json.items.find((i: any) => i.id === made.json.id)).toMatchObject({ status: 'PUBLISHED', changed: true, onRequest: true, priceAmount: null });
    const snap = await prisma.publication.findFirst({ where: { catalogItemId: made.json.id }, orderBy: { occurredAt: 'desc' } });
    expect(JSON.stringify(snap?.publishedContent)).toContain('برگر ویژه');
    expect(JSON.stringify(snap?.publishedContent)).not.toContain('دوبل');
    expect((await call('POST', `${org}/catalog/${made.json.id}/publish`, {}, owner)).json.outcome).toBe('PUBLISHED');
    list = await call('GET', `${org}/catalog`, undefined, owner);
    expect(list.json.items.find((i: any) => i.id === made.json.id).changed).toBe(false);

    expect((await call('POST', `${org}/catalog/${made.json.id}/retire`, {}, owner)).status).toBe(200);
    list = await call('GET', `${org}/catalog`, undefined, owner);
    expect(list.json.items.some((i: any) => i.id === made.json.id)).toBe(false);
  });

  it('photos: a clean image is stored content-addressed and readable only by members; camera metadata is refused', async () => {
    const made = await call('POST', `${org}/catalog`, { name: 'سیب‌زمینی' }, owner);
    const image = png();
    const up = await call('POST', `${org}/catalog/${made.json.id}/media`, undefined, owner, { bytes: image, alt: 'سیب‌زمینی سرخ‌کرده' });
    expect(up.status).toBe(200);
    const sha = crypto.createHash('sha256').update(image).digest('hex');
    expect(up.json.path).toBe(`media/sha256/${sha.slice(0, 2)}/${sha}.png`);
    expect(fs.readFileSync(path.join(store, ...String(up.json.path).split('/'))).equals(image)).toBe(true);
    const read = await call('GET', `${org}/${up.json.path}`, undefined, owner);
    expect(read.type).toBe('image/png');
    expect(read.bytes!.equals(image)).toBe(true);
    expect((await call('GET', `${org}/${up.json.path}`, undefined, outsider)).status).toBe(403);

    const exif = await call('POST', `${org}/catalog/${made.json.id}/media`, undefined, owner, { bytes: jpegWithExif(), alt: 'x' });
    expect(exif.status).toBe(400);
    expect(exif.json).toMatchObject({ error: 'PHOTO_INVALID', reason: 'CATALOG_MEDIA_METADATA' });
    expect((await call('POST', `${org}/catalog/${made.json.id}/media`, undefined, owner, { bytes: Buffer.from('not an image'), alt: 'x' })).json.reason).toBe('CATALOG_MEDIA_TYPE');

    let list = await call('GET', `${org}/catalog`, undefined, owner);
    expect(list.json.items.find((i: any) => i.id === made.json.id).media).toEqual([{ id: up.json.id, path: up.json.path, alt: 'سیب‌زمینی سرخ‌کرده' }]);
    expect((await call('POST', `${org}/catalog/${made.json.id}/media/${up.json.id}/remove`, {}, owner)).status).toBe(200);
    list = await call('GET', `${org}/catalog`, undefined, owner);
    expect(list.json.items.find((i: any) => i.id === made.json.id).media).toEqual([]);
  });

  it('a member without the editing permissions cannot change products or the storefront', async () => {
    expect((await call('POST', `${org}/catalog`, { name: 'x' }, staff)).status).toBe(403);
    expect((await call('POST', `${org}/profile/${profileId}`, { description: 'x' }, staff)).status).toBe(403);
    expect((await call('GET', `${org}/catalog`, undefined, outsider)).status).toBe(403);
  });

  it('storefront: description, hours, phone and links are edited, checked, and published by a tap', async () => {
    const hours = { weekly: [{ day: 1, intervals: [{ open: '08:00', close: '23:00' }] }, { day: 7, intervals: [] }] };
    const ok = await call('POST', `${org}/profile/${profileId}`, { description: 'برگر با نان تازه', addressText: 'ولیعصر', publicPhone: '۰۲۱-۸۸۰۰۰۰۰۰', website: 'https://example.com', social: ['https://instagram.com/x'], businessHours: hours }, owner);
    expect(ok.status).toBe(200);
    const got = await call('GET', `${org}/profile`, undefined, owner);
    expect(got.json.profile).toMatchObject({ description: 'برگر با نان تازه', addressText: 'ولیعصر', publicPhone: '02188000000', website: 'https://example.com', social: ['https://instagram.com/x'] });
    expect(got.json.profile.businessHours).toMatchObject({ schema_version: 'mlino.business-hours.v1', timezone: 'Asia/Tehran', weekly: [{ day: 1 }, { day: 7, intervals: [] }] });
    expect((await call('POST', `${org}/profile/${profileId}`, { website: 'http://insecure.example' }, owner)).status).toBe(400);
    expect((await call('POST', `${org}/profile/${profileId}`, { businessHours: { weekly: [{ day: 9, intervals: [] }] } }, owner)).status).toBe(400);
    const pub = await call('POST', `${org}/profile/${profileId}/publish`, {}, owner);
    expect(pub.json.outcome).toBe('PUBLISHED');
  });
});
