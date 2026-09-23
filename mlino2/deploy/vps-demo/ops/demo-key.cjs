'use strict';
// DEMO-ONLY signing key for the public demo on the VPS. It signs only fictional demo businesses.
// The private key lives in /etc/mlino/demo-export-key.json (root-only, 0600) and never leaves the server.
const fs = require('fs'); const crypto = require('crypto');
const file = process.env.MLINO_DEMO_KEY_FILE || '/etc/mlino/demo-export-key.json';
if (!fs.existsSync(file)) {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
  fs.writeFileSync(file, JSON.stringify({ priv: privateKey.export({ format: 'der', type: 'pkcs8' }).toString('base64'), pub: publicKey.export({ format: 'der', type: 'spki' }).toString('base64') }), { mode: 0o600 });
}
const k = JSON.parse(fs.readFileSync(file, 'utf8'));
const privateKey = crypto.createPrivateKey({ key: Buffer.from(k.priv, 'base64'), format: 'der', type: 'pkcs8' });
const publicKey = crypto.createPublicKey({ key: Buffer.from(k.pub, 'base64'), format: 'der', type: 'spki' });
exports.createKeyProvider = async () => ({ privateKey: async () => privateKey, publicKey: async () => publicKey });
exports.trustBundle = () => JSON.stringify({ version: 'demo-vps-1', keys: [{ keyId: 'demo-vps-1', rawPublicKeyBase64Url: publicKey.export({ format: 'jwk' }).x }], revokedIds: [] });
