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
import { TEST_ORG, createTestOrg, dropTestOrg, pools, resetSchemas } from './support';

const { core, chat: chatDb } = pools();
const V2 = 'explore.test';
const BIZ = 'business.test';

describe('MLINO API — audiences, CSRF, permission per request', () => {
  let server: http.Server;
  let base: string;
  const published = path.join(os.tmpdir(), `mlino-published-${process.pid}.json`);
  const catalog = path.join(os.tmpdir(), `mlino-catalog-${process.pid}.json`);

  beforeAll(async () => {
    await resetSchemas(core, chatDb);
    await createTestOrg(core);
    fs.writeFileSync(published, JSON.stringify({ records: [
      { business: { organization_id: TEST_ORG, name: 'کافه آزمون' }, capabilities: [{ name: 'قهوه' }] },
      { business: { organization_id: 'test-demo-04', name: 'داروخانه نمایشی' }, capabilities: [{ name: 'خدمات دارویی' }] },
    ] }));
    const identity = new CoreIdentity(core, { pepper: crypto.randomBytes(32), delivery: testDelivery });
    await seedDemoMembers(core, identity, '09000000090');
    await seedDemoMembers(core, identity, '09000000093');
    fs.writeFileSync(catalog, JSON.stringify({ records: [{ organization_id: TEST_ORG, items: [{ name: 'لاته', price_amount: '145000', on_request: false }] }] }));
    const core2 = { prisma, plans: new PlanService(prisma), offers: new OfferService(prisma), publications: new PublicationService(prisma) };
    const handler = createHandler({ identity, chat: new ChatModule(chatDb), core: core2, config: { hosts: new Map([[V2, 'v2'], [BIZ, 'business']]), cookieSecure: false, publishedPath: published, catalogPath: catalog } });
    server = http.createServer((q, s) => void handler(q, s));
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(async () => {
    server.close(); fs.rmSync(published, { force: true }); fs.rmSync(catalog, { force: true });
    await prisma.organizationPlan.deleteMany({ where: { organizationId: TEST_ORG } });
    await prisma.$disconnect();
    await dropTestOrg(core); await core.end(); await chatDb.end();
  });

  const call = async (host: string, method: string, url: string, body?: unknown, cookie?: string, csrf = true) => {
    const res = await fetch(base + url, { method, headers: { 'x-forwarded-host': host, 'content-type': 'application/json', ...(csrf && method !== 'GET' ? { 'x-mlino-csrf': '1' } : {}), ...(cookie ? { cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: res.status, json: await res.json() as Record<string, any>, setCookie: res.headers.get('set-cookie') ?? '' };
  };
  const login = async (host: string, phone: string) => {
    const start = await call(host, 'POST', '/api/auth/otp/start', { phone });
    expect(start.status).toBe(200);
    const done = await call(host, 'POST', '/api/auth/otp/verify', { challengeId: start.json.challengeId, code: start.json.testCode });
    expect(done.setCookie).toMatch(/mlino_sid=.+; Path=\/api; HttpOnly; SameSite=Lax/);
    return done.setCookie.split(';')[0];
  };

  it('refuses unknown hosts, missing CSRF header and foreign origins', async () => {
    expect((await call('evil.test', 'GET', '/api/auth/config')).status).toBe(404);
    expect((await call(V2, 'POST', '/api/auth/otp/start', { phone: '09000000001' }, undefined, false)).status).toBe(403);
    const res = await fetch(`${base}/api/auth/otp/start`, { method: 'POST', headers: { 'x-forwarded-host': V2, 'x-mlino-csrf': '1', origin: 'https://evil.test' }, body: '{}' });
    expect(res.status).toBe(403);
  });

  it('customer writes from V2; the business member answers from the panel; the session of one audience is useless on the other', async () => {
    const customer = await login(V2, '09000000001');
    expect((await call(V2, 'GET', `/api/chat/business?organizationId=test-demo-04`)).json).toMatchObject({ available: false, sensitive: true });
    expect((await call(V2, 'POST', '/api/chat/threads', { organizationId: 'test-demo-04', name: 'سارا', body: 'سلام' }, customer)).json.error).toBe('SENSITIVE_BUSINESS');
    const sent = await call(V2, 'POST', '/api/chat/threads', { organizationId: TEST_ORG, name: 'سارا', body: 'سلام' }, customer);
    expect(sent.status).toBe(200);

    expect((await call(BIZ, 'GET', `/api/biz/${TEST_ORG}/chat/threads`, undefined, customer)).status).toBe(401);
    expect((await call(V2, 'GET', `/api/biz/${TEST_ORG}/chat/threads`, undefined, customer)).status).toBe(404);

    const outsider = await login(BIZ, '09000000002');
    expect((await call(BIZ, 'GET', `/api/biz/${TEST_ORG}/chat/threads`, undefined, outsider)).status).toBe(403);

    const member = await login(BIZ, '09000000090');
    const me = await call(BIZ, 'GET', '/api/auth/me', undefined, member);
    expect(me.json.organizations).toEqual(expect.arrayContaining([expect.objectContaining({ organizationId: TEST_ORG, canChat: true, published: true })]));
    const threads = await call(BIZ, 'GET', `/api/biz/${TEST_ORG}/chat/threads`, undefined, member);
    expect(threads.json.threads[0]).toMatchObject({ customerName: 'سارا', unread: 1 });
    expect(JSON.stringify(threads.json)).not.toMatch(/0900000000|phone/i);
    const id = threads.json.threads[0].id;
    expect((await call(BIZ, 'POST', `/api/biz/${TEST_ORG}/chat/threads/${id}/messages`, { body: 'سلام، بفرمایید' }, member)).status).toBe(200);
    const log = await call(BIZ, 'GET', `/api/biz/${TEST_ORG}/chat/access-log`, undefined, member);
    expect(log.json.entries.every((e: Record<string, unknown>) => e.actorRef === undefined && e.byMe === true)).toBe(true);

    const back = await call(V2, 'GET', `/api/chat/threads/${id}/messages`, undefined, customer);
    expect(back.json.messages.map((m: { sender: string }) => m.sender)).toEqual(['customer', 'business']);

    expect((await call(BIZ, 'DELETE', '/api/auth/account', undefined, member)).status).toBe(409);
    const gone = await call(V2, 'DELETE', '/api/auth/account', undefined, customer);
    expect(gone.json).toEqual({ erased: true, conversations: 1 });
    expect((await call(V2, 'GET', '/api/chat/threads', undefined, customer)).status).toBe(401);
  });

  it('panel: FREE plan allows two offers a month and no auto-reply; drafts reach nobody until a person publishes; PRO unlocks both', async () => {
    const member = await login(BIZ, '09000000093');
    const plan = await call(BIZ, 'GET', `/api/biz/${TEST_ORG}/plan`, undefined, member);
    expect(plan.status).toBe(200);
    expect(plan.json).toMatchObject({ tier: 'FREE', limits: { offersPerMonth: 2, chatAutoReply: false } });
    const ids: string[] = [];
    for (let i = 0; i < 3; i += 1) {
      const draft = await call(BIZ, 'POST', `/api/biz/${TEST_ORG}/offers`, { name: `آفر ${i}`, validDays: 7, radiusMeters: 800 }, member);
      expect(draft.json.status).toBe('UNPUBLISHED');
      ids.push(draft.json.versionId);
    }
    expect((await call(BIZ, 'POST', `/api/biz/${TEST_ORG}/offers`, { name: 'x', validDays: 7, radiusMeters: 50 }, member)).status).toBe(400);
    expect((await call(BIZ, 'POST', `/api/biz/${TEST_ORG}/offers/${ids[0]}/publish`, {}, member)).json.outcome).toBe('PUBLISHED');
    expect((await call(BIZ, 'POST', `/api/biz/${TEST_ORG}/offers/${ids[1]}/publish`, {}, member)).status).toBe(200);
    const third = await call(BIZ, 'POST', `/api/biz/${TEST_ORG}/offers/${ids[2]}/publish`, {}, member);
    expect(third.status).toBe(409);
    expect(third.json.error).toBe('PLAN_LIMIT');
    const list = await call(BIZ, 'GET', `/api/biz/${TEST_ORG}/offers`, undefined, member);
    expect(list.json.offers.filter((o: { status: string }) => o.status === 'PUBLISHED')).toHaveLength(2);
    expect(list.json.offers[0].radiusMeters).toBe(800);
    expect((await call(BIZ, 'POST', `/api/biz/${TEST_ORG}/chat/auto-reply`, { on: true }, member)).status).toBe(409);

    expect((await call(BIZ, 'POST', `/api/biz/${TEST_ORG}/plan`, { tier: 'PRO' }, member)).json.tier).toBe('PRO');
    expect((await call(BIZ, 'POST', `/api/biz/${TEST_ORG}/offers/${ids[2]}/publish`, {}, member)).status).toBe(200);
    expect((await call(BIZ, 'POST', `/api/biz/${TEST_ORG}/chat/auto-reply`, { on: true }, member)).json.autoReply).toBe(true);

    const customer = await login(V2, '09000000011');
    expect((await call(V2, 'GET', `/api/chat/business?organizationId=${TEST_ORG}`)).json.autoReply).toBe(true);
    const sent = await call(V2, 'POST', '/api/chat/threads', { organizationId: TEST_ORG, name: 'مینا', body: 'لاته چنده؟' }, customer);
    const msgs = await call(V2, 'GET', `/api/chat/threads/${sent.json.threadId}/messages`, undefined, customer);
    expect(msgs.json.messages[1]).toMatchObject({ sender: 'business', auto: true });
    expect(msgs.json.messages[1].body).toContain('۱۴۵٬۰۰۰');
    await call(V2, 'POST', `/api/chat/threads/${sent.json.threadId}/messages`, { body: 'پارکینگ دارید؟' }, customer);
    const pending = await call(BIZ, 'GET', `/api/biz/${TEST_ORG}/chat/pending`, undefined, member);
    expect(pending.json.questions.map((q: { question: string }) => q.question)).toEqual(['پارکینگ دارید؟']);
    const ans = await call(BIZ, 'POST', `/api/biz/${TEST_ORG}/chat/pending/${pending.json.questions[0].id}/answer`, { answer: 'بله، روبه‌روی کافه.', learn: true }, member);
    expect(ans.json.knowledgeId).toBeTruthy();
    expect((await call(BIZ, 'GET', `/api/biz/${TEST_ORG}/chat/knowledge`, undefined, member)).json.entries[0]).toMatchObject({ question: 'پارکینگ دارید؟', learned: true });

    const outsider = await login(BIZ, '09000000092');
    expect((await call(BIZ, 'GET', `/api/biz/${TEST_ORG}/plan`, undefined, outsider)).status).toBe(403);
    expect((await call(BIZ, 'POST', `/api/biz/${TEST_ORG}/plan`, { tier: 'MAX' }, outsider)).status).toBe(403);
  });
});
