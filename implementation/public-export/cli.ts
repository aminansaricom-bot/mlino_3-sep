import { PrismaClient } from '@prisma/client';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { buildPublicExport, CONTRACT_VERSION, Issue } from './builder';
import { SigningKeyProvider, VerificationKeyProvider, verifyEnvelope } from './signing';

export type ExportKeyProvider = SigningKeyProvider & VerificationKeyProvider;

export type CliDependencies = {
  db: PrismaClient;
  keyProvider: ExportKeyProvider;
  env: NodeJS.ProcessEnv;
  log: (line: string) => void;
};

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
