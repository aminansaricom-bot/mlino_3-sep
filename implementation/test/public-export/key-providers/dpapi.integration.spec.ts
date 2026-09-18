import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { DpapiProtector } from '../../../public-export/key-providers/protector';

function probeCurrentUser(): boolean {
  if (process.platform !== 'win32') return false;
  const script = [
    '$ErrorActionPreference="Stop"',
    'Add-Type -AssemblyName System.Security',
    '$raw=[Convert]::FromBase64String([Console]::In.ReadToEnd().Trim())',
    '$scope=[System.Security.Cryptography.DataProtectionScope]::CurrentUser',
    '$protected=[System.Security.Cryptography.ProtectedData]::Protect($raw,$null,$scope)',
    '$round=[System.Security.Cryptography.ProtectedData]::Unprotect($protected,$null,$scope)',
    'if ([Convert]::ToBase64String($raw) -ne [Convert]::ToBase64String($round)) { exit 2 }',
    '[Console]::Out.Write("OK")',
    '[Array]::Clear($raw,0,$raw.Length)',
    '[Array]::Clear($round,0,$round.Length)',
  ].join('; ');
  const probe = spawnSync('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', script], {
    input: randomBytes(8).toString('base64'), encoding: 'utf8', shell: false, windowsHide: true, timeout: 15000,
  });
  return probe.status === 0 && probe.stdout === 'OK';
}

const available = probeCurrentUser();
if (!available) process.stderr.write('DPAPI_PROFILE_UNAVAILABLE: CurrentUser probe failed; real integration test skipped\n');
const realTest = available ? test : test.skip;
realTest(available ? 'DpapiProtector CurrentUser round trip on random TEST bytes' : 'DPAPI_PROFILE_UNAVAILABLE: real CurrentUser round trip skipped', async () => {
  const input = randomBytes(48);
  try {
    const protector = new DpapiProtector();
    const protectedBytes = await protector.protect(input);
    expect(protectedBytes).not.toEqual(input);
    expect(await protector.unprotect(protectedBytes)).toEqual(input);
  } finally { input.fill(0); }
}, 30000);
