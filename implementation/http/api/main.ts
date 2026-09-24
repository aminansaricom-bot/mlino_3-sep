import http from 'node:http';
import { Pool } from 'pg';
import webpush from 'web-push';
import { CoreIdentity, IDENTITY_SCHEMA_SQL, testDelivery, type Audience } from '../../identity';
import { CHAT_SCHEMA_SQL, ChatModule } from '../../chat';
import { NOTIFY_SCHEMA_SQL, NotifyModule, type Sender } from '../../notify';
import { prisma } from '../../foundation/prisma-client';
import { OfferService } from '../../core/offer-service';
import { PLAN_LIMITS, PlanService, planOf } from '../../core/plan-service';
import { PublicationService } from '../../core/publication-service';
import { createHandler } from './app';
import type { CoreDeps } from './core-routes';
import { businessPlace } from './facts';
import { seedDemoMembers } from './seed-demo-members';

/**
 * Entry point of the MLINO API service. Runs from the Core build (/opt/mlino/core) so the panel's writes go
 * through the same Core services the tests cover.
 *
 * Environment only — no secret has a default and none is read from a committed file:
 *   DATABASE_URL        Core database for Prisma (Core services: plans, offers, publications)
 *   CORE_DATABASE_URL   Core database for the identity schema and membership reads
 *   CHAT_DATABASE_URL   chat module database — separate storage (D-71)
 *   NOTIFY_DATABASE_URL nearby-offer notification database (optional; with VAPID_* enables notifications)
 *   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
 *   IDENTITY_PEPPER     base64, at least 32 bytes
 *   OTP_DELIVERY        only `test` today; anything else refuses to start
 *   API_HOSTS           e.g. explore.mlino.site=v2,business.mlino.site=business
 *   PUBLISHED_PATH      public-business.v1.json produced by the export
 *   CATALOG_PATH        public-catalog.v1.json (published catalog for the chat auto-reply)
 *   API_PORT            default 8741, bound to 127.0.0.1
 *   COOKIE_SECURE       1 in production
 *
 * `node main.js seed-demo-members 09000000090` makes that test identity a member of every fictional
 * test-demo-* organization with chat.reply, offer.manage, publication.manage and plan.manage.
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
    console.log(`[mlino-api] demo members: ${out.added} grants added, ${out.existing} already present`);
    await core.end(); await chatDb.end();
    return;
  }

  const publishedPath = required('PUBLISHED_PATH');

  let notify: { module: NotifyModule; publicKey: string } | undefined;
  let notifyDb: Pool | undefined;
  if (process.env.NOTIFY_DATABASE_URL && process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? 'https://explore.mlino.site', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
    notifyDb = new Pool({ connectionString: process.env.NOTIFY_DATABASE_URL, max: 3 });
    await notifyDb.query(NOTIFY_SCHEMA_SQL);
    const sender: Sender = {
      async send(sub, payload) {
        try { await webpush.sendNotification(sub, payload, { TTL: 6 * 3600, urgency: 'normal' }); return { gone: false }; }
        catch (e) { const code = (e as { statusCode?: number }).statusCode; if (code === 404 || code === 410) return { gone: true }; throw e; }
      },
    };
    notify = { module: new NotifyModule(notifyDb, sender), publicKey: process.env.VAPID_PUBLIC_KEY };
  }

  const coreDeps: CoreDeps = {
    prisma,
    plans: new PlanService(prisma),
    offers: new OfferService(prisma),
    publications: new PublicationService(prisma),
    // D-77: after a person publishes an offer with a radius, notify opted-in viewers inside it (PRO/MAX only).
    onOfferPublished: async (organizationId, offerVersionId) => {
      if (!notify || !PLAN_LIMITS[await planOf(prisma, organizationId)].offerPush) return;
      const v = await prisma.offerVersion.findFirst({ where: { id: offerVersionId, organizationId, publicationStatus: 'PUBLISHED' }, select: { name: true, visibilityRadiusMeters: true } });
      const place = businessPlace(publishedPath, organizationId);
      if (!v?.visibilityRadiusMeters || !place) return;
      const out = await notify.module.announce({ organizationId, offerVersionId, businessName: place.name, offerName: v.name.replace(/\s*\(آزمایشی\)/g, ''), radiusMeters: v.visibilityRadiusMeters, at: { lat: place.lat, lng: place.lng } });
      console.log(`[mlino-api] offer announced: ${out.sent} notifications${out.skipped ? ` (${out.skipped})` : ''}`);
    },
  };

  const hosts = new Map<string, Audience>();
  for (const pair of required('API_HOSTS').split(',')) {
    const [host, aud] = pair.split('=').map((s) => s.trim().toLowerCase());
    if (host && (aud === 'v2' || aud === 'business')) hosts.set(host, aud);
  }

  const handler = createHandler({ identity, chat, core: coreDeps, notify, config: { hosts, cookieSecure: process.env.COOKIE_SECURE === '1', publishedPath, catalogPath: process.env.CATALOG_PATH } });
  const server = http.createServer((req, res) => { void handler(req, res); });
  const port = Number(process.env.API_PORT ?? 8741);
  server.listen(port, '127.0.0.1', () => console.log(`[mlino-api] listening on 127.0.0.1:${port}, OTP delivery: ${delivery}, notifications: ${notify ? 'on' : 'off'}`));

  const sweep = async () => {
    try {
      const gone = await chat.purge();
      const old = await identity.purgeExpired();
      if (notify) await notify.module.purge();
      if (gone || old.challenges || old.sessions) console.log(`[mlino-api] retention: ${gone} conversations, ${old.challenges} codes, ${old.sessions} sessions removed`);
    } catch (e) { console.error('[mlino-api] retention sweep failed', e instanceof Error ? e.message : ''); }
  };
  void sweep();
  const timer = setInterval(() => void sweep(), 10 * 60_000);

  const stop = () => { clearInterval(timer); server.close(() => { void core.end(); void chatDb.end(); void notifyDb?.end(); void prisma.$disconnect(); process.exit(0); }); };
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
}

void main();
