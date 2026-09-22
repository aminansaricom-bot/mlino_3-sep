import { promises as fs } from 'node:fs';
import path from 'node:path';
import { canonicalBytes } from '../canonical';
import { CONTRACT_VERSION } from '../builder';
import { PublicBusinessExportV1 } from '../builder';
import { CATALOG_FILE, CATALOG_CAP, verifyCatalogArtifact } from '../catalog-artifact';
import { stageMedia } from '../media-stage';
import { SignedEnvelope, VerificationKeyProvider, verifyEnvelope } from '../signing';

const FILE = 'public-business.v1.json';
const FUTURE_MS = 30_000;
const MAX_ARTIFACT_BYTES = 2_000_000;
const RENAME_ATTEMPTS = 5;
const RENAME_DELAY_MS = 100;
export type DistributionCode =
  'DISTRIBUTION_PATH' | 'DISTRIBUTION_SOURCE' | 'DISTRIBUTION_CANONICAL' |
  'DISTRIBUTION_CONTRACT' | 'DISTRIBUTION_SIGNATURE' | 'DISTRIBUTION_TIMESTAMP' |
  'DISTRIBUTION_EXPIRED' | 'DISTRIBUTION_FUTURE' | 'DISTRIBUTION_ROLLBACK' | 'DISTRIBUTION_IO' |
  'DISTRIBUTION_CATALOG' | 'DISTRIBUTION_MEDIA';

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
  log?: (entry: { code: string; ok: boolean } | { code: 'DISTRIBUTION_CATALOG_SKIPPED'; reason: string }) => void;
};

function catalogReason(error: unknown): string {
  if (error instanceof DistributionError) return error.code;
  const message = error instanceof Error ? error.message : '';
  return /^CATALOG_[A-Z0-9_]+$/.test(message) ? message : 'DISTRIBUTION_CATALOG';
}

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
    const maxAgeMs = options.maxAgeMs ?? 120_000;
    if (!Number.isFinite(now.getTime()) || !Number.isFinite(maxAgeMs) || maxAgeMs < 0) fail('DISTRIBUTION_TIMESTAMP');
    let raw: Buffer;
    const sourceFile = path.join(options.sourceDir, FILE);
    try {
      const stat = await fs.lstat(sourceFile);
      if (!stat.isFile() || stat.size > MAX_ARTIFACT_BYTES) fail('DISTRIBUTION_SOURCE');
      raw = await fs.readFile(sourceFile);
    }
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
    try {
      const stat = await fs.lstat(target);
      if (!stat.isFile() || stat.size > MAX_ARTIFACT_BYTES) fail('DISTRIBUTION_IO');
      existing = await fs.readFile(target);
    }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') fail('DISTRIBUTION_IO'); }
    if (existing) {
      const old = parse(existing);
      if (timestamp(old.generated_at) > generated) fail('DISTRIBUTION_ROLLBACK');
    }
    let catalogRaw: Buffer | null = null;
    let catalog: Awaited<ReturnType<typeof verifyCatalogArtifact>> | null = null;
    const catalogSource = path.join(options.sourceDir, CATALOG_FILE);
    try {
      const stat = await fs.lstat(catalogSource);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size > CATALOG_CAP) fail('DISTRIBUTION_CATALOG');
      catalogRaw = await fs.readFile(catalogSource);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        log({ code: 'DISTRIBUTION_CATALOG_SKIPPED', reason: catalogReason(error) });
      }
    }
    if (catalogRaw) {
      try {
        catalog = await verifyCatalogArtifact(catalogRaw, options.keyProvider, envelope as PublicBusinessExportV1, now, maxAgeMs);
        const catalogTarget = path.join(options.publicDir, CATALOG_FILE);
        const prior = await fs.readFile(catalogTarget).catch((error: NodeJS.ErrnoException) => {
          if (error.code === 'ENOENT') return null;
          fail('DISTRIBUTION_CATALOG');
        });
        if (prior) {
          const old = JSON.parse(prior.toString('utf8')) as { generated_at?: unknown };
          if (timestamp(old.generated_at) > generated) fail('DISTRIBUTION_ROLLBACK');
        }
        await stageMedia(options.sourceDir, options.publicDir, catalog);
      } catch (error) {
        catalog = null;
        log({ code: 'DISTRIBUTION_CATALOG_SKIPPED', reason: catalogReason(error) });
      }
    }
    temp = path.join(options.publicDir, `.public-business.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`);
    await fs.writeFile(temp, raw, { flag: 'wx' });
    const rename = deps.rename ?? fs.rename;
    let renamed = false;
    for (let attempt = 1; attempt <= RENAME_ATTEMPTS; attempt += 1) {
      try {
        await rename(temp, target);
        renamed = true;
        break;
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (!['EPERM', 'EBUSY', 'EACCES'].includes(code ?? '') || attempt === RENAME_ATTEMPTS) throw error;
        await new Promise((resolve) => setTimeout(resolve, RENAME_DELAY_MS));
      }
    }
    if (!renamed) fail('DISTRIBUTION_IO');
    temp = undefined;
    if (catalogRaw && catalog) {
      try {
        const catalogTarget = path.join(options.publicDir, CATALOG_FILE);
        const catalogTemp = path.join(options.publicDir, `.public-catalog.${process.pid}.${Date.now()}.tmp`);
      try {
        const file = await fs.open(catalogTemp, 'wx', 0o600);
        try { await file.writeFile(catalogRaw); await file.sync(); } finally { await file.close(); }
        const catalogRename = deps.rename ?? fs.rename;
        let completed = false;
        for (let attempt = 1; attempt <= RENAME_ATTEMPTS; attempt += 1) {
          try { await catalogRename(catalogTemp, catalogTarget); completed = true; break; }
          catch (error) {
            if (!['EPERM', 'EBUSY', 'EACCES'].includes((error as NodeJS.ErrnoException).code ?? '') || attempt === RENAME_ATTEMPTS) throw error;
            await new Promise((resolve) => setTimeout(resolve, RENAME_DELAY_MS));
          }
        }
        if (!completed) fail('DISTRIBUTION_IO');
      } finally { await fs.rm(catalogTemp, { force: true }); }
      } catch (error) {
        log({ code: 'DISTRIBUTION_CATALOG_SKIPPED', reason: catalogReason(error) });
      }
    }
    log({ code: 'DISTRIBUTION_OK', ok: true });
  } catch (error) {
    const code = error instanceof DistributionError ? error.code : 'DISTRIBUTION_IO';
    log({ code, ok: false });
    throw new DistributionError(code);
  } finally {
    if (temp) await fs.unlink(temp).catch(() => undefined);
  }
}
