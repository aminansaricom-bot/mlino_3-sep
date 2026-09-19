import { generateKeyPairSync } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { canonicalBytes } from '../../../public-export/canonical';
import { signEnvelope } from '../../../public-export/signing';
import { distributeCurrent, validateDistributionDirectories } from '../../../public-export/distribution/distribute';

const at = new Date('2026-09-18T12:00:00.000Z');
const FILE = 'public-business.v1.json';
const pair = generateKeyPairSync('ed25519');
const provider = { publicKey: async () => pair.publicKey, privateKey: async () => pair.privateKey };
let root: string, sourceDir: string, publicDir: string;
const options = () => ({ sourceDir, publicDir, keyProvider: provider, now: at });
async function bytes(age = 0) {
  return canonicalBytes(await signEnvelope({ contract_version: 'mlino.v2.public-business.v1',
    generated_at: new Date(at.getTime() - age).toISOString(), snapshot_id: 'test', records: [] }, 'test', provider));
}
beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'mlino-m23r-'));
  sourceDir = path.join(root, 'source'); publicDir = path.join(root, 'public');
  await fs.mkdir(sourceDir); await fs.mkdir(publicDir);
  await fs.writeFile(path.join(sourceDir, FILE), await bytes());
});
afterEach(async () => { await fs.rm(root, { recursive: true, force: true }); });

test('m23r rejects oversized source before readFile and preserves destination', async () => {
  await fs.writeFile(path.join(sourceDir, FILE), Buffer.alloc(2_000_001));
  await fs.writeFile(path.join(publicDir, FILE), await bytes());
  const read = jest.spyOn(fs, 'readFile');
  try {
    await expect(distributeCurrent(options())).rejects.toMatchObject({ code: 'DISTRIBUTION_SOURCE' });
    expect(read).not.toHaveBeenCalled();
  } finally { read.mockRestore(); }
});
test('m23r age 120 seconds accepted and 120001ms rejected', async () => {
  await fs.writeFile(path.join(sourceDir, FILE), await bytes(120_000));
  await distributeCurrent(options());
  await fs.writeFile(path.join(sourceDir, FILE), await bytes(120_001));
  await expect(distributeCurrent(options())).rejects.toMatchObject({ code: 'DISTRIBUTION_EXPIRED' });
});
test('m23r retries sharing violations then atomically succeeds', async () => {
  let tries = 0;
  await distributeCurrent(options(), { rename: async (from, to) => {
    tries += 1;
    if (tries < 3) throw Object.assign(new Error('test lock'), { code: 'EPERM' });
    await fs.rename(from, to);
  } });
  expect(tries).toBe(3);
  expect(await fs.readdir(publicDir)).toEqual([FILE]);
});
test('m23r bounded retry exhaustion preserves old file and cleans temp', async () => {
  const old = await bytes(1000);
  await fs.writeFile(path.join(publicDir, FILE), old);
  const rename = jest.fn(async () => { throw Object.assign(new Error('test lock'), { code: 'EACCES' }); });
  await expect(distributeCurrent(options(), { rename })).rejects.toMatchObject({ code: 'DISTRIBUTION_IO' });
  expect(rename).toHaveBeenCalledTimes(5);
  expect(await fs.readFile(path.join(publicDir, FILE))).toEqual(old);
  expect(await fs.readdir(publicDir)).toEqual([FILE]);
});
test('m23r strict Windows reader lock is exercised or visibly skipped', async () => {
  if (process.platform !== 'win32') {
    console.log('SKIP: WINDOWS_STRICT_FILE_LOCK_UNAVAILABLE');
    return;
  }
  const target = path.join(publicDir, FILE);
  await fs.writeFile(target, await bytes(1000));
  const script = '$f=[System.IO.File]::Open($env:MLINO_LOCK_TARGET,[System.IO.FileMode]::Open,[System.IO.FileAccess]::Read,[System.IO.FileShare]::Read); [Console]::WriteLine("READY"); [Console]::ReadLine(); $f.Dispose()';
  const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, MLINO_LOCK_TARGET: target } });
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('WINDOWS_LOCK_PROBE_TIMEOUT')), 10000);
    child.stdout.once('data', (chunk) => { clearTimeout(timer); if (chunk.toString().trim() === 'READY') resolve(); else reject(new Error('WINDOWS_LOCK_PROBE_FAILED')); });
    child.once('error', reject);
  });
  try {
    await expect(distributeCurrent(options())).rejects.toMatchObject({ code: 'DISTRIBUTION_IO' });
  } finally {
    child.stdin.write('\n');
    await new Promise<void>((resolve) => child.once('close', () => resolve()));
  }
});
test('m23r rejects duplicate JSON keys BOM and trailing newline', async () => {
  const raw = await bytes();
  for (const invalid of [Buffer.concat([Buffer.from([239,187,191]), raw]),
    Buffer.concat([raw, Buffer.from('\n')]), Buffer.from(raw.toString().replace('{', '{"records":[],'))]) {
    await fs.writeFile(path.join(sourceDir, FILE), invalid);
    await expect(distributeCurrent(options())).rejects.toThrow();
    expect(await fs.readdir(publicDir)).toEqual([]);
  }
});
test('m23r rejects producer and repository junctions including uppercase aliases', async () => {
  const link = path.join(root, 'junction');
  await fs.symlink(sourceDir, link, 'junction');
  await expect(validateDistributionDirectories(sourceDir, link)).rejects.toMatchObject({ code: 'DISTRIBUTION_PATH' });
  await fs.unlink(link);
  await fs.symlink(path.resolve(__dirname, '../../../..'), link, 'junction');
  await expect(validateDistributionDirectories(sourceDir, link)).rejects.toMatchObject({ code: 'DISTRIBUTION_PATH' });
  if (process.platform === 'win32') {
    await expect(validateDistributionDirectories(sourceDir, link.toUpperCase())).rejects.toMatchObject({ code: 'DISTRIBUTION_PATH' });
  }
});
