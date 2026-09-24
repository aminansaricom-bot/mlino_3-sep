import crypto from 'node:crypto';
import type { Pool, PoolClient } from 'pg';

/**
 * Core person identity — OD-08 as decided by the owner (D-74).
 *
 * - Core issues the identity itself: a phone number proven by a one-time code.
 * - The session is an opaque random token. Only its SHA-256 digest is stored;
 *   it carries identity only, never an organization or a permission (D-66).
 * - Sessions can be closed one by one or all at once (D-70). Closing a session
 *   changes no membership and no grant.
 * - The phone number itself is never stored: only an HMAC digest for lookup
 *   and the last four digits as a hint.
 * - Until an SMS provider is connected, delivery is `test`: only the fictional
 *   test range is accepted and the code is returned to the caller for display.
 */

export const IDENTITY_PROVIDER = 'mlino-phone';
export const AUDIENCES = ['v2', 'business'] as const;
export type Audience = (typeof AUDIENCES)[number];

export const OTP_TTL_SECONDS = 120;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_MIN_INTERVAL_SECONDS = 60;
export const OTP_MAX_PER_HOUR = 5;
export const SESSION_TTL_DAYS = 30;

export type IdentityErrorCode =
  | 'PHONE_INVALID' | 'REAL_NUMBER_NEEDS_SMS' | 'TEST_NUMBER_NOT_ALLOWED' | 'RATE_LIMITED'
  | 'CHALLENGE_INVALID' | 'CODE_WRONG' | 'TOO_MANY_ATTEMPTS' | 'AUDIENCE_INVALID'
  | 'SESSION_INVALID' | 'MEMBER_OF_ORGANIZATION';

export class IdentityError extends Error {
  constructor(readonly code: IdentityErrorCode, message: string, readonly detail: Record<string, unknown> = {}) {
    super(`${code}: ${message}`);
    this.name = 'IdentityError';
  }
}

/** A delivered code is shown on screen only by the test delivery. */
export interface OtpDelivery {
  readonly mode: 'test' | 'sms';
  send(phone: string, code: string): Promise<{ displayCode?: string }>;
}

export const testDelivery: OtpDelivery = { mode: 'test', async send(_phone, code) { return { displayCode: code }; } };

const FA = '۰۱۲۳۴۵۶۷۸۹';
const AR = '٠١٢٣٤٥٦٧٨٩';
const TEST_NUMBER = /^090000000(0[1-9]|[1-9]\d)$/;

export function normalizePhone(input: string): string {
  const latin = String(input ?? '')
    .replace(/[۰-۹]/g, (d) => String(FA.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(AR.indexOf(d)))
    .replace(/[\s\-()]/g, '');
  const local = latin.replace(/^(\+98|0098|98)(?=9\d{9}$)/, '0');
  if (!/^09\d{9}$/.test(local)) throw new IdentityError('PHONE_INVALID', 'mobile number must look like 09xxxxxxxxx');
  return local;
}

export function isTestNumber(phone: string): boolean { return TEST_NUMBER.test(phone); }

export interface SessionIdentity {
  readonly sessionId: string;
  readonly personId: string;
  readonly audience: Audience;
  readonly phoneHint: string;
  readonly testIdentity: boolean;
}

export interface VerifiedLogin extends SessionIdentity {
  /** Returned once, to be placed in an HttpOnly cookie. Never stored. */
  readonly token: string;
  readonly expiresAt: Date;
}

export interface CoreIdentityOptions {
  readonly pepper: Buffer;
  readonly delivery: OtpDelivery;
  readonly now?: () => Date;
}

const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest();

export class CoreIdentity {
  private readonly now: () => Date;

  constructor(private readonly pool: Pool, private readonly options: CoreIdentityOptions) {
    if (!options.pepper || options.pepper.length < 32) throw new Error('identity pepper must be at least 32 bytes');
    this.now = options.now ?? (() => new Date());
  }

  get deliveryMode(): 'test' | 'sms' { return this.options.delivery.mode; }

  private hmac(value: string): Buffer { return crypto.createHmac('sha256', this.options.pepper).update(value).digest(); }

  private checkAudience(audience: string): Audience {
    if (!(AUDIENCES as readonly string[]).includes(audience)) throw new IdentityError('AUDIENCE_INVALID', 'unknown audience');
    return audience as Audience;
  }

  async startChallenge(input: { phone: string; audience: string }): Promise<{ challengeId: string; expiresInSeconds: number; testCode?: string }> {
    const audience = this.checkAudience(input.audience);
    const phone = normalizePhone(input.phone);
    const test = isTestNumber(phone);
    if (this.deliveryMode === 'test' && !test) throw new IdentityError('REAL_NUMBER_NEEDS_SMS', 'real numbers are accepted once an SMS provider is connected');
    if (this.deliveryMode === 'sms' && test) throw new IdentityError('TEST_NUMBER_NOT_ALLOWED', 'test numbers are not accepted with real SMS delivery');

    const digest = this.hmac(`phone:${phone}`);
    const now = this.now();
    const recent = await this.pool.query<{ last: Date | null; hour: string }>(
      `SELECT max(created_at) AS last, count(*) FILTER (WHERE created_at > $2) AS hour
         FROM core_identity.otp_challenges WHERE phone_digest = $1`,
      [digest, new Date(now.getTime() - 3600_000)],
    );
    const last = recent.rows[0]?.last ? new Date(recent.rows[0].last) : null;
    if (last && now.getTime() - last.getTime() < OTP_MIN_INTERVAL_SECONDS * 1000) {
      throw new IdentityError('RATE_LIMITED', 'wait before asking for another code', { retryAfterSeconds: Math.ceil(OTP_MIN_INTERVAL_SECONDS - (now.getTime() - last.getTime()) / 1000) });
    }
    if (Number(recent.rows[0]?.hour ?? 0) >= OTP_MAX_PER_HOUR) throw new IdentityError('RATE_LIMITED', 'too many codes this hour', { retryAfterSeconds: 3600 });

    const challengeId = crypto.randomUUID();
    const code = String(crypto.randomInt(100000, 1000000));
    await this.pool.query(
      `INSERT INTO core_identity.otp_challenges (id, phone_digest, phone_hint, test_identity, code_digest, audience, created_at, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [challengeId, digest, phone.slice(-4), test, this.hmac(`otp:${challengeId}:${code}`), audience, now, new Date(now.getTime() + OTP_TTL_SECONDS * 1000)],
    );
    const delivered = await this.options.delivery.send(phone, code);
    return { challengeId, expiresInSeconds: OTP_TTL_SECONDS, ...(delivered.displayCode ? { testCode: delivered.displayCode } : {}) };
  }

  async verifyChallenge(input: { challengeId: string; code: string; audience: string }): Promise<VerifiedLogin> {
    const audience = this.checkAudience(input.audience);
    const code = normalizeCode(input.code);
    if (!/^[0-9a-f-]{36}$/i.test(String(input.challengeId))) throw new IdentityError('CHALLENGE_INVALID', 'unknown challenge');
    // A wrong code must be counted even though the call fails, so the failure is
    // returned out of the transaction (which commits the counter) and thrown after it.
    const outcome = await this.tx(async (db): Promise<VerifiedLogin | IdentityError> => {
      const now = this.now();
      const found = await db.query<{ phone_digest: Buffer; phone_hint: string; test_identity: boolean; code_digest: Buffer; audience: string; expires_at: Date; attempts: number; consumed_at: Date | null }>(
        `SELECT phone_digest, phone_hint, test_identity, code_digest, audience, expires_at, attempts, consumed_at
           FROM core_identity.otp_challenges WHERE id = $1 FOR UPDATE`, [input.challengeId]);
      const c = found.rows[0];
      if (!c || c.consumed_at || c.audience !== audience || new Date(c.expires_at) <= now) throw new IdentityError('CHALLENGE_INVALID', 'code expired or unknown; ask for a new one');
      if (c.attempts >= OTP_MAX_ATTEMPTS) throw new IdentityError('TOO_MANY_ATTEMPTS', 'too many wrong codes; ask for a new one');
      const given = this.hmac(`otp:${input.challengeId}:${code}`);
      if (!crypto.timingSafeEqual(given, c.code_digest)) {
        await db.query('UPDATE core_identity.otp_challenges SET attempts = attempts + 1 WHERE id = $1', [input.challengeId]);
        const remaining = OTP_MAX_ATTEMPTS - c.attempts - 1;
        return new IdentityError(remaining > 0 ? 'CODE_WRONG' : 'TOO_MANY_ATTEMPTS', 'wrong code', { remainingAttempts: Math.max(0, remaining) });
      }
      await db.query('UPDATE core_identity.otp_challenges SET consumed_at = $2 WHERE id = $1', [input.challengeId, now]);

      const person = await db.query<{ id: string }>(
        `INSERT INTO core_identity.persons (id, phone_digest, phone_hint, test_identity, created_at, last_login_at)
         VALUES ($1, $2, $3, $4, $5, $5)
         ON CONFLICT (phone_digest) DO UPDATE SET last_login_at = EXCLUDED.last_login_at
         RETURNING id`,
        [crypto.randomUUID(), c.phone_digest, c.phone_hint, c.test_identity, now]);
      const personId = person.rows[0].id;

      const token = crypto.randomBytes(32).toString('base64url');
      const sessionId = crypto.randomUUID();
      const expiresAt = new Date(now.getTime() + SESSION_TTL_DAYS * 86400_000);
      await db.query(
        `INSERT INTO core_identity.sessions (id, token_digest, person_id, audience, created_at, last_seen_at, expires_at)
         VALUES ($1, $2, $3, $4, $5, $5, $6)`,
        [sessionId, sha256(token), personId, audience, now, expiresAt]);
      return { token, expiresAt, sessionId, personId, audience, phoneHint: c.phone_hint, testIdentity: c.test_identity };
    });
    if (outcome instanceof IdentityError) throw outcome;
    return outcome;
  }

  /** Identity only (D-66). Returns null for anything that is not a live session of this audience. */
  async resolveSession(token: string | undefined, audience: string): Promise<SessionIdentity | null> {
    if (!token || token.length > 100) return null;
    const aud = this.checkAudience(audience);
    const now = this.now();
    const r = await this.pool.query<{ id: string; person_id: string; phone_hint: string; test_identity: boolean; last_seen_at: Date }>(
      `SELECT s.id, s.person_id, p.phone_hint, p.test_identity, s.last_seen_at
         FROM core_identity.sessions s JOIN core_identity.persons p ON p.id = s.person_id
        WHERE s.token_digest = $1 AND s.audience = $2 AND s.closed_at IS NULL AND s.expires_at > $3`,
      [sha256(token), aud, now]);
    const s = r.rows[0];
    if (!s) return null;
    if (now.getTime() - new Date(s.last_seen_at).getTime() > 5 * 60_000) {
      await this.pool.query('UPDATE core_identity.sessions SET last_seen_at = $2 WHERE id = $1', [s.id, now]);
    }
    return { sessionId: s.id, personId: s.person_id, audience: aud, phoneHint: s.phone_hint, testIdentity: s.test_identity };
  }

  async closeSession(sessionId: string, reason = 'logout'): Promise<void> {
    await this.pool.query('UPDATE core_identity.sessions SET closed_at = $2, close_reason = $3 WHERE id = $1 AND closed_at IS NULL', [sessionId, this.now(), reason]);
  }

  /** D-70: closing sessions never touches membership or grants. */
  async closeAllSessions(personId: string, reason = 'logout_all'): Promise<number> {
    const r = await this.pool.query('UPDATE core_identity.sessions SET closed_at = $2, close_reason = $3 WHERE person_id = $1 AND closed_at IS NULL', [personId, this.now(), reason]);
    // A device key belongs to the person's sessions: «خروج از همه‌ی دستگاه‌ها» ends it too (D-70, D-79).
    await this.pool.query('UPDATE core_identity.device_keys SET revoked_at = $2 WHERE person_id = $1 AND revoked_at IS NULL', [personId, this.now()]);
    return r.rowCount ?? 0;
  }

  /**
   * Device key (D-79): lets the business app's background task read ONE thing — the aggregate chat summary of
   * ONE organization — while the app is closed. It carries identity + scope only; membership and grant are still
   * checked on every use (D-57, D-66). Only its SHA-256 is stored; one live key per person, organization and device
   * label; revoked by turning the notifications off or by «خروج از همه‌ی دستگاه‌ها».
   */
  async issueDeviceKey(personId: string, organizationId: string, label: string): Promise<{ key: string }> {
    const key = crypto.randomBytes(32).toString('base64url');
    const now = this.now();
    await this.pool.query('UPDATE core_identity.device_keys SET revoked_at = $4 WHERE person_id = $1 AND organization_id = $2 AND label = $3 AND revoked_at IS NULL', [personId, organizationId, label, now]);
    await this.pool.query('INSERT INTO core_identity.device_keys (id, key_digest, person_id, organization_id, scope, label, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [crypto.randomUUID(), sha256(key), personId, organizationId, 'chat_summary', label.slice(0, 60), now]);
    return { key };
  }

  async resolveDeviceKey(key: string | undefined): Promise<{ personId: string; organizationId: string; scope: string } | null> {
    if (!key || key.length > 100) return null;
    const r = await this.pool.query<{ person_id: string; organization_id: string; scope: string; id: string }>(
      'SELECT id, person_id, organization_id, scope FROM core_identity.device_keys WHERE key_digest = $1 AND revoked_at IS NULL', [sha256(key)]);
    const row = r.rows[0];
    if (!row) return null;
    await this.pool.query('UPDATE core_identity.device_keys SET last_used_at = $2 WHERE id = $1', [row.id, this.now()]);
    return { personId: row.person_id, organizationId: row.organization_id, scope: row.scope };
  }

  async revokeDeviceKeys(personId: string, organizationId: string, label: string): Promise<number> {
    const r = await this.pool.query('UPDATE core_identity.device_keys SET revoked_at = $4 WHERE person_id = $1 AND organization_id = $2 AND label = $3 AND revoked_at IS NULL', [personId, organizationId, label, this.now()]);
    return r.rowCount ?? 0;
  }

  /** Active Core memberships of this person (read from Core tables). */
  async memberships(personId: string): Promise<Array<{ membershipId: string; organizationId: string; organizationName: string; permissions: string[] }>> {
    const r = await this.pool.query<{ id: string; organization_id: string; display_name: string; permissions: string[] | null }>(
      `SELECT m.id, m.organization_id, o.display_name,
              array_agg(g.permission_key) FILTER (WHERE g.id IS NOT NULL) AS permissions
         FROM memberships m
         JOIN organizations o ON o.id = m.organization_id AND o.lifecycle_status = 'ACTIVE'
         LEFT JOIN permission_grants g ON g.membership_id = m.id AND g.organization_id = m.organization_id AND g.grant_status = 'ACTIVE'
        WHERE m.identity_provider = $1 AND m.external_subject = $2 AND m.membership_status = 'ACTIVE'
        GROUP BY m.id, m.organization_id, o.display_name
        ORDER BY o.display_name`,
      [IDENTITY_PROVIDER, personId]);
    return r.rows.map((x) => ({ membershipId: x.id, organizationId: x.organization_id, organizationName: x.display_name, permissions: x.permissions ?? [] }));
  }

  /** Permission comes from membership and grant, checked at the moment of the act (D-57, D-66). */
  async hasPermission(personId: string, organizationId: string, permissionKey: string): Promise<boolean> {
    const r = await this.pool.query(
      `SELECT 1 FROM memberships m
         JOIN organizations o ON o.id = m.organization_id AND o.lifecycle_status = 'ACTIVE'
         JOIN permission_grants g ON g.membership_id = m.id AND g.organization_id = m.organization_id AND g.grant_status = 'ACTIVE' AND g.permission_key = $4
        WHERE m.identity_provider = $1 AND m.external_subject = $2 AND m.organization_id = $3 AND m.membership_status = 'ACTIVE'
        LIMIT 1`,
      [IDENTITY_PROVIDER, personId, organizationId, permissionKey]);
    return (r.rowCount ?? 0) > 0;
  }

  /**
   * Real deletion of a person identity. Refused while the person holds an
   * active Core membership: membership is the organization's record and is
   * ended by the organization, not erased from here (D-57).
   */
  async erasePerson(personId: string): Promise<void> {
    if ((await this.memberships(personId)).length > 0) throw new IdentityError('MEMBER_OF_ORGANIZATION', 'end organization memberships first');
    await this.tx(async (db) => {
      await db.query('DELETE FROM core_identity.persons WHERE id = $1', [personId]);
      await db.query('INSERT INTO core_identity.erasure_log (ref, erased_at, reason) VALUES ($1, $2, $3)', [crypto.randomUUID(), this.now(), 'person_request']);
    });
  }

  /** Operations only (demo seeding): the person record for a test number, created if missing. */
  async ensureTestPerson(phoneInput: string): Promise<string> {
    const phone = normalizePhone(phoneInput);
    if (!isTestNumber(phone)) throw new IdentityError('TEST_NUMBER_NOT_ALLOWED', 'only test numbers can be seeded');
    const r = await this.pool.query<{ id: string }>(
      `INSERT INTO core_identity.persons (id, phone_digest, phone_hint, test_identity) VALUES ($1, $2, $3, true)
       ON CONFLICT (phone_digest) DO UPDATE SET phone_hint = EXCLUDED.phone_hint RETURNING id`,
      [crypto.randomUUID(), this.hmac(`phone:${phone}`), phone.slice(-4)]);
    return r.rows[0].id;
  }

  /**
   * The person for a phone number, created if missing, so an organization can add a member before their first
   * login. Stores only what a login would (digest and last four digits).
   */
  async personForPhone(phoneInput: string): Promise<{ personId: string; phoneHint: string }> {
    const phone = normalizePhone(phoneInput);
    const test = isTestNumber(phone);
    // Same rule as login: a member must be someone who can actually log in.
    if (this.deliveryMode === 'test' && !test) throw new IdentityError('REAL_NUMBER_NEEDS_SMS', 'real numbers are accepted once an SMS provider is connected');
    if (this.deliveryMode === 'sms' && test) throw new IdentityError('TEST_NUMBER_NOT_ALLOWED', 'test numbers are not accepted with real SMS delivery');
    const r = await this.pool.query<{ id: string }>(
      `INSERT INTO core_identity.persons (id, phone_digest, phone_hint, test_identity) VALUES ($1, $2, $3, $4)
       ON CONFLICT (phone_digest) DO UPDATE SET phone_hint = EXCLUDED.phone_hint RETURNING id`,
      [crypto.randomUUID(), this.hmac(`phone:${phone}`), phone.slice(-4), test]);
    return { personId: r.rows[0].id, phoneHint: phone.slice(-4) };
  }

  /** Last four digits for persons (member lists show only these). Unknown ids are left out. */
  async phoneHints(personIds: readonly string[]): Promise<Map<string, { phoneHint: string; test: boolean }>> {
    if (!personIds.length) return new Map();
    const r = await this.pool.query<{ id: string; phone_hint: string; test_identity: boolean }>(
      'SELECT id, phone_hint, test_identity FROM core_identity.persons WHERE id::text = ANY($1::text[])', [personIds]);
    return new Map(r.rows.map((x) => [x.id, { phoneHint: x.phone_hint, test: x.test_identity }]));
  }

  async purgeExpired(): Promise<{ challenges: number; sessions: number }> {
    const now = this.now();
    const a = await this.pool.query('DELETE FROM core_identity.otp_challenges WHERE created_at < $1', [new Date(now.getTime() - 86400_000)]);
    const b = await this.pool.query('DELETE FROM core_identity.sessions WHERE expires_at < $1 OR closed_at < $1', [new Date(now.getTime() - 7 * 86400_000)]);
    return { challenges: a.rowCount ?? 0, sessions: b.rowCount ?? 0 };
  }

  private async tx<T>(fn: (db: PoolClient) => Promise<T>): Promise<T> {
    const db = await this.pool.connect();
    try {
      await db.query('BEGIN');
      const out = await fn(db);
      await db.query('COMMIT');
      return out;
    } catch (e) {
      await db.query('ROLLBACK').catch(() => undefined);
      throw e;
    } finally {
      db.release();
    }
  }
}

function normalizeCode(input: string): string {
  return String(input ?? '').replace(/[۰-۹]/g, (d) => String(FA.indexOf(d))).replace(/[٠-٩]/g, (d) => String(AR.indexOf(d))).replace(/\s/g, '').slice(0, 12);
}

export const IDENTITY_SCHEMA_SQL = `
CREATE SCHEMA IF NOT EXISTS core_identity;
CREATE TABLE IF NOT EXISTS core_identity.persons (
  id            uuid PRIMARY KEY,
  phone_digest  bytea NOT NULL UNIQUE,
  phone_hint    varchar(4) NOT NULL,
  test_identity boolean NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);
CREATE TABLE IF NOT EXISTS core_identity.otp_challenges (
  id            uuid PRIMARY KEY,
  phone_digest  bytea NOT NULL,
  phone_hint    varchar(4) NOT NULL,
  test_identity boolean NOT NULL,
  code_digest   bytea NOT NULL,
  audience      varchar(16) NOT NULL CHECK (audience IN ('v2', 'business')),
  created_at    timestamptz NOT NULL,
  expires_at    timestamptz NOT NULL,
  attempts      int NOT NULL DEFAULT 0,
  consumed_at   timestamptz
);
CREATE INDEX IF NOT EXISTS otp_challenge_phone_created_idx ON core_identity.otp_challenges (phone_digest, created_at);
CREATE TABLE IF NOT EXISTS core_identity.sessions (
  id            uuid PRIMARY KEY,
  token_digest  bytea NOT NULL UNIQUE,
  person_id     uuid NOT NULL REFERENCES core_identity.persons(id) ON DELETE CASCADE,
  audience      varchar(16) NOT NULL CHECK (audience IN ('v2', 'business')),
  created_at    timestamptz NOT NULL,
  last_seen_at  timestamptz NOT NULL,
  expires_at    timestamptz NOT NULL,
  closed_at     timestamptz,
  close_reason  varchar(40)
);
CREATE INDEX IF NOT EXISTS session_person_idx ON core_identity.sessions (person_id);
CREATE TABLE IF NOT EXISTS core_identity.device_keys (
  id              uuid PRIMARY KEY,
  key_digest      bytea NOT NULL UNIQUE,
  person_id       uuid NOT NULL REFERENCES core_identity.persons(id) ON DELETE CASCADE,
  organization_id text NOT NULL,
  scope           varchar(40) NOT NULL CHECK (scope IN ('chat_summary')),
  label           varchar(60) NOT NULL,
  created_at      timestamptz NOT NULL,
  last_used_at    timestamptz,
  revoked_at      timestamptz
);
CREATE INDEX IF NOT EXISTS device_key_person_idx ON core_identity.device_keys (person_id, organization_id);
CREATE TABLE IF NOT EXISTS core_identity.erasure_log (
  ref       uuid PRIMARY KEY,
  erased_at timestamptz NOT NULL,
  reason    varchar(40) NOT NULL
);
`;
