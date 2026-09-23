import crypto from 'node:crypto';
import type { Pool, PoolClient } from 'pg';

/**
 * Chat module — customer ⇄ business conversations (owner decision D-73).
 *
 * A module, not Core (ADR-0011): its own database (D-71), and only one-way
 * references to Core ids (organization id, person id). Guardrails:
 *
 * - Only the customer starts a conversation. The business replies inside it.
 * - The business sees the name the customer chose, never the phone number.
 * - Text only, at most 1000 characters.
 * - Nothing here is read by any AI, and nothing flows into CRM.
 * - Retention: a conversation is deleted for real 90 days after its last
 *   message (24 hours for test identities). Either side can delete earlier,
 *   which removes it for both sides; only an opaque erasure record remains.
 * - Either side can block. Blocked conversations accept no new messages.
 * - Off for sensitive businesses (R8-a §3.10, D-72 default).
 * - Every business-side read of conversations is logged (R8-a §3.5).
 */

export const RETENTION_DAYS = 90;
export const TEST_RETENTION_HOURS = 24;
export const MAX_BODY = 1000;
export const CHAT_PERMISSION = 'chat.reply';
const READ_LOG_WINDOW_MS = 10 * 60_000;

export type ChatErrorCode = 'CHAT_UNAVAILABLE' | 'BUSINESS_UNKNOWN' | 'NOT_FOUND' | 'BLOCKED' | 'INPUT_INVALID' | 'SENSITIVE_BUSINESS';

export class ChatError extends Error {
  constructor(readonly code: ChatErrorCode, message: string) { super(`${code}: ${message}`); this.name = 'ChatError'; }
}

const SENSITIVE_WORDS = ['دارو', 'پزشک', 'کلینیک', 'درمان', 'دندان', 'بیمارستان', 'آزمایشگاه', 'سلامت', 'روان', 'مشاوره', 'زیبایی', 'پوست', 'فیزیوتراپی', 'بینایی', 'سونوگرافی', 'رادیولوژی', 'مطب', 'پرستار'];

/** Conservative: a health-like word in the published name or capabilities turns chat off. */
export function isSensitiveBusiness(name: string, capabilityNames: readonly string[]): boolean {
  const text = [name, ...capabilityNames].join(' ');
  return SENSITIVE_WORDS.some((w) => text.includes(w));
}

export interface PublishedBusinessRef {
  readonly organizationId: string;
  readonly name: string;
  readonly sensitive: boolean;
}

export interface Party { readonly ref: string; readonly test: boolean }

export interface ThreadSummary {
  readonly id: string;
  readonly organizationId: string;
  readonly customerName: string;
  readonly blockedBy: 'customer' | 'business' | null;
  readonly lastMessageAt: string;
  readonly expiresAt: string;
  readonly lastBody: string;
  readonly lastSender: 'customer' | 'business';
  readonly unread: number;
  readonly test: boolean;
}

export interface ChatMessage {
  readonly id: string;
  readonly seq: number;
  readonly sender: 'customer' | 'business';
  readonly body: string;
  readonly createdAt: string;
}

function cleanBody(body: unknown): string {
  const text = String(body ?? '').replace(/\r\n/g, '\n').replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '').trim();
  if (!text) throw new ChatError('INPUT_INVALID', 'message is empty');
  if ([...text].length > MAX_BODY) throw new ChatError('INPUT_INVALID', `message is longer than ${MAX_BODY} characters`);
  return text;
}

function cleanName(name: unknown): string {
  const text = String(name ?? '').replace(/[\u0000-\u001F\u007F]/g, '').replace(/\s+/g, ' ').trim();
  if ([...text].length < 2 || [...text].length > 40) throw new ChatError('INPUT_INVALID', 'name must be 2 to 40 characters');
  if (/\d{6,}/.test(text.replace(/[۰-۹]/g, '0'))) throw new ChatError('INPUT_INVALID', 'a name, not a number');
  return text;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class ChatModule {
  private readonly now: () => Date;

  constructor(private readonly pool: Pool, options: { now?: () => Date } = {}) {
    this.now = options.now ?? (() => new Date());
  }

  private expiry(test: boolean, from: Date): Date {
    return new Date(from.getTime() + (test ? TEST_RETENTION_HOURS * 3600_000 : RETENTION_DAYS * 86400_000));
  }

  async isEnabled(business: PublishedBusinessRef): Promise<boolean> {
    if (business.sensitive) return false;
    const r = await this.pool.query<{ enabled: boolean }>('SELECT enabled FROM chat_settings WHERE organization_id = $1', [business.organizationId]);
    return r.rows[0]?.enabled ?? true;
  }

  // ───────────── customer side ─────────────

  /** Starts the conversation if needed and sends the customer's message. */
  async customerSend(business: PublishedBusinessRef, customer: Party, input: { name?: string; body: unknown }): Promise<{ threadId: string; message: ChatMessage }> {
    if (!(await this.isEnabled(business))) throw new ChatError(business.sensitive ? 'SENSITIVE_BUSINESS' : 'CHAT_UNAVAILABLE', 'this business does not take messages');
    const body = cleanBody(input.body);
    return this.tx(async (db) => {
      const now = this.now();
      const found = await db.query<{ id: string; blocked_by: string | null }>(
        'SELECT id, blocked_by FROM chat_conversations WHERE organization_id = $1 AND customer_ref = $2 FOR UPDATE', [business.organizationId, customer.ref]);
      let threadId = found.rows[0]?.id;
      if (found.rows[0]?.blocked_by) throw new ChatError('BLOCKED', 'this conversation is blocked');
      if (!threadId) {
        const name = cleanName(input.name);
        threadId = crypto.randomUUID();
        await db.query(
          `INSERT INTO chat_conversations (id, organization_id, customer_ref, customer_name, test_mode, created_at, last_message_at, expires_at, customer_read_at)
           VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $6)`,
          [threadId, business.organizationId, customer.ref, name, customer.test, now, this.expiry(customer.test, now)]);
      }
      const message = await this.insertMessage(db, threadId, 'customer', customer.ref, body, now, customer.test);
      await db.query('UPDATE chat_conversations SET customer_read_at = $2 WHERE id = $1', [threadId, now]);
      return { threadId, message };
    });
  }

  async customerThreads(customerRef: string): Promise<ThreadSummary[]> {
    return this.threads('c.customer_ref = $1', [customerRef], 'customer');
  }

  async customerMessages(customerRef: string, threadId: string, afterSeq = 0): Promise<{ thread: ThreadSummary; messages: ChatMessage[] }> {
    const thread = await this.ownThread('customer', customerRef, threadId);
    const messages = await this.messages(threadId, afterSeq);
    await this.pool.query('UPDATE chat_conversations SET customer_read_at = $2 WHERE id = $1', [threadId, this.now()]);
    return { thread, messages };
  }

  async customerReply(customer: Party, threadId: string, body: unknown): Promise<ChatMessage> {
    const text = cleanBody(body);
    return this.tx(async (db) => {
      const t = await this.lockThread(db, 'customer', customer.ref, threadId);
      if (t.blocked_by) throw new ChatError('BLOCKED', 'this conversation is blocked');
      const now = this.now();
      const m = await this.insertMessage(db, threadId, 'customer', customer.ref, text, now, t.test_mode);
      await db.query('UPDATE chat_conversations SET customer_read_at = $2 WHERE id = $1', [threadId, now]);
      return m;
    });
  }

  // ───────────── business side (caller has checked membership + chat.reply) ─────────────

  async businessThreads(organizationId: string, actorRef: string): Promise<ThreadSummary[]> {
    await this.logOncePerWindow(organizationId, null, actorRef, 'list');
    return this.threads('c.organization_id = $1', [organizationId], 'business');
  }

  async businessMessages(organizationId: string, actorRef: string, threadId: string, afterSeq = 0): Promise<{ thread: ThreadSummary; messages: ChatMessage[] }> {
    const thread = await this.ownThread('business', organizationId, threadId);
    await this.logOncePerWindow(organizationId, threadId, actorRef, 'read');
    const messages = await this.messages(threadId, afterSeq);
    await this.pool.query('UPDATE chat_conversations SET business_read_at = $2 WHERE id = $1', [threadId, this.now()]);
    return { thread, messages };
  }

  async businessReply(organizationId: string, actorRef: string, threadId: string, body: unknown): Promise<ChatMessage> {
    const text = cleanBody(body);
    return this.tx(async (db) => {
      const t = await this.lockThread(db, 'business', organizationId, threadId);
      if (t.blocked_by) throw new ChatError('BLOCKED', 'this conversation is blocked');
      const now = this.now();
      const m = await this.insertMessage(db, threadId, 'business', actorRef, text, now, t.test_mode);
      await db.query('UPDATE chat_conversations SET business_read_at = $2 WHERE id = $1', [threadId, now]);
      await this.log(organizationId, threadId, actorRef, 'reply', db);
      return m;
    });
  }

  async setEnabled(business: PublishedBusinessRef, actorRef: string, enabled: boolean): Promise<boolean> {
    if (enabled && business.sensitive) throw new ChatError('SENSITIVE_BUSINESS', 'chat stays off for sensitive businesses');
    await this.pool.query(
      `INSERT INTO chat_settings (organization_id, enabled, changed_by, changed_at) VALUES ($1, $2, $3, $4)
       ON CONFLICT (organization_id) DO UPDATE SET enabled = EXCLUDED.enabled, changed_by = EXCLUDED.changed_by, changed_at = EXCLUDED.changed_at`,
      [business.organizationId, enabled, actorRef, this.now()]);
    await this.log(business.organizationId, null, actorRef, enabled ? 'enable' : 'disable');
    return enabled;
  }

  /** Aggregate only: this is all the assistant and the Today page may see. */
  async summary(organizationId: string): Promise<{ conversations: number; unreadConversations: number; unreadMessages: number }> {
    const r = await this.pool.query<{ conversations: string; unread_conversations: string; unread_messages: string }>(
      `SELECT count(DISTINCT c.id) AS conversations,
              count(DISTINCT m.conversation_id) AS unread_conversations,
              count(m.id) AS unread_messages
         FROM chat_conversations c
         LEFT JOIN chat_messages m ON m.conversation_id = c.id AND m.sender = 'customer'
              AND (c.business_read_at IS NULL OR m.created_at > c.business_read_at)
        WHERE c.organization_id = $1`, [organizationId]);
    const x = r.rows[0];
    return { conversations: Number(x.conversations), unreadConversations: Number(x.unread_conversations), unreadMessages: Number(x.unread_messages) };
  }

  async accessLog(organizationId: string, limit = 50): Promise<Array<{ at: string; action: string; actorRef: string; threadId: string | null }>> {
    const r = await this.pool.query<{ at: Date; action: string; actor_ref: string; conversation_id: string | null }>(
      'SELECT at, action, actor_ref, conversation_id FROM chat_access_log WHERE organization_id = $1 ORDER BY at DESC, id DESC LIMIT $2', [organizationId, limit]);
    return r.rows.map((x) => ({ at: new Date(x.at).toISOString(), action: x.action, actorRef: x.actor_ref, threadId: x.conversation_id }));
  }

  // ───────────── both sides ─────────────

  async block(side: 'customer' | 'business', owner: string, threadId: string, actorRef: string, blocked: boolean): Promise<void> {
    await this.tx(async (db) => {
      const t = await this.lockThread(db, side, owner, threadId);
      if (!blocked && t.blocked_by && t.blocked_by !== side) throw new ChatError('BLOCKED', 'only the side that blocked can unblock');
      await db.query('UPDATE chat_conversations SET blocked_by = $2 WHERE id = $1', [threadId, blocked ? side : null]);
      if (side === 'business') await this.log(owner, threadId, actorRef, blocked ? 'block' : 'unblock', db);
    });
  }

  /** Real deletion for both sides. Only an opaque erasure record remains. */
  async erase(side: 'customer' | 'business', owner: string, threadId: string, actorRef: string): Promise<void> {
    await this.tx(async (db) => {
      const t = await this.lockThread(db, side, owner, threadId);
      await db.query('DELETE FROM chat_conversations WHERE id = $1', [threadId]);
      await db.query('INSERT INTO chat_erasure_log (ref, organization_id, erased_at, reason) VALUES ($1, $2, $3, $4)', [crypto.randomUUID(), t.organization_id, this.now(), `${side}_request`]);
      if (side === 'business') await this.log(owner, null, actorRef, 'erase', db);
    });
  }

  /** The customer deleted their account: every conversation goes. */
  async eraseCustomer(customerRef: string): Promise<number> {
    return this.tx(async (db) => {
      const gone = await db.query<{ organization_id: string }>('DELETE FROM chat_conversations WHERE customer_ref = $1 RETURNING organization_id', [customerRef]);
      for (const row of gone.rows) {
        await db.query('INSERT INTO chat_erasure_log (ref, organization_id, erased_at, reason) VALUES ($1, $2, $3, $4)', [crypto.randomUUID(), row.organization_id, this.now(), 'account_deleted']);
      }
      return gone.rowCount ?? 0;
    });
  }

  /** Retention: 90 days after the last message (24 hours for test identities). */
  async purge(): Promise<number> {
    return this.tx(async (db) => {
      const gone = await db.query<{ organization_id: string }>('DELETE FROM chat_conversations WHERE expires_at <= $1 RETURNING organization_id', [this.now()]);
      for (const row of gone.rows) {
        await db.query('INSERT INTO chat_erasure_log (ref, organization_id, erased_at, reason) VALUES ($1, $2, $3, $4)', [crypto.randomUUID(), row.organization_id, this.now(), 'retention']);
      }
      return gone.rowCount ?? 0;
    });
  }

  // ───────────── internals ─────────────

  private async insertMessage(db: PoolClient, threadId: string, sender: 'customer' | 'business', senderRef: string, body: string, now: Date, test: boolean): Promise<ChatMessage> {
    const r = await db.query<{ id: string; seq: string; created_at: Date }>(
      'INSERT INTO chat_messages (id, conversation_id, sender, sender_ref, body, created_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, seq, created_at',
      [crypto.randomUUID(), threadId, sender, senderRef, body, now]);
    await db.query('UPDATE chat_conversations SET last_message_at = $2, expires_at = $3 WHERE id = $1', [threadId, now, this.expiry(test, now)]);
    return { id: r.rows[0].id, seq: Number(r.rows[0].seq), sender, body, createdAt: new Date(r.rows[0].created_at).toISOString() };
  }

  private async threads(where: string, params: unknown[], viewer: 'customer' | 'business'): Promise<ThreadSummary[]> {
    const readCol = viewer === 'customer' ? 'c.customer_read_at' : 'c.business_read_at';
    const other = viewer === 'customer' ? 'business' : 'customer';
    const r = await this.pool.query<{ id: string; organization_id: string; customer_name: string; blocked_by: 'customer' | 'business' | null; last_message_at: Date; expires_at: Date; test_mode: boolean; last_body: string; last_sender: 'customer' | 'business'; unread: string }>(
      `SELECT c.id, c.organization_id, c.customer_name, c.blocked_by, c.last_message_at, c.expires_at, c.test_mode,
              l.body AS last_body, l.sender AS last_sender,
              (SELECT count(*) FROM chat_messages u WHERE u.conversation_id = c.id AND u.sender = '${other}' AND (${readCol} IS NULL OR u.created_at > ${readCol})) AS unread
         FROM chat_conversations c
         JOIN LATERAL (SELECT body, sender FROM chat_messages WHERE conversation_id = c.id ORDER BY seq DESC LIMIT 1) l ON true
        WHERE ${where}
        ORDER BY c.last_message_at DESC`, params);
    return r.rows.map((x) => ({
      id: x.id, organizationId: x.organization_id, customerName: x.customer_name, blockedBy: x.blocked_by,
      lastMessageAt: new Date(x.last_message_at).toISOString(), expiresAt: new Date(x.expires_at).toISOString(),
      lastBody: x.last_body.length > 120 ? `${x.last_body.slice(0, 120)}…` : x.last_body, lastSender: x.last_sender, unread: Number(x.unread), test: x.test_mode,
    }));
  }

  private async ownThread(side: 'customer' | 'business', owner: string, threadId: string): Promise<ThreadSummary> {
    if (!UUID.test(threadId)) throw new ChatError('NOT_FOUND', 'no such conversation');
    const list = await this.threads(`c.id = $1 AND ${side === 'customer' ? 'c.customer_ref' : 'c.organization_id'} = $2`, [threadId, owner], side);
    if (!list[0]) throw new ChatError('NOT_FOUND', 'no such conversation');
    return list[0];
  }

  private async lockThread(db: PoolClient, side: 'customer' | 'business', owner: string, threadId: string) {
    if (!UUID.test(threadId)) throw new ChatError('NOT_FOUND', 'no such conversation');
    const r = await db.query<{ organization_id: string; blocked_by: string | null; test_mode: boolean }>(
      `SELECT organization_id, blocked_by, test_mode FROM chat_conversations WHERE id = $1 AND ${side === 'customer' ? 'customer_ref' : 'organization_id'} = $2 FOR UPDATE`,
      [threadId, owner]);
    if (!r.rows[0]) throw new ChatError('NOT_FOUND', 'no such conversation');
    return r.rows[0];
  }

  private async messages(threadId: string, afterSeq: number): Promise<ChatMessage[]> {
    const r = await this.pool.query<{ id: string; seq: string; sender: 'customer' | 'business'; body: string; created_at: Date }>(
      'SELECT id, seq, sender, body, created_at FROM chat_messages WHERE conversation_id = $1 AND seq > $2 ORDER BY seq LIMIT 500',
      [threadId, Number.isFinite(afterSeq) && afterSeq > 0 ? Math.floor(afterSeq) : 0]);
    return r.rows.map((x) => ({ id: x.id, seq: Number(x.seq), sender: x.sender, body: x.body, createdAt: new Date(x.created_at).toISOString() }));
  }

  /** Polling must not flood the log: the same look by the same member is recorded once per ten minutes. */
  private async logOncePerWindow(organizationId: string, threadId: string | null, actorRef: string, action: 'list' | 'read'): Promise<void> {
    const recent = await this.pool.query(
      `SELECT 1 FROM chat_access_log WHERE organization_id = $1 AND conversation_id IS NOT DISTINCT FROM $2 AND actor_ref = $3 AND action = $4 AND at > $5 LIMIT 1`,
      [organizationId, threadId, actorRef, action, new Date(this.now().getTime() - READ_LOG_WINDOW_MS)]);
    if (!recent.rowCount) await this.log(organizationId, threadId, actorRef, action);
  }

  private async log(organizationId: string, threadId: string | null, actorRef: string, action: string, db: Pool | PoolClient = this.pool): Promise<void> {
    await db.query('INSERT INTO chat_access_log (organization_id, conversation_id, actor_ref, action, at) VALUES ($1, $2, $3, $4, $5)', [organizationId, threadId, actorRef, action, this.now()]);
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

export const CHAT_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS chat_conversations (
  id               uuid PRIMARY KEY,
  organization_id  text NOT NULL,
  customer_ref     uuid NOT NULL,
  customer_name    varchar(40) NOT NULL,
  test_mode        boolean NOT NULL,
  blocked_by       varchar(10) CHECK (blocked_by IN ('customer', 'business')),
  created_at       timestamptz NOT NULL,
  last_message_at  timestamptz NOT NULL,
  expires_at       timestamptz NOT NULL,
  customer_read_at timestamptz,
  business_read_at timestamptz,
  UNIQUE (organization_id, customer_ref)
);
CREATE INDEX IF NOT EXISTS chat_conversation_customer_idx ON chat_conversations (customer_ref);
CREATE INDEX IF NOT EXISTS chat_conversation_expiry_idx ON chat_conversations (expires_at);
CREATE TABLE IF NOT EXISTS chat_messages (
  id              uuid PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  seq             bigserial,
  sender          varchar(10) NOT NULL CHECK (sender IN ('customer', 'business')),
  sender_ref      uuid NOT NULL,
  body            text NOT NULL CHECK (char_length(body) BETWEEN 1 AND ${MAX_BODY}),
  created_at      timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS chat_message_conversation_seq_idx ON chat_messages (conversation_id, seq);
CREATE TABLE IF NOT EXISTS chat_settings (
  organization_id text PRIMARY KEY,
  enabled         boolean NOT NULL,
  changed_by      uuid,
  changed_at      timestamptz
);
CREATE TABLE IF NOT EXISTS chat_access_log (
  id              bigserial PRIMARY KEY,
  organization_id text NOT NULL,
  conversation_id uuid,
  actor_ref       uuid NOT NULL,
  action          varchar(24) NOT NULL,
  at              timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS chat_access_log_org_idx ON chat_access_log (organization_id, at);
CREATE TABLE IF NOT EXISTS chat_erasure_log (
  ref             uuid PRIMARY KEY,
  organization_id text NOT NULL,
  erased_at       timestamptz NOT NULL,
  reason          varchar(24) NOT NULL
);
`;
