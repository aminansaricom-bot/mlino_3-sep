import crypto from 'node:crypto';
import { IdentityError } from './index';

/**
 * Google sign-in (owner's request, D-90): the browser gets an ID token from Google's own button; Core checks it
 * here and keeps only what a login needs. No new dependency: the token's RS256 signature is checked with Node's
 * crypto against Google's published keys, then issuer, audience (our client ID), expiry and a verified email.
 * Nothing from the token is stored except an HMAC of the Google subject and a masked email hint (see CoreIdentity).
 */

export const GOOGLE_CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com']);
const SKEW_MS = 60_000;

export interface GoogleClaims { readonly sub: string; readonly email: string }

export interface GoogleVerifier {
  readonly clientId: string;
  verify(idToken: string): Promise<GoogleClaims>;
}

interface Jwk { kid: string; kty: string; n: string; e: string; alg?: string }

const b64json = (part: string): Record<string, unknown> => {
  try { return JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as Record<string, unknown>; }
  catch { throw new IdentityError('GOOGLE_TOKEN_INVALID', 'malformed token'); }
};

export function googleVerifier(options: {
  clientId: string;
  fetchImpl?: typeof fetch;
  now?: () => Date;
  certsUrl?: string;
}): GoogleVerifier {
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? (() => new Date());
  let keys: Map<string, crypto.KeyObject> = new Map();
  let keysUntil = 0;

  async function loadKeys(): Promise<void> {
    let res: Response;
    try { res = await fetchImpl(options.certsUrl ?? GOOGLE_CERTS_URL, { signal: AbortSignal.timeout(8000) }); }
    catch { throw new IdentityError('GOOGLE_UNAVAILABLE', 'Google keys could not be fetched'); }
    if (!res.ok) throw new IdentityError('GOOGLE_UNAVAILABLE', `Google keys answered ${res.status}`);
    const body = await res.json() as { keys?: Jwk[] };
    const next = new Map<string, crypto.KeyObject>();
    for (const k of body.keys ?? []) {
      if (k.kty === 'RSA' && typeof k.kid === 'string') next.set(k.kid, crypto.createPublicKey({ key: { kty: 'RSA', n: k.n, e: k.e }, format: 'jwk' }));
    }
    const maxAge = Number(/max-age=(\d+)/.exec(res.headers.get('cache-control') ?? '')?.[1] ?? 3600);
    keys = next;
    keysUntil = now().getTime() + Math.min(Math.max(maxAge, 60), 24 * 3600) * 1000;
  }

  return {
    clientId: options.clientId,
    async verify(idToken: string): Promise<GoogleClaims> {
      const parts = String(idToken ?? '').split('.');
      if (parts.length !== 3 || idToken.length > 4096) throw new IdentityError('GOOGLE_TOKEN_INVALID', 'not a token');
      const header = b64json(parts[0]);
      if (header.alg !== 'RS256' || typeof header.kid !== 'string') throw new IdentityError('GOOGLE_TOKEN_INVALID', 'unexpected algorithm');
      if (now().getTime() >= keysUntil || !keys.has(header.kid)) await loadKeys();
      const key = keys.get(header.kid);
      if (!key) throw new IdentityError('GOOGLE_TOKEN_INVALID', 'unknown key');
      const signed = crypto.verify('RSA-SHA256', Buffer.from(`${parts[0]}.${parts[1]}`), key, Buffer.from(parts[2], 'base64url'));
      if (!signed) throw new IdentityError('GOOGLE_TOKEN_INVALID', 'bad signature');

      const c = b64json(parts[1]);
      const t = now().getTime();
      if (!ISSUERS.has(String(c.iss))) throw new IdentityError('GOOGLE_TOKEN_INVALID', 'wrong issuer');
      const aud = Array.isArray(c.aud) ? c.aud : [c.aud];
      if (!aud.includes(options.clientId)) throw new IdentityError('GOOGLE_TOKEN_INVALID', 'token is for another app');
      if (typeof c.exp !== 'number' || c.exp * 1000 < t - SKEW_MS) throw new IdentityError('GOOGLE_TOKEN_INVALID', 'token expired');
      if (typeof c.iat === 'number' && c.iat * 1000 > t + 5 * SKEW_MS) throw new IdentityError('GOOGLE_TOKEN_INVALID', 'token from the future');
      if (c.email_verified !== true && c.email_verified !== 'true') throw new IdentityError('GOOGLE_TOKEN_INVALID', 'email not verified');
      if (typeof c.sub !== 'string' || !c.sub || c.sub.length > 255 || typeof c.email !== 'string' || !c.email.includes('@')) {
        throw new IdentityError('GOOGLE_TOKEN_INVALID', 'missing subject or email');
      }
      return { sub: c.sub, email: c.email };
    },
  };
}

/** «a•••@gmail.com»: enough to recognise one's own account, never the full address. */
export function maskEmail(email: string): string {
  const [local, domain = ''] = String(email).toLowerCase().split('@');
  return `${local.slice(0, 1)}•••@${domain}`.slice(0, 64);
}
