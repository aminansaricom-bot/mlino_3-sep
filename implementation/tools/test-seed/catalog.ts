import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { AuthContext, CORE_AUTH_ISSUER } from '../../core/auth-context';
import { CatalogItemService } from '../../core/catalog-item-service';
import { PublicationService } from '../../core/publication-service';
import { PermissionGrantService } from '../../core/permission-grant-service';
import { validateMediaStore } from '../../public-export/media';
import { catalogTestMedia, generateCatalogTestPng, storeCatalogTestMedia } from './catalog-images';
import { createSeedPlatformVerifier, SEED_REASON } from './seed';
import { TestSeedError } from './types';
import { isTestSeedOrganizationId } from './withdraw';

export interface TestCatalogInput {
  test_id: string; item_key: string; name: string; short_description: string | null;
  price_amount: number | null; price_currency: string | null; on_request: boolean;
  grouping_label: string | null; display_order: number; images: Array<{ alt_text: string }>;
}
const FIELDS = ['test_id', 'item_key', 'name', 'short_description', 'price_amount', 'price_currency',
  'on_request', 'grouping_label', 'display_order', 'images'];
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
function fail(code: string): never { throw new TestSeedError(code); }

function parseOne(value: unknown): TestCatalogInput {
  if (!object(value) || Object.keys(value).length !== FIELDS.length ||
      Object.keys(value).some((field) => !FIELDS.includes(field)) || FIELDS.some((field) => !(field in value))) fail('TEST_SEED_CATALOG_SHAPE');
  if (typeof value.test_id !== 'string' || !/^(?:vanak|demo)-\d{2}$/.test(value.test_id)) fail('TEST_SEED_CATALOG_TEST_ID');
  if (typeof value.item_key !== 'string' || !value.item_key.startsWith('test-ui-vanak-') || value.item_key.length > 160) fail('TEST_SEED_CATALOG_KEY');
  if (typeof value.name !== 'string' || !value.name.includes('(آزمایشی)') || value.name.length > 200) fail('TEST_SEED_CATALOG_NAME');
  if (value.short_description !== null && (typeof value.short_description !== 'string' || value.short_description.length > 2000)) fail('TEST_SEED_CATALOG_DESCRIPTION');
  if (value.grouping_label !== null && (typeof value.grouping_label !== 'string' || value.grouping_label.length > 160 || /[<>\u0000-\u001f\u007f]/u.test(value.grouping_label))) fail('TEST_SEED_CATALOG_GROUP');
  if (!Number.isSafeInteger(value.display_order) || (value.display_order as number) < 0) fail('TEST_SEED_CATALOG_ORDER');
  if (typeof value.on_request !== 'boolean') fail('TEST_SEED_CATALOG_PRICE_MODE');
  if (value.on_request) {
    if (value.price_amount !== null || value.price_currency !== null) fail('TEST_SEED_CATALOG_PRICE_MODE');
  } else if (typeof value.price_amount !== 'number' || !Number.isFinite(value.price_amount) ||
      !/^(0|[1-9]\d{0,9})(\.\d{1,2})?$/.test(String(value.price_amount)) ||
      typeof value.price_currency !== 'string' || !/^[A-Z]{3}$/.test(value.price_currency)) fail('TEST_SEED_CATALOG_PRICE_MODE');
  if (!Array.isArray(value.images) || value.images.length > 8 || value.images.some((image) => !object(image) ||
      Object.keys(image).length !== 1 || typeof image.alt_text !== 'string' || !image.alt_text.trim() || image.alt_text.length > 300)) fail('TEST_SEED_CATALOG_IMAGES');
  return value as unknown as TestCatalogInput;
}

export function parseTestCatalog(value: unknown): TestCatalogInput[] {
  if (!Array.isArray(value) || value.length === 0) fail('TEST_SEED_CATALOG_SHAPE');
  const rows = value.map(parseOne);
  if (new Set(rows.map((row) => row.item_key)).size !== rows.length) fail('TEST_SEED_CATALOG_KEY_DUPLICATE');
  return rows;
}
export function readTestCatalog(inputPath: string): TestCatalogInput[] {
  let value: unknown;
  try { value = JSON.parse(readFileSync(inputPath, 'utf8')); } catch { fail('TEST_SEED_CATALOG_JSON'); }
  return parseTestCatalog(value);
}

export function catalogOrganizationId(testId: string): string {
  if (!/^(?:vanak|demo)-\d{2}$/.test(testId)) fail('TEST_SEED_CATALOG_TEST_ID');
  return `test-${testId}`;
}

function contextFor(organizationId: string, membership: { id: string; externalSubject: string }): AuthContext {
  return { issuer: CORE_AUTH_ISSUER, organizationId, identityProvider: 'test-seed',
    externalSubject: membership.externalSubject, membershipId: membership.id };
}

export async function seedTestCatalog(db: PrismaClient, rows: TestCatalogInput[], store: string, env: NodeJS.ProcessEnv = process.env) {
  const verifier = createSeedPlatformVerifier(env);
  const base = await validateMediaStore(store);
  const catalog = new CatalogItemService(db);
  const publications = new PublicationService(db);
  const grants = new PermissionGrantService(db, verifier);
  let created = 0; let skipped = 0; let images = 0;
  for (const row of rows) {
    const organizationId = catalogOrganizationId(row.test_id);
    const organization = await db.organization.findUnique({ where: { id: organizationId }, select: {
      id: true, memberships: { where: { identityProvider: 'test-seed', externalSubject: row.test_id, membershipStatus: 'ACTIVE' }, select: { id: true, externalSubject: true }, take: 1 },
    } });
    if (!organization || organization.memberships.length !== 1) fail('TEST_SEED_CATALOG_ORGANIZATION');
    const member = organization.memberships[0];
    let grant = await db.permissionGrant.findFirst({ where: { organizationId, membershipId: member.id,
      permissionKey: 'catalog_item.manage', grantStatus: 'ACTIVE' }, select: { id: true } });
    if (!grant) {
      // The approved path is the official service. Current Core rejects founder self-grants; that
      // architecture gap remains fail-closed and is called out in the execution report.
      await grants.issue(contextFor(organizationId, member), member.id, 'catalog_item.manage', SEED_REASON);
      grant = await db.permissionGrant.findFirst({ where: { organizationId, membershipId: member.id,
        permissionKey: 'catalog_item.manage', grantStatus: 'ACTIVE' }, select: { id: true } });
      if (!grant) fail('TEST_SEED_CATALOG_GRANT_MISSING');
    }
    const existing = await db.catalogItem.findUnique({ where: { organizationId_itemKey: { organizationId, itemKey: row.item_key } },
      select: { lifecycleStatus: true, publicationStatus: true } });
    if (existing) {
      if (existing.lifecycleStatus !== 'ACTIVE' || existing.publicationStatus !== 'PUBLISHED') fail('TEST_SEED_CATALOG_PARTIAL');
      skipped++; continue;
    }
    const context = contextFor(organizationId, member);
    const item = await catalog.create(context, { organizationId, itemKey: row.item_key, name: row.name,
      shortDescription: row.short_description, priceAmount: row.price_amount, priceCurrency: row.price_currency,
      onRequest: row.on_request, groupingLabel: row.grouping_label, displayOrder: row.display_order });
    for (const [position, image] of row.images.entries()) {
      const bytes = generateCatalogTestPng(row.item_key, position);
      const media = catalogTestMedia(bytes, position, image.alt_text);
      await storeCatalogTestMedia(base, bytes, media);
      await catalog.addMedia(context, item.id, { position, objectPath: media.path, sha256: media.sha256,
        mediaType: 'PNG', byteSize: media.byte_size, widthPx: media.width, heightPx: media.height,
        altText: media.alt_text });
      images++;
    }
    await catalog.activate(context, item.id);
    await publications.publish(context, 'CATALOG_ITEM', item.id, SEED_REASON);
    created++;
  }
  return { created, skipped, images };
}

export async function withdrawTestCatalog(db: PrismaClient, env: NodeJS.ProcessEnv = process.env) {
  createSeedPlatformVerifier(env);
  const organizations = await db.organization.findMany({ where: { OR: [
    { id: { startsWith: 'test-vanak-' } }, { id: { startsWith: 'test-demo-' } },
  ] }, select: { id: true, memberships: { where: { identityProvider: 'test-seed', membershipStatus: 'ACTIVE' },
    select: { id: true, externalSubject: true }, take: 1 } } });
  const catalog = new CatalogItemService(db);
  const publications = new PublicationService(db);
  let withdrawn = 0; let retired = 0;
  for (const organization of organizations) {
    if (!isTestSeedOrganizationId(organization.id) || organization.memberships.length !== 1) continue;
    const context = contextFor(organization.id, organization.memberships[0]);
    const items = await db.catalogItem.findMany({ where: { organizationId: organization.id,
      itemKey: { startsWith: 'test-ui-vanak-' } }, select: { id: true, lifecycleStatus: true, publicationStatus: true } });
    for (const item of items) {
      if (item.publicationStatus === 'PUBLISHED') { await publications.withdraw(context, 'CATALOG_ITEM', item.id, SEED_REASON); withdrawn++; }
      if (item.lifecycleStatus === 'ACTIVE') { await catalog.retire(context, item.id, 'TEST DATA cleanup'); retired++; }
    }
  }
  return { withdrawn, retired };
}
