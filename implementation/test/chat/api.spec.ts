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
import { TEST_ORG, createTestOrg, dropTestOrg, pools, resetSchemas } from './support';

const { core, chat: chatDb } = pools();
const V2 = 'explore.test';
const BIZ = 'business.test';

describe('MLINO API — audiences, CSRF, permission per request', () => {
  let server: http.Server;
  let base: string;
  const published = path.join(os.tmpdir(), `mlino-published-${process.pid}.json`);

  beforeAll(async () => {
    await resetSchemas(core, chatDb);
    await createTestOrg(core);
    fs.writeFileSync(published, JSON.stringify({ records: [
      { business: { organization_id: TEST_ORG, name: 'کافه آزمون' }, capabilities: [{ name: 'قهوه' }] },
      { business: { organization_id: 'test-demo-04', name: 'داروخانه نمایشی' }, capabilities: [{ name: 'خدمات دارویی' }] },
    ] }));
    const identity = new CoreIdentity(core, { pepper: crypto.randomBytes(32), delivery: testDelivery });
    await seedDemoMembers(core, identity, '09000000090');
    const handler = createHandler({ identity, chat: new ChatModule(chatDb), config: { hosts: new Map([[V2, 'v2'], [BIZ, 'business']]), cookieSecure: false, publishedPath: published } });
    server = http.createServer((q, s) => void handler(q, s));
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(async () => { server.close(); fs.rmSync(published, { force: true }); await dropTestOrg(core); await core.end(); await chatDb.end(); });

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
});
