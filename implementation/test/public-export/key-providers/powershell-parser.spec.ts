import { spawnSync } from 'node:child_process';
import { buildDpapiScript } from '../../../public-export/key-providers/protector';

const parserCommand = '$source=[Console]::In.ReadToEnd();$tokens=$null;$errors=$null;[System.Management.Automation.Language.Parser]::ParseInput($source,[ref]$tokens,[ref]$errors)|Out-Null;[Console]::Out.Write($errors.Count)';

const parseTest = process.platform === 'win32' ? test : test.skip;
parseTest.each(['protect', 'unprotect'] as const)('PowerShell parser accepts exact generated script for %s', (mode) => {
  const script = buildDpapiScript(mode);
  // PowerShell parses `}; else {` as an `else` command; syntax-only ParseInput misses that runtime fault.
  expect(script).not.toMatch(/}\s*;\s*else\s*{/);
  const result = spawnSync('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', parserCommand], {
    input: script, encoding: 'utf8', shell: false, windowsHide: true, timeout: 15000,
  });
  expect(result.status).toBe(0);
  expect(result.stdout.trim()).toBe('0');
}, 20000);
