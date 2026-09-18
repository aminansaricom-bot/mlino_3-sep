import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { DpapiProtector } from '../../../public-export/key-providers/protector';

jest.mock('node:child_process', () => ({ spawn: jest.fn() }));
const spawnMock = spawn as jest.Mock;

function fakeProcess(code: number, output: string) {
  const child = new EventEmitter() as EventEmitter & { stdout: EventEmitter & { setEncoding: jest.Mock }; stdin: { end: jest.Mock }; kill: jest.Mock };
  const stdout = new EventEmitter() as EventEmitter & { setEncoding: jest.Mock };
  stdout.setEncoding = jest.fn();
  const end = jest.fn(() => setImmediate(() => {
    if (output) stdout.emit('data', output);
    child.emit('close', code);
  }));
  child.stdout = stdout;
  child.stdin = { end };
  child.kill = jest.fn();
  return { child, end };
}

describe('M2-2 DPAPI spawn boundary (no real DPAPI)', () => {
  beforeEach(() => spawnMock.mockReset());

  test('plaintext travels only by stdin; powershell.exe, shell:false, no secret in args/options/env', async () => {
    const sample = Buffer.from('M2-2-test-only-plaintext-token');
    const fake = fakeProcess(0, Buffer.from('protected-test-output').toString('base64'));
    spawnMock.mockReturnValue(fake.child);
    expect(await new DpapiProtector().protect(sample)).toEqual(Buffer.from('protected-test-output'));
    const [command, args, options] = spawnMock.mock.calls[0];
    expect(command).toBe('powershell.exe');
    expect(args[4]).toContain('"protect"');
    expect(options.shell).toBe(false);
    expect(options.env).toBeUndefined();
    expect(options.stdio).toEqual(['pipe', 'pipe', 'ignore']);
    expect(fake.end).toHaveBeenCalledWith(sample.toString('base64'));
    const commandMetadata = JSON.stringify({ command, args, options });
    expect(commandMetadata).not.toContain(sample.toString('utf8'));
    expect(commandMetadata).not.toContain(sample.toString('base64'));
  });

  test('non-zero exit and empty output map to DPAPI_OPERATION_FAILED', async () => {
    for (const [code, output] of [[1, ''], [0, '']] as const) {
      spawnMock.mockReturnValue(fakeProcess(code, output).child);
      await expect(new DpapiProtector().unprotect(Buffer.from('test-only'))).rejects.toThrow('DPAPI_OPERATION_FAILED');
    }
  });
});
