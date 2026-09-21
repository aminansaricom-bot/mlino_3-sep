import { CatalogMediaType, Prisma, PrismaClient } from '@prisma/client';
import { AuthContext, requireMembershipPermission, requireNonEmpty, requireSameOrganization, validateAuthContext } from './auth-context';
import { mapCoreDatabaseError } from './error-adapter';
import { CoreDomainError, conflict, validationFailed } from './errors';
import { lockOrganization } from './repositories';
import { runCoreTransaction } from './transaction';

export interface CreateCatalogItemInput {
  organizationId: string;
  itemKey: string;
  name: string;
  shortDescription?: string | null;
  priceAmount?: number | string | null;
  priceCurrency?: string | null;
  onRequest: boolean;
  groupingLabel?: string | null;
  displayOrder?: number;
  availableFrom?: Date | null;
  availableUntil?: Date | null;
}

export type CatalogPublicFields = Partial<Pick<CreateCatalogItemInput, 'name' | 'shortDescription' | 'priceAmount' | 'priceCurrency' | 'onRequest' | 'groupingLabel' | 'displayOrder' | 'availableFrom' | 'availableUntil'>>;

export interface CatalogMediaInput {
  position: number;
  objectPath: string;
  sha256: string;
  mediaType: CatalogMediaType;
  byteSize: number;
  widthPx: number;
  heightPx: number;
  altText: string;
  placeholderKind?: string | null;
  placeholderValue?: string | null;
}

const PUBLIC_FIELDS = ['name', 'shortDescription', 'priceAmount', 'priceCurrency', 'onRequest', 'groupingLabel', 'displayOrder', 'availableFrom', 'availableUntil'] as const;
const MEDIA_FIELDS = ['position', 'objectPath', 'sha256', 'mediaType', 'byteSize', 'widthPx', 'heightPx', 'altText', 'placeholderKind', 'placeholderValue'] as const;

export class CatalogItemService {
  constructor(private readonly db: PrismaClient) {}

  async create(context: AuthContext, input: CreateCatalogItemInput) {
    validateAuthContext(context);
    assertKeys(input, ['organizationId', 'itemKey', ...PUBLIC_FIELDS]);
    requireSameOrganization(context, input.organizationId);
    if (typeof input.itemKey !== 'string') throw validationFailed('invalid itemKey');
    requireNonEmpty(input.itemKey, 'itemKey');
    validatePublic(input, true);
    return this.inTransaction(async (tx) => {
      await this.authorize(tx, context);
      return tx.catalogItem.create({ data: {
        organizationId: context.organizationId,
        itemKey: input.itemKey,
        name: input.name,
        shortDescription: input.shortDescription,
        priceAmount: input.priceAmount,
        priceCurrency: input.priceCurrency,
        onRequest: input.onRequest,
        groupingLabel: input.groupingLabel,
        displayOrder: input.displayOrder,
        availableFrom: input.availableFrom,
        availableUntil: input.availableUntil,
      } });
    });
  }

  async updatePublicFields(context: AuthContext, catalogItemId: string, input: CatalogPublicFields) {
    validateAuthContext(context);
    requireNonEmpty(catalogItemId, 'catalogItemId');
    assertKeys(input, PUBLIC_FIELDS);
    if (Object.keys(input).length === 0) throw validationFailed('at least one public field is required');
    validatePublic(input, false);
    return this.inTransaction(async (tx) => {
      await this.authorize(tx, context);
      const item = await this.lockItem(tx, context.organizationId, catalogItemId);
      if (item.lifecycle_status === 'RETIRED') throw conflict('catalog item is retired');
      validateAvailability(
        input.availableFrom === undefined ? item.available_from : input.availableFrom,
        input.availableUntil === undefined ? item.available_until : input.availableUntil,
      );
      return tx.catalogItem.update({ where: { id_organizationId: { id: catalogItemId, organizationId: context.organizationId } }, data: input });
    });
  }

  async activate(context: AuthContext, catalogItemId: string) {
    validateAuthContext(context);
    requireNonEmpty(catalogItemId, 'catalogItemId');
    return this.inTransaction(async (tx) => {
      const member = await this.authorize(tx, context);
      const item = await this.lockItem(tx, context.organizationId, catalogItemId);
      if (item.lifecycle_status !== 'DRAFT') throw conflict('catalog item is not draft');
      return tx.catalogItem.update({ where: { id_organizationId: { id: catalogItemId, organizationId: context.organizationId } }, data: {
        lifecycleStatus: 'ACTIVE', activatedAt: new Date(), activatedByMembershipId: member.id, activatedByOrganizationId: context.organizationId,
      } });
    });
  }

  async retire(context: AuthContext, catalogItemId: string, reason: string) {
    validateAuthContext(context);
    requireNonEmpty(catalogItemId, 'catalogItemId');
    requireNonEmpty(reason, 'reason');
    return this.inTransaction(async (tx) => {
      const member = await this.authorize(tx, context);
      const item = await this.lockItem(tx, context.organizationId, catalogItemId);
      if (item.lifecycle_status !== 'ACTIVE' || item.publication_status === 'PUBLISHED') throw conflict('catalog item must be active and withdrawn before retirement');
      return tx.catalogItem.update({ where: { id_organizationId: { id: catalogItemId, organizationId: context.organizationId } }, data: {
        lifecycleStatus: 'RETIRED', retiredAt: new Date(), retiredByMembershipId: member.id, retiredByOrganizationId: context.organizationId, retirementReason: reason,
      } });
    });
  }

  async addMedia(context: AuthContext, catalogItemId: string, input: CatalogMediaInput) {
    validateAuthContext(context);
    requireNonEmpty(catalogItemId, 'catalogItemId');
    assertKeys(input, MEDIA_FIELDS);
    validateMedia(input);
    return this.inTransaction(async (tx) => {
      await this.authorize(tx, context);
      const item = await this.lockItem(tx, context.organizationId, catalogItemId);
      if (item.lifecycle_status === 'RETIRED') throw conflict('catalog item is retired');
      return tx.catalogItemMedia.create({ data: { organizationId: context.organizationId, catalogItemId, ...input } });
    });
  }

  async reorderMedia(context: AuthContext, catalogItemId: string, orderedMediaIds: string[]) {
    validateAuthContext(context);
    requireNonEmpty(catalogItemId, 'catalogItemId');
    if (!Array.isArray(orderedMediaIds) || orderedMediaIds.length > 8 || new Set(orderedMediaIds).size !== orderedMediaIds.length || orderedMediaIds.some((id) => typeof id !== 'string' || !id)) throw validationFailed('invalid catalog media order');
    return this.inTransaction(async (tx) => {
      await this.authorize(tx, context);
      const item = await this.lockItem(tx, context.organizationId, catalogItemId);
      if (item.lifecycle_status === 'RETIRED') throw conflict('catalog item is retired');
      const existing = await tx.catalogItemMedia.findMany({ where: { catalogItemId, organizationId: context.organizationId }, select: { id: true } });
      if (existing.length !== orderedMediaIds.length || existing.some((row) => !orderedMediaIds.includes(row.id))) throw validationFailed('catalog media order does not match item');
      await tx.$executeRawUnsafe('SET CONSTRAINTS catalog_item_media_item_position_unique DEFERRED');
      for (const [position, id] of orderedMediaIds.entries()) {
        await tx.catalogItemMedia.update({ where: { id_organizationId: { id, organizationId: context.organizationId } }, data: { position } });
      }
      return tx.catalogItemMedia.findMany({ where: { catalogItemId, organizationId: context.organizationId }, orderBy: { position: 'asc' } });
    });
  }

  async removeMedia(context: AuthContext, catalogItemId: string, mediaId: string) {
    validateAuthContext(context);
    requireNonEmpty(catalogItemId, 'catalogItemId');
    requireNonEmpty(mediaId, 'mediaId');
    return this.inTransaction(async (tx) => {
      await this.authorize(tx, context);
      const item = await this.lockItem(tx, context.organizationId, catalogItemId);
      if (item.lifecycle_status === 'RETIRED') throw conflict('catalog item is retired');
      const media = await tx.catalogItemMedia.findUnique({ where: { id_organizationId: { id: mediaId, organizationId: context.organizationId } } });
      if (!media || media.catalogItemId !== catalogItemId) throw validationFailed('catalog media not found in item');
      return tx.catalogItemMedia.delete({ where: { id_organizationId: { id: mediaId, organizationId: context.organizationId } } });
    });
  }

  private async authorize(tx: Prisma.TransactionClient, context: AuthContext) {
    await lockOrganization(tx, context.organizationId);
    return requireMembershipPermission(tx, context, 'catalog_item.manage');
  }

  private async lockItem(tx: Prisma.TransactionClient, organizationId: string, itemId: string) {
    const rows = await tx.$queryRaw<Array<{ id: string; lifecycle_status: string; publication_status: string; available_from: Date | null; available_until: Date | null }>>(Prisma.sql`SELECT id, lifecycle_status, publication_status, available_from, available_until FROM catalog_items WHERE id = ${itemId} AND organization_id = ${organizationId} FOR UPDATE`);
    if (rows.length !== 1) throw validationFailed('catalog item not found in organization');
    return rows[0];
  }

  private async inTransaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return runCoreTransaction(this.db, work).catch((error: unknown) => { throw error instanceof CoreDomainError ? error : mapCoreDatabaseError(error); });
  }
}

function assertKeys(input: object, allowed: readonly string[]): void {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw validationFailed('invalid catalog input');
  const unknown = Object.keys(input).find((key) => !allowed.includes(key));
  if (unknown) throw validationFailed(`unknown catalog field: ${unknown}`);
}

function validatePublic(input: CatalogPublicFields, creating: boolean): void {
  if (creating && typeof input.onRequest !== 'boolean') throw validationFailed('onRequest is required');
  if (input.onRequest !== undefined && typeof input.onRequest !== 'boolean') throw validationFailed('invalid onRequest');
  if (input.name !== undefined && (typeof input.name !== 'string' || !input.name.trim() || input.name.length > 200)) throw validationFailed('invalid name');
  if (creating && input.name === undefined) throw validationFailed('name is required');
  if (input.shortDescription != null && typeof input.shortDescription !== 'string') throw validationFailed('invalid short description');
  if (input.priceAmount != null && ((typeof input.priceAmount !== 'number' && typeof input.priceAmount !== 'string') || !/^(0|[1-9]\d{0,9})(\.\d{1,2})?$/.test(String(input.priceAmount)))) throw validationFailed('invalid price amount');
  if (input.groupingLabel != null && (typeof input.groupingLabel !== 'string' || input.groupingLabel.length > 160 || /[<>\u0000-\u001f\u007f]/u.test(input.groupingLabel))) throw validationFailed('invalid grouping label');
  if (input.displayOrder !== undefined && (!Number.isInteger(input.displayOrder) || input.displayOrder < 0)) throw validationFailed('invalid display order');
  if (input.priceCurrency != null && (typeof input.priceCurrency !== 'string' || !/^[A-Z]{3}$/.test(input.priceCurrency))) throw validationFailed('invalid price currency');
  if (input.availableFrom != null && (!(input.availableFrom instanceof Date) || Number.isNaN(input.availableFrom.getTime()))) throw validationFailed('invalid availableFrom');
  if (input.availableUntil != null && (!(input.availableUntil instanceof Date) || Number.isNaN(input.availableUntil.getTime()))) throw validationFailed('invalid availableUntil');
  if (creating) validateAvailability(input.availableFrom, input.availableUntil);
}

function validateAvailability(from: Date | null | undefined, until: Date | null | undefined): void {
  if (from != null && until != null && until <= from) throw validationFailed('invalid catalog availability range');
}

function validateMedia(input: CatalogMediaInput): void {
  if (!Number.isInteger(input.position) || input.position < 0 || input.position > 7) throw validationFailed('invalid catalog media position');
  if (!Number.isInteger(input.byteSize) || input.byteSize < 1 || input.byteSize > 1500000) throw validationFailed('invalid catalog media byte size');
  if (!Number.isInteger(input.widthPx) || !Number.isInteger(input.heightPx) || input.widthPx < 320 || input.widthPx > 4096 || input.heightPx < 320 || input.heightPx > 4096 || input.widthPx * input.heightPx > 16000000) throw validationFailed('invalid catalog media dimensions');
  if (typeof input.altText !== 'string' || input.altText.trim().length < 1 || input.altText.length > 300) throw validationFailed('invalid catalog media alt text');
  if (typeof input.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(input.sha256)) throw validationFailed('invalid catalog media hash');
  const extension = { AVIF: 'avif', WEBP: 'webp', JPEG: 'jpg', PNG: 'png' }[input.mediaType];
  if (!extension || input.objectPath !== `media/sha256/${input.sha256.slice(0, 2)}/${input.sha256}.${extension}`) throw validationFailed('invalid catalog media path');
  if ((input.placeholderKind == null) !== (input.placeholderValue == null) || (input.placeholderKind != null && (input.placeholderKind !== 'mlino.blurhash.v1' || typeof input.placeholderValue !== 'string' || input.placeholderValue.trim().length < 1 || input.placeholderValue.length > 256))) throw validationFailed('invalid catalog media placeholder');
}
