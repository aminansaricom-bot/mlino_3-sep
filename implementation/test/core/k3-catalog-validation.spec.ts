import { PrismaClient } from '@prisma/client';
import { AuthContext, CORE_AUTH_ISSUER } from '../../core/auth-context';
import { CatalogItemService } from '../../core/catalog-item-service';
import { OfferService } from '../../core/offer-service';
import { PublicationService } from '../../core/publication-service';

const context: AuthContext = { issuer: CORE_AUTH_ISSUER, organizationId: 'test-org', identityProvider: 'test', externalSubject: 'test-owner' };
// All these rejections occur before the database handle is accessed.
const unavailableDb = {} as PrismaClient;
const catalog = new CatalogItemService(unavailableDb);
const offers = new OfferService(unavailableDb);
const publications = new PublicationService(unavailableDb);

describe('K3 catalog validation without a database', () => {
  test('k3 grouping label rejects control characters and angle brackets before DB access', async () => {
    for (const groupingLabel of ['<script>', 'section\nother', 'a'.repeat(161)]) {
      await expect(catalog.create(context, { organizationId: context.organizationId, itemKey: 'item', name: 'Name', onRequest: true, groupingLabel })).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
    }
  });

  test('k3 catalog create allowlist rejects publication and revision fields before DB access', async () => {
    await expect(catalog.create(context, { organizationId: context.organizationId, itemKey: 'item', name: 'Name', onRequest: true, contentRevision: 999 } as never)).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
    await expect(catalog.updatePublicFields(context, 'item', { publicationStatus: 'PUBLISHED' } as never)).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
  });

  test('k3 media validation rejects invalid path, hash, dimensions and placeholder before DB access', async () => {
    const media = { position: 0, sha256: 'a'.repeat(64), objectPath: `media/sha256/aa/${'a'.repeat(64)}.webp`, mediaType: 'WEBP' as const, byteSize: 1000, widthPx: 800, heightPx: 600, altText: 'Test' };
    for (const bad of [{ ...media, objectPath: '../other.webp' }, { ...media, sha256: 'xyz' }, { ...media, widthPx: 10 }, { ...media, placeholderKind: 'other', placeholderValue: 'x' }]) {
      await expect(catalog.addMedia(context, 'item', bad)).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
    }
  });

  test('k3 offer catalog link rejects forged fields before DB access', async () => {
    await expect(offers.linkCatalogItem(context, { offerVersionId: 'version', catalogItemId: 'item', publicationStatus: 'PUBLISHED' } as never)).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
  });

  test('k3 unsupported publication target rejects before DB access', async () => {
    await expect(publications.publish(context, 'UNKNOWN' as never, 'item', 'test')).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
  });
});
