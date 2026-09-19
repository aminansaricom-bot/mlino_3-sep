import { isAbsolute, relative, resolve } from 'node:path';
import { prisma } from '../../foundation/prisma-client';
import { readVanakBusinesses } from './parse';
import { seedVanakBusinesses } from './seed';
import { TestSeedError } from './types';
import { withdrawVanakBusinesses } from './withdraw';

function checkedInputPath(value: string | undefined): string {
  if (!value || !isAbsolute(value)) throw new TestSeedError('TEST_SEED_INPUT_PATH');
  const repository = resolve(__dirname, '../../..');
  const relation = relative(repository, value);
  if (!relation.startsWith('..') || relation === '') throw new TestSeedError('TEST_SEED_INPUT_PATH');
  return value;
}

async function main(): Promise<void> {
  const command = process.argv[2];
  if (command === 'seed') {
    const rows = readVanakBusinesses(checkedInputPath(process.argv[3]));
    const result = await seedVanakBusinesses(prisma, rows);
    process.stdout.write(`TEST_SEED_OK created=${result.created} skipped=${result.skipped} failed=0\n`);
  } else if (command === 'withdraw') {
    const flag = process.argv[3];
    if (flag !== undefined && flag !== '--archive') throw new TestSeedError('TEST_SEED_COMMAND');
    const result = await withdrawVanakBusinesses(prisma, process.env, flag === '--archive');
    process.stdout.write(`TEST_SEED_WITHDRAW_OK withdrawn=${result.withdrawn} archived=${result.archived} failed=0\n`);
  } else {
    throw new TestSeedError('TEST_SEED_COMMAND');
  }
}

main().catch((error: unknown) => {
  const code = error instanceof TestSeedError ? error.code : 'TEST_SEED_FAILED';
  process.stderr.write(`${code}\n`);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
