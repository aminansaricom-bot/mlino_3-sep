import crypto from 'node:crypto';
import { CoreIdentity, IdentityError, normalizePhone, testDelivery } from '../../identity';
import { seedDemoMembers } from '../../http/api/seed-demo-members';
import { Clock, TEST_ORG, createTestOrg, dropTestOrg, pools, resetSchemas } from './support';

const { core, chat } = pools();
const pepper = crypto.randomBytes(32);
const code = async (p: Promise<unknown>) => { try { await p; return 'OK'; } catch (e) { return e instanceof IdentityError ? e.code : String(e); } };

describe('Core identity — phone code, server-side session (D-74)', () => {
  let clock: Clock;
  let id: CoreIdentity;
  beforeEach(async () => { await resetSchemas(core, chat); clock = new Clock(); id = new CoreIdentity(core, { pepper, delivery: testDelivery, now: clock.now }); });
  afterAll(async () => { await dropTestOrg(core); await core.end(); await chat.end(); });

  it('normalizes Persian digits and +98, rejects anything that is not a mobile number', () => {
    expect(normalizePhone('+98 900 000 0001')).toBe('09000000001');
    expect(normalizePhone('۰۹۰۰۰۰۰۰۰۰۱')).toBe('09000000001');
    expect(() => normalizePhone('021-1234567')).toThrow(IdentityError);
  });

  it('in test delivery only the fictional range is accepted and the code is returned for display', async () => {
    expect(await code(id.startChallenge({ phone: '09121234567', audience: 'v2' }))).toBe('REAL_NUMBER_NEEDS_SMS');
    const c = await id.startChallenge({ phone: '09000000001', audience: 'v2' });
    expect(c.testCode).toMatch(/^\d{6}$/);
    expect(c.expiresInSeconds).toBe(120);
  });

  it('a right code opens a session for that audience only; the token is never stored and the phone never kept', async () => {
    const c = await id.startChallenge({ phone: '09000000001', audience: 'v2' });
    const login = await id.verifyChallenge({ challengeId: c.challengeId, code: c.testCode!, audience: 'v2' });
    expect(login.phoneHint).toBe('0001');
    expect(await id.resolveSession(login.token, 'v2')).toMatchObject({ personId: login.personId, audience: 'v2' });
    expect(await id.resolveSession(login.token, 'business')).toBeNull();
    const stored = await core.query(`SELECT (SELECT json_agg(p)::text FROM core_identity.persons p) AS persons, (SELECT json_agg(s)::text FROM core_identity.sessions s) AS sessions, (SELECT json_agg(o)::text FROM core_identity.otp_challenges o) AS codes`);
    const all = JSON.stringify(stored.rows[0]);
    expect(all).not.toContain('09000000001');
    expect(all).not.toContain(login.token);
    expect(all).not.toContain(c.testCode!);
    expect(await code(id.verifyChallenge({ challengeId: c.challengeId, code: c.testCode!, audience: 'v2' }))).toBe('CHALLENGE_INVALID');
  });

  it('wrong codes count down, five lock the challenge, and codes expire after two minutes', async () => {
    const c = await id.startChallenge({ phone: '09000000002', audience: 'business' });
    const wrong = c.testCode === '111111' ? '222222' : '111111';
    for (let i = 0; i < 4; i += 1) expect(await code(id.verifyChallenge({ challengeId: c.challengeId, code: wrong, audience: 'business' }))).toBe('CODE_WRONG');
    expect(await code(id.verifyChallenge({ challengeId: c.challengeId, code: wrong, audience: 'business' }))).toBe('TOO_MANY_ATTEMPTS');
    expect(await code(id.verifyChallenge({ challengeId: c.challengeId, code: c.testCode!, audience: 'business' }))).toBe('TOO_MANY_ATTEMPTS');
    clock.advance(61_000);
    const d = await id.startChallenge({ phone: '09000000002', audience: 'business' });
    clock.advance(121_000);
    expect(await code(id.verifyChallenge({ challengeId: d.challengeId, code: d.testCode!, audience: 'business' }))).toBe('CHALLENGE_INVALID');
  });

  it('one code a minute and five an hour per number', async () => {
    await id.startChallenge({ phone: '09000000003', audience: 'v2' });
    expect(await code(id.startChallenge({ phone: '09000000003', audience: 'v2' }))).toBe('RATE_LIMITED');
    for (let i = 0; i < 4; i += 1) { clock.advance(61_000); await id.startChallenge({ phone: '09000000003', audience: 'v2' }); }
    clock.advance(61_000);
    expect(await code(id.startChallenge({ phone: '09000000003', audience: 'v2' }))).toBe('RATE_LIMITED');
  });

  it('closing sessions (one or all) ends them without touching membership or grants (D-70)', async () => {
    await createTestOrg(core);
    await seedDemoMembersFor('09000000090');
    const c = await id.startChallenge({ phone: '09000000090', audience: 'business' });
    const a = await id.verifyChallenge({ challengeId: c.challengeId, code: c.testCode!, audience: 'business' });
    clock.advance(61_000);
    const c2 = await id.startChallenge({ phone: '09000000090', audience: 'business' });
    const b = await id.verifyChallenge({ challengeId: c2.challengeId, code: c2.testCode!, audience: 'business' });
    await id.closeSession(a.sessionId);
    expect(await id.resolveSession(a.token, 'business')).toBeNull();
    expect(await id.resolveSession(b.token, 'business')).not.toBeNull();
    expect(await id.closeAllSessions(b.personId)).toBe(1);
    expect(await id.resolveSession(b.token, 'business')).toBeNull();
    expect(await id.hasPermission(b.personId, TEST_ORG, 'chat.reply')).toBe(true);
    expect(await code(id.erasePerson(b.personId))).toBe('MEMBER_OF_ORGANIZATION');
  });

  it('a person without memberships is erased for real, leaving only an opaque record', async () => {
    const c = await id.startChallenge({ phone: '09000000004', audience: 'v2' });
    const login = await id.verifyChallenge({ challengeId: c.challengeId, code: c.testCode!, audience: 'v2' });
    await id.erasePerson(login.personId);
    expect((await core.query('SELECT 1 FROM core_identity.persons WHERE id = $1', [login.personId])).rowCount).toBe(0);
    expect((await core.query('SELECT 1 FROM core_identity.sessions')).rowCount).toBe(0);
    const log = await core.query('SELECT ref::text FROM core_identity.erasure_log');
    expect(log.rowCount).toBe(1);
    expect(log.rows[0].ref).not.toBe(login.personId);
  });

  async function seedDemoMembersFor(phone: string): Promise<void> {
    // The seed only touches test-demo-* organizations; the spec org matches that range.
    const out = await seedDemoMembers(core, id, phone);
    expect(out.added + out.existing).toBeGreaterThanOrEqual(1);
    expect(await code(seedDemoMembers(core, id, '09121234567'))).toBe('TEST_NUMBER_NOT_ALLOWED');
  }
});
