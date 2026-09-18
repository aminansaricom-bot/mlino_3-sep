import { spawn } from 'node:child_process';

export interface Protector {
  protect(bytes: Buffer): Promise<Buffer>;
  unprotect(bytes: Buffer): Promise<Buffer>;
}

const scriptLines = [
  '$ErrorActionPreference = "Stop"',
  'Add-Type -AssemblyName System.Security',
  '$line = [Console]::In.ReadToEnd().Trim()',
  '$inputBytes = [Convert]::FromBase64String($line)',
  'try {',
  '  $scope = [System.Security.Cryptography.DataProtectionScope]::CurrentUser',
  '  if ("__MODE__" -eq "protect") { $result = [System.Security.Cryptography.ProtectedData]::Protect($inputBytes, $null, $scope) }',
  '  else { $result = [System.Security.Cryptography.ProtectedData]::Unprotect($inputBytes, $null, $scope) }',
  '  [Console]::Out.Write([Convert]::ToBase64String($result))',
  '  [Array]::Clear($result, 0, $result.Length)',
  '} finally { [Array]::Clear($inputBytes, 0, $inputBytes.Length) }',
];

export function buildDpapiScript(mode: 'protect' | 'unprotect'): string {
  if (mode !== 'protect' && mode !== 'unprotect') throw new Error('DPAPI_MODE_INVALID');
  return scriptLines.join('\n').replace('__MODE__', mode);
}

export class DpapiProtector implements Protector {
  async protect(bytes: Buffer): Promise<Buffer> { return this.run('protect', bytes); }
  async unprotect(bytes: Buffer): Promise<Buffer> { return this.run('unprotect', bytes); }

  private run(mode: 'protect' | 'unprotect', bytes: Buffer): Promise<Buffer> {
    if (process.platform !== 'win32') return Promise.reject(new Error('DPAPI_WINDOWS_REQUIRED'));
    return new Promise((resolve, reject) => {
      const child = spawn('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', buildDpapiScript(mode)], { shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'ignore'] });
      let output = '';
      let failed = false;
      child.on('error', () => { failed = true; reject(new Error('DPAPI_OPERATION_FAILED')); });
      child.stdout.setEncoding('utf8');
      child.stdout.on('data', (chunk: string) => {
        output += chunk;
        if (output.length > 1024 * 1024) { failed = true; child.kill(); }
      });
      child.on('close', (code) => {
        if (failed || code !== 0 || !output || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(output)) { reject(new Error('DPAPI_OPERATION_FAILED')); return; }
        resolve(Buffer.from(output, 'base64'));
      });
      child.stdin.end(bytes.toString('base64'));
    });
  }
}
