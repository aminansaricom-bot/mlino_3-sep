import { DEMO_VOTER, demoRatings } from '../../http/api/seed-demo-ratings';

const business = (id: string, name: string, capabilities: string[] = []) => ({ business: { organization_id: id, name }, capabilities: capabilities.map((n) => ({ name: n })) });
const catalog = (id: string, items: string[]) => ({ organization_id: id, items: items.map((i) => ({ catalog_item_id: i })) });

describe('sample ratings for the demo businesses', () => {
  const businesses = [business('test-demo-01', 'کافه نمایشی (آزمایشی)'), business('test-demo-04', 'داروخانه نمایشی (آزمایشی)', ['دارو']), business('real-cafe', 'کافه واقعی')];
  const catalogs = [catalog('test-demo-01', ['a', 'b']), catalog('test-demo-04', ['p']), catalog('real-cafe', ['r'])];

  it('rates only published products of test businesses, never health businesses or real ones', () => {
    const rows = demoRatings(businesses, catalogs);
    expect(new Set(rows.map((r) => r.organizationId))).toEqual(new Set(['test-demo-01']));
    expect(new Set(rows.map((r) => r.catalogItemId))).toEqual(new Set(['a', 'b']));
  });

  it('uses synthetic voters, stars from 1 to 5, and the same votes every time', () => {
    const rows = demoRatings(businesses, catalogs);
    expect(rows.every((r) => r.personId.startsWith(DEMO_VOTER) && r.stars >= 1 && r.stars <= 5)).toBe(true);
    expect(demoRatings(businesses, catalogs)).toEqual(rows);
    const perItem = rows.filter((r) => r.catalogItemId === 'a');
    expect(perItem.length).toBeGreaterThanOrEqual(8);
    expect(new Set(perItem.map((r) => r.personId)).size).toBe(perItem.length);
  });
});
