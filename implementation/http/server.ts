import { startReadApi } from './read-api';

/**
 * Executable entry point for the V1 read API.
 *
 * NOT a production launcher — see the header of read-api.ts. This exists so the
 * approved composition root can actually be run locally, and so the graceful
 * shutdown path described in V1_COMPOSITION_ROOT_DESIGN.md §2.2 item 5 has a
 * real owner.
 *
 * Configuration comes from the environment only:
 *   DATABASE_URL       - required by Prisma
 *   MLINO_JWT_SECRET   - required; auth-adapter already fails closed without it
 *   PORT               - optional, defaults to 3000 here
 *
 * No secret has a default and none is read from a committed file.
 */
async function main(): Promise<void> {
  const started = await startReadApi(Number(process.env.PORT ?? 3000));
  // eslint-disable-next-line no-console
  console.log(`[v1-read-api] listening on ${started.port} — local bridge, not production`);

  let closing = false;
  const shutdown = async (signal: string) => {
    if (closing) return; // a second Ctrl-C must not start a second teardown
    closing = true;
    // eslint-disable-next-line no-console
    console.log(`[v1-read-api] ${signal} received, shutting down`);
    await started.close();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

void main();
