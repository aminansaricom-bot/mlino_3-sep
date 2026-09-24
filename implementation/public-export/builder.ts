import { PrismaClient } from '@prisma/client';
import { canonicalBytes, snapshotId, utcTimestamp } from './canonical';
import { SignedEnvelope, SigningKeyProvider, signEnvelope } from './signing';

export const CONTRACT_VERSION = 'mlino.v2.public-business.v1' as const;
const SNAPSHOT_VERSION = 'core-publication-snapshot-v1';

export type PublicBusinessRecordV1 = {
  business: {
    organization_id: string; name: string; description: string | null;
    location: { latitude: number | null; longitude: number | null; address_text: string | null } | null;
    contact_information: { public_phone?: string; public_email?: string; public_address?: string } | null;
    links: { website?: string; public_social?: string[] } | null;
    business_hours: unknown | null; published_at: string; publication_id: string; source_revision: number;
  };
  capabilities: Array<{ capability_id: string; capability_key: string; name: string; short_description: string | null; fresh_until: string | null; source_revision: number }>;
  offers: Array<{ offer_id: string; offer_version_id: string; version_number: number; name: string; short_description: string | null; offer_shape: string; terms: unknown | null; price_amount: string | null; price_currency: string | null; on_request: boolean; valid_from: string; valid_until: string | null; capability_links: Array<{ capability_id: string; capability_key: string; name: string }>; published_at: string; publication_id: string; visibility_radius_meters?: number }>;
  stale: boolean;
  /** D-78: present (true) only for PRO/MAX plans. Placement, not a fact about the business; V2 labels it «ویژه». */
  promoted?: true;
  ordering: { primary: 'publication.occurred_at'; tie_breaker: 'publication.id' };
};

export type PublicBusinessExportV1 = {
  contract_version: typeof CONTRACT_VERSION;
  generated_at: string;
  snapshot_id: string;
  signature: { algorithm: 'Ed25519'; key_id: string; value: string };
  records: PublicBusinessRecordV1[];
};

/** D-77: only a whole number of meters in the allowed range is exported; anything else means «everyone». */
function radiusOf(value: unknown): { visibility_radius_meters?: number } {
  return typeof value === 'number' && Number.isInteger(value) && value >= 100 && value <= 20000 ? { visibility_radius_meters: value } : {};
}

export type Issue = { code: string; organization_id?: string; publication_id?: string };
export type BuildOptions = { asOf: Date | string; keyId: string; signingKeyProvider: SigningKeyProvider; onIssue?: (issue: Issue) => void };

type Event = {
  id: string; organizationId: string; businessProfileId: string | null; capabilityId: string | null;
  offerVersionId: string | null; eventKind: 'PUBLISHED' | 'WITHDRAWN';
  contentRevision: number | null; publishedContent: unknown; occurredAt: Date;
};

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function content(event: Event): Record<string, unknown> | null {
  const envelope = object(event.publishedContent);
  return envelope?.snapshot_version === SNAPSHOT_VERSION ? object(envelope.content) : null;
}

function string(value: unknown): string | null { return typeof value === 'string' ? value : null; }
function required(value: unknown): string | null { return typeof value === 'string' && value.trim() ? value : null; }
function nullableString(value: unknown): string | null | undefined { return value === null ? null : string(value) ?? undefined; }

function timestamp(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT/.test(value)) return null;
  try { return utcTimestamp(value); } catch { return null; }
}

function coordinate(value: unknown, limit: number): number | null | undefined {
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > limit || Number(value.toFixed(6)) !== value) return undefined;
  return Object.is(value, -0) ? 0 : value;
}

function selected(events: Event[]): Event[] {
  const latest = new Map<string, Event>();
  for (const event of events) {
    const target = event.businessProfileId ? `p:${event.businessProfileId}` : event.capabilityId ? `c:${event.capabilityId}` : event.offerVersionId ? `o:${event.offerVersionId}` : null;
    if (!target) continue;
    const key = `${event.organizationId}:${target}`;
    const old = latest.get(key);
    if (!old || event.occurredAt.getTime() > old.occurredAt.getTime() ||
        (event.occurredAt.getTime() === old.occurredAt.getTime() && event.id > old.id)) latest.set(key, event);
  }
  return [...latest.values()].filter((event) => event.eventKind === 'PUBLISHED' && content(event));
}

function eventOrder(a: Event, b: Event): number {
  return a.occurredAt.getTime() - b.occurredAt.getTime() || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

function allowContact(value: unknown): PublicBusinessRecordV1['business']['contact_information'] {
  if (value === null) return null;
  const source = object(value);
  if (!source) return null;
  const result: NonNullable<PublicBusinessRecordV1['business']['contact_information']> = {};
  for (const key of ['public_phone', 'public_email', 'public_address'] as const) {
    if (typeof source[key] === 'string') result[key] = source[key] as string;
  }
  return result;
}

function allowLinks(value: unknown): PublicBusinessRecordV1['business']['links'] {
  if (value === null) return null;
  const source = object(value);
  if (!source) return null;
  const result: NonNullable<PublicBusinessRecordV1['business']['links']> = {};
  if (typeof source.website === 'string') result.website = source.website;
  if (Array.isArray(source.public_social) && source.public_social.every((item) => typeof item === 'string')) result.public_social = source.public_social;
  return result;
}

function validInterval(value: unknown): boolean {
  const item = object(value);
  if (!item || Object.keys(item).some((key) => !['open', 'close'].includes(key))) return false;
  const pattern = /^([01]\d|2[0-3]):[0-5]\d$/;
  return typeof item.open === 'string' && typeof item.close === 'string' && pattern.test(item.open) && pattern.test(item.close) && item.open < item.close;
}

function validIntervals(value: unknown): boolean {
  if (!Array.isArray(value) || !value.every(validInterval)) return false;
  const sorted = [...value].sort((a, b) => a.open.localeCompare(b.open));
  return sorted.every((item, index) => index === 0 || sorted[index - 1].close <= item.open);
}

export function validBusinessHours(value: unknown): boolean {
  if (value === null) return true;
  const root = object(value);
  if (!root || Object.keys(root).some((key) => !['schema_version', 'timezone', 'weekly', 'exceptions'].includes(key)) || root.schema_version !== 'mlino.business-hours.v1') return false;
  if (typeof root.timezone !== 'string' || (!root.timezone.includes('/') && root.timezone !== 'UTC')) return false;
  try { new Intl.DateTimeFormat('en-US', { timeZone: root.timezone }); } catch { return false; }
  if (!Array.isArray(root.weekly) || root.weekly.length > 7) return false;
  const days = new Set<number>();
  for (const entry of root.weekly) {
    const day = object(entry);
    if (!day || Object.keys(day).some((key) => !['day', 'intervals'].includes(key)) || !Number.isInteger(day.day) || (day.day as number) < 1 || (day.day as number) > 7 || days.has(day.day as number) || !validIntervals(day.intervals)) return false;
    days.add(day.day as number);
  }
  if (root.exceptions !== undefined) {
    if (!Array.isArray(root.exceptions)) return false;
    const dates = new Set<string>();
    for (const entry of root.exceptions) {
      const exception = object(entry);
      if (!exception || Object.keys(exception).some((key) => !['date', 'closed', 'intervals'].includes(key)) || typeof exception.date !== 'string' || !/^\d{4}-\d\d-\d\d$/.test(exception.date) || dates.has(exception.date) || typeof exception.closed !== 'boolean') return false;
      if (exception.intervals !== undefined && !validIntervals(exception.intervals)) return false;
      dates.add(exception.date);
    }
  }
  return true;
}

export function validTerms(value: unknown): boolean {
  if (value === null) return true;
  const item = object(value);
  if (!item || Object.keys(item).some((key) => !['schema_version', 'summary', 'conditions'].includes(key)) || item.schema_version !== 'mlino.offer-terms.v1' || typeof item.summary !== 'string' || !item.summary.trim() || item.summary.length > 2000 || /<[^>]*>/.test(item.summary)) return false;
  return Array.isArray(item.conditions) && item.conditions.length <= 30 && item.conditions.every((line) => typeof line === 'string' && !!line.trim() && line.length <= 1000 && !/<[^>]*>/.test(line));
}

export async function buildPublicExport(db: PrismaClient, options: BuildOptions): Promise<{ artifact: PublicBusinessExportV1; bytes: Buffer }> {
  const asOf = new Date(utcTimestamp(options.asOf));
  const emit = (code: string, organization_id?: string, publication_id?: string) => {
    const issue: Issue = { code };
    if (organization_id !== undefined) issue.organization_id = organization_id;
    if (publication_id !== undefined) issue.publication_id = publication_id;
    options.onIssue?.(issue);
  };
  const records = await db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
    const [events, organizations, profiles, claims, capabilities, versions, plans] = await Promise.all([
      tx.publication.findMany({ where: { occurredAt: { lte: asOf } }, select: { id: true, organizationId: true, businessProfileId: true, capabilityId: true, offerVersionId: true, eventKind: true, contentRevision: true, publishedContent: true, occurredAt: true } }),
      tx.organization.findMany({ select: { id: true, lifecycleStatus: true } }),
      tx.businessProfile.findMany({ select: { id: true, organizationId: true, lifecycleStatus: true, businessIdentityClaimId: true } }),
      tx.businessIdentityClaim.findMany({ select: { id: true, organizationId: true, claimStatus: true, validUntil: true } }),
      tx.capability.findMany({ select: { id: true, organizationId: true, capabilityStatus: true, audience: true, confirmationStatus: true, freshUntil: true } }),
      tx.offerVersion.findMany({ select: { id: true, organizationId: true, offerId: true, offer: { select: { organizationId: true, lifecycleStatus: true } } } }),
      // Absent in databases (and fakes) that predate plans: nobody is promoted.
      tx.organizationPlan ? tx.organizationPlan.findMany({ where: { planTier: { in: ['PRO', 'MAX'] } }, select: { organizationId: true } }) : Promise.resolve([] as Array<{ organizationId: string }>),
    ]);
    const promotedOrgs = new Set(plans.map((row) => row.organizationId));
    const byProfile = new Map(profiles.map((row) => [row.id, row]));
    const byClaim = new Map(claims.map((row) => [row.id, row]));
    const byCapability = new Map(capabilities.map((row) => [row.id, row]));
    const byVersion = new Map(versions.map((row) => [row.id, row]));
    const latest = selected(events as Event[]);
    const profileEvents = latest.filter((row) => row.businessProfileId).sort(eventOrder);
    const result: PublicBusinessRecordV1[] = [];
    for (const organization of organizations) {
      if (organization.lifecycleStatus !== 'ACTIVE') continue;
      const ownProfiles = profileEvents.filter((row) => row.organizationId === organization.id);
      if (ownProfiles.length > 1) { emit('MULTIPLE_PUBLISHED_PROFILES', organization.id); continue; }
      if (ownProfiles.length !== 1) continue;
      const profileEvent = ownProfiles[0];
      const profile = byProfile.get(profileEvent.businessProfileId!);
      const claim = profile?.businessIdentityClaimId ? byClaim.get(profile.businessIdentityClaimId) : null;
      if (!profile || profile.organizationId !== organization.id || profile.lifecycleStatus !== 'ACTIVE' || !claim || claim.organizationId !== organization.id || claim.claimStatus !== 'VERIFIED' || (claim.validUntil && claim.validUntil <= asOf)) continue;
      const profileContent = content(profileEvent)!;
      const name = required(profileContent.name);
      const description = nullableString(profileContent.description);
      const latitude = coordinate(profileContent.latitude, 90);
      const longitude = coordinate(profileContent.longitude, 180);
      const address = nullableString(profileContent.address_text);
      if (!name || description === undefined || latitude === undefined || longitude === undefined || address === undefined || profileEvent.contentRevision === null) { emit('INVALID_PROFILE_SNAPSHOT', organization.id, profileEvent.id); continue; }
      const location = latitude === null && longitude === null && address === null ? null : { latitude: latitude === null || longitude === null ? null : latitude, longitude: latitude === null || longitude === null ? null : longitude, address_text: address };
      let hours = profileContent.business_hours ?? null;
      if (!validBusinessHours(hours)) { emit('INVALID_BUSINESS_HOURS'); hours = null; }
      const capabilityEntries = latest.filter((row) => row.organizationId === organization.id && row.capabilityId).sort(eventOrder).flatMap((event) => {
        const eligibility = byCapability.get(event.capabilityId!);
        const snapshot = content(event)!;
        if (!eligibility || eligibility.organizationId !== organization.id || eligibility.capabilityStatus !== 'ACTIVE' || eligibility.audience !== 'CUSTOMER_FACING' || eligibility.confirmationStatus !== 'HUMAN_CONFIRMED' || (eligibility.freshUntil && eligibility.freshUntil <= asOf)) return [];
        if (!required(snapshot.capability_key) || !required(snapshot.name) || nullableString(snapshot.short_description) === undefined || event.contentRevision === null) return [];
        return [{ event, dto: { capability_id: event.capabilityId!, capability_key: snapshot.capability_key as string, name: snapshot.name as string, short_description: snapshot.short_description as string | null, fresh_until: eligibility.freshUntil ? utcTimestamp(eligibility.freshUntil) : null, source_revision: event.contentRevision } }];
      });
      const visibleCapabilities = new Map(capabilityEntries.map(({ dto }) => [dto.capability_id, dto]));
      const offers = latest.filter((row) => row.organizationId === organization.id && row.offerVersionId).sort(eventOrder).flatMap((event) => {
        const version = byVersion.get(event.offerVersionId!);
        const snapshot = content(event)!;
        if (!version || version.organizationId !== organization.id || version.offer.organizationId !== organization.id || version.offer.lifecycleStatus !== 'ACTIVE') return [];
        const from = timestamp(snapshot.valid_from);
        const until = snapshot.valid_until === null ? null : timestamp(snapshot.valid_until);
        if (!from || (snapshot.valid_until !== null && !until) || new Date(from) > asOf || (until && new Date(until) <= asOf)) return [];
        if (!validTerms(snapshot.terms)) { emit('INVALID_OFFER_TERMS', organization.id, event.id); return []; }
        if (snapshot.offer_id !== version.offerId || !Number.isSafeInteger(snapshot.version_number) || !required(snapshot.name) || nullableString(snapshot.short_description) === undefined || !required(snapshot.offer_shape) || nullableString(snapshot.price_amount) === undefined || nullableString(snapshot.price_currency) === undefined || typeof snapshot.on_request !== 'boolean' || !Array.isArray(snapshot.capability_link_ids) || !snapshot.capability_link_ids.every((id) => typeof id === 'string')) return [];
        const links = [...new Set(snapshot.capability_link_ids as string[])].sort().flatMap((id) => {
          const cap = visibleCapabilities.get(id);
          return cap ? [{ capability_id: id, capability_key: cap.capability_key, name: cap.name }] : [];
        });
        return [{ offer_id: version.offerId, offer_version_id: version.id, version_number: snapshot.version_number as number, name: snapshot.name as string, short_description: snapshot.short_description as string | null, offer_shape: snapshot.offer_shape as string, terms: snapshot.terms, price_amount: snapshot.price_amount as string | null, price_currency: snapshot.price_currency as string | null, on_request: snapshot.on_request as boolean, valid_from: from, valid_until: until, capability_links: links, published_at: utcTimestamp(event.occurredAt), publication_id: event.id, ...radiusOf(snapshot.visibility_radius_meters) }];
      });
      result.push({
        business: { organization_id: organization.id, name, description, location, contact_information: allowContact(profileContent.contact_information ?? null), links: allowLinks(profileContent.links ?? null), business_hours: hours, published_at: utcTimestamp(profileEvent.occurredAt), publication_id: profileEvent.id, source_revision: profileEvent.contentRevision },
        capabilities: capabilityEntries.map(({ dto }) => dto), offers, stale: false,
        ordering: { primary: 'publication.occurred_at', tie_breaker: 'publication.id' },
        ...(promotedOrgs.has(organization.id) ? { promoted: true as const } : {}),
      });
    }
    return result.sort((a, b) => a.business.published_at.localeCompare(b.business.published_at) || a.business.publication_id.localeCompare(b.business.publication_id) || a.business.organization_id.localeCompare(b.business.organization_id));
  }, { isolationLevel: 'RepeatableRead' });
  const unsigned = { contract_version: CONTRACT_VERSION, generated_at: utcTimestamp(asOf), snapshot_id: snapshotId(CONTRACT_VERSION, records), records };
  const artifact = await signEnvelope(unsigned, options.keyId, options.signingKeyProvider) as PublicBusinessExportV1 & SignedEnvelope;
  return { artifact, bytes: canonicalBytes(artifact) };
}
