import fs from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { CoreIdentity, IdentityError, type Audience, type SessionIdentity } from '../../identity';
import { CHAT_PERMISSION, ChatError, ChatModule, isSensitiveBusiness, type PublishedBusinessRef } from '../../chat';
import { CoreDomainError } from '../../core/errors';
import { type CoreDeps, RouteError, coreErrorStatus, handleCoreRoute } from './core-routes';
import { businessFacts } from './facts';
import { PLAN_LIMITS, planOf } from '../../core/plan-service';
import type { AutoResolver } from '../../chat';
import { NotifyError, type NotifyModule } from '../../notify';

/**
 * MLINO API — Core identity routes (/api/auth/*) and the chat module's routes
 * (/api/chat/* for customers, /api/biz/* for business members).
 *
 * The audience comes from the Host header: explore → v2, business → business.
 * A session only works on the audience it was issued for.
 *
 * CSRF: cookies are SameSite=Lax, and every state-changing request must carry
 * `x-mlino-csrf: 1` (a custom header a cross-site form cannot send) and, when
 * present, an Origin equal to the request's own origin.
 */

export const SESSION_COOKIE = 'mlino_sid';

export interface ApiConfig {
  readonly hosts: ReadonlyMap<string, Audience>;
  readonly cookieSecure: boolean;
  readonly publishedPath: string;
  /** public-catalog.v1.json — published menu and prices for the chat auto-reply. */
  readonly catalogPath?: string;
}

export interface ApiDeps {
  readonly identity: CoreIdentity;
  readonly chat: ChatModule;
  readonly config: ApiConfig;
  /** Core write routes (plans, offers). Absent in tests that exercise only identity and chat. */
  readonly core?: CoreDeps;
  /** Nearby-offer notifications (D-77). Absent when VAPID keys are not configured. */
  readonly notify?: { module: NotifyModule; publicKey: string };
}

class HttpError extends Error {
  constructor(readonly status: number, readonly code: string, message = code, readonly detail: Record<string, unknown> = {}) { super(message); }
}

// ───────────── published businesses (the only businesses chat may reach — D-52) ─────────────

interface PublishedCache { mtimeMs: number; byOrg: Map<string, PublishedBusinessRef> }
let cache: PublishedCache | null = null;

export function publishedBusinesses(path: string): Map<string, PublishedBusinessRef> {
  let stat: fs.Stats;
  try { stat = fs.statSync(path); } catch { return cache?.byOrg ?? new Map(); }
  if (cache && cache.mtimeMs === stat.mtimeMs) return cache.byOrg;
  const byOrg = new Map<string, PublishedBusinessRef>();
  try {
    const doc = JSON.parse(fs.readFileSync(path, 'utf8')) as { records?: Array<{ business?: { organization_id?: string; name?: string }; capabilities?: Array<{ name?: string }> }> };
    for (const r of doc.records ?? []) {
      const id = r.business?.organization_id;
      const name = r.business?.name ?? '';
      if (!id) continue;
      byOrg.set(id, { organizationId: id, name, sensitive: isSensitiveBusiness(name, (r.capabilities ?? []).map((c) => c.name ?? '')) });
    }
  } catch {
    return cache?.byOrg ?? new Map();
  }
  cache = { mtimeMs: stat.mtimeMs, byOrg };
  return byOrg;
}

// ───────────── small HTTP helpers ─────────────

function send(res: ServerResponse, status: number, body: unknown, headers: Record<string, string | string[]> = {}): void {
  const data = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...headers });
  res.end(data);
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > 8192) throw new HttpError(413, 'BODY_TOO_LARGE');
    chunks.push(chunk as Buffer);
  }
  if (!size) return {};
  try {
    const v = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('not an object');
    return v as Record<string, unknown>;
  } catch { throw new HttpError(400, 'JSON_INVALID'); }
}

function cookie(req: IncomingMessage, name: string): string | undefined {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return undefined;
}

function sessionCookie(value: string, maxAgeSeconds: number, secure: boolean): string {
  return `${SESSION_COOKIE}=${value}; Path=/api; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure ? '; Secure' : ''}`;
}

// ───────────── rate limit per client address (in memory) ─────────────

const hits = new Map<string, number[]>();
function limit(key: string, max: number, windowMs: number): void {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= max) throw new HttpError(429, 'RATE_LIMITED', 'too many requests', { retryAfterSeconds: Math.ceil((windowMs - (now - list[0])) / 1000) });
  list.push(now);
  hits.set(key, list);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
}

function clientAddress(req: IncomingMessage): string {
  const fwd = String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim();
  return fwd || req.socket.remoteAddress || 'unknown';
}

// ───────────── handler ─────────────

export function createHandler(deps: ApiDeps) {
  const { identity, chat, config, core, notify } = deps;

  return async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      const host = String(req.headers['x-forwarded-host'] ?? req.headers.host ?? '').toLowerCase();
      const audience = config.hosts.get(host);
      if (!audience) throw new HttpError(404, 'NOT_FOUND');
      const url = new URL(req.url ?? '/', 'http://local');
      const path = url.pathname.replace(/\/+$/, '');
      const method = req.method ?? 'GET';

      if (method !== 'GET') {
        if (req.headers['x-mlino-csrf'] !== '1') throw new HttpError(403, 'CSRF');
        const origin = req.headers.origin;
        if (origin && new URL(origin).host.toLowerCase() !== host) throw new HttpError(403, 'CSRF');
      }

      const session = await identity.resolveSession(cookie(req, SESSION_COOKIE), audience);
      const needSession = (): SessionIdentity => { if (!session) throw new HttpError(401, 'LOGIN_REQUIRED'); return session; };
      const published = () => publishedBusinesses(config.publishedPath);
      // D-75: auto-reply only when the business switched it on AND its plan includes it (PRO/MAX, D-76).
      const planAllowsAuto = async (orgId: string) => !!core && PLAN_LIMITS[await planOf(core.prisma, orgId)].chatAutoReply;
      const autoFor: AutoResolver = async (orgId) => {
        if (!config.catalogPath || !(await chat.autoReplyOn(orgId)) || !(await planAllowsAuto(orgId))) return undefined;
        const facts = businessFacts(config.publishedPath, config.catalogPath, orgId);
        return facts ? { facts } : undefined;
      };

      // ── Core identity ──
      if (path === '/api/auth/config' && method === 'GET') {
        return send(res, 200, { delivery: identity.deliveryMode, testNumbers: identity.deliveryMode === 'test' ? { from: '09000000001', to: '09000000099' } : null, audience });
      }
      if (path === '/api/auth/otp/start' && method === 'POST') {
        limit(`otp:${clientAddress(req)}`, 10, 10 * 60_000);
        const body = await readJson(req);
        return send(res, 200, await identity.startChallenge({ phone: String(body.phone ?? ''), audience }));
      }
      if (path === '/api/auth/otp/verify' && method === 'POST') {
        limit(`verify:${clientAddress(req)}`, 30, 10 * 60_000);
        const body = await readJson(req);
        const login = await identity.verifyChallenge({ challengeId: String(body.challengeId ?? ''), code: String(body.code ?? ''), audience });
        if (session) await identity.closeSession(session.sessionId, 'replaced');
        const maxAge = Math.floor((login.expiresAt.getTime() - Date.now()) / 1000);
        return send(res, 200, { person: { phoneHint: login.phoneHint, test: login.testIdentity } }, { 'set-cookie': sessionCookie(login.token, maxAge, config.cookieSecure) });
      }
      if (path === '/api/auth/me' && method === 'GET') {
        if (!session) return send(res, 200, { person: null });
        const base = { phoneHint: session.phoneHint, test: session.testIdentity };
        if (audience !== 'business') return send(res, 200, { person: base });
        const pub = published();
        const orgs = (await identity.memberships(session.personId)).map((m) => ({
          organizationId: m.organizationId,
          name: pub.get(m.organizationId)?.name ?? m.organizationName,
          published: pub.has(m.organizationId),
          canChat: m.permissions.includes(CHAT_PERMISSION),
        }));
        return send(res, 200, { person: base, organizations: orgs });
      }
      if (path === '/api/auth/logout' && method === 'POST') {
        if (session) await identity.closeSession(session.sessionId, 'logout');
        return send(res, 200, { ok: true }, { 'set-cookie': sessionCookie('', 0, config.cookieSecure) });
      }
      if (path === '/api/auth/logout-all' && method === 'POST') {
        const s = needSession();
        const closed = await identity.closeAllSessions(s.personId, 'logout_all');
        return send(res, 200, { closed }, { 'set-cookie': sessionCookie('', 0, config.cookieSecure) });
      }
      if (path === '/api/auth/account' && method === 'DELETE') {
        const s = needSession();
        if ((await identity.memberships(s.personId)).length) throw new IdentityError('MEMBER_OF_ORGANIZATION', 'end organization memberships first');
        const conversations = await chat.eraseCustomer(s.personId);
        await identity.erasePerson(s.personId);
        return send(res, 200, { erased: true, conversations }, { 'set-cookie': sessionCookie('', 0, config.cookieSecure) });
      }

      // ── nearby-offer notifications (V2, anonymous, opt-in — D-77) ──
      if (path.startsWith('/api/push/')) {
        if (audience !== 'v2' || !notify) throw new HttpError(404, 'NOT_FOUND');
        if (path === '/api/push/key' && method === 'GET') return send(res, 200, { publicKey: notify.publicKey });
        limit(`push:${clientAddress(req)}`, 30, 10 * 60_000);
        const body = await readJson(req);
        if (path === '/api/push/subscribe' && method === 'POST') { await notify.module.subscribe({ subscription: body.subscription, lat: body.lat, lng: body.lng }); return send(res, 200, { ok: true }); }
        if (path === '/api/push/location' && method === 'POST') return send(res, 200, { known: await notify.module.updateLocation(body.endpoint, body.lat, body.lng) });
        if (path === '/api/push/unsubscribe' && method === 'POST') { await notify.module.unsubscribe(body.endpoint); return send(res, 200, { ok: true }); }
        throw new HttpError(404, 'NOT_FOUND');
      }

      // ── chat: customer side (V2) ──
      if (path.startsWith('/api/chat')) {
        if (audience !== 'v2') throw new HttpError(404, 'NOT_FOUND');
        if (path === '/api/chat/business' && method === 'GET') {
          const b = published().get(url.searchParams.get('organizationId') ?? '');
          if (!b) throw new ChatError('BUSINESS_UNKNOWN', 'not a published business');
          return send(res, 200, { organizationId: b.organizationId, name: b.name, available: await chat.isEnabled(b), sensitive: b.sensitive, autoReply: (await autoFor(b.organizationId)) !== undefined });
        }
        const s = needSession();
        const me = { ref: s.personId, test: s.testIdentity };
        if (path === '/api/chat/threads' && method === 'GET') {
          const pub = published();
          const threads = (await chat.customerThreads(s.personId)).map((t) => ({ ...t, customerName: undefined, name: t.customerName, businessName: pub.get(t.organizationId)?.name ?? 'کسب‌وکار' }));
          return send(res, 200, { threads });
        }
        if (path === '/api/chat/threads' && method === 'POST') {
          limit(`send:${s.personId}`, 20, 60_000);
          const body = await readJson(req);
          const b = published().get(String(body.organizationId ?? ''));
          if (!b) throw new ChatError('BUSINESS_UNKNOWN', 'not a published business');
          return send(res, 200, await chat.customerSend(b, me, { name: String(body.name ?? ''), body: body.body }, autoFor));
        }
        const m = path.match(/^\/api\/chat\/threads\/([^/]+)(\/messages|\/block|\/unblock)?$/);
        if (m) {
          const [, id, tail] = m;
          if (tail === '/messages' && method === 'GET') {
            const r = await chat.customerMessages(s.personId, id, Number(url.searchParams.get('after') ?? 0));
            return send(res, 200, { ...r, businessName: published().get(r.thread.organizationId)?.name ?? 'کسب‌وکار' });
          }
          if (tail === '/messages' && method === 'POST') {
            limit(`send:${s.personId}`, 20, 60_000);
            const body = await readJson(req);
            return send(res, 200, { message: await chat.customerReply(me, id, body.body, autoFor) });
          }
          if (tail === '/block' && method === 'POST') { await chat.block('customer', s.personId, id, s.personId, true); return send(res, 200, { ok: true }); }
          if (tail === '/unblock' && method === 'POST') { await chat.block('customer', s.personId, id, s.personId, false); return send(res, 200, { ok: true }); }
          if (!tail && method === 'DELETE') { await chat.erase('customer', s.personId, id, s.personId); return send(res, 200, { erased: true }); }
        }
        throw new HttpError(404, 'NOT_FOUND');
      }

      // ── Core routes for the panel: plan and offers. Any active member may call; each service checks its own grant.
      const coreMatch = path.match(/^\/api\/biz\/([A-Za-z0-9_-]{1,64})(\/plan|\/offers(?:\/.*)?)$/);
      if (coreMatch && core) {
        if (audience !== 'business') throw new HttpError(404, 'NOT_FOUND');
        const s = needSession();
        const orgId = coreMatch[1];
        if (!(await identity.memberships(s.personId)).some((m) => m.organizationId === orgId)) throw new HttpError(403, 'MEMBERSHIP_REQUIRED');
        const out = await handleCoreRoute(core, s.personId, orgId, coreMatch[2], method, () => readJson(req));
        if (out === undefined) throw new HttpError(404, 'NOT_FOUND');
        return send(res, 200, out);
      }

      // ── chat: business side (V1 panel) — membership + chat.reply checked on every request ──
      const biz = path.match(/^\/api\/biz\/([A-Za-z0-9_-]{1,64})\/chat(\/.*)?$/);
      if (biz) {
        if (audience !== 'business') throw new HttpError(404, 'NOT_FOUND');
        const s = needSession();
        const orgId = biz[1];
        const rest = biz[2] ?? '';
        if (!(await identity.hasPermission(s.personId, orgId, CHAT_PERMISSION))) throw new HttpError(403, 'PERMISSION_REQUIRED', 'chat.reply grant required');
        const b = published().get(orgId);
        if (!b) throw new ChatError('BUSINESS_UNKNOWN', 'business is not published');

        if (rest === '/summary' && method === 'GET') return send(res, 200, { ...(await chat.summary(orgId)), enabled: await chat.isEnabled(b), sensitive: b.sensitive, autoReply: await chat.autoReplyOn(orgId), autoReplyAllowed: await planAllowsAuto(orgId) });
        if (rest === '/auto-reply' && method === 'POST') {
          const body = await readJson(req);
          const on = body.on === true;
          if (on && !(await planAllowsAuto(orgId))) throw new HttpError(409, 'PLAN_LIMIT', 'auto-reply is part of the PRO and MAX plans');
          return send(res, 200, { autoReply: await chat.setAutoReply(b, s.personId, on) });
        }
        if (rest === '/knowledge' && method === 'GET') return send(res, 200, { entries: await chat.knowledge(orgId) });
        if (rest === '/knowledge' && method === 'POST') {
          const body = await readJson(req);
          return send(res, 200, { id: await chat.saveKnowledge(orgId, s.personId, { id: typeof body.id === 'string' ? body.id : undefined, question: body.question, answer: body.answer }) });
        }
        const km = rest.match(/^\/knowledge\/([^/]+)$/);
        if (km && method === 'DELETE') { await chat.deleteKnowledge(orgId, s.personId, km[1]); return send(res, 200, { deleted: true }); }
        if (rest === '/pending' && method === 'GET') return send(res, 200, { questions: await chat.pending(orgId) });
        const pm = rest.match(/^\/pending\/([^/]+)\/answer$/);
        if (pm && method === 'POST') {
          const body = await readJson(req);
          return send(res, 200, await chat.answerPending(orgId, s.personId, pm[1], { answer: body.answer, learn: body.learn === true, question: typeof body.question === 'string' ? body.question : undefined }));
        }
        if (rest === '/settings' && method === 'POST') {
          const body = await readJson(req);
          return send(res, 200, { enabled: await chat.setEnabled(b, s.personId, body.enabled === true) });
        }
        if (rest === '/access-log' && method === 'GET') return send(res, 200, { entries: (await chat.accessLog(orgId)).map((e) => ({ ...e, actorRef: undefined, byMe: e.actorRef === s.personId })) });
        if (rest === '/threads' && method === 'GET') return send(res, 200, { threads: await chat.businessThreads(orgId, s.personId) });
        const m = rest.match(/^\/threads\/([^/]+)(\/messages|\/block|\/unblock)?$/);
        if (m) {
          const [, id, tail] = m;
          if (tail === '/messages' && method === 'GET') return send(res, 200, await chat.businessMessages(orgId, s.personId, id, Number(url.searchParams.get('after') ?? 0)));
          if (tail === '/messages' && method === 'POST') {
            limit(`send:${s.personId}`, 40, 60_000);
            const body = await readJson(req);
            return send(res, 200, { message: await chat.businessReply(orgId, s.personId, id, body.body) });
          }
          if (tail === '/block' && method === 'POST') { await chat.block('business', orgId, id, s.personId, true); return send(res, 200, { ok: true }); }
          if (tail === '/unblock' && method === 'POST') { await chat.block('business', orgId, id, s.personId, false); return send(res, 200, { ok: true }); }
          if (!tail && method === 'DELETE') { await chat.erase('business', orgId, id, s.personId); return send(res, 200, { erased: true }); }
        }
        throw new HttpError(404, 'NOT_FOUND');
      }

      throw new HttpError(404, 'NOT_FOUND');
    } catch (e) {
      if (e instanceof HttpError) return send(res, e.status, { error: e.code, ...e.detail });
      if (e instanceof RouteError) return send(res, e.status, { error: e.code, ...e.detail });
      if (e instanceof NotifyError) return send(res, 400, { error: e.code });
      if (e instanceof CoreDomainError) return send(res, coreErrorStatus(e), { error: e.code, message: e.code === 'PLAN_LIMIT' ? e.message : undefined });
      if (e instanceof IdentityError) {
        const status = e.code === 'RATE_LIMITED' || e.code === 'TOO_MANY_ATTEMPTS' ? 429 : e.code === 'MEMBER_OF_ORGANIZATION' ? 409 : 400;
        return send(res, status, { error: e.code, ...e.detail });
      }
      if (e instanceof ChatError) {
        const status = e.code === 'NOT_FOUND' || e.code === 'BUSINESS_UNKNOWN' ? 404 : e.code === 'INPUT_INVALID' ? 400 : 409;
        return send(res, status, { error: e.code });
      }
      // eslint-disable-next-line no-console
      console.error('[mlino-api] unexpected', e instanceof Error ? e.message : 'error');
      return send(res, 500, { error: 'INTERNAL' });
    }
  };
}
