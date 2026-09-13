import { assertDisposableDatabase } from './db-guard';

describe('G10a3 database guard', () => {
  const original = process.env.DATABASE_URL;

  afterEach(() => {
    if (original === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = original;
  });

  it.each([
    undefined,
    'postgresql://user:pass@localhost:5435/db',
    'postgresql://user:pass@db:5432/db',
    'postgresql://user:pass@localhost:5549/db',
  ])('rejects unsafe DATABASE_URL %s', async (url) => {
    if (url === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = url;
    await expect(assertDisposableDatabase()).rejects.toThrow('G10A3 database guard');
  });

  it('accepts only the disposable localhost:5499 target', async () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5499/db';
    await expect(assertDisposableDatabase()).resolves.toBeUndefined();
  });
});
