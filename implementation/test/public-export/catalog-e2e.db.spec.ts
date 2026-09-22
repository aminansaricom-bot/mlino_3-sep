import { createHash, generateKeyPairSync } from 'node:crypto';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { deflateSync } from 'node:zlib';
import { prisma } from '../../foundation/prisma-client';
import { AuthContext, CORE_AUTH_ISSUER } from '../../core/auth-context';
import { BootstrapService } from '../../core/bootstrap-service';
import { BusinessProfileService } from '../../core/business-profile-service';
import { CatalogItemService } from '../../core/catalog-item-service';
import { IdentityClaimService } from '../../core/identity-claim-service';
import { IdentityVerificationService } from '../../core/identity-verification-service';
import { PlatformIdentityVerifier } from '../../core/platform-identity-verifier';
import { PublicationService } from '../../core/publication-service';
import { buildPublicExport } from '../../public-export/builder';
import { verifyCatalogArtifact } from '../../public-export/catalog-artifact';
import { runPublicExportCli } from '../../public-export/cli';
import { distributeCurrent } from '../../public-export/distribution/distribute';
import { catalogMediaGc } from '../../public-export/distribution/media-gc';
import { verifyEnvelope } from '../../public-export/signing';
import { assertDisposableDatabase } from '../core/db-guard';

class TestVerifier implements PlatformIdentityVerifier {
  async verify() { return { ref: 'platform:k4b-e2e' }; }
}
const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const provider = { privateKey: async () => privateKey, publicKey: async () => publicKey };

function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function pngChunk(kind: string, body: Buffer): Buffer {
  const name = Buffer.from(kind, 'ascii');
  const header = Buffer.alloc(4);
  header.writeUInt32BE(body.length);
  const footer = Buffer.alloc(4);
  footer.writeUInt32BE(crc32(Buffer.concat([name, body])));
  return Buffer.concat([header, name, body, footer]);
}
function realPng(color = 0): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(800, 0);
  ihdr.writeUInt32BE(600, 4);
  ihdr[8] = 8;
  ihdr[9] = 2; // RGB, 8 bits per channel.
  const row = Buffer.alloc(1 + 800 * 3);
  row.fill(color, 1);
  const pixels = Buffer.concat(Array.from({ length: 600 }, () => row));
  return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(pixels)), pngChunk('IEND', Buffer.alloc(0))]);
}

describe('K4b catalog producer and distributor end to end on disposable PostgreSQL', () => {
  beforeAll(async () => assertDisposableDatabase());
  afterAll(async () => prisma.$disconnect());

  test('k4b-e2e-published-business-and-catalog-media-isolation', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mlino-k4b-e2e-'));
    const store = path.join(root, 'private');
    const source = path.join(root, 'source');
    const publicDir = path.join(root, 'public');
    await fs.mkdir(store);
    await fs.mkdir(publicDir);
    try {
      const organizationId = `k4b-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const verifier = new TestVerifier();
      const bootstrap = new BootstrapService(prisma, verifier);
      const claims = new IdentityClaimService(prisma, verifier);
      const verifications = new IdentityVerificationService(prisma, verifier);
      const profiles = new BusinessProfileService(prisma);
      const items = new CatalogItemService(prisma);
      const publications = new PublicationService(prisma);
      const { foundingMembership } = await bootstrap.execute('test', { organizationId, displayName: 'K4b',
        foundingIdentityProvider: 'k4b', foundingExternalSubject: organizationId });
      const context: AuthContext = { issuer: CORE_AUTH_ISSUER, organizationId, membershipId: foundingMembership.id,
        identityProvider: foundingMembership.identityProvider, externalSubject: foundingMembership.externalSubject };
      const claim = await claims.submit(context, { organizationId, identifierType: 'registration', identifierValue: organizationId });
      const attempt = await verifications.start(context, { organizationId, claimId: claim.id, methodKey: 'document' });
      await verifications.markUnderReview('test', organizationId, attempt.id);
      await verifications.decide('test', { organizationId, verificationId: attempt.id, decision: 'VERIFIED', decisionReason: 'K4b test' });
      const profile = await profiles.create(context, { organizationId, name: 'K4b business' });
      await profiles.linkIdentityClaim(context, profile.id, claim.id);
      await profiles.activate(context, profile.id);
      await publications.publish(context, 'BUSINESS_PROFILE', profile.id, 'K4b test');

      const image = realPng();
      const sha256 = createHash('sha256').update(image).digest('hex');
      const relative = `media/sha256/${sha256.slice(0, 2)}/${sha256}.png`;
      const imageFile = path.join(store, ...relative.split('/'));
      await fs.mkdir(path.dirname(imageFile), { recursive: true });
      await fs.writeFile(imageFile, image);
      const media = { position: 0, objectPath: relative, sha256, mediaType: 'PNG' as const,
        byteSize: image.length, widthPx: 800, heightPx: 600, altText: 'K4b test image' };
      const first = await items.create(context, { organizationId, itemKey: 'first', name: 'First', onRequest: true, displayOrder: 1 });
      await items.addMedia(context, first.id, media);
      await items.activate(context, first.id);
      await publications.publish(context, 'CATALOG_ITEM', first.id, 'K4b test');
      const second = await items.create(context, { organizationId, itemKey: 'second', name: 'Second', onRequest: true, displayOrder: 2 });
      await items.activate(context, second.id);
      await publications.publish(context, 'CATALOG_ITEM', second.id, 'K4b test');
      const thirdImage = realPng(1);
      const thirdHash = createHash('sha256').update(thirdImage).digest('hex');
      const thirdRelative = `media/sha256/${thirdHash.slice(0, 2)}/${thirdHash}.png`;
      const thirdPath = path.join(store, ...thirdRelative.split('/'));
      await fs.mkdir(path.dirname(thirdPath), { recursive: true });
      await fs.writeFile(thirdPath, thirdImage);
      const tampered = await items.create(context, { organizationId, itemKey: 'tampered', name: 'Tampered', onRequest: true, displayOrder: 3 });
      await items.addMedia(context, tampered.id, { ...media, objectPath: thirdRelative, sha256: thirdHash, byteSize: thirdImage.length });
      await items.activate(context, tampered.id);
      await publications.publish(context, 'CATALOG_ITEM', tampered.id, 'K4b test');
      const withdrawn = await items.create(context, { organizationId, itemKey: 'withdrawn', name: 'Withdrawn', onRequest: true, displayOrder: 4 });
      await items.activate(context, withdrawn.id);
      await publications.publish(context, 'CATALOG_ITEM', withdrawn.id, 'K4b test');
      await publications.withdraw(context, 'CATALOG_ITEM', withdrawn.id, 'K4b test');

      // Tamper only after publication; the first item's image stays intact.
      thirdImage[thirdImage.length - 2] ^= 1;
      await fs.writeFile(thirdPath, thirdImage);

      const asOf = new Date();
      const expectedBusiness = await buildPublicExport(prisma, { asOf, keyId: 'test', signingKeyProvider: provider });
      const logs: string[] = [];
      await runPublicExportCli({ db: prisma, keyProvider: provider,
        env: { MLINO_EXPORT_OUTPUT_DIR: source, MLINO_MEDIA_STORE_DIR: store, MLINO_EXPORT_KEY_ID: 'test',
          MLINO_EXPORT_AS_OF: asOf.toISOString() }, log: (line) => logs.push(line) });
      const businessBytes = await fs.readFile(path.join(source, 'public-business.v1.json'));
      expect(businessBytes).toEqual(expectedBusiness.bytes);
      const business = JSON.parse(businessBytes.toString('utf8'));
      const ownBusiness = business.records.find((entry: { business: { organization_id: string } }) => entry.business.organization_id === organizationId);
      expect(ownBusiness?.business.name).toBe('K4b business');
      const catalogBytes = await fs.readFile(path.join(source, 'public-catalog.v1.json'));
      const catalog = await verifyCatalogArtifact(catalogBytes, provider, business, asOf);
      expect(await verifyEnvelope(catalog, provider, 'catalog')).toBe(true);
      expect(await verifyEnvelope(catalog, provider)).toBe(false);
      const own = catalog.records.find((record) => record.organization_id === organizationId)!;
      expect(own.business_snapshot_id).toBe(business.snapshot_id);
      expect(own.business_publication_id).toBe(ownBusiness.business.publication_id);
      expect(own.items.map((item) => item.item_key)).toEqual(['first', 'second']);
      expect(logs.some((line) => line.includes('CATALOG_MEDIA_HASH'))).toBe(true);
      await distributeCurrent({ sourceDir: source, publicDir, keyProvider: provider, now: asOf });
      expect(await fs.readFile(path.join(publicDir, 'public-business.v1.json'))).toEqual(businessBytes);
      expect(await fs.readFile(path.join(publicDir, 'public-catalog.v1.json'))).toEqual(catalogBytes);
      expect(createHash('sha256').update(await fs.readFile(path.join(publicDir, ...relative.split('/')))).digest('hex')).toBe(sha256);
      await expect(fs.stat(path.join(publicDir, ...thirdRelative.split('/')))).rejects.toMatchObject({ code: 'ENOENT' });
      expect(await catalogMediaGc(publicDir, provider, { now: asOf })).toEqual([]);
    } finally { await fs.rm(root, { recursive: true, force: true }); }
  });
});
