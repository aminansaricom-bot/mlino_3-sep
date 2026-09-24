import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { CoreIdentity, testDelivery } from '../../identity';
import { ChatModule } from '../../chat';
import { createHandler } from '../../http/api/app';
import { seedDemoMembers } from '../../http/api/seed-demo-members';
import { prisma } from '../../foundation/prisma-client';
import { OfferService } from '../../core/offer-service';
import { PlanService } from '../../core/plan-service';
import { PublicationService } from '../../core/publication-service';
import { CatalogItemService } from '../../core/catalog-item-service';
import { BusinessProfileService } from '../../core/business-profile-service';
import { TEST_ORG, createTestOrg, dropTestOrg, pools, resetSchemas } from './support';

const { core, chat: chatDb } = pools();
const BIZ = 'business.test';

describe('an offer about one product: the discount reaches that product only (kit: 95 000 → 76 000)', () => {
  let server: http.Server;
  let base: string;
  const published = path.join(os.tmpdir(), `mlino-published-offerprod-${process.pid}.json`);

  beforeAll(async () => {
    await resetSchemas(core, chatDb);
    await createTestOrg(core);
    fs.writeFileSync(published, JSON.stringify({ records: [{ business: { organization_id: TEST_ORG, name: 'کافه آزمون' }, capabilities: [] }] }));
    const identity = new CoreIdentity(core, { pepper: crypto.randomBytes(32), delivery: testDelivery });
    await seedDemoMembers(core, identity, '09000000090');
    const publications = new PublicationService(prisma);
    const coreDeps = { prisma, plans: new PlanService(prisma), offers: new OfferService(prisma), publications };
    const catalog = { prisma, catalog: new CatalogItemService(prisma), profiles: new BusinessProfileService(prisma), publications };
    const handler = createHandler({ identity, chat: new ChatModule(chatDb), core: coreDeps, catalog, config: { hosts: new Map([[BIZ, 'business']]), cookieSecure: false, publishedPath: published } });
    server = http.createServer((q, s) => void handler(q, s));
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(async () => {
    server.close(); fs.rmSync(published, { force: true });
    await prisma.organizationPlan.deleteMany({ where: { organizationId: TEST_ORG } });
    await prisma.$disconnect();
    await dropTestOrg(core); await core.end(); await chatDb.end();
  });

  const call = async (method: string, url: string, body?: unknown, cookie?: string) => {
    const res = await fetch(base + url, { method, headers: { 'x-forwarded-host': BIZ, 'content-type': 'application/json', ...(method !== 'GET' ? { 'x-mlino-csrf': '1' } : {}), ...(cookie ? { cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: res.status, json: await res.json() as Record<string, any> };
  };
  const login = async (phone: string) => {
    const start = await call('POST', '/api/auth/otp/start', { phone });
    const done = await fetch(`${base}/api/auth/otp/verify`, { method: 'POST', headers: { 'x-forwarded-host': BIZ, 'content-type': 'application/json', 'x-mlino-csrf': '1' }, body: JSON.stringify({ challengeId: start.json.challengeId, code: start.json.testCode }) });
    return (done.headers.get('set-cookie') ?? '').split(';')[0];
  };
  const org = `/api/biz/${TEST_ORG}`;

  it('links the offer to the product, refuses a price that is not lower, and republishes the product with the link', async () => {
    const owner = await login('09000000090');
    const item = await call('POST', `${org}/catalog`, { name: 'آمریکانو', priceAmount: '95000' }, owner);
    expect((await call('POST', `${org}/catalog/${item.json.id}/publish`, {}, owner)).json.outcome).toBe('PUBLISHED');

    expect((await call('POST', `${org}/offers`, { name: 'آمریکانو ارزان‌تر؟', validDays: 7, priceAmount: 99000, catalogItemId: item.json.id }, owner)).json.error).toBe('OFFER_NOT_LOWER');
    const offer = await call('POST', `${org}/offers`, { name: '۲۰٪ تخفیف آمریکانو', validDays: 7, priceAmount: 76000, catalogItemId: item.json.id }, owner);
    expect(offer.status).toBe(200);
    const list = await call('GET', `${org}/offers`, undefined, owner);
    expect(list.json.offers.find((o: any) => o.versionId === offer.json.versionId).item).toMatchObject({ id: item.json.id, name: 'آمریکانو', priceAmount: '95000' });

    expect((await call('POST', `${org}/offers/${offer.json.versionId}/publish`, {}, owner)).json.outcome).toBe('PUBLISHED');
    const snap = await prisma.publication.findFirst({ where: { catalogItemId: item.json.id }, orderBy: { occurredAt: 'desc' } });
    expect((snap?.publishedContent as any).content.offer_version_links).toEqual([offer.json.versionId]);
    const cat = await call('GET', `${org}/catalog`, undefined, owner);
    expect(cat.json.items.find((i: any) => i.id === item.json.id)).toMatchObject({ status: 'PUBLISHED', changed: false });
  });
});
