import fs from 'node:fs';
import type { BusinessFacts } from '../../chat';

/**
 * The business's PUBLISHED facts for the chat auto-reply, read from the same public files V2 reads (D-52).
 * Nothing unpublished — no draft, stock, or internal data — can reach an automatic answer.
 */

type Json = Record<string, unknown>;
interface Cached { mtimeMs: number; value: Map<string, Json> }
const caches = new Map<string, Cached>();

function load(path: string, key: (record: Json) => string | undefined): Map<string, Json> {
  let stat: fs.Stats;
  try { stat = fs.statSync(path); } catch { return caches.get(path)?.value ?? new Map(); }
  const hit = caches.get(path);
  if (hit && hit.mtimeMs === stat.mtimeMs) return hit.value;
  const value = new Map<string, Json>();
  try {
    const doc = JSON.parse(fs.readFileSync(path, 'utf8')) as { records?: Json[] };
    for (const r of doc.records ?? []) { const k = key(r); if (k) value.set(k, r); }
  } catch { return hit?.value ?? new Map(); }
  caches.set(path, { mtimeMs: stat.mtimeMs, value });
  return value;
}

const priceLabel = (amount: unknown) => (typeof amount === 'string' && amount ? `${new Intl.NumberFormat('fa-IR').format(Number(amount))} ریال` : null);
const dateLabel = (iso: unknown) => (typeof iso === 'string' ? new Date(iso).toLocaleDateString('fa-IR', { day: 'numeric', month: 'long', timeZone: 'Asia/Tehran' }) : null);

/** Published name and coordinates of a business (for nearby-offer notifications). */
export function businessPlace(businessPath: string, organizationId: string): { name: string; lat: number; lng: number } | null {
  const record = load(businessPath, (r) => (r.business as Json | undefined)?.organization_id as string | undefined).get(organizationId);
  const b = record?.business as Json | undefined;
  const loc = b?.location as Json | null | undefined;
  if (!b || typeof loc?.latitude !== 'number' || typeof loc?.longitude !== 'number') return null;
  return { name: String(b.name ?? '').replace(/\s*\(آزمایشی\)/g, ''), lat: loc.latitude as number, lng: loc.longitude as number };
}

export function businessFacts(businessPath: string, catalogPath: string, organizationId: string, now = Date.now()): BusinessFacts | null {
  const record = load(businessPath, (r) => (r.business as Json | undefined)?.organization_id as string | undefined).get(organizationId);
  if (!record) return null;
  const b = record.business as Json;
  const location = b.location as Json | null;
  const contact = b.contact_information as Json | null;
  const hours = (b.business_hours as Json | null)?.weekly as BusinessFacts['hours'] | undefined;
  const catalog = load(catalogPath, (r) => r.organization_id as string | undefined).get(organizationId);
  const items = ((catalog?.items as Json[] | undefined) ?? []).map((i) => ({ name: String(i.name ?? ''), price: i.on_request ? null : priceLabel(i.price_amount) }));
  const offers = ((record.offers as Json[] | undefined) ?? [])
    // Radius-limited offers are for viewers nearby (D-77); the chat does not know where the customer is.
    .filter((o) => o.visibility_radius_meters === undefined)
    .filter((o) => Date.parse(String(o.valid_from)) <= now && (o.valid_until === null || Date.parse(String(o.valid_until)) > now))
    .map((o) => ({ name: String(o.name ?? ''), until: dateLabel(o.valid_until) }));
  return {
    name: String(b.name ?? ''),
    address: (location?.address_text as string | null) ?? null,
    phone: (contact?.public_phone as string | undefined) ?? null,
    hours: Array.isArray(hours) ? hours : null,
    items,
    offers,
  };
}
