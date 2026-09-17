import { Prisma, PrismaClient } from '@prisma/client';

type CoreTransactionOptions = { maxWait: number; timeout: number };

function positiveInteger(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  if (!/^\d+$/.test(raw)) throw new Error(`${name} must be a positive integer`);
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer`);
  return value;
}

export function coreTransactionOptions(): CoreTransactionOptions {
  return {
    maxWait: positiveInteger('CORE_TX_MAX_WAIT_MS', 5000),
    timeout: positiveInteger('CORE_TX_TIMEOUT_MS', 10000),
  };
}

export function runCoreTransaction<T>(db: PrismaClient, fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return db.$transaction(fn, coreTransactionOptions());
}
