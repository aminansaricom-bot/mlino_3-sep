import crypto from 'node:crypto';
import { CoreIdentity, IdentityError } from '../../identity';
import { smsIrDelivery } from '../../identity/smsir';
import { Clock, dropTestOrg, pools, resetSchemas } from './support';

const { core, chat } = pools();
const pepper = crypto.randomBytes(32);
const code = async (p: Promise<unknown>) => { try { await p; return 'OK'; } catch (e) { return e instanceof IdentityError ? e.code : String(e); } };

/** A stand-in for sms.ir: records what would be sent, answers like the real API. Nothing leaves the machine. */
function fakeSmsIr(answer: { ok: boolean; status: number } = { ok: true, status: 1 }) {
  const sent: Array<{ url: string; headers: Record<string, string>; body: any }> = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    sent.push({ url, headers: init.headers as Record<string, string>, body: JSON.parse(String(init.body)) });
    return { ok: answer.ok, json: async () => ({ status: answer.status, message: answer.status === 1 ? 'موفق' : 'خطا' }) } as Response;
  }) as unknown as typeof fetch;
  return { sent, fetchImpl };
}

describe('SMS delivery through sms.ir quick send (D-82)', () => {
  let clock: Clock;
  beforeEach(async () => { await resetSchemas(core, chat); clock = new Clock(); });
  afterAll(async () => { await dropTestOrg(core); await core.end(); await chat.end(); });

  it('a real number gets the code by SMS (template + CODE parameter, key in a header); the code is not returned', async () => {
    const sms = fakeSmsIr();
    const id = new CoreIdentity(core, { pepper, delivery: smsIrDelivery({ apiKey: 'k'.repeat(40), templateId: 123456, fetchImpl: sms.fetchImpl }), now: clock.now });
    const c = await id.startChallenge({ phone: '+98 912 123 4567', audience: 'business' });
    expect(c.testCode).toBeUndefined();
    expect(sms.sent).toHaveLength(1);
    expect(sms.sent[0].url).toBe('https://api.sms.ir/v1/send/verify');
    expect(sms.sent[0].headers['x-api-key']).toBe('k'.repeat(40));
    expect(sms.sent[0].body).toMatchObject({ mobile: '09121234567', templateId: 123456, parameters: [{ name: 'CODE' }] });
    const sentCode = sms.sent[0].body.parameters[0].value as string;
    expect(sentCode).toMatch(/^\d{6}$/);
    const login = await id.verifyChallenge({ challengeId: c.challengeId, code: sentCode, audience: 'business' });
    expect(login).toMatchObject({ phoneHint: '4567', testIdentity: false });
  });

  it('test numbers never reach the provider: allowed on screen only in demo mode, refused otherwise', async () => {
    const sms = fakeSmsIr();
    const demo = new CoreIdentity(core, { pepper, delivery: smsIrDelivery({ apiKey: 'k'.repeat(40), templateId: 1, fetchImpl: sms.fetchImpl }), allowTestNumbers: true, now: clock.now });
    expect((await demo.startChallenge({ phone: '09000000001', audience: 'v2' })).testCode).toMatch(/^\d{6}$/);
    expect(demo.testNumbersAllowed).toBe(true);
    const strict = new CoreIdentity(core, { pepper, delivery: smsIrDelivery({ apiKey: 'k'.repeat(40), templateId: 1, fetchImpl: sms.fetchImpl }), now: clock.now });
    expect(await code(strict.startChallenge({ phone: '09000000002', audience: 'v2' }))).toBe('TEST_NUMBER_NOT_ALLOWED');
    expect(await code(strict.personForPhone('09000000002'))).toBe('TEST_NUMBER_NOT_ALLOWED');
    expect(sms.sent).toHaveLength(0);
  });

  it('a refused or failed send is SMS_FAILED; a daily cap protects the credit', async () => {
    const refused = fakeSmsIr({ ok: true, status: 0 });
    const a = new CoreIdentity(core, { pepper, delivery: smsIrDelivery({ apiKey: 'k'.repeat(40), templateId: 1, fetchImpl: refused.fetchImpl }), now: clock.now });
    expect(await code(a.startChallenge({ phone: '09121111111', audience: 'v2' }))).toBe('SMS_FAILED');

    const sms = fakeSmsIr();
    const b = new CoreIdentity(core, { pepper, delivery: smsIrDelivery({ apiKey: 'k'.repeat(40), templateId: 1, fetchImpl: sms.fetchImpl }), realDailyLimit: 2, now: clock.now });
    await b.startChallenge({ phone: '09122222222', audience: 'v2' });
    expect(await code(b.startChallenge({ phone: '09123333333', audience: 'v2' }))).toBe('RATE_LIMITED');
    clock.advance(25 * 3600_000);
    expect(await code(b.startChallenge({ phone: '09123333333', audience: 'v2' }))).toBe('OK');
  });

  it('refuses to start without a key or a template', () => {
    expect(() => smsIrDelivery({ apiKey: '', templateId: 1 })).toThrow();
    expect(() => smsIrDelivery({ apiKey: 'k'.repeat(40), templateId: Number('') })).toThrow();
  });
});
