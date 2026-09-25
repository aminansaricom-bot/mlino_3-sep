import fs from 'node:fs';
import type { Pool } from 'pg';
import { isSensitiveBusiness } from '../../chat';

/**
 * Sample five-star ratings for the fictional test businesses, so the demo shows stars on products and businesses.
 *
 * - Only `test-demo-*` businesses and only products that are published right now (read from the same signed public
 *   files the API reads). Health and similar businesses get none (ratings are off for them, D-84).
 * - The voters are synthetic (`demo-voter-NN`, marked as test identities): test ratings count only for test
 *   businesses, so a real business can never receive them.
 * - Deterministic: the same product always gets the same votes; running it again adds nothing new.
 * - `remove` deletes exactly these synthetic votes and nothing else.
 */

export const DEMO_VOTER = 'demo-voter-';
type Json = Record<string, unknown>;
export type DemoRating = Readonly<{ organizationId: string; catalogItemId: string; personId: string; stars: number }>;

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function random(seed: number): () => number {
  let a = seed;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const records = (file: string): Json[] => {
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as Json;
  const payload = (parsed.payload ?? parsed) as Json;
  return (payload.records as Json[] | undefined) ?? [];
};

/** The votes for every published product of the test businesses in the two public files. */
export function demoRatings(businessRecords: readonly Json[], catalogRecords: readonly Json[]): DemoRating[] {
  const businesses = new Map(businessRecords.map((r) => [((r.business as Json).organization_id as string), r]));
  const out: DemoRating[] = [];
  for (const c of catalogRecords) {
    const org = c.organization_id as string;
    const record = businesses.get(org);
    if (!org.startsWith('test-demo-') || !record) continue;
    const name = ((record.business as Json).name as string) ?? '';
    const capabilities = ((record.capabilities as Json[] | undefined) ?? []).map((x) => String(x.name ?? ''));
    if (isSensitiveBusiness(name, capabilities)) continue;
    for (const item of (c.items as Json[] | undefined) ?? []) {
      const id = item.catalog_item_id as string;
      const next = random(hash(`${org}/${id}`));
      const voters = 8 + Math.floor(next() * 35);
      const mean = 3.7 + next() * 1.1;
      for (let v = 1; v <= voters; v += 1) {
        const stars = Math.min(5, Math.max(1, Math.round(mean + (next() - 0.5) * 2.4)));
        out.push({ organizationId: org, catalogItemId: id, personId: `${DEMO_VOTER}${String(v).padStart(2, '0')}`, stars });
      }
    }
  }
  return out;
}

export async function seedDemoRatings(ratingsDb: Pool, businessPath: string, catalogPath: string): Promise<{ added: number; planned: number }> {
  const rows = demoRatings(records(businessPath), records(catalogPath));
  let added = 0;
  for (const r of rows) {
    const res = await ratingsDb.query(
      `INSERT INTO product_ratings (organization_id, catalog_item_id, person_id, test_identity, stars)
       VALUES ($1, $2, $3, true, $4) ON CONFLICT DO NOTHING`, [r.organizationId, r.catalogItemId, r.personId, r.stars]);
    added += res.rowCount ?? 0;
  }
  return { added, planned: rows.length };
}

export async function removeDemoRatings(ratingsDb: Pool): Promise<number> {
  const res = await ratingsDb.query(`DELETE FROM product_ratings WHERE person_id LIKE $1 AND test_identity = true AND organization_id LIKE 'test-demo-%'`, [`${DEMO_VOTER}%`]);
  return res.rowCount ?? 0;
}
