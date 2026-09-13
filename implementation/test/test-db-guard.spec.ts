import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { assertSafeTestDatabase } from './test-db-guard';

describe('assertSafeTestDatabase', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mlino-test-db-guard-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const filePath = () => path.join(tempDir, '.env');

  test('allows an unset URL when no env file exists', () => {
    expect(() => assertSafeTestDatabase({}, filePath())).not.toThrow();
  });

  test('allows disposable local PostgreSQL on port 5499', () => {
    expect(() => assertSafeTestDatabase({ DATABASE_URL: 'postgresql://user:pass@localhost:5499/test' }, filePath())).not.toThrow();
  });

  test.each([
    ['port 5435', 'postgresql://user:pass@localhost:5435/test'],
    ['container host', 'postgresql://user:pass@db:5432/test'],
    ['other port', 'postgresql://user:pass@localhost:5432/test'],
    ['non-local host', 'postgresql://user:pass@example.test:5499/test'],
    ['garbage', 'not-a-database-url'],
  ])('rejects %s', (_name, databaseUrl) => {
    expect(() => assertSafeTestDatabase({ DATABASE_URL: databaseUrl }, filePath())).toThrow(/^V1 test database guard:/);
  });

  test('reads and rejects an unsafe URL from .env when the environment is unset', () => {
    fs.writeFileSync(filePath(), 'DATABASE_URL="postgresql://user:pass@localhost:5435/test"\n', 'utf8');
    expect(() => assertSafeTestDatabase({}, filePath())).toThrow(/^V1 test database guard:/);
  });

  test('rejects when any DATABASE_URL line in .env is unsafe', () => {
    fs.writeFileSync(filePath(), [
      'DATABASE_URL=postgresql://user:pass@localhost:5499/test',
      'DATABASE_URL=postgresql://user:pass@localhost:5435/test',
    ].join('\n'), 'utf8');
    expect(() => assertSafeTestDatabase({}, filePath())).toThrow(/^V1 test database guard:/);
  });

  test('accepts an export-prefixed quoted URL in .env', () => {
    fs.writeFileSync(filePath(), 'export DATABASE_URL="postgresql://user:pass@localhost:5499/test"\n', 'utf8');
    expect(() => assertSafeTestDatabase({}, filePath())).not.toThrow();
  });

  test('checks implementation/prisma/.env as well', () => {
    fs.mkdirSync(path.join(tempDir, 'prisma'));
    fs.writeFileSync(path.join(tempDir, 'prisma', '.env'), 'DATABASE_URL=postgresql://user:pass@localhost:5435/test\n', 'utf8');
    expect(() => assertSafeTestDatabase({}, filePath())).toThrow(/^V1 test database guard:/);
  });

  test('checks both env files and accepts two safe URLs', () => {
    fs.writeFileSync(filePath(), 'DATABASE_URL=postgresql://user:pass@localhost:5499/test\n', 'utf8');
    fs.mkdirSync(path.join(tempDir, 'prisma'));
    fs.writeFileSync(path.join(tempDir, 'prisma', '.env'), 'export DATABASE_URL=postgresql://user:pass@127.0.0.1:5499/test\n', 'utf8');
    expect(() => assertSafeTestDatabase({}, filePath())).not.toThrow();
  });

  test('environment URL takes precedence over an unsafe .env URL', () => {
    fs.writeFileSync(filePath(), 'DATABASE_URL=postgresql://user:pass@localhost:5435/test\n', 'utf8');
    expect(() => assertSafeTestDatabase({ DATABASE_URL: 'postgresql://user:pass@localhost:5499/test' }, filePath())).not.toThrow();
  });

  test('never includes the URL or password in the error', () => {
    const databaseUrl = 'postgresql://sensitive-user:super-secret@db:5432/private';
    try {
      assertSafeTestDatabase({ DATABASE_URL: databaseUrl }, filePath());
      throw new Error('expected guard to throw');
    } catch (error) {
      const message = String(error);
      expect(message).toContain('V1 test database guard:');
      expect(message).not.toContain(databaseUrl);
      expect(message).not.toContain('super-secret');
    }
  });
});
