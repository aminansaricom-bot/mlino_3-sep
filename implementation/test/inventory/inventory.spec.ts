import { Inventory, InventoryError, consumption, displayQty, lowStock, stockReport, stockValue } from '../../inventory';

function cafe() {
  const inv = new Inventory();
  inv.addItem({ id: 'milk', name: 'شیر', unit: 'ml', kind: 'material', reorderLevel: 10_000 });
  inv.addItem({ id: 'beans', name: 'دانه‌ی قهوه', unit: 'g', kind: 'material', reorderLevel: 2_000 });
  inv.addItem({ id: 'cake', name: 'چیزکیک', unit: 'pcs', kind: 'goods', reorderLevel: 4, catalogItemId: 'demo-cheesecake' });
  inv.setRecipe('demo-latte', [{ itemId: 'beans', qty: 18 }, { itemId: 'milk', qty: 200 }]);
  inv.setRecipe('demo-cheesecake', [{ itemId: 'cake', qty: 1 }]);
  return inv;
}
const code = (fn: () => unknown) => { try { fn(); return 'ok'; } catch (e) { return e instanceof InventoryError ? e.code : String(e); } };

describe('inventory', () => {
  it('receives at cost and values issues at the moving average', () => {
    const inv = cafe();
    inv.receive({ itemId: 'milk', qty: 20_000, totalCost: 9_000_000, date: '2026-09-23' }); // 450 rial/ml
    inv.receive({ itemId: 'milk', qty: 10_000, totalCost: 6_000_000, date: '2026-09-24' }); // 600 rial/ml → avg 500
    expect(inv.onHand('milk')).toEqual({ qty: 30_000, value: 15_000_000, averageCost: 500 });
    const m = inv.issue({ itemId: 'milk', qty: 3_000, date: '2026-09-24', note: 'ریخت' });
    expect(m).toMatchObject({ qty: -3_000, value: -1_500_000, type: 'issue' });
    expect(inv.onHand('milk').value).toBe(13_500_000);
  });

  it('refuses to issue more than is on hand, but a sale still happens and shows as negative stock', () => {
    const inv = cafe();
    inv.receive({ itemId: 'cake', qty: 2, totalCost: 1_600_000, date: '2026-09-23' });
    expect(code(() => inv.issue({ itemId: 'cake', qty: 3, date: '2026-09-23' }))).toBe('INSUFFICIENT_STOCK');
    inv.sell({ catalogItemId: 'demo-cheesecake', quantity: 3, date: '2026-09-23' });
    const cake = stockReport(inv).find((r) => r.id === 'cake')!;
    expect(cake).toMatchObject({ qty: -1, value: 0, negative: true, low: true });
  });

  it('a latte sale issues every recipe line; items without a recipe move nothing', () => {
    const inv = cafe();
    inv.receive({ itemId: 'beans', qty: 1_000, totalCost: 12_000_000, date: '2026-09-23' });
    inv.receive({ itemId: 'milk', qty: 10_000, totalCost: 4_500_000, date: '2026-09-23' });
    const moves = inv.sell({ catalogItemId: 'demo-latte', quantity: 5, date: '2026-09-23' });
    expect(moves.map((m) => [m.itemId, m.qty, m.value])).toEqual([['beans', -90, -1_080_000], ['milk', -1_000, -450_000]]);
    expect(inv.sell({ catalogItemId: 'demo-espresso', quantity: 2, date: '2026-09-23' })).toEqual([]);
    expect(consumption(inv, '2026-09-23', '2026-09-23').get('beans')).toBe(90);
  });

  it('a count records only the difference, valued at average cost', () => {
    const inv = cafe();
    inv.receive({ itemId: 'beans', qty: 2_000, totalCost: 24_000_000, date: '2026-09-23' });
    expect(inv.count({ itemId: 'beans', countedQty: 2_000, date: '2026-09-24' })).toBeNull();
    expect(inv.count({ itemId: 'beans', countedQty: 1_900, date: '2026-09-24' })).toMatchObject({ qty: -100, value: -1_200_000, type: 'count' });
    expect(inv.count({ itemId: 'beans', countedQty: 1_950, date: '2026-09-25' })).toMatchObject({ qty: 50, value: 600_000 });
    expect(inv.onHand('beans')).toMatchObject({ qty: 1_950, value: 23_400_000 });
  });

  it('low stock, value and display units', () => {
    const inv = cafe();
    inv.receive({ itemId: 'milk', qty: 8_000, totalCost: 3_600_000, date: '2026-09-23' });
    inv.receive({ itemId: 'beans', qty: 5_000, totalCost: 60_000_000, date: '2026-09-23' });
    expect(lowStock(inv).map((r) => r.id)).toEqual(['cake', 'milk']);
    expect(stockValue(inv)).toBe(63_600_000);
    expect(displayQty(12_500, 'g')).toEqual({ value: 12.5, label: 'کیلوگرم' });
    expect(displayQty(3, 'pcs')).toEqual({ value: 3, label: 'عدد' });
  });

  it('validates input: whole quantities, known items, sane recipes', () => {
    const inv = cafe();
    expect(code(() => inv.receive({ itemId: 'milk', qty: 1.5, totalCost: 10, date: '2026-09-23' }))).toBe('QTY_INVALID');
    expect(code(() => inv.receive({ itemId: 'nope', qty: 1, totalCost: 10, date: '2026-09-23' }))).toBe('ITEM_UNKNOWN');
    expect(code(() => inv.receive({ itemId: 'milk', qty: 1, totalCost: -1, date: '2026-09-23' }))).toBe('VALUE_INVALID');
    expect(code(() => inv.setRecipe('demo-latte', [{ itemId: 'milk', qty: 1 }, { itemId: 'milk', qty: 2 }]))).toBe('RECIPE_INVALID');
    expect(code(() => inv.addItem({ id: 'milk', name: 'x', unit: 'ml', kind: 'material', reorderLevel: 0 }))).toBe('ITEM_EXISTS');
    expect(code(() => inv.receive({ itemId: 'milk', qty: 1, totalCost: 1, date: '1405/07/01' }))).toBe('DATE_INVALID');
  });
});
