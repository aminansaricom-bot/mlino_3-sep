import { promises as fs } from 'node:fs';
import path from 'node:path';
import { canonicalBytes } from '../canonical';
import { CONTRACT_VERSION } from '../builder';
import { SignedEnvelope, VerificationKeyProvider, verifyEnvelope } from '../signing';

const FILE = 'public-business.v1.json';
const FUTURE_MS = 30_000;
export type DistributionCode =
  'DISTRIBUTION_PATH' | 'DISTRIBUTION_SOURCE' | 'DISTRIBUTION_CANONICAL' |
  'DISTRIBUTION_CONTRACT' | 'DISTRIBUTION_SIGNATURE' | 'DISTRIBUTION_TIMESTAMP' |
  'DISTRIBUTION_EXPIRED' | 'DISTRIBUTION_FUTURE' | 'DISTRIBUTION_ROLLBACK' | 'DISTRIBUTION_IO';

export class DistributionError extends Error {
  constructor(readonly code: DistributionCode) { super(code); }
}

export type DistributionOptions = {
  sourceDir: string;
  publicDir: string;
  keyProvider: VerificationKeyProvider;
  now?: Date;
  maxAgeMs?: number;
};
export type DistributionDeps = {
  rename?: (from: string, to: string) => Promise<void>;
  log?: (entry: { code: string; ok: boolean }) => void;
};

function fail(code: DistributionCode): never { throw new DistributionError(code); }
function within(parent: string, child: string): boolean {
  const rel = path.relative(parent, child);
  return rel === '' || (!rel.startsWith('..' + path.sep) && rel !== '..' && !path.isAbsolute(rel));
}
// Both the source tree and the compiled dist tree are inside implementation/.
function repositoryRoot(): string {
  return path.resolve(__dirname, path.basename(path.resolve(__dirname, '../..')) === 'dist' ? '../../../..' : '../../..');
}
export async function validateDistributionDirectories(sourceDir: string, publicDir: string): Promise<void> {
  if (!path.isAbsolute(sourceDir) || !path.isAbsolute(publicDir)) fail('DISTRIBUTION_PATH');
  let source: string; let destination: string;
  try {
    source = await fs.realpath(sourceDir);
    destination = await fs.realpath(publicDir);
  } catch { return fail('DISTRIBUTION_PATH'); }
  if (within(source, destination) || within(destination, source) ||
      within(repositoryRoot(), source) || within(repositoryRoot(), destination)) fail('DISTRIBUTION_PATH');
}

function timestamp(value: unknown): number {
  if (typeof value !== 'string') fail('DISTRIBUTION_TIMESTAMP');
  const ms = Date.parse(value);
  if (!Number.isFinite(ms) || new Date(ms).toISOString() !== value) fail('DISTRIBUTION_TIMESTAMP');
  return ms;
}

function parse(raw: Buffer): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(raw.toString('utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) fail('DISTRIBUTION_SOURCE');
    if (!canonicalBytes(value).equals(raw)) fail('DISTRIBUTION_CANONICAL');
    return value as Record<string, unknown>;
  } catch (error) {
    if (error instanceof DistributionError) throw error;
    return fail('DISTRIBUTION_SOURCE');
  }
}

export async function distributeCurrent(options: DistributionOptions, deps: DistributionDeps = {}): Promise<void> {
  const log = deps.log ?? (() => undefined);
  let temp: string | undefined;
  try {
    await validateDistributionDirectories(options.sourceDir, options.publicDir);
    const now = options.now ?? new Date();
    const maxAgeMs = options.maxAgeMs ?? 300_000;
    if (!Number.isFinite(now.getTime()) || !Number.isFinite(maxAgeMs) || maxAgeMs < 0) fail('DISTRIBUTION_TIMESTAMP');
    let raw: Buffer;
    try { raw = await fs.readFile(path.join(options.sourceDir, FILE)); }
    catch { return fail('DISTRIBUTION_SOURCE'); }
    const envelope = parse(raw);
    if (envelope.contract_version !== CONTRACT_VERSION) fail('DISTRIBUTION_CONTRACT');
    const generated = timestamp(envelope.generated_at);
    if (generated > now.getTime() + FUTURE_MS) fail('DISTRIBUTION_FUTURE');
    if (generated < now.getTime() - maxAgeMs) fail('DISTRIBUTION_EXPIRED');
    let valid = false;
    try { valid = await verifyEnvelope(envelope as SignedEnvelope, options.keyProvider); } catch { valid = false; }
    if (!valid) fail('DISTRIBUTION_SIGNATURE');
    const target = path.join(options.publicDir, FILE);
    let existing: Buffer | undefined;
    try { existing = await fs.readFile(target); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') fail('DISTRIBUTION_IO'); }
    if (existing) {
      const old = parse(existing);
      if (timestamp(old.generated_at) > generated) fail('DISTRIBUTION_ROLLBACK');
    }
    temp = path.join(options.publicDir, `.public-business.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`);
    await fs.writeFile(temp, raw, { flag: 'wx' });
    await (deps.rename ?? fs.rename)(temp, target);
    temp = undefined;
    log({ code: 'DISTRIBUTION_OK', ok: true });
  } catch (error) {
    const code = error instanceof DistributionError ? error.code : 'DISTRIBUTION_IO';
    log({ code, ok: false });
    throw new DistributionError(code);
  } finally {
    if (temp) await fs.unlink(temp).catch(() => undefined);
  }
}
