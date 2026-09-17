import { haversineDistanceMeters } from '../directory/geo';

export type PublicCapability = Readonly<{
  capability_id: string; capability_key: string; name: string; short_description: string | null;
  fresh_until: string | null; source_revision: number;
}>;
export type PublicOffer = Readonly<{
  offer_id: string; offer_version_id: string; version_number: number; name: string;
  short_description: string | null; offer_shape: string; terms: unknown | null;
  price_amount: string | null; price_currency: string | null; on_request: boolean;
  valid_from: string; valid_until: string | null;
  capability_links: readonly Readonly<{ capability_id: string; capability_key: string; name: string }>[];
  published_at: string; publication_id: string;
}>;
export type PublicBusiness = Readonly<{
  organization_id: string; name: string; description: string | null;
  location: Readonly<{ latitude: number | null; longitude: number | null; address_text: string | null }> | null;
  contact_information: Readonly<{ public_phone?: string; public_email?: string; public_address?: string }> | null;
  links: Readonly<{ website?: string; public_social?: readonly string[] }> | null;
  business_hours: unknown | null; published_at: string; publication_id: string; source_revision: number;
}>;
export type PublicRecord = Readonly<{
  business: PublicBusiness; capabilities: readonly PublicCapability[]; offers: readonly PublicOffer[];
  stale: boolean; ordering: Readonly<{ primary: 'publication.occurred_at'; tie_breaker: 'publication.id' }>;
}>;

function obj(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('PUBLIC_EXPORT_FIELD_SHAPE');
  return value as Record<string, unknown>;
}
function onlyKeys(value: Record<string, unknown>, keys: readonly string[]): void {
  if (Object.keys(value).some((key) => !keys.includes(key))) throw new Error('PUBLIC_EXPORT_UNKNOWN_PUBLIC_FIELD');
}
function string(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('PUBLIC_EXPORT_FIELD_STRING');
  return value;
}
function nullableString(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== 'string') throw new Error('PUBLIC_EXPORT_FIELD_STRING');
  return value;
}
function integer(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw new Error('PUBLIC_EXPORT_FIELD_INTEGER');
  return value;
}
export function instant(value: unknown): number {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value)) throw new Error('PUBLIC_EXPORT_TIMESTAMP');
  const time = Date.parse(value);
  if (!Number.isFinite(time) || new Date(time).toISOString() !== value) throw new Error('PUBLIC_EXPORT_TIMESTAMP');
  return time;
}
function nullableInstant(value: unknown): string | null {
  if (value === null) return null;
  instant(value);
  return value as string;
}
function optionalStrings(value: unknown, keys: readonly string[]): Record<string, string> {
  const source = obj(value);
  if (Object.keys(source).some((key) => !keys.includes(key))) throw new Error('PUBLIC_EXPORT_UNKNOWN_PUBLIC_FIELD');
  const result: Record<string, string> = {};
  for (const key of keys) if (source[key] !== undefined) result[key] = string(source[key]);
  return result;
}
function location(value: unknown): PublicBusiness['location'] {
  if (value === null) return null;
  const l = obj(value);
  onlyKeys(l, ['latitude', 'longitude', 'address_text']);
  const lat = l.latitude, lon = l.longitude;
  if (lat !== null && (typeof lat !== 'number' || !Number.isFinite(lat) || Math.abs(lat) > 90)) throw new Error('PUBLIC_EXPORT_COORDINATE');
  if (lon !== null && (typeof lon !== 'number' || !Number.isFinite(lon) || Math.abs(lon) > 180)) throw new Error('PUBLIC_EXPORT_COORDINATE');
  if ((lat === null) !== (lon === null)) throw new Error('PUBLIC_EXPORT_COORDINATE_PAIR');
  return { latitude: lat as number | null, longitude: lon as number | null, address_text: nullableString(l.address_text) };
}
function hours(value: unknown): unknown | null {
  if (value === null) return null;
  const h = obj(value);
  if (h.schema_version !== 'mlino.business-hours.v1' || typeof h.timezone !== 'string' || !Array.isArray(h.weekly)) throw new Error('PUBLIC_EXPORT_HOURS_SCHEMA');
  return value;
}
function terms(value: unknown): unknown | null {
  if (value === null) return null;
  const t = obj(value);
  if (t.schema_version !== 'mlino.offer-terms.v1' || typeof t.summary !== 'string' || !Array.isArray(t.conditions)) throw new Error('PUBLIC_EXPORT_TERMS_SCHEMA');
  return value;
}
function business(value: unknown): PublicBusiness {
  const b = obj(value);
  onlyKeys(b, ['organization_id', 'name', 'description', 'location', 'contact_information', 'links', 'business_hours', 'published_at', 'publication_id', 'source_revision']);
  instant(b.published_at);
  const contact = b.contact_information === null ? null : optionalStrings(b.contact_information, ['public_phone', 'public_email', 'public_address']);
  const linksSource = b.links === null ? null : obj(b.links);
  if (linksSource && Object.keys(linksSource).some((key) => !['website', 'public_social'].includes(key))) throw new Error('PUBLIC_EXPORT_UNKNOWN_PUBLIC_FIELD');
  const social = linksSource?.public_social;
  if (social !== undefined && (!Array.isArray(social) || !social.every((item) => typeof item === 'string'))) throw new Error('PUBLIC_EXPORT_LINKS');
  return {
    organization_id: string(b.organization_id), name: string(b.name), description: nullableString(b.description),
    location: location(b.location), contact_information: contact,
    links: linksSource ? { ...(linksSource.website === undefined ? {} : { website: string(linksSource.website) }), ...(social === undefined ? {} : { public_social: [...social as string[]] }) } : null,
    business_hours: hours(b.business_hours), published_at: b.published_at as string,
    publication_id: string(b.publication_id), source_revision: integer(b.source_revision),
  };
}
function capability(value: unknown): PublicCapability {
  const c = obj(value);
  onlyKeys(c, ['capability_id', 'capability_key', 'name', 'short_description', 'fresh_until', 'source_revision']);
  return { capability_id: string(c.capability_id), capability_key: string(c.capability_key), name: string(c.name),
    short_description: nullableString(c.short_description), fresh_until: nullableInstant(c.fresh_until), source_revision: integer(c.source_revision) };
}
function offer(value: unknown): PublicOffer {
  const o = obj(value);
  onlyKeys(o, ['offer_id', 'offer_version_id', 'version_number', 'name', 'short_description', 'offer_shape', 'terms', 'price_amount', 'price_currency', 'on_request', 'valid_from', 'valid_until', 'capability_links', 'published_at', 'publication_id']);
  instant(o.valid_from); nullableInstant(o.valid_until); instant(o.published_at);
  if (!Array.isArray(o.capability_links) || typeof o.on_request !== 'boolean') throw new Error('PUBLIC_EXPORT_OFFER_SHAPE');
  const capability_links = o.capability_links.map((value: unknown) => {
    const link = obj(value);
    onlyKeys(link, ['capability_id', 'capability_key', 'name']);
    return { capability_id: string(link.capability_id), capability_key: string(link.capability_key), name: string(link.name) };
  });
  return { offer_id: string(o.offer_id), offer_version_id: string(o.offer_version_id), version_number: integer(o.version_number),
    name: string(o.name), short_description: nullableString(o.short_description), offer_shape: string(o.offer_shape),
    terms: terms(o.terms), price_amount: nullableString(o.price_amount), price_currency: nullableString(o.price_currency),
    on_request: o.on_request, valid_from: o.valid_from as string, valid_until: o.valid_until as string | null,
    capability_links, published_at: o.published_at as string, publication_id: string(o.publication_id) };
}
export function mapRecords(value: unknown): readonly PublicRecord[] {
  if (!Array.isArray(value)) throw new Error('PUBLIC_EXPORT_RECORDS');
  const ids = new Set<string>();
  return value.map((raw) => {
    const record = obj(raw);
    onlyKeys(record, ['business', 'capabilities', 'offers', 'stale', 'ordering']);
    if (!Array.isArray(record.capabilities) || !Array.isArray(record.offers) || typeof record.stale !== 'boolean') throw new Error('PUBLIC_EXPORT_RECORD_SHAPE');
    const ordering = obj(record.ordering);
    if (ordering.primary !== 'publication.occurred_at' || ordering.tie_breaker !== 'publication.id') throw new Error('PUBLIC_EXPORT_ORDERING');
    const mappedBusiness = business(record.business);
    if (ids.has(mappedBusiness.organization_id)) throw new Error('PUBLIC_EXPORT_DUPLICATE_ORGANIZATION');
    ids.add(mappedBusiness.organization_id);
    const capabilities = record.capabilities.map(capability);
    const byId = new Map(capabilities.map((cap) => [cap.capability_id, cap]));
    if (byId.size !== capabilities.length) throw new Error('PUBLIC_EXPORT_DUPLICATE_CAPABILITY');
    const offers = record.offers.map(offer);
    for (const item of offers) for (const link of item.capability_links) {
      const target = byId.get(link.capability_id);
      if (!target || target.capability_key !== link.capability_key || target.name !== link.name) throw new Error('PUBLIC_EXPORT_INVALID_CAPABILITY_LINK');
    }
    return { business: mappedBusiness, capabilities, offers, stale: record.stale,
      ordering: { primary: 'publication.occurred_at' as const, tie_breaker: 'publication.id' as const } };
  });
}

export function visibleAt(record: PublicRecord, now: number): PublicRecord {
  const capabilities = record.capabilities.filter((cap) => cap.fresh_until === null || instant(cap.fresh_until) > now);
  const ids = new Set(capabilities.map((cap) => cap.capability_id));
  const offers = record.offers.filter((item) => instant(item.valid_from) <= now && (item.valid_until === null || instant(item.valid_until) > now))
    .map((item) => ({ ...item, capability_links: item.capability_links.filter((link) => ids.has(link.capability_id)) }));
  return { ...record, capabilities, offers };
}

export function near(records: readonly PublicRecord[], latitude: number, longitude: number, radiusMeters: number): Array<{ record: PublicRecord; distanceMeters: number }> {
  return records.flatMap((record) => {
    const point = record.business.location;
    if (point?.latitude === null || point?.longitude === null || !point) return [];
    const distanceMeters = haversineDistanceMeters(latitude, longitude, point.latitude, point.longitude);
    return distanceMeters <= radiusMeters ? [{ record, distanceMeters }] : [];
  }).sort((a, b) => a.distanceMeters - b.distanceMeters);
}
