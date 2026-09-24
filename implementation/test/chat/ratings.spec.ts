import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { CoreIdentity, testDelivery } from '../../identity';
import { ChatModule } from '../../chat';
import { createHandler } from '../../http/api/app';
import { RATINGS_SCHEMA_SQL, RatingsModule } from '../../ratings';
import { TEST_ORG, dropTestOrg, pools, resetSchemas } from './support';

const { core, chat: chatDb } = pools();
const V2 = 'explore.test';
const REAL = 'real-org-ratings-spec';
const PHARMACY = 'test-demo-pharmacy-spec';

describe('product ratings (D-84): one per person per product, averages public, people never shown', () => {
  let server: http.Server;
  let base: string;
  const published = path.join(os.tmpdir(), `mlino-published-ratings-${process.pid}.json`);
  const catalog = path.join(os.tmpdir(), `mlino-catalog-ratings-${process.pid}.json`);

  beforeAll(async () => {
    await resetSchemas(core, chatDb);
    await chatDb.query('DROP TABLE IF EXISTS product_ratings');
    await chatDb.query(RATINGS_SCHEMA_SQL);
    fs.writeFileSync(published, JSON.stringify({ records: [
      { business: { organization_id: TEST_ORG, name: 'کافه آزمون' }, capabilities: [] },
      { business: { organization_id: REAL, name: 'کافه واقعی' }, capabilities: [] },
      { business: { organization_id: PHARMACY, name: 'داروخانه نمایشی' }, capabilities: [{ name: 'خدمات دارویی' }] },
    ] }));
    fs.writeFileSync(catalog, JSON.stringify({ records: [
      { organization_id: TEST_ORG, items: [{ catalog_item_id: 'latte', name: 'لاته' }, { catalog_item_id: 'mocha', name: 'موکا' }] },
      { organization_id: REAL, items: [{ catalog_item_id: 'latte', name: 'لاته' }] },
      { organization_id: PHARMACY, items: [{ catalog_item_id: 'pill', name: 'قرص' }] },
    ] }));
    const identity = new CoreIdentity(core, { pepper: crypto.randomBytes(32), delivery: testDelivery });
    const handler = createHandler({ identity, chat: new ChatModule(chatDb), ratings: new RatingsModule(chatDb), config: { hosts: new Map([[V2, 'v2']]), cookieSecure: false, publishedPath: published, catalogPath: catalog } });
    server = http.createServer((q, s) => void handler(q, s));
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(async () => {
    server.close(); fs.rmSync(published, { force: true }); fs.rmSync(catalog, { force: true });
    await chatDb.query('DROP TABLE IF EXISTS product_ratings');
    await dropTestOrg(core); await core.end(); await chatDb.end();
  });

  const call = async (method: string, url: string, body?: unknown, cookie?: string) => {
    const res = await fetch(base + url, { method, headers: { 'x-forwarded-host': V2, 'content-type': 'application/json', ...(method !== 'GET' ? { 'x-mlino-csrf': '1' } : {}), ...(cookie ? { cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: res.status, json: await res.json() as Record<string, any> };
  };
  const login = async (phone: string) => {
    const start = await call('POST', '/api/auth/otp/start', { phone });
    const done = await fetch(`${base}/api/auth/otp/verify`, { method: 'POST', headers: { 'x-forwarded-host': V2, 'content-type': 'application/json', 'x-mlino-csrf': '1' }, body: JSON.stringify({ challengeId: start.json.challengeId, code: start.json.testCode }) });
    return (done.headers.get('set-cookie') ?? '').split(';')[0];
  };

  it('signed-in people rate published products; the average and count are public; each sees only their own stars', async () => {
    expect((await call('GET', `/api/ratings?organizationId=${TEST_ORG}`)).json).toEqual({ enabled: true, items: {} });
    expect((await call('POST', '/api/ratings', { organizationId: TEST_ORG, catalogItemId: 'latte', stars: 5 })).status).toBe(401);

    const a = await login('09000000031');
    const b = await login('09000000032');
    expect((await call('POST', '/api/ratings', { organizationId: TEST_ORG, catalogItemId: 'latte', stars: 7 }, a)).status).toBe(400);
    expect((await call('POST', '/api/ratings', { organizationId: TEST_ORG, catalogItemId: 'nope', stars: 5 }, a)).status).toBe(404);
    expect((await call('POST', '/api/ratings', { organizationId: TEST_ORG, catalogItemId: 'latte', stars: 5 }, a)).json.item).toEqual({ avg: 5, count: 1, mine: 5 });
    expect((await call('POST', '/api/ratings', { organizationId: TEST_ORG, catalogItemId: 'latte', stars: 2 }, b)).json.item).toEqual({ avg: 3.5, count: 2, mine: 2 });
    // Changing one's mind replaces the rating, never adds a second one.
    expect((await call('POST', '/api/ratings', { organizationId: TEST_ORG, catalogItemId: 'latte', stars: 4 }, a)).json.item).toEqual({ avg: 3, count: 2, mine: 4 });

    const pub = await call('GET', `/api/ratings?organizationId=${TEST_ORG}`);
    expect(pub.json.items.latte).toEqual({ avg: 3, count: 2, mine: null });
    expect(JSON.stringify(pub.json)).not.toMatch(/0900|person/);
    expect((await call('GET', `/api/ratings?organizationId=${TEST_ORG}`, undefined, b)).json.items.latte.mine).toBe(2);

    expect((await call('POST', '/api/ratings/remove', { organizationId: TEST_ORG, catalogItemId: 'latte' }, b)).json.item).toEqual({ avg: 4, count: 1, mine: null });
  });

  it('test identities do not count for real businesses; health businesses are not rated; deleting the account deletes ratings', async () => {
    const c = await login('09000000033');
    expect((await call('POST', '/api/ratings', { organizationId: REAL, catalogItemId: 'latte', stars: 1 }, c)).json.item).toEqual({ avg: 0, count: 0, mine: 1 });
    expect((await call('GET', `/api/ratings?organizationId=${REAL}`)).json.items).toEqual({});

    expect((await call('GET', `/api/ratings?organizationId=${PHARMACY}`)).json).toEqual({ enabled: false, items: {} });
    expect((await call('POST', '/api/ratings', { organizationId: PHARMACY, catalogItemId: 'pill', stars: 5 }, c)).json.error).toBe('RATINGS_OFF');

    await call('POST', '/api/ratings', { organizationId: TEST_ORG, catalogItemId: 'mocha', stars: 5 }, c);
    expect((await call('GET', `/api/ratings?organizationId=${TEST_ORG}`)).json.items.mocha.count).toBe(1);
    expect((await call('DELETE', '/api/auth/account', undefined, c)).status).toBe(200);
    expect((await call('GET', `/api/ratings?organizationId=${TEST_ORG}`)).json.items.mocha).toBeUndefined();
  });
});
