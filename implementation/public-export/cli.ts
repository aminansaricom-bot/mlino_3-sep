import { PrismaClient } from '@prisma/client';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { buildPublicExport, CONTRACT_VERSION, Issue } from './builder';
import { buildPublicCatalogExport, CATALOG_CONTRACT_VERSION } from './catalog-builder';
import { CATALOG_FILE, verifyCatalogArtifact } from './catalog-artifact';
import { stageMedia } from './media-stage';
import { validateMediaStore } from './media';
import { SigningKeyProvider, VerificationKeyProvider, verifyEnvelope } from './signing';

export type ExportKeyProvider = SigningKeyProvider & VerificationKeyProvider;

export type CliDependencies = {
  db: PrismaClient;
  keyProvider: ExportKeyProvider;
  env: NodeJS.ProcessEnv;
  log: (line: string) => void;
};

function catalogFailure(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  return /^(CATALOG|PUBLIC_EXPORT)_[A-Z0-9_]+$/.test(message) ? message : 'CATALOG_EXPORT_ERROR';
}

function required(value: string | undefined, code: string): string {
  if (!value?.trim()) throw new Error(code);
  return value;
}

function outsideRepository(outputDirectory: string): void {
  const repo = path.resolve(__dirname, '../..');
  const relative = path.relative(repo, outputDirectory);
  if (relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))) throw new Error('PUBLIC_EXPORT_OUTPUT_IN_REPOSITORY');
}

export async function runPublicExportCli({ db, keyProvider, env, log }: CliDependencies): Promise<void> {
  const outputDirectory = path.resolve(required(env.MLINO_EXPORT_OUTPUT_DIR, 'PUBLIC_EXPORT_OUTPUT_DIR_REQUIRED'));
  const keyId = required(env.MLINO_EXPORT_KEY_ID, 'PUBLIC_EXPORT_KEY_ID_REQUIRED');
  outsideRepository(outputDirectory);
  const asOf = env.MLINO_EXPORT_AS_OF ? new Date(env.MLINO_EXPORT_AS_OF) : new Date();
  if (!Number.isFinite(asOf.getTime())) throw new Error('PUBLIC_EXPORT_AS_OF_INVALID');
  await fs.mkdir(outputDirectory, { recursive: true, mode: 0o700 });
  outsideRepository(await fs.realpath(outputDirectory));
  const lockPath = path.join(outputDirectory, '.public-business.lock');
  const lock = await fs.open(lockPath, 'wx', 0o600);
  let tempPath: string | undefined;
  try {
    const issues: Issue[] = [];
    const { artifact, bytes } = await buildPublicExport(db, { asOf, keyId, signingKeyProvider: keyProvider, onIssue: (issue) => issues.push(issue) });
    if (!(await verifyEnvelope(artifact, keyProvider))) throw new Error('PUBLIC_EXPORT_SIGNATURE_SELF_CHECK_FAILED');
    const current = path.join(outputDirectory, 'public-business.v1.json');
    const previousOne = path.join(outputDirectory, 'public-business.v1.previous-1.json');
    const previousTwo = path.join(outputDirectory, 'public-business.v1.previous-2.json');
    tempPath = path.join(outputDirectory, `.public-business.${process.pid}.${Date.now()}.tmp`);
    const temp = await fs.open(tempPath, 'wx', 0o600);
    try { await temp.writeFile(bytes); await temp.sync(); } finally { await temp.close(); }
    // Preserve the old current before replacing it. Rotation runs only after a valid new artifact is current.
    const oldCurrentBytes = await fs.readFile(current).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return null;
      throw error;
    });
    const oldPreviousBytes = await fs.readFile(previousOne).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return null;
      throw error;
    });
    const acceptedPrior = async (bytes: Buffer | null): Promise<Buffer | null> => {
      if (!bytes) return null;
      try {
        const parsed = JSON.parse(bytes.toString('utf8'));
        if (parsed.contract_version !== CONTRACT_VERSION || !(await verifyEnvelope(parsed, keyProvider))) return null;
        return bytes;
      } catch { return null; }
    };
    const oldCurrent = await acceptedPrior(oldCurrentBytes);
    const oldPrevious = await acceptedPrior(oldPreviousBytes);
    await fs.rename(tempPath, current);
    tempPath = undefined;
    if (oldPrevious) await fs.writeFile(previousTwo, oldPrevious, { mode: 0o600 });
    if (oldCurrent) await fs.writeFile(previousOne, oldCurrent, { mode: 0o600 });
    // Publish the valid business artifact before any optional catalog work.
    let catalog: Awaited<ReturnType<typeof buildPublicCatalogExport>> | null = null;
    if (env.MLINO_MEDIA_STORE_DIR) {
      try {
        await validateMediaStore(env.MLINO_MEDIA_STORE_DIR);
        catalog = await buildPublicCatalogExport(db, { asOf, keyId, signingKeyProvider: keyProvider, businessArtifact: artifact,
          mediaStoreDir: env.MLINO_MEDIA_STORE_DIR, onIssue: (issue) => issues.push(issue) });
        await verifyCatalogArtifact(catalog.bytes, keyProvider, artifact, asOf);
        await stageMedia(env.MLINO_MEDIA_STORE_DIR, outputDirectory, catalog.artifact);
      } catch (error) {
        catalog = null;
        log(JSON.stringify({ code: 'CATALOG_EXPORT_SKIPPED', reason: catalogFailure(error) }));
      }
    }
    if (catalog) {
      try {
        const catalogCurrent = path.join(outputDirectory, CATALOG_FILE);
        const catalogPreviousOne = path.join(outputDirectory, 'public-catalog.v1.previous-1.json');
        const catalogPreviousTwo = path.join(outputDirectory, 'public-catalog.v1.previous-2.json');
        const prior = await fs.readFile(catalogCurrent).catch((error: NodeJS.ErrnoException) => { if (error.code === 'ENOENT') return null; throw error; });
        const priorOne = await fs.readFile(catalogPreviousOne).catch((error: NodeJS.ErrnoException) => { if (error.code === 'ENOENT') return null; throw error; });
        const validPrior = async (value: Buffer | null): Promise<Buffer | null> => {
          if (!value) return null;
          try {
            const parsed = JSON.parse(value.toString('utf8'));
            if (parsed.contract_version !== CATALOG_CONTRACT_VERSION || !(await verifyEnvelope(parsed, keyProvider, 'catalog'))) return null;
            return value;
          } catch { return null; }
        };
        const checkedPrior = await validPrior(prior);
        const checkedPriorOne = await validPrior(priorOne);
        const catalogTemp = path.join(outputDirectory, `.public-catalog.${process.pid}.${Date.now()}.tmp`);
        try {
          const file = await fs.open(catalogTemp, 'wx', 0o600);
          try { await file.writeFile(catalog.bytes); await file.sync(); } finally { await file.close(); }
          await fs.rename(catalogTemp, catalogCurrent);
          if (checkedPriorOne) await fs.writeFile(catalogPreviousTwo, checkedPriorOne, { mode: 0o600 });
          if (checkedPrior) await fs.writeFile(catalogPreviousOne, checkedPrior, { mode: 0o600 });
        } finally { await fs.rm(catalogTemp, { force: true }); }
        log(JSON.stringify({ code: 'CATALOG_EXPORT_PUBLISHED', snapshot_id: catalog.artifact.snapshot_id, records: catalog.artifact.records.length }));
      } catch (error) {
        log(JSON.stringify({ code: 'CATALOG_EXPORT_SKIPPED', reason: catalogFailure(error) }));
      }
    }
    for (const issue of issues) log(JSON.stringify(issue));
    log(JSON.stringify({ code: 'PUBLIC_EXPORT_PUBLISHED', snapshot_id: artifact.snapshot_id, key_id: keyId, records: artifact.records.length }));
  } finally {
    if (tempPath) await fs.rm(tempPath, { force: true });
    await lock.close();
    await fs.rm(lockPath, { force: true });
  }
}

async function main(): Promise<void> {
  const adapterPath = required(process.env.MLINO_EXPORT_KEY_PROVIDER_MODULE, 'PUBLIC_EXPORT_KEY_PROVIDER_REQUIRED');
  if (!path.isAbsolute(adapterPath)) throw new Error('PUBLIC_EXPORT_KEY_PROVIDER_PATH');
  outsideRepository(adapterPath);
  // The deployment supplies an adapter backed by its OS secret store. This repository never holds a key.
  const adapter = require(adapterPath) as { createKeyProvider?: () => Promise<ExportKeyProvider> };
  if (typeof adapter.createKeyProvider !== 'function') throw new Error('PUBLIC_EXPORT_KEY_PROVIDER_INVALID');
  const keyProvider = await adapter.createKeyProvider();
  const db = new PrismaClient();
  try { await runPublicExportCli({ db, keyProvider, env: process.env, log: (line) => process.stdout.write(`${line}\n`) }); }
  finally { await db.$disconnect(); }
}

if (require.main === module) {
  main().catch(() => { process.stderr.write('PUBLIC_EXPORT_FAILED\n'); process.exitCode = 1; });
}
