import { runCoreTransaction } from './transaction';
import { Prisma, PrismaClient } from '@prisma/client';
import { AuthContext, requireActiveMembership, requireNonEmpty, validateAuthContext } from './auth-context';
import { mapCoreDatabaseError } from './error-adapter';
import { CoreDomainError, conflict, validationFailed } from './errors';
import { lockOrganization } from './repositories';
import { assertPublishQuota } from './plan-service';

export type PublicationTarget = 'BUSINESS_PROFILE' | 'CAPABILITY' | 'OFFER_VERSION' | 'CATALOG_ITEM';

type PublicationEvent = 'PUBLISHED' | 'WITHDRAWN';
type LockedProfile = { kind: 'BUSINESS_PROFILE'; id: string; publication_status: string; content_revision: number; published_content_revision: number | null; name: string; description: string | null; latitude: Prisma.Decimal | null; longitude: Prisma.Decimal | null; address_text: string | null; contact_information: Prisma.JsonValue | null; links: Prisma.JsonValue | null; business_hours: Prisma.JsonValue | null };
type LockedCapability = { kind: 'CAPABILITY'; id: string; publication_status: string; content_revision: number; published_content_revision: number | null; capability_key: string; name: string; short_description: string | null; audience: string };
type LockedCatalogItem = { kind: 'CATALOG_ITEM'; id: string; publication_status: string; content_revision: number; published_content_revision: number | null; lifecycle_status: string; item_key: string; name: string; short_description: string | null; price_amount: Prisma.Decimal | null; price_currency: string | null; on_request: boolean; grouping_label: string | null; display_order: number; available_from: Date | null; available_until: Date | null };
type LockedTarget = LockedProfile | LockedCapability | LockedCatalogItem;
type LockedOfferVersion = { id: string; offer_id: string; version_number: number; name: string; short_description: string | null; offer_shape: string; terms: Prisma.JsonValue | null; price_amount: Prisma.Decimal | null; price_currency: string | null; on_request: boolean; valid_from: Date; valid_until: Date | null; publication_status: string; visibility_radius_meters: number | null };
type PublishedContent = Prisma.InputJsonObject;

export class PublicationService {
  constructor(private readonly db: PrismaClient) {}

  async publish(context: AuthContext, target: PublicationTarget, targetId: string, reason: string) {
    this.validateTarget(target);
    return this.change(context, target, targetId, reason, 'PUBLISHED');
  }

  async withdraw(context: AuthContext, target: PublicationTarget, targetId: string, reason: string) {
    this.validateTarget(target);
    return this.change(context, target, targetId, reason, 'WITHDRAWN');
  }

  private async change(context: AuthContext, target: PublicationTarget, targetId: string, reason: string, eventKind: PublicationEvent) {
    validateAuthContext(context);
    requireNonEmpty(targetId, 'targetId');
    requireNonEmpty(reason, 'reason');
    return runCoreTransaction(this.db, async (tx) => {
      await lockOrganization(tx, context.organizationId);
      const membership = await requireActiveMembership(tx, context);
      const grant = await tx.permissionGrant.findFirst({ where: { organizationId: context.organizationId, membershipId: membership.id, permissionKey: 'publication.manage', grantStatus: 'ACTIVE' }, select: { id: true } });
      if (!grant) throw new CoreDomainError('AUTHORIZATION_DENIED', 'required permission grant missing');
      if (target === 'OFFER_VERSION') return this.changeOfferVersion(tx, context.organizationId, targetId, reason, eventKind, membership.id, grant.id);
      const row = await this.lockTarget(tx, target, targetId, context.organizationId);
      if (!row) throw validationFailed('publication target not found in organization');
      const status = row.publication_status;
      const revision = row.content_revision;
      const publishedRevision = row.published_content_revision;
      if (eventKind === 'PUBLISHED') {
        if (status === 'PUBLISHED' && publishedRevision === revision) return { outcome: 'ALREADY_PUBLISHED' as const, revision };
        if (!['UNPUBLISHED', 'WITHDRAWN', 'PUBLISHED'].includes(status) || (status === 'PUBLISHED' && revision <= (publishedRevision ?? 0))) throw conflict('invalid publication transition');
      } else if (status !== 'PUBLISHED') {
        throw conflict('target is not published');
      }
      if (eventKind === 'PUBLISHED' && row.kind === 'CATALOG_ITEM' && row.lifecycle_status !== 'ACTIVE') throw conflict('catalog item is not active');
      // D-76: a new public product counts against the plan; a new revision of one already public does not.
      if (eventKind === 'PUBLISHED' && row.kind === 'CATALOG_ITEM' && status !== 'PUBLISHED') await assertPublishQuota(tx, context.organizationId, 'CATALOG_ITEM', new Date());
      const publishedContent = eventKind === 'PUBLISHED' ? await this.snapshotForTarget(tx, row, context.organizationId) : null;
      const data = this.publicationData(target, targetId, context.organizationId, eventKind, eventKind === 'PUBLISHED' ? revision : publishedRevision!, membership.id, grant.id, reason, publishedContent);
      const publication = await tx.publication.create({ data });
      return eventKind === 'PUBLISHED' ? { outcome: 'PUBLISHED' as const, publication } : { outcome: 'WITHDRAWN' as const, publication };
    }).catch((error: unknown) => {
      throw error instanceof CoreDomainError ? error : mapCoreDatabaseError(error);
    });
  }

  private async changeOfferVersion(tx: Prisma.TransactionClient, organizationId: string, versionId: string, reason: string, eventKind: PublicationEvent, membershipId: string, grantId: string) {
    const offerRows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT o.id FROM offers o JOIN offer_versions v ON v.offer_id = o.id AND v.organization_id = o.organization_id WHERE v.id = ${versionId} AND v.organization_id = ${organizationId} FOR UPDATE`);
    if (offerRows.length !== 1) throw validationFailed('offer version not found in organization');
    const versionRows = await tx.$queryRaw<LockedOfferVersion[]>(Prisma.sql`SELECT id, offer_id, version_number, name, short_description, offer_shape, terms, price_amount, price_currency, on_request, valid_from, valid_until, publication_status, visibility_radius_meters FROM offer_versions WHERE id = ${versionId} AND organization_id = ${organizationId} FOR UPDATE`);
    if (versionRows.length !== 1) throw validationFailed('offer version not found in organization');
    const version = versionRows[0];
    if (eventKind === 'WITHDRAWN') {
      if (version.publication_status !== 'PUBLISHED') throw conflict('target is not published');
      const publication = await tx.publication.create({ data: this.publicationData('OFFER_VERSION', versionId, organizationId, 'WITHDRAWN', null, membershipId, grantId, reason, null) });
      return { outcome: 'WITHDRAWN' as const, publication };
    }
    if (version.publication_status === 'PUBLISHED') return { outcome: 'ALREADY_PUBLISHED' as const, revision: null };
    await assertPublishQuota(tx, organizationId, 'OFFER_VERSION', new Date(), version.offer_id);
    const oldRows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT id FROM offer_versions WHERE offer_id = ${version.offer_id} AND organization_id = ${organizationId} AND id <> ${versionId} AND publication_status = 'PUBLISHED' FOR UPDATE`);
    if (oldRows.length > 1) throw conflict('multiple published offer versions found');
    const capabilityRows = await tx.offerVersionCapability.findMany({ where: { organizationId, offerVersionId: versionId }, select: { capabilityId: true }, orderBy: { capabilityId: 'asc' } });
    const publishedContent = this.snapshotForOfferVersion(version, capabilityRows.map((row) => row.capabilityId));
    if (oldRows.length === 1) {
      const withdrawnPublication = await tx.publication.create({ data: this.publicationData('OFFER_VERSION', oldRows[0].id, organizationId, 'WITHDRAWN', null, membershipId, grantId, `replaced by ${versionId}`, null) });
      const publication = await tx.publication.create({ data: this.publicationData('OFFER_VERSION', versionId, organizationId, 'PUBLISHED', null, membershipId, grantId, reason, publishedContent) });
      return { outcome: 'REPLACED' as const, withdrawnPublication, publication };
    }
    const publication = await tx.publication.create({ data: this.publicationData('OFFER_VERSION', versionId, organizationId, 'PUBLISHED', null, membershipId, grantId, reason, publishedContent) });
    return { outcome: 'PUBLISHED' as const, publication };
  }

  private validateTarget(target: PublicationTarget): void {
    if (target !== 'BUSINESS_PROFILE' && target !== 'CAPABILITY' && target !== 'OFFER_VERSION' && target !== 'CATALOG_ITEM') throw validationFailed('unsupported publication target');
  }

  private async lockTarget(tx: Prisma.TransactionClient, target: Exclude<PublicationTarget, 'OFFER_VERSION'>, id: string, organizationId: string): Promise<LockedTarget | undefined> {
    if (target === 'BUSINESS_PROFILE') {
      const rows = await tx.$queryRaw<Omit<LockedProfile, 'kind'>[]>(Prisma.sql`SELECT id, publication_status, content_revision, published_content_revision, name, description, latitude, longitude, address_text, contact_information, links, business_hours FROM business_profiles WHERE id = ${id} AND organization_id = ${organizationId} FOR UPDATE`);
      return rows[0] ? { kind: 'BUSINESS_PROFILE', ...rows[0] } : undefined;
    }
    if (target === 'CAPABILITY') {
      const rows = await tx.$queryRaw<Omit<LockedCapability, 'kind'>[]>(Prisma.sql`SELECT id, publication_status, content_revision, published_content_revision, capability_key, name, short_description, audience FROM capabilities WHERE id = ${id} AND organization_id = ${organizationId} FOR UPDATE`);
      return rows[0] ? { kind: 'CAPABILITY', ...rows[0] } : undefined;
    }
    const rows = await tx.$queryRaw<Omit<LockedCatalogItem, 'kind'>[]>(Prisma.sql`SELECT id, publication_status, content_revision, published_content_revision, lifecycle_status, item_key, name, short_description, price_amount, price_currency, on_request, grouping_label, display_order, available_from, available_until FROM catalog_items WHERE id = ${id} AND organization_id = ${organizationId} FOR UPDATE`);
    return rows[0] ? { kind: 'CATALOG_ITEM', ...rows[0] } : undefined;
  }

  private async snapshotForTarget(tx: Prisma.TransactionClient, row: LockedTarget, organizationId: string): Promise<PublishedContent> {
    if (row.kind === 'BUSINESS_PROFILE') {
      const hasCoordinates = row.latitude !== null && row.longitude !== null;
      return {
        snapshot_version: 'core-publication-snapshot-v1',
        content: {
          name: row.name,
          description: row.description,
          latitude: hasCoordinates ? Number(row.latitude!.toFixed(6)) : null,
          longitude: hasCoordinates ? Number(row.longitude!.toFixed(6)) : null,
          address_text: row.address_text,
          contact_information: sanitizeObject(row.contact_information, ['public_phone', 'public_email', 'public_address']),
          links: sanitizeObject(row.links, ['website', 'public_social']),
          business_hours: row.business_hours,
        },
      } as Prisma.InputJsonObject;
    }
    if (row.kind === 'CATALOG_ITEM') {
      const media = await tx.catalogItemMedia.findMany({ where: { catalogItemId: row.id, organizationId }, orderBy: [{ position: 'asc' }, { sha256: 'asc' }] });
      const links = await tx.offerVersionCatalogItem.findMany({ where: { catalogItemId: row.id, organizationId }, select: { offerVersionId: true }, orderBy: { offerVersionId: 'asc' } });
      return {
        snapshot_version: 'core-publication-snapshot-v1',
        content: {
          item_key: row.item_key,
          name: row.name,
          short_description: row.short_description,
          price_amount: row.price_amount?.toString() ?? null,
          price_currency: row.price_currency,
          on_request: row.on_request,
          grouping_label: row.grouping_label,
          display_order: row.display_order,
          available_from: row.available_from?.toISOString() ?? null,
          available_until: row.available_until?.toISOString() ?? null,
          offer_version_links: links.map((link) => link.offerVersionId),
          media: media.map((image) => ({
            position: image.position,
            path: image.objectPath,
            sha256: image.sha256,
            media_type: ({ AVIF: 'image/avif', WEBP: 'image/webp', JPEG: 'image/jpeg', PNG: 'image/png' } as const)[image.mediaType],
            byte_size: image.byteSize,
            width: image.widthPx,
            height: image.heightPx,
            alt_text: image.altText,
            placeholder: image.placeholderKind === null ? null : { schema_version: image.placeholderKind, value: image.placeholderValue },
          })),
        },
      } as Prisma.InputJsonObject;
    }
    return {
      snapshot_version: 'core-publication-snapshot-v1',
      content: { capability_key: row.capability_key, name: row.name, short_description: row.short_description, audience: row.audience },
    } as Prisma.InputJsonObject;
  }

  private snapshotForOfferVersion(version: LockedOfferVersion, capabilityIds: string[]): PublishedContent {
    return {
      snapshot_version: 'core-publication-snapshot-v1',
      content: {
        offer_id: version.offer_id,
        version_number: version.version_number,
        name: version.name,
        short_description: version.short_description,
        offer_shape: version.offer_shape,
        terms: version.terms,
        price_amount: version.price_amount?.toString() ?? null,
        price_currency: version.price_currency,
        on_request: version.on_request,
        valid_from: version.valid_from.toISOString(),
        valid_until: version.valid_until?.toISOString() ?? null,
        ...(version.visibility_radius_meters !== null ? { visibility_radius_meters: version.visibility_radius_meters } : {}),
        capability_link_ids: [...new Set(capabilityIds)].sort(),
      },
    } as Prisma.InputJsonObject;
  }

  private publicationData(target: PublicationTarget, id: string, organizationId: string, eventKind: PublicationEvent, contentRevision: number | null, membershipId: string, grantId: string, reason: string, publishedContent: PublishedContent | null) {
    const targetFields = target === 'BUSINESS_PROFILE'
      ? { businessProfileId: id, businessProfileOrganizationId: organizationId }
      : target === 'CAPABILITY'
        ? { capabilityId: id, capabilityOrganizationId: organizationId }
        : target === 'CATALOG_ITEM'
          ? { catalogItemId: id, catalogItemOrganizationId: organizationId }
          : { offerVersionId: id, offerVersionOrganizationId: organizationId };
    return {
      organizationId,
      ...targetFields,
      eventKind,
      contentRevision,
      publishedContent: eventKind === 'PUBLISHED' ? publishedContent! : Prisma.DbNull,
      performedByMembershipId: membershipId,
      permissionKey: 'publication.manage',
      gateSnapshot: { grantId, policyVersion: 'core-publication-v1' },
      reason,
    };
  }
}

function sanitizeObject(value: Prisma.JsonValue | null, allowedKeys: readonly string[]): Prisma.InputJsonObject | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
  const source = value as Record<string, Prisma.JsonValue>;
  const sanitized: Record<string, Prisma.InputJsonValue | null> = {};
  for (const key of allowedKeys) {
    const item = source[key];
    if (typeof item === 'string') sanitized[key] = item;
    if (key === 'public_social' && Array.isArray(item) && item.every((entry) => typeof entry === 'string')) sanitized[key] = item;
  }
  return sanitized as Prisma.InputJsonObject;
}
