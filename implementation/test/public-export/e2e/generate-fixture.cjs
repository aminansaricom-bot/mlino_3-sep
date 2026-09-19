const fs = require('node:fs');
const fsp = fs.promises;
const path = require('node:path');
const crypto = require('node:crypto');
const ts = require('typescript');
const root = path.resolve(__dirname, '../../../');
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }, fileName: file,
}).outputText, file);
const v1 = file => require(path.join(root, 'public-export', file));
const { canonicalBytes, snapshotId } = v1('canonical.ts');
const { signEnvelope } = v1('signing.ts');
const { generateProtectedKey } = v1('key-providers/keygen.ts');
const { createDpapiKeyProvider } = v1('key-providers/dpapiKeyProvider.ts');
const { buildV2TrustBundle } = v1('key-providers/trustBundle.ts');

async function main() {
  const output = path.resolve(process.argv[2]);
  if (!output) throw new Error('OUTPUT_REQUIRED');
  const secrets = new Map();
  const protector = {
    async protect(bytes) { const token = crypto.randomBytes(32); secrets.set(token.toString('hex'), Buffer.from(bytes)); return token; },
    async unprotect(token) { return Buffer.from(secrets.get(token.toString('hex'))); },
  };
  try {
    const entry = await generateProtectedKey('20260919', protector);
    const descriptor = { format: 'mlino.public-export.keystore.v1', active_key_id: entry.key_id, keys: [entry] };
    const descriptorPath = path.join(output, 'descriptor.test.json');
    await fsp.mkdir(output, { recursive: true });
    await fsp.writeFile(descriptorPath, JSON.stringify(descriptor));
    const provider = await createDpapiKeyProvider({ descriptorPath }, { protector });
    const generated = new Date('2026-09-19T09:00:00.000Z');
    const records = [{ business: { organization_id: 'e2e-org', name: 'E2E TEST', description: 'fixture', location: null,
      contact_information: null, links: null, business_hours: null, published_at: generated.toISOString(),
      publication_id: 'e2e-profile-publication', source_revision: 1 }, capabilities: [], offers: [], stale: false,
      ordering: { primary: 'publication.occurred_at', tie_breaker: 'publication.id' } }];
    const contract = 'mlino.v2.public-business.v1';
    const envelope = await signEnvelope({ contract_version: contract, generated_at: generated.toISOString(),
      snapshot_id: snapshotId(contract, records), records }, entry.key_id, provider);
    const trust = buildV2TrustBundle(descriptor, { version: 'e2e-test-v1', revokedIds: [] });
    await fsp.writeFile(path.join(output, 'public-business.v1.json'), canonicalBytes(envelope));
    await fsp.writeFile(path.join(output, 'trust-bundle.json'), JSON.stringify(trust));
    console.log(JSON.stringify({ artifactBytes: canonicalBytes(envelope).length, keyId: entry.key_id }));
  } finally { for (const value of secrets.values()) value.fill(0); }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
