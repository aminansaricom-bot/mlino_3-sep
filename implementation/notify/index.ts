import crypto from 'node:crypto';
import type { Pool } from 'pg';

/**
 * Nearby-offer notifications (owner decision D-77, active notification inside the business's radius).
 * A V2-side module with its own database (D-71). Guardrails:
 *
 * - Opt-in only, from the viewer's own tap; turning it off deletes the subscription for real.
 * - Anonymous: a subscription is tied to no person, phone or session.
 * - Location is coarse (rounded to ~110 m) and goes stale after 24 hours; a stale location receives nothing.
 * - Only offers published with a radius, only to subscribers inside it, only for PRO/MAX plans (D-76).
 * - At most 3 notifications per subscriber per Tehran day; none between 22:00 and 08:00; never the same offer twice.
 * - The server only ever posts to known push services (no arbitrary URL — no request forgery).
 */

export const LOCATION_TTL_MS = 24 * 3600_000;
export const DAILY_CAP = 3;
const COARSE = 1000; // 3 decimals ≈ 110 m

const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /^updates\.push\.services\.mozilla\.com$/, /^[a-z0-9.-]*\.push\.apple\.com$/, /^[a-z0-9.-]*\.notify\.windows\.com$/, /^push\.services\.mozilla\.com$/];

export type NotifyErrorCode = 'INPUT_INVALID' | 'ENDPOINT_NOT_ALLOWED';
export class NotifyError extends Error {
  constructor(readonly code: NotifyErrorCode, message: string) { super(`${code}: ${message}`); this.name = 'NotifyError'; }
}

export interface PushSubscriptionInput { endpoint: string; keys: { p256dh: string; auth: string } }

export function allowedEndpoint(endpoint: unknown): string {
  if (typeof endpoint !== 'string' || endpoint.length > 1000) throw new NotifyError('INPUT_INVALID', 'endpoint');
  let url: URL;
  try { url = new URL(endpoint); } catch { throw new NotifyError('INPUT_INVALID', 'endpoint'); }
  if (url.protocol !== 'https:' || url.port || !PUSH_HOSTS.some((h) => h.test(url.hostname))) throw new NotifyError('ENDPOINT_NOT_ALLOWED', 'not a known push service');
  return url.toString();
}

function coarse(lat: unknown, lng: unknown): { lat: number; lng: number } {
  const a = Number(lat); const b = Number(lng);
  if (!Number.isFinite(a) || !Number.isFinite(b) || Math.abs(a) > 90 || Math.abs(b) > 180) throw new NotifyError('INPUT_INVALID', 'location');
  return { lat: Math.round(a * COARSE) / COARSE, lng: Math.round(b * COARSE) / COARSE };
}

export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const r = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371008.8 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Hour and day in Tehran (UTC+03:30, no DST). */
function tehran(now: Date): { hour: number; day: string } {
  const t = new Date(now.getTime() + 210 * 60_000);
  return { hour: t.getUTCHours(), day: t.toISOString().slice(0, 10) };
}

export interface OfferToAnnounce {
  readonly organizationId: string;
  readonly offerVersionId: string;
  readonly businessName: string;
  readonly offerName: string;
  readonly radiusMeters: number;
  readonly at: { lat: number; lng: number };
}

export interface Sender { send(sub: PushSubscriptionInput, payload: string): Promise<{ gone: boolean }> }

export class NotifyModule {
  private readonly now: () => Date;
  constructor(private readonly pool: Pool, private readonly sender: Sender, options: { now?: () => Date } = {}) { this.now = options.now ?? (() => new Date()); }

  async subscribe(input: { subscription: unknown; lat: unknown; lng: unknown }): Promise<void> {
    const s = input.subscription as PushSubscriptionInput | undefined;
    const endpoint = allowedEndpoint(s?.endpoint);
    const p256dh = String(s?.keys?.p256dh ?? ''); const auth = String(s?.keys?.auth ?? '');
    if (!/^[A-Za-z0-9_-]{40,200}$/.test(p256dh) || !/^[A-Za-z0-9_-]{8,64}$/.test(auth)) throw new NotifyError('INPUT_INVALID', 'keys');
    const at = coarse(input.lat, input.lng);
    await this.pool.query(
      `INSERT INTO notify_subscriptions (id, endpoint, p256dh, auth, lat, lng, located_at, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
       ON CONFLICT (endpoint) DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, lat = EXCLUDED.lat, lng = EXCLUDED.lng, located_at = EXCLUDED.located_at`,
      [crypto.randomUUID(), endpoint, p256dh, auth, at.lat, at.lng, this.now()]);
  }

  async updateLocation(endpoint: unknown, lat: unknown, lng: unknown): Promise<boolean> {
    const e = allowedEndpoint(endpoint);
    const at = coarse(lat, lng);
    const r = await this.pool.query('UPDATE notify_subscriptions SET lat = $2, lng = $3, located_at = $4 WHERE endpoint = $1', [e, at.lat, at.lng, this.now()]);
    return (r.rowCount ?? 0) > 0;
  }

  /** Turning notifications off deletes the subscription and everything sent to it. */
  async unsubscribe(endpoint: unknown): Promise<void> {
    await this.pool.query('DELETE FROM notify_subscriptions WHERE endpoint = $1', [allowedEndpoint(endpoint)]);
  }

  async announce(offer: OfferToAnnounce): Promise<{ sent: number; skipped: string | null }> {
    const now = this.now();
    const t = tehran(now);
    if (t.hour >= 22 || t.hour < 8) return { sent: 0, skipped: 'quiet_hours' };
    // Coarse box first, exact distance after.
    const dLat = offer.radiusMeters / 111_000 + 0.002;
    const dLng = offer.radiusMeters / (111_000 * Math.cos((offer.at.lat * Math.PI) / 180)) + 0.002;
    const rows = await this.pool.query<{ id: string; endpoint: string; p256dh: string; auth: string; lat: number; lng: number; sent_day: string | null; sent_today: number }>(
      `SELECT s.id, s.endpoint, s.p256dh, s.auth, s.lat, s.lng, s.sent_day::text AS sent_day, s.sent_today FROM notify_subscriptions s
        WHERE s.located_at > $1 AND s.lat BETWEEN $2 AND $3 AND s.lng BETWEEN $4 AND $5
          AND NOT EXISTS (SELECT 1 FROM notify_sent n WHERE n.subscription_id = s.id AND n.offer_version_id = $6)`,
      [new Date(now.getTime() - LOCATION_TTL_MS), offer.at.lat - dLat, offer.at.lat + dLat, offer.at.lng - dLng, offer.at.lng + dLng, offer.offerVersionId]);
    const payload = JSON.stringify({ title: offer.businessName, body: offer.offerName, url: `/?org=${encodeURIComponent(offer.organizationId)}&offer=${encodeURIComponent(offer.offerVersionId)}` });
    let sent = 0;
    for (const s of rows.rows) {
      if (distanceMeters({ lat: s.lat, lng: s.lng }, offer.at) > offer.radiusMeters) continue;
      const today = s.sent_day === t.day ? s.sent_today : 0;
      if (today >= DAILY_CAP) continue;
      try {
        const r = await this.sender.send({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload);
        if (r.gone) { await this.pool.query('DELETE FROM notify_subscriptions WHERE id = $1', [s.id]); continue; }
      } catch { continue; }
      await this.pool.query('UPDATE notify_subscriptions SET sent_day = $2, sent_today = $3 WHERE id = $1', [s.id, t.day, today + 1]);
      await this.pool.query('INSERT INTO notify_sent (subscription_id, offer_version_id, sent_at) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [s.id, offer.offerVersionId, now]);
      sent += 1;
    }
    return { sent, skipped: null };
  }

  /** Stale locations are useless and are removed; the subscription itself stays until the viewer turns it off. */
  async purge(): Promise<number> {
    const r = await this.pool.query('DELETE FROM notify_sent WHERE sent_at < $1', [new Date(this.now().getTime() - 30 * 86400_000)]);
    return r.rowCount ?? 0;
  }
}

export const NOTIFY_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS notify_subscriptions (
  id          uuid PRIMARY KEY,
  endpoint    text NOT NULL UNIQUE,
  p256dh      text NOT NULL,
  auth        text NOT NULL,
  lat         double precision NOT NULL,
  lng         double precision NOT NULL,
  located_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL,
  sent_day    date,
  sent_today  integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS notify_subscription_place_idx ON notify_subscriptions (lat, lng);
CREATE TABLE IF NOT EXISTS notify_sent (
  subscription_id  uuid NOT NULL REFERENCES notify_subscriptions(id) ON DELETE CASCADE,
  offer_version_id text NOT NULL,
  sent_at          timestamptz NOT NULL,
  PRIMARY KEY (subscription_id, offer_version_id)
);
`;
