import { Prisma, PrismaClient } from '@prisma/client';
import { BootstrapService } from '../../core/bootstrap-service';
import { mapCoreDatabaseError } from '../../core/error-adapter';
import { CoreDomainError } from '../../core/errors';
import { runCoreTransaction } from '../../core/transaction';
import { PlatformIdentityVerifier } from '../../core/platform-identity-verifier';
import { assertDisposableDatabase } from './db-guard';

class TestPlatformVerifier implements PlatformIdentityVerifier {
  async verify(credential: string) {
    if (credential !== 'platform-token') throw new Error('invalid platform credential');
    return { ref: 'platform:test' };
  }
}

function knownError(code: string): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('transaction diagnostic', { code, clientVersion: '5.22.0' });
}

describe('G15 transaction robustness', () => {
  const originalMaxWait = process.env.CORE_TX_MAX_WAIT_MS;
  const originalTimeout = process.env.CORE_TX_TIMEOUT_MS;

  beforeAll(async () => {
    await assertDisposableDatabase();
  });

  afterEach(() => {
    if (originalMaxWait === undefined) delete process.env.CORE_TX_MAX_WAIT_MS;
    else process.env.CORE_TX_MAX_WAIT_MS = originalMaxWait;
    if (originalTimeout === undefined) delete process.env.CORE_TX_TIMEOUT_MS;
    else process.env.CORE_TX_TIMEOUT_MS = originalTimeout;
  });

  it('T1 passes default and overridden transaction options and rejects invalid values', async () => {
    const transaction = jest.fn(async (_fn: unknown, options: unknown) => options);
    const db = { $transaction: transaction } as unknown as PrismaClient;

    delete process.env.CORE_TX_MAX_WAIT_MS;
    delete process.env.CORE_TX_TIMEOUT_MS;
    await expect(runCoreTransaction(db, async () => 'ok')).resolves.toEqual({ maxWait: 5000, timeout: 10000 });
    expect(transaction).toHaveBeenLastCalledWith(expect.any(Function), { maxWait: 5000, timeout: 10000 });

    process.env.CORE_TX_MAX_WAIT_MS = '7000';
    process.env.CORE_TX_TIMEOUT_MS = '12000';
    await expect(runCoreTransaction(db, async () => 'ok')).resolves.toEqual({ maxWait: 7000, timeout: 12000 });

    process.env.CORE_TX_MAX_WAIT_MS = '0';
    expect(() => runCoreTransaction(db, async () => 'ok')).toThrow('CORE_TX_MAX_WAIT_MS must be a positive integer');
    process.env.CORE_TX_MAX_WAIT_MS = 'not-a-number';
    expect(() => runCoreTransaction(db, async () => 'ok')).toThrow('CORE_TX_MAX_WAIT_MS must be a positive integer');
  });

  it('T2 maps deterministic pool exhaustion to TRANSACTION_RETRYABLE', async () => {
    const baseUrl = process.env.DATABASE_URL;
    if (!baseUrl) throw new Error('DATABASE_URL is required by this disposable test');
    const guardedUrl = new URL(baseUrl);
    guardedUrl.searchParams.set('connection_limit', '1');
    const client = new PrismaClient({ datasources: { db: { url: guardedUrl.toString() } } });
    const verifier = new TestPlatformVerifier();
    const service = new BootstrapService(client, verifier);
    let release!: () => void;
    let entered!: () => void;
    const enteredPromise = new Promise<void>((resolve) => { entered = resolve; });
    const releasePromise = new Promise<void>((resolve) => { release = resolve; });
    const holder = client.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1`;
      entered();
      await releasePromise;
    });

    try {
      await enteredPromise;
      process.env.CORE_TX_MAX_WAIT_MS = '200';
      process.env.CORE_TX_TIMEOUT_MS = '10000';
      await expect(service.execute('platform-token', {
        organizationId: 'g15-2-deterministic',
        displayName: 'g15-2-deterministic',
        foundingIdentityProvider: 'test-idp',
        foundingExternalSubject: 'owner',
      })).rejects.toMatchObject({ name: 'CoreDomainError', code: 'TRANSACTION_RETRYABLE' } satisfies Partial<CoreDomainError>);
    } finally {
      release();
      await holder;
      await client.$disconnect();
    }
  });

  it.each([
    ['P2028', 'TRANSACTION_RETRYABLE'],
    ['P2034', 'TRANSACTION_RETRYABLE'],
    ['40001', 'TRANSACTION_RETRYABLE'],
    ['40P01', 'TRANSACTION_RETRYABLE'],
    ['P9999', 'INTERNAL_ERROR'],
  ] as const)('T3 maps %s to %s', (code, expected) => {
    expect(mapCoreDatabaseError(knownError(code)).code).toBe(expected);
  });

  it('T3 preserves existing trigger and uniqueness mappings', () => {
    expect(mapCoreDatabaseError(new Error('Database error: publications are append-only')).code).toBe('CONFLICT');
    expect(mapCoreDatabaseError({ code: 'P2002', meta: { target: ['permission_grant_active_unique'] } }).code).toBe('CONFLICT');
  });
});
