// Execute from a V1 worktree whose canonical.ts blob equals origin/main.
// Usage: node generate-v1-fixtures.cjs <absolute V2 fixture output path>
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ts = require(path.join(process.cwd(), 'implementation/node_modules/typescript'));
const source = fs.readFileSync(path.join(process.cwd(), 'implementation/public-export/canonical.ts'), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const moduleObject = { exports: {} };
new Function('require', 'module', 'exports', js)(require, moduleObject, moduleObject.exports);
const { canonicalBytes } = moduleObject.exports;
const cases = [
  ['nfc_non_latin', { label: 'کافه e\u0301' }],
  ['six_decimal', { latitude: 35.123456 }],
  ['negative_zero', { zero: -0 }],
  ['explicit_null', { value: null }],
  ['absent_key', {}],
  ['empty_string', { text: '' }],
  ['nested_order', { items: [['دوم', 'اول'], { b: [3, 2, 1], a: [] }] }],
  ['scalar_key_order', { '😀': 1, 'آ': 2, a: 3 }],
];
const result = cases.map(([name, input]) => {
  const bytes = canonicalBytes(input);
  return { name, input, expected_hex: bytes.toString('hex'), expected_sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
});
const output = path.resolve(process.argv[2] || '');
if (!path.isAbsolute(output) || !output.includes('v2-public-consumer-impl')) throw new Error('OUTPUT_MUST_BE_V2_FIXTURE');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(`V1_CANONICAL_FIXTURES=${result.length}\nV1_SOURCE=implementation/public-export/canonical.ts\n`);
