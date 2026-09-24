import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { CoreIdentity, testDelivery } from '../../identity';
import { CHAT_PERMISSION, ChatModule } from '../../chat';
import { createHandler } from '../../http/api/app';
import { seedDemoMembers } from '../../http/api/seed-demo-members';
import { prisma } from '../../foundation/prisma-client';
import { MembershipService } from '../../core/membership-service';
import { PermissionGrantService } from '../../core/permission-grant-service';
import { TEST_ORG, createTestOrg, dropTestOrg, pools, resetSchemas } from './support';

const { core, chat: chatDb } = pools();
const BIZ = 'business.test';

describe('members and permissions from the panel — Core rules unchanged (D-57)', () => {
  let server: http.Server;
  let base: string;
  const published = path.join(os.tmpdir(), `mlino-published-members-${process.pid}.json`);

  beforeAll(async () => {
    await resetSchemas(core, chatDb);
    await createTestOrg(core);
    fs.writeFileSync(published, JSON.stringify({ records: [{ business: { organization_id: TEST_ORG, name: 'کافه آزمون' }, capabilities: [] }] }));
    const identity = new CoreIdentity(core, { pepper: crypto.randomBytes(32), delivery: testDelivery });
    await seedDemoMembers(core, identity, '09000000090');
    const members = { prisma, identity, memberships: new MembershipService(prisma), grants: new PermissionGrantService(prisma, undefined, [CHAT_PERMISSION]) };
    const handler = createHandler({ identity, chat: new ChatModule(chatDb), members, config: { hosts: new Map([[BIZ, 'business']]), cookieSecure: false, publishedPath: published } });
    server = http.createServer((q, s) => void handler(q, s));
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(async () => {
    server.close(); fs.rmSync(published, { force: true });
    await prisma.$disconnect();
    await dropTestOrg(core); await core.end(); await chatDb.end();
  });

  const call = async (method: string, url: string, body?: unknown, cookie?: string) => {
    const res = await fetch(base + url, { method, headers: { 'x-forwarded-host': BIZ, 'content-type': 'application/json', ...(method !== 'GET' ? { 'x-mlino-csrf': '1' } : {}), ...(cookie ? { cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await res.text();
    return { status: res.status, json: JSON.parse(text) as Record<string, any>, text };
  };
  const login = async (phone: string) => {
    const start = await call('POST', '/api/auth/otp/start', { phone });
    const done = await fetch(`${base}/api/auth/otp/verify`, { method: 'POST', headers: { 'x-forwarded-host': BIZ, 'content-type': 'application/json', 'x-mlino-csrf': '1' }, body: JSON.stringify({ challengeId: start.json.challengeId, code: start.json.testCode }) });
    return (done.headers.get('set-cookie') ?? '').split(';')[0];
  };
  const org = `/api/biz/${TEST_ORG}`;

  it('an admin adds a colleague by number, grants and takes back a permission, and removes them; only last four digits are ever shown', async () => {
    const owner = await login('09000000090');
    const me = await call('GET', '/api/auth/me', undefined, owner);
    expect(me.json.organizations.find((o: any) => o.organizationId === TEST_ORG).permissions).toEqual(expect.arrayContaining(['chat.reply', 'permission_grant.issue']));

    const list = await call('GET', `${org}/members`, undefined, owner);
    expect(list.status).toBe(200);
    expect(list.json.grantable).toEqual(expect.arrayContaining(['chat.reply', 'offer.manage', 'membership.create']));
    expect(list.json.members.find((m: any) => m.isMe)).toMatchObject({ phoneHint: '0090', test: true });
    expect(list.json.members.find((m: any) => m.founding)).toMatchObject({ phoneHint: null });

    expect((await call('POST', `${org}/members`, { phone: '09121234567' }, owner)).json.error).toBe('REAL_NUMBER_NEEDS_SMS');
    const added = await call('POST', `${org}/members`, { phone: '09000000071' }, owner);
    expect(added.status).toBe(200);
    expect((await call('POST', `${org}/members`, { phone: '09000000071' }, owner)).status).toBe(409);

    // The new member can log in, sees the business, but holds nothing yet.
    const staff = await login('09000000071');
    const staffMe = await call('GET', '/api/auth/me', undefined, staff);
    expect(staffMe.json.organizations.find((o: any) => o.organizationId === TEST_ORG)).toMatchObject({ permissions: [], canChat: false });
    expect((await call('GET', `${org}/chat/threads`, undefined, staff)).status).toBe(403);
    expect((await call('GET', `${org}/members`, undefined, staff)).json.error).toBe('ADMIN_REQUIRED');

    const grant = await call('POST', `${org}/members/${added.json.membershipId}/grants`, { key: 'chat.reply' }, owner);
    expect(grant.status).toBe(200);
    expect((await call('GET', `${org}/chat/threads`, undefined, staff)).status).toBe(200);

    // Unknown keys, keys the granter does not hold, and grants by a non-admin are refused by Core.
    expect((await call('POST', `${org}/members/${added.json.membershipId}/grants`, { key: 'accounting.post' }, owner)).status).toBe(400);
    expect((await call('POST', `${org}/members/${added.json.membershipId}/grants`, { key: 'evidence.manage' }, owner)).status).toBe(403);
    expect((await call('POST', `${org}/members/${list.json.me}/grants`, { key: 'chat.reply' }, staff)).status).toBe(403);

    const after = await call('GET', `${org}/members`, undefined, owner);
    expect(after.text).not.toContain('09000000071');
    expect(after.json.members.find((m: any) => m.membershipId === added.json.membershipId)).toMatchObject({ phoneHint: '0071', grants: [{ key: 'chat.reply', founding: false }] });

    // Taking the permission back works from the very next request (checked per act, D-66).
    expect((await call('POST', `${org}/grants/${grant.json.grantId}/revoke`, {}, owner)).status).toBe(200);
    expect((await call('GET', `${org}/chat/threads`, undefined, staff)).status).toBe(403);

    expect((await call('POST', `${org}/members/${list.json.me}/revoke`, {}, owner)).json.error).toBe('SELF_REMOVAL');
    expect((await call('POST', `${org}/members/${added.json.membershipId}/revoke`, {}, owner)).status).toBe(200);
    expect((await call('GET', '/api/auth/me', undefined, staff)).json.organizations.some((o: any) => o.organizationId === TEST_ORG)).toBe(false);
    expect((await call('GET', `${org}/members`, undefined, staff)).status).toBe(403);
  });

  it('module keys are declared by modules and may not pose as Core keys', () => {
    expect(() => new PermissionGrantService(prisma, undefined, ['offer.manage'])).toThrow();
    expect(() => new PermissionGrantService(prisma, undefined, ['Chat'])).toThrow();
    const g = new PermissionGrantService(prisma, undefined, ['chat.reply']);
    expect(g.isGrantable('chat.reply') && g.isGrantable('offer.manage')).toBe(true);
    expect(g.isGrantable('accounting.post')).toBe(false);
    expect(new PermissionGrantService(prisma).isGrantable('chat.reply')).toBe(false);
  });
});
