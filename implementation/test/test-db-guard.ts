import fs from 'node:fs';
import { URL } from 'node:url';

const GUARD_PREFIX = 'V1 test database guard:';

function databaseUrlsFromFile(envFilePath: string): string[] {
  if (!fs.existsSync(envFilePath)) return [];

  const contents = fs.readFileSync(envFilePath, 'utf8');
  const urls: string[] = [];
  for (const line of contents.split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?DATABASE_URL\s*=\s*(.*?)\s*$/.exec(line);
    if (!match) continue;

    const raw = match[1];
    if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
      urls.push(raw.slice(1, -1));
    } else {
      urls.push(raw);
    }
  }

  return urls;
}

function reject(): never {
  throw new Error(`${GUARD_PREFIX} only disposable localhost PostgreSQL on port 5499 is allowed`);
}

export function assertSafeTestDatabase(env: NodeJS.ProcessEnv, envFilePath: string): void {
  const hasEnvironmentUrl = Object.prototype.hasOwnProperty.call(env, 'DATABASE_URL');
  const effectiveUrls = hasEnvironmentUrl
    ? [env.DATABASE_URL]
    : [
        ...databaseUrlsFromFile(envFilePath),
        ...databaseUrlsFromFile(`${envFilePath.replace(/[\\/]\.env$/, '')}/prisma/.env`),
      ];

  if (effectiveUrls.length === 0) return;

  for (const effectiveUrl of effectiveUrls) {
    if (effectiveUrl === undefined || effectiveUrl.includes(':5435') || effectiveUrl.includes('@db:')) reject();

    let parsed: URL;
    try {
      parsed = new URL(effectiveUrl);
    } catch {
      reject();
    }

    const hostname = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase();
    const localHost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
    if (!localHost || parsed.port !== '5499') reject();
  }
}
