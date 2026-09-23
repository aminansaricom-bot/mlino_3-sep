import http from 'node:http';
import { Pool } from 'pg';
import { CoreIdentity, IDENTITY_SCHEMA_SQL, testDelivery, type Audience } from '../../identity';
import { CHAT_SCHEMA_SQL, ChatModule } from '../../chat';
import { createHandler } from './app';
import { seedDemoMembers } from './seed-demo-members';

/**
 * Entry point of the MLINO API service.
 *
 * Environment only — no secret has a default and none is read from a committed file:
 *   CORE_DATABASE_URL   Core database (identity schema + read of memberships and grants)
 *   CHAT_DATABASE_URL   chat module database — separate storage (D-71)
 *   IDENTITY_PEPPER     base64, at least 32 bytes
 *   OTP_DELIVERY        only `test` today; anything else refuses to start
 *   API_HOSTS           e.g. explore.mlino.site=v2,business.mlino.site=business
 *   PUBLISHED_PATH      public-business.v1.json produced by the export
 *   API_PORT            default 8741, bound to 127.0.0.1
 *   COOKIE_SECURE       1 in production
 *
 * `node mlino-api.cjs seed-demo-members 09000000090` adds that test identity as a
 * member with `chat.reply` to every fictional test-demo-* organization.
 */

function required(name: string): string {
  const v = process.env[name];
  if (!v) { console.error(`[mlino-api] ${name} is not set — refusing to start`); process.exit(1); }
  return v;
}

async function main(): Promise<void> {
  const pepper = Buffer.from(required('IDENTITY_PEPPER'), 'base64');
  const delivery = process.env.OTP_DELIVERY ?? 'test';
  if (delivery !== 'test') { console.error('[mlino-api] only OTP_DELIVERY=test is implemented until an SMS provider is chosen'); process.exit(1); }

  const core = new Pool({ connectionString: required('CORE_DATABASE_URL'), max: 5 });
  const chatDb = new Pool({ connectionString: required('CHAT_DATABASE_URL'), max: 5 });
  await core.query(IDENTITY_SCHEMA_SQL);
  await chatDb.query(CHAT_SCHEMA_SQL);

  const identity = new CoreIdentity(core, { pepper, delivery: testDelivery });
  const chat = new ChatModule(chatDb);

  if (process.argv[2] === 'seed-demo-members') {
    const out = await seedDemoMembers(core, identity, process.argv[3] ?? '');
    console.log(`[mlino-api] demo members: ${out.added} added, ${out.existing} already present`);
    await core.end(); await chatDb.end();
    return;
  }

  const hosts = new Map<string, Audience>();
  for (const pair of required('API_HOSTS').split(',')) {
    const [host, aud] = pair.split('=').map((s) => s.trim().toLowerCase());
    if (host && (aud === 'v2' || aud === 'business')) hosts.set(host, aud);
  }

  const handler = createHandler({ identity, chat, config: { hosts, cookieSecure: process.env.COOKIE_SECURE === '1', publishedPath: required('PUBLISHED_PATH') } });
  const server = http.createServer((req, res) => { void handler(req, res); });
  const port = Number(process.env.API_PORT ?? 8741);
  server.listen(port, '127.0.0.1', () => console.log(`[mlino-api] listening on 127.0.0.1:${port}, OTP delivery: ${delivery}`));

  const sweep = async () => {
    try {
      const gone = await chat.purge();
      const old = await identity.purgeExpired();
      if (gone || old.challenges || old.sessions) console.log(`[mlino-api] retention: ${gone} conversations, ${old.challenges} codes, ${old.sessions} sessions removed`);
    } catch (e) { console.error('[mlino-api] retention sweep failed', e instanceof Error ? e.message : ''); }
  };
  void sweep();
  const timer = setInterval(() => void sweep(), 10 * 60_000);

  const stop = () => { clearInterval(timer); server.close(() => { void core.end(); void chatDb.end(); process.exit(0); }); };
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
}

void main();
