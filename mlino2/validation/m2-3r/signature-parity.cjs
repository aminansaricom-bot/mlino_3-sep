// TEST-ONLY diagnostic. No real keys, network, database or product-file changes.
// Usage: node signature-parity.cjs <V1 implementation directory> <V2 app directory>
const fs = require('node:fs');
const fsp = fs.promises;
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const [v1, v2] = process.argv.slice(2).map(value => path.resolve(value));
if (!v1 || !v2) throw new Error('TWO_WORKTREE_ARGUMENTS_REQUIRED');
const ts = require(path.join(v1, 'node_modules/typescript'));
require.extensions['.ts'] = (module, file) => {
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: file,
  });
  module._compile(compiled.outputText, file);
};
const fromV1 = file => require(path.join(v1, 'public-export', file));
const fromV2 = file => require(path.join(v2, 'src/publicExport', file));
const { canonicalBytes, snapshotId } = fromV1('canonical.ts');
const { signEnvelope, verifyEnvelope } = fromV1('signing.ts');
const { generateProtectedKey } = fromV1('key-providers/keygen.ts');
const { createDpapiKeyProvider } = fromV1('key-providers/dpapiKeyProvider.ts');
const { buildV2TrustBundle } = fromV1('key-providers/trustBundle.ts');
const { distributeCurrent } = fromV1('distribution/distribute.ts');
const { trustBundleFromBuildJson } = fromV2('trustBundle.ts');
const { PublicExportConsumer, TTL_MS } = fromV2('consumer.ts');
const { FileTransport } = fromV2('transport.ts');

async function main() {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'mlino-m2-3r-parity-'));
  const secrets = new Map();
  try {
    const protector = {
      async protect(bytes) {
        const token = crypto.randomBytes(32);
        secrets.set(token.toString('hex'), Buffer.from(bytes));
        return token;
      },
      async unprotect(token) { return Buffer.from(secrets.get(token.toString('hex'))); },
    };
    const entry = await generateProtectedKey('20260918', protector);
    const descriptor = { format: 'mlino.public-export.keystore.v1', active_key_id: entry.key_id, keys: [entry] };
    const descriptorPath = path.join(root, 'test-descriptor.json');
    await fsp.writeFile(descriptorPath, JSON.stringify(descriptor));
    const provider = await createDpapiKeyProvider({ descriptorPath }, { protector });
    const bundle = buildV2TrustBundle(descriptor, { version: 'm2-3r-test', revokedIds: [] });
    const trust = trustBundleFromBuildJson(JSON.stringify(bundle));
    const at = new Date('2026-09-18T12:00:00.000Z');
    const records = [{
      business: { organization_id: 'test-org', name: 'TEST', description: null, location: null,
        contact_information: null, links: null, business_hours: null,
        published_at: at.toISOString(), publication_id: 'test-publication', source_revision: 1 },
      capabilities: [], offers: [], stale: false,
      ordering: { primary: 'publication.occurred_at', tie_breaker: 'publication.id' },
    }];
    const contract = 'mlino.v2.public-business.v1';
    const signed = await signEnvelope({ contract_version: contract, generated_at: at.toISOString(),
      snapshot_id: snapshotId(contract, records), records }, entry.key_id, provider);
    const sourceDir = path.join(root, 'producer');
    const publicDir = path.join(root, 'public');
    await fsp.mkdir(sourceDir);
    await fsp.mkdir(publicDir);
    const source = path.join(sourceDir, 'public-business.v1.json');
    const target = path.join(publicDir, 'public-business.v1.json');
    await fsp.writeFile(source, canonicalBytes(signed));
    assert.equal(await verifyEnvelope(signed, provider), true);
    await distributeCurrent({ sourceDir, publicDir, keyProvider: provider, now: at });
    const validBytes = await fsp.readFile(target);
    const validConsumer = new PublicExportConsumer(new FileTransport(validBytes), trust);
    await validConsumer.refresh(at.getTime());
    assert.equal(validConsumer.read(at.getTime())[0].business.name, 'TEST');
    console.log('CONTROL canonical: V1 verify=true; distribute=PASS; V2 consumer=ACCEPT (1 record)');
    const tampered = Buffer.from(validBytes.toString('utf8').replace('"name":"TEST"', '"name":"XEST"'));
    await assert.rejects(new PublicExportConsumer(new FileTransport(tampered), trust).refresh(at.getTime()),
      { message: 'PUBLIC_EXPORT_BAD_SIGNATURE' });
    const revoked = trustBundleFromBuildJson(JSON.stringify({ ...bundle, revokedIds: [entry.key_id] }));
    await assert.rejects(new PublicExportConsumer(new FileTransport(validBytes), revoked).refresh(at.getTime()),
      { message: 'PUBLIC_EXPORT_UNKNOWN_OR_REVOKED_KEY' });
    await assert.rejects(new PublicExportConsumer(new FileTransport(validBytes), trust).refresh(at.getTime() + TTL_MS + 1),
      { message: 'PUBLIC_EXPORT_EXPIRED_OR_FUTURE' });
    console.log('CONTROLS tamper=PUBLIC_EXPORT_BAD_SIGNATURE; revoked=PUBLIC_EXPORT_UNKNOWN_OR_REVOKED_KEY; ttl=PUBLIC_EXPORT_EXPIRED_OR_FUTURE');

    // For a 64-byte signature, the final sextet has four unused bits.
    // Set one unused bit: the spelling changes but the decoded 64 bytes do not.
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    const original = signed.signature.value;
    assert.equal(original.length, 86);
    const tail = alphabet.indexOf(original.at(-1));
    assert.equal(tail % 16, 0);
    const alternative = original.slice(0, -1) + alphabet[tail + 1];
    assert.notEqual(alternative, original);
    assert.deepEqual(Buffer.from(alternative, 'base64url'), Buffer.from(original, 'base64url'));
    signed.signature.value = alternative;
    assert.equal(await verifyEnvelope(signed, provider), true);
    const alteredBytes = canonicalBytes(signed);
    await fsp.writeFile(source, alteredBytes);
    await distributeCurrent({ sourceDir, publicDir, keyProvider: provider, now: at });
    const distributed = await fsp.readFile(target);
    assert.deepEqual(distributed, alteredBytes);
    await assert.rejects(new PublicExportConsumer(new FileTransport(distributed), trust).refresh(at.getTime()),
      { message: 'PUBLIC_EXPORT_SIGNATURE_VALUE' });
    console.log('FINDING M2-3R-F1: same decoded signature; V1 verify=true; distribute=PASS; V2=PUBLIC_EXPORT_SIGNATURE_VALUE');
    console.log('RESULT=CONFIRMED_ACCEPTANCE_MISMATCH; no content forgery demonstrated; mandatory review STOP');
  } finally {
    for (const secret of secrets.values()) secret.fill(0);
    const resolved = await fsp.realpath(root);
    const temp = await fsp.realpath(os.tmpdir());
    const relative = path.relative(temp, resolved);
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative) || !path.basename(resolved).startsWith('mlino-m2-3r-parity-')) {
      throw new Error('TEMP_CLEANUP_BOUNDARY');
    }
    await fsp.rm(resolved, { recursive: true, force: true });
    console.log('TEST_TEMP_REMOVED=true; TEST_PRIVATE_BYTES_ZEROED=true');
  }
}
main().catch(() => { console.error('DIAGNOSTIC_FAILED'); process.exitCode = 1; });
