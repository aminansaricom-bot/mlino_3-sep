import { existsSync } from 'node:fs';

export async function assertDisposableDatabase(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('G10A2 database guard: DATABASE_URL is unset');
  if (url.includes(':5435') || url.includes('@db:')) throw new Error('G10A2 database guard: forbidden database target');
  const parsed = new URL(url);
  if (!['127.0.0.1', 'localhost'].includes(parsed.hostname) || parsed.port !== '5499') throw new Error('G10A2 database guard: only localhost:5499 is allowed');
  if (existsSync('implementation/.env')) throw new Error('G10A2 database guard: implementation/.env exists');
}
