import type { Pool } from 'pg';

/**
 * Product ratings (owner decision D-84): one to five stars, one rating per person per product, changeable and
 * removable. A V2-side module; it stores only the person's id (never a phone), the product and the stars.
 *
 * - Only signed-in people rate, and only products that are published right now (checked by the caller against the
 *   signed public catalog).
 * - Businesses and other customers see only the average and the count, never who rated.
 * - Test identities' ratings count only for the fictional test businesses; real businesses count only real people.
 * - Sensitive businesses (health) are not rated at all: a rating would link a person to a medicine or treatment.
 * - Deleting one's account deletes one's ratings.
 */

export const RATINGS_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS product_ratings (
  organization_id text NOT NULL,
  catalog_item_id text NOT NULL,
  person_id text NOT NULL,
  test_identity boolean NOT NULL DEFAULT false,
  stars smallint NOT NULL CHECK (stars BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, catalog_item_id, person_id)
);
CREATE INDEX IF NOT EXISTS product_ratings_person ON product_ratings (person_id);
`;

export type RatingSummary = Readonly<{ avg: number; count: number; mine: number | null }>;

export class RatingError extends Error {
  constructor(readonly code: 'INPUT_INVALID', message: string) { super(`${code}: ${message}`); this.name = 'RatingError'; }
}

const isTestOrg = (organizationId: string) => organizationId.startsWith('test-');

export class RatingsModule {
  constructor(private readonly db: Pool) {}

  /** Average (one decimal) and count per product of one business, plus the viewer's own stars when signed in. */
  async summary(organizationId: string, personId?: string): Promise<Record<string, RatingSummary>> {
    const counted = isTestOrg(organizationId);
    const r = await this.db.query<{ catalog_item_id: string; avg: string; count: string; mine: number | null }>(
      `SELECT catalog_item_id,
              round(avg(stars) FILTER (WHERE test_identity = $2), 1)::text AS avg,
              count(*) FILTER (WHERE test_identity = $2)::text AS count,
              max(stars) FILTER (WHERE person_id = $3) AS mine
         FROM product_ratings WHERE organization_id = $1 GROUP BY catalog_item_id`,
      [organizationId, counted, personId ?? '']);
    const out: Record<string, RatingSummary> = {};
    for (const row of r.rows) {
      const count = Number(row.count);
      if (count === 0 && row.mine === null) continue;
      out[row.catalog_item_id] = { avg: count ? Number(row.avg) : 0, count, mine: row.mine };
    }
    return out;
  }

  async rate(input: { organizationId: string; catalogItemId: string; personId: string; testIdentity: boolean; stars: unknown }): Promise<void> {
    const stars = Number(input.stars);
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) throw new RatingError('INPUT_INVALID', 'stars must be 1–5');
    await this.db.query(
      `INSERT INTO product_ratings (organization_id, catalog_item_id, person_id, test_identity, stars)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (organization_id, catalog_item_id, person_id) DO UPDATE SET stars = EXCLUDED.stars, updated_at = now()`,
      [input.organizationId, input.catalogItemId, input.personId, input.testIdentity, stars]);
  }

  async remove(organizationId: string, catalogItemId: string, personId: string): Promise<void> {
    await this.db.query('DELETE FROM product_ratings WHERE organization_id = $1 AND catalog_item_id = $2 AND person_id = $3', [organizationId, catalogItemId, personId]);
  }

  /** Account deletion: every rating the person gave. */
  async eraseCustomer(personId: string): Promise<number> {
    const r = await this.db.query('DELETE FROM product_ratings WHERE person_id = $1', [personId]);
    return r.rowCount ?? 0;
  }
}
