import { describe, expect, it, vi } from 'vitest';
import fixtureText from './fixtures/public-catalog.v1.fixture.json?raw';
import businessFixture from './fixtures/e2e/public-business.v1.json';
import businessTrust from './fixtures/e2e/trust-bundle.json';
import { canonicalBytes, snapshotId } from './canonical';
import { CatalogConsumer, CatalogFetchTransport, CATALOG_URL } from './catalog';
import { PublicExportConsumer } from './consumer';
import { TrustBundle, trustBundleFromBuildJson } from './trustBundle';
import { verifyArtifact } from './verify';

const at = Date.parse('2026-09-22T12:00:00.000Z');
const iso = (n: number) => new Date(n).toISOString();
const text = (value: Uint8Array) => new TextDecoder().decode(value);
function publicKey(base64url: string): Uint8Array {
  const b64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, '=')), (char) => char.charCodeAt(0));
}
async function pair() {
  const keys = await crypto.subtle.generateKey('Ed25519', true, ['sign', 'verify']);
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', keys.publicKey));
  return { keys, trust: new TrustBundle('test', [{ keyId: 'test', rawPublicKey: raw }]) };
}
async function signed(keys: CryptoKeyPair, records: unknown[], generated = at, domain: 'catalog' | 'business' = 'catalog'): Promise<Uint8Array> {
  const version = domain === 'catalog' ? 'mlino.v2.public-catalog.v1' : 'mlino.v2.public-business.v1';
  const unsigned = { contract_version: version, generated_at: iso(generated), snapshot_id: await snapshotId(version, records), records };
  const metadata = { algorithm: 'Ed25519', key_id: 'test' };
  const payload = canonicalBytes({ ...unsigned, signature: metadata });
  const prefix = new TextEncoder().encode(domain === 'catalog' ? 'MLINO-PUBLIC-CATALOG-V1\n' : 'MLINO-PUBLIC-BUSINESS-V1\n');
  const bytes = new Uint8Array(prefix.length + payload.length);
  bytes.set(prefix); bytes.set(payload, prefix.length);
  const signature = new Uint8Array(await crypto.subtle.sign('Ed25519', keys.privateKey, bytes as BufferSource));
  const value = btoa(String.fromCharCode(...signature)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return canonicalBytes({ ...unsigned, signature: { ...metadata, value } });
}
function item() {
  return { catalog_item_id: 'i-1', item_key: 'coffee', name: 'قهوه', short_description: null,
    price_amount: '50000.00', price_currency: 'IRR', on_request: false, grouping_label: 'نوشیدنی', display_order: 0,
    available_from: null, available_until: null, offer_version_links: ['offer-visible', 'offer-hidden'], media: [],
    published_at: iso(at - 60_000), publication_id: 'p-item', source_revision: 1 };
}
function record(org = 'org-1', businessSnapshot = 'sha256:business', businessPublication = 'p-business') {
  return { organization_id: org, business_snapshot_id: businessSnapshot, business_publication_id: businessPublication, items: [item()] };
}
function businessStub(): PublicExportConsumer {
  return { snapshotId: 'sha256:business', hasValidSnapshot: () => true,
    read: () => [{ business: { organization_id: 'org-1', publication_id: 'p-business' },
      offers: [{ offer_version_id: 'offer-visible' }] },
      { business: { organization_id: 'org-2', publication_id: 'p-other' }, offers: [] }] } as unknown as PublicExportConsumer;
}

describe('signed catalog domain and the frozen K4 fixture', () => {
  it('copies the K4 fixture byte-for-byte by SHA-256 and accepts only the catalog domain', async () => {
    const raw = new TextEncoder().encode(fixtureText);
    const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', raw as BufferSource));
    expect(Array.from(hash, (b) => b.toString(16).padStart(2, '0')).join('')).toBe('dc945f4aefb705956000c21cb8b14eb05ff3f0f2bf12912eaef7ed8494a47442');
    const fixture = JSON.parse(fixtureText);
    const trust = new TrustBundle('k4', [{ keyId: 'test-only-k4', rawPublicKey: publicKey(fixture.public_key_raw_base64url) }]);
    expect((await verifyArtifact(canonicalBytes(fixture.artifact), trust, 'catalog')).snapshot_id).toBe(fixture.expected_snapshot_id);
    await expect(verifyArtifact(canonicalBytes(fixture.artifact), trust)).rejects.toThrow('PUBLIC_EXPORT_VERSION');
  });

  it('continues accepting the old business fixture with the unchanged default domain and rejects it as catalog', async () => {
    const trust = trustBundleFromBuildJson(JSON.stringify(businessTrust));
    const raw = canonicalBytes(businessFixture);
    expect((await verifyArtifact(raw, trust)).contract_version).toBe('mlino.v2.public-business.v1');
    await expect(verifyArtifact(raw, trust, 'catalog')).rejects.toThrow('PUBLIC_EXPORT_VERSION');
  });
});

describe('catalog consumer isolation', () => {
  it('accepts matching organizations, hides only a mismatched one, and drops unresolved offer links', async () => {
    const { keys, trust } = await pair();
    const records = [record(), record('org-2', 'sha256:business', 'wrong-publication')];
    const bytes = await signed(keys, records);
    const catalog = new CatalogConsumer({ read: async () => bytes }, trust);
    await catalog.refresh(businessStub(), at);
    const result = catalog.read(businessStub(), at);
    expect(result.map((r) => r.organization_id)).toEqual(['org-1']);
    expect(result[0].items[0].offer_version_links).toEqual(['offer-visible']);
    expect(text(bytes)).toContain('offer-hidden'); // filtering is a read projection, not a signature mutation.
  });

  it('404 is an empty catalog; failures never mutate the accepted business state', async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 404 }));
    const transport = new CatalogFetchTransport(fetcher as typeof fetch);
    expect(await transport.read()).toBeNull();
    expect(fetcher).toHaveBeenCalledWith(CATALOG_URL, expect.objectContaining({ cache: 'no-store' }));
    const { trust } = await pair();
    const business = businessStub();
    const before = business.read(at);
    const catalog = new CatalogConsumer({ read: async () => { throw new Error('network'); } }, trust);
    await catalog.refresh(business, at);
    expect(catalog.read(business, at)).toEqual([]);
    expect(business.read(at)).toEqual(before);
  });

  it('rejects unknown fields at envelope, record, item and media levels', async () => {
    const { keys, trust } = await pair();
    const media = { position: 0, path: `media/sha256/${'a'.repeat(2)}/${'a'.repeat(64)}.png`,
      sha256: 'a'.repeat(64), media_type: 'image/png', byte_size: 42, width: 800, height: 600,
      alt_text: 'آزمایشی', placeholder: null };
    for (const altered of [
      [{ ...record(), extra: 1 }],
      [{ ...record(), items: [{ ...item(), extra: 1 }] }],
      [{ ...record(), items: [{ ...item(), media: [{ ...media, extra: 1 }] }] }],
    ]) {
      const catalog = new CatalogConsumer({ read: async () => signed(keys, altered) }, trust);
      await catalog.refresh(businessStub(), at);
      expect(catalog.read(businessStub(), at)).toEqual([]);
    }
    const valid = JSON.parse(text(await signed(keys, [record()]))) as Record<string, unknown>;
    valid.extra = true;
    const catalog = new CatalogConsumer({ read: async () => canonicalBytes(valid) }, trust);
    await catalog.refresh(businessStub(), at);
    expect(catalog.read(businessStub(), at)).toEqual([]);
  });

  it('hides expired and future artifacts independently of business', async () => {
    const { keys, trust } = await pair();
    for (const generated of [at - 300_001, at + 30_001]) {
      const catalog = new CatalogConsumer({ read: async () => signed(keys, [record()], generated) }, trust);
      await catalog.refresh(businessStub(), at);
      expect(catalog.read(businessStub(), at)).toEqual([]);
    }
  });
});
