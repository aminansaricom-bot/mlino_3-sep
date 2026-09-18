import { spawnSync } from 'node:child_process';
import { promises as fs, mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const scriptDir = path.resolve(__dirname, '../../../public-export/distribution');
const setup = path.join(scriptDir, 'setup-public-folder.ps1');
const verify = path.join(scriptDir, 'verify-public-folder.ps1');
const principal = process.platform === 'win32' ? spawnSync('whoami', [], { encoding: 'utf8' }).stdout.trim() : '';
function canSetAcl(): boolean {
  if (!principal) return false;
  const root = mkdtempSync(path.join(os.tmpdir(), 'mlino-acl-probe-'));
  const folder = path.join(root, 'public'); const producer = path.join(root, 'producer');
  try {
    mkdirSync(producer);
    return spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', setup,
      '-Path', folder, '-ProducerAccount', principal, '-ReaderPrincipal', principal],
    { env: { ...process.env, MLINO_EXPORT_OUTPUT_DIR: producer }, encoding: 'utf8', timeout: 20000 }).status === 0;
  } finally { rmSync(root, { recursive: true, force: true }); }
}
const aclAvailable = canSetAcl();

test('acl-script-explicitly-disables-inheritance', async () => {
  expect(await fs.readFile(setup, 'utf8')).toMatch(/SetAccessRuleProtection\(\$true,\s*\$false\)/);
});

(aclAvailable ? test : test.skip)(aclAvailable ? 'acl-setup-and-verify-reject-extra-ace' : 'ACL_UNAVAILABLE: acl-setup-and-verify-reject-extra-ace', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mlino-public-acl-'));
  const folder = path.join(root, 'public'); const producer = path.join(root, 'producer');
  await fs.mkdir(producer);
  const env = { ...process.env, MLINO_EXPORT_OUTPUT_DIR: producer };
  const args = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', setup, '-Path', folder, '-ProducerAccount', principal, '-ReaderPrincipal', principal];
  try {
    const created = spawnSync('powershell.exe', args, { env, encoding: 'utf8', timeout: 20000 });
    expect(created.status).toBe(0);
    const checkArgs = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', verify, '-Path', folder, '-ProducerAccount', principal, '-ReaderPrincipal', principal];
    expect(spawnSync('powershell.exe', checkArgs, { env, encoding: 'utf8' }).status).toBe(0);
    const probe = spawnSync('icacls.exe', [folder, '/grant', '*S-1-5-11:(R)'], { env, encoding: 'utf8' });
    expect(probe.status).toBe(0);
    expect(spawnSync('powershell.exe', checkArgs, { env, encoding: 'utf8' }).status).not.toBe(0);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});
