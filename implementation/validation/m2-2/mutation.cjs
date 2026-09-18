'use strict';
// Runs only against a disposable copy outside the repository. No real key or database is used.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const source = path.resolve(__dirname, '../..');
const scratchRoot = fs.realpathSync(path.resolve(source, '../..'));
const scratch = fs.mkdtempSync(path.join(scratchRoot, 'mlino-m2-2-mutation-'));
const cases = [
  {
    name: 'ACTIVE_ONLY', file: 'public-export/key-providers/dpapiKeyProvider.ts',
    before: "if (keyId !== descriptor.active_key_id) throw new Error('KEY_NOT_ACTIVE');",
    after: '/* mutation: active-only check removed */',
    test: 'test/public-export/key-providers/key-providers.spec.ts',
    expected: 'privateKey only active;',
  },
  {
    name: 'PUBLIC_PRIVATE_MATCH', file: 'public-export/key-providers/dpapiKeyProvider.ts',
    before: "if (!rawPublicKey(createPublicKey(privateKey)).equals(Buffer.from(entry.public_key_raw_base64url, 'base64url'))) throw new Error('KEY_PAIR_MISMATCH');",
    after: '/* mutation: public/private match removed */',
    test: 'test/public-export/key-providers/key-providers.spec.ts',
    expected: 'signEnvelope via adapter verifies;',
  },
  {
    name: 'KEY_ID_BINDING', file: 'public-export/key-providers/descriptor.ts',
    before: 'validateKeyId(entry.key_id, publicBytes);',
    after: '/* mutation: key_id derivation check removed */',
    test: 'test/public-export/key-providers/key-providers.spec.ts',
    expected: 'key_id derivation is bound',
  },
  {
    name: 'PLAINTEXT_ARGUMENT', file: 'public-export/key-providers/protector.ts',
    before: "['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', script.replace('__MODE__', mode)]",
    after: "['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', script.replace('__MODE__', mode), bytes.toString('base64')]",
    before2: "child.stdin.end(bytes.toString('base64'));",
    after2: "child.stdin.end('');",
    test: 'test/public-export/key-providers/protector.spec.ts',
    expected: 'plaintext travels only by stdin;',
  },
];

function replaceExactlyOnce(content, before, after) {
  if (content.indexOf(before) < 0 || content.indexOf(before, content.indexOf(before) + before.length) >= 0) throw new Error('MUTATION_SOURCE_MISMATCH');
  return content.replace(before, after);
}

try {
  fs.cpSync(path.join(source, 'public-export'), path.join(scratch, 'public-export'), { recursive: true });
  fs.mkdirSync(path.join(scratch, 'test', 'public-export'), { recursive: true });
  fs.cpSync(path.join(source, 'test', 'public-export', 'key-providers'), path.join(scratch, 'test', 'public-export', 'key-providers'), { recursive: true });
  fs.copyFileSync(path.join(source, 'test', 'setup-env.ts'), path.join(scratch, 'test', 'setup-env.ts'));
  fs.copyFileSync(path.join(source, 'test', 'test-db-guard.ts'), path.join(scratch, 'test', 'test-db-guard.ts'));
  fs.copyFileSync(path.join(source, 'jest.config.js'), path.join(scratch, 'jest.config.js'));
  fs.copyFileSync(path.join(source, 'tsconfig.json'), path.join(scratch, 'tsconfig.json'));
  fs.copyFileSync(path.join(source, 'package.json'), path.join(scratch, 'package.json'));
  fs.symlinkSync(path.join(source, 'node_modules'), path.join(scratch, 'node_modules'), 'junction');
  if (!fs.existsSync(path.join(scratch, 'test', 'setup-env.ts'))) throw new Error('MUTATION_COPY_MISSING_SETUP');

  const log = [];
  for (const item of cases) {
    const target = path.join(scratch, item.file);
    let content = fs.readFileSync(path.join(source, item.file), 'utf8');
    content = replaceExactlyOnce(content, item.before, item.after);
    if (item.before2) content = replaceExactlyOnce(content, item.before2, item.after2);
    fs.writeFileSync(target, content);
    const jest = path.join(scratch, 'node_modules', 'jest', 'bin', 'jest.js');
    const result = spawnSync(process.execPath, [jest, '--runInBand', '--runTestsByPath', item.test], {
      cwd: scratch, encoding: 'utf8', shell: false, timeout: 90000,
      env: { ...process.env, DATABASE_URL: 'postgresql://test:test@localhost:5499/test' },
      maxBuffer: 2 * 1024 * 1024,
    });
    const output = `${result.stdout || ''}\n${result.stderr || ''}`;
    const failingNames = [...output.matchAll(/^\s*●\s+(.+)$/gm)].map((match) => match[1].trim()).slice(0, 4);
    const passed = result.status !== 0 && result.status !== null && failingNames.some((name) => name.includes(item.expected));
    log.push(`${item.name}: ${passed ? 'DETECTED' : 'NOT_DETECTED'}; jest_exit=${result.status}; failing_tests=${failingNames.join(' | ') || 'none'}`);
    fs.copyFileSync(path.join(source, item.file), target);
    if (!passed) throw new Error(`MUTATION_NOT_DETECTED_${item.name}`);
  }
  fs.writeFileSync(path.join(__dirname, 'mutation.log'), `${log.join('\n')}\n`);
  process.stdout.write(`${log.join('\n')}\n`);
} finally {
  const resolved = path.resolve(scratch);
  if (!resolved.startsWith(scratchRoot + path.sep)) throw new Error('UNSAFE_MUTATION_CLEANUP');
  fs.rmSync(scratch, { recursive: true, force: true });
}
