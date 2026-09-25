import crypto from 'node:crypto';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { CoreIdentity, IdentityError, testDelivery } from '../../identity';
import { googleVerifier, maskEmail } from '../../identity/google';
import { ChatModule } from '../../chat';
import { createHandler } from '../../http/api/app';
import { dropTestOrg, pools, resetSchemas } from './support';

const { core, chat } = pools();
const CLIENT = 'test-client.apps.googleusercontent.com';
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const other = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwks = { keys: [{ ...(publicKey.export({ format: 'jwk' }) as object), kid: 'k1', alg: 'RS256', use: 'sig' }] };
const fakeFetch = (async () => new Response(JSON.stringify(jwks), { status: 200, headers: { 'cache-control': 'public, max-age=3600' } })) as typeof fetch;
const NOW = Date.parse('2026-09-25T12:00:00Z');

function token(claims: Record<string, unknown>, key = privateKey, kid = 'k1'): string {
  const enc = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const body = `${enc({ alg: 'RS256', kid, typ: 'JWT' })}.${enc({ iss: 'https://accounts.google.com', aud: CLIENT, sub: '1234567890', email: 'ali.test@gmail.com', email_verified: true, iat: NOW / 1000, exp: NOW / 1000 + 3600, ...claims })}`;
  return `${body}.${crypto.sign('RSA-SHA256', Buffer.from(body), key).toString('base64url')}`;
}
const verifier = () => googleVerifier({ clientId: CLIENT, fetchImpl: fakeFetch, now: () => new Date(NOW) });
const code = async (p: Promise<unknown>) => { try { await p; return 'OK'; } catch (e) { return e instanceof IdentityError ? e.code : String(e); } };

describe('Sign-in with Google (D-90)', () => {
  beforeEach(async () => { await resetSchemas(core, chat); });
  afterAll(async () => { await dropTestOrg(core); await core.end(); await chat.end(); });

  it('accepts only a token signed by Google\'s key, for our client, unexpired, with a verified email', async () => {
    const v = verifier();
    expect(await v.verify(token({}))).toEqual({ sub: '1234567890', email: 'ali.test@gmail.com' });
    expect(await code(v.verify(token({}, other.privateKey)))).toBe('GOOGLE_TOKEN_INVALID');
    expect(await code(v.verify(token({ aud: 'someone-else' })))).toBe('GOOGLE_TOKEN_INVALID');
    expect(await code(v.verify(token({ iss: 'https://evil.example' })))).toBe('GOOGLE_TOKEN_INVALID');
    expect(await code(v.verify(token({ exp: NOW / 1000 - 3600 })))).toBe('GOOGLE_TOKEN_INVALID');
    expect(await code(v.verify(token({ email_verified: false })))).toBe('GOOGLE_TOKEN_INVALID');
    expect(await code(v.verify(token({}, privateKey, 'unknown-kid')))).toBe('GOOGLE_TOKEN_INVALID');
    expect(await code(v.verify('not.a.token'))).toBe('GOOGLE_TOKEN_INVALID');
    const down = googleVerifier({ clientId: CLIENT, fetchImpl: (async () => { throw new Error('offline'); }) as typeof fetch });
    expect(await code(down.verify(token({})))).toBe('GOOGLE_UNAVAILABLE');
  });

  it('keeps only an HMAC of the subject and a masked email; the same Google account is the same person', async () => {
    const id = new CoreIdentity(core, { pepper: crypto.randomBytes(32), delivery: testDelivery });
    const a = await id.loginWithGoogle({ subject: '1234567890', emailHint: maskEmail('ali.test@gmail.com'), audience: 'v2' });
    const b = await id.loginWithGoogle({ subject: '1234567890', emailHint: maskEmail('ali.test@gmail.com'), audience: 'business' });
    expect(a.personId).toBe(b.personId);
    expect(a.emailHint).toBe('a•••@gmail.com');
    expect(await id.resolveSession(a.token, 'v2')).toMatchObject({ personId: a.personId, emailHint: 'a•••@gmail.com' });
    expect(await id.resolveSession(a.token, 'business')).toBeNull();
    const stored = JSON.stringify((await core.query(`SELECT (SELECT json_agg(p)::text FROM core_identity.persons p) AS p, (SELECT json_agg(e)::text FROM core_identity.external_logins e) AS e`)).rows[0]);
    expect(stored).not.toContain('1234567890');
    expect(stored).not.toContain('ali.test');
    await id.erasePerson(a.personId);
    expect((await core.query('SELECT count(*)::int AS n FROM core_identity.external_logins')).rows[0].n).toBe(0);
  });

  it('API: /api/auth/google opens a session for the host\'s audience; off (404) without a client ID', async () => {
    const identity = new CoreIdentity(core, { pepper: crypto.randomBytes(32), delivery: testDelivery });
    const hosts = new Map([['explore.test', 'v2' as const], ['business.test', 'business' as const]]);
    const serve = async (google?: ReturnType<typeof verifier>) => {
      const handler = createHandler({ identity, chat: new ChatModule(chat), google, config: { hosts, cookieSecure: false, publishedPath: '/nonexistent.json' } });
      const server = http.createServer((q, s) => void handler(q, s));
      await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
      return { server, base: `http://127.0.0.1:${(server.address() as AddressInfo).port}` };
    };
    const call = async (base: string, method: string, url: string, body?: unknown, cookie?: string) => {
      const res = await fetch(base + url, { method, headers: { 'x-forwarded-host': 'explore.test', 'content-type': 'application/json', 'x-mlino-csrf': '1', ...(cookie ? { cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
      return { status: res.status, json: await res.json() as Record<string, any>, setCookie: res.headers.get('set-cookie') ?? '' };
    };

    const off = await serve();
    expect((await call(off.base, 'GET', '/api/auth/config')).json.google).toBeNull();
    expect((await call(off.base, 'POST', '/api/auth/google', { credential: token({}) })).status).toBe(404);
    off.server.close();

    const on = await serve(verifier());
    expect((await call(on.base, 'GET', '/api/auth/config')).json.google).toBe(CLIENT);
    expect((await call(on.base, 'POST', '/api/auth/google', { credential: token({ aud: 'x' }) })).json.error).toBe('GOOGLE_TOKEN_INVALID');
    const ok = await call(on.base, 'POST', '/api/auth/google', { credential: token({}) });
    expect(ok.status).toBe(200);
    expect(ok.setCookie).toMatch(/mlino_sid=.+; Path=\/api; HttpOnly; SameSite=Lax/);
    const cookie = ok.setCookie.split(';')[0];
    expect((await call(on.base, 'GET', '/api/auth/me', undefined, cookie)).json.person).toEqual({ phoneHint: '', emailHint: 'a•••@gmail.com', test: false });
    on.server.close();
  });
});
