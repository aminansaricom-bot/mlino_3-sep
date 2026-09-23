// Seeds ONLY the fictional demo businesses into the demo Core database on this server.
const base = '/opt/mlino/core/';
const { PrismaClient } = require(base + 'node_modules/@prisma/client');
const { readVanakBusinesses } = require(base + 'dist/tools/test-seed/parse');
const { seedVanakBusinesses } = require(base + 'dist/tools/test-seed/seed');
const { readTestOffers, seedTestOffers } = require(base + 'dist/tools/test-seed/offers');
const { readTestCatalog, seedTestCatalog, withdrawTestCatalog } = require(base + 'dist/tools/test-seed/catalog');
const D = base + 'data/'; const store = '/var/lib/mlino/media-store';
(async () => {
  if (!/@127\.0\.0\.1:5440\/mlino_demo(\?|$)/.test(process.env.DATABASE_URL || '')) throw new Error('DEMO_DB_ONLY');
  const db = new PrismaClient();
  try {
    const out = {};
    out.oldBiz = await seedVanakBusinesses(db, readVanakBusinesses(D + 'demo_businesses.json'), process.env);
    out.oldOffers = await seedTestOffers(db, readTestOffers(D + 'demo_offers.json'), process.env);
    out.oldMenu = await seedTestCatalog(db, readTestCatalog(D + 'demo_catalog.json'), store, process.env);
    out.withdraw = await withdrawTestCatalog(db, process.env);
    out.biz = await seedVanakBusinesses(db, readVanakBusinesses(D + 'demo_businesses_food.json'), process.env);
    out.offers = await seedTestOffers(db, readTestOffers(D + 'demo_offers_food.json'), process.env);
    out.menu = await seedTestCatalog(db, readTestCatalog(D + 'demo_catalog_food.json'), store, process.env);
    console.log(JSON.stringify(out));
  } finally { await db.$disconnect(); }
})().catch((e) => { console.error('SEED_FAILED', e.code || e.message); process.exit(1); });
