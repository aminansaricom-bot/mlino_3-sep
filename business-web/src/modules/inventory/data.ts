// Inventory demo data: an append-only op log replayed into the engine (same pattern as the accounting book).
// The sample is derived from the accounting sample so the two modules tell one consistent story:
// purchases in the books arrive as stock, invoiced menu items consume their recipes, and a weekly
// stock-take records real usage (daily takings carry no item detail, so usage appears through counts).

import { Inventory, type RecipeLine, type StockItem } from '../../inventoryEngine';
import type { BookData, Op } from '../../book';

export type InvOp =
  | Readonly<{ k: 'item'; input: StockItem }>
  | Readonly<{ k: 'recipe'; catalogItemId: string; lines: readonly RecipeLine[] }>
  | Readonly<{ k: 'receive'; input: { itemId: string; qty: number; totalCost: number; date: string; note?: string } }>
  | Readonly<{ k: 'issue'; input: { itemId: string; qty: number; date: string; note?: string } }>
  | Readonly<{ k: 'count'; input: { itemId: string; countedQty: number; date: string; note?: string } }>
  | Readonly<{ k: 'sell'; input: { catalogItemId: string; quantity: number; date: string; note?: string } }>;

export type InvData = Readonly<{ version: 1; ops: readonly InvOp[] }>;

export function runInvOp(inv: Inventory, op: InvOp): void {
  switch (op.k) {
    case 'item': inv.addItem(op.input); return;
    case 'recipe': inv.setRecipe(op.catalogItemId, op.lines); return;
    case 'receive': inv.receive(op.input); return;
    case 'issue': inv.issue(op.input); return;
    case 'count': inv.count(op.input); return;
    case 'sell': inv.sell(op.input); return;
  }
}

export function replayInventory(data: InvData): Inventory {
  const inv = new Inventory();
  for (const op of data.ops) runInvOp(inv, op);
  return inv;
}

const KEY = 'mlino.inventory.demo.v1';
export function loadInventory(): InvData | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as InvData;
    return data?.version === 1 && Array.isArray(data.ops) ? data : null;
  } catch { return null; }
}
export function saveInventory(data: InvData): void {
  try { window.localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* the session keeps working */ }
}
export function clearInventory(): void {
  try { window.localStorage.removeItem(KEY); } catch { /* ignore */ }
}

/** Sales of an invoice become recipe consumption (the only cross-module flow: accounting → inventory). */
export function salesFromAccountingOp(op: Op, inv: Inventory): InvOp[] {
  if (op.k !== 'invoice') return [];
  return op.input.lines
    .filter((l) => l.catalogItemId && inv.recipe(l.catalogItemId).length > 0)
    .map((l) => ({ k: 'sell' as const, input: { catalogItemId: l.catalogItemId!, quantity: l.quantity, date: op.input.date, note: `فاکتور ${op.input.id}` } }));
}

const ITEMS: readonly StockItem[] = [
  { id: 'milk', name: 'شیر', unit: 'ml', kind: 'material', reorderLevel: 25_000 },
  { id: 'beans', name: 'دانه‌ی قهوه', unit: 'g', kind: 'material', reorderLevel: 3_000 },
  { id: 'sugar', name: 'شکر', unit: 'g', kind: 'material', reorderLevel: 1_000 },
  { id: 'mint', name: 'نعناع و لیمو', unit: 'g', kind: 'material', reorderLevel: 300 },
  { id: 'croissant', name: 'کروسان', unit: 'pcs', kind: 'goods', reorderLevel: 15, catalogItemId: 'demo-croissant' },
  { id: 'cheesecake', name: 'چیزکیک', unit: 'pcs', kind: 'goods', reorderLevel: 4, catalogItemId: 'demo-cheesecake' },
  { id: 'chocolate-cake', name: 'کیک شکلاتی', unit: 'pcs', kind: 'goods', reorderLevel: 2, catalogItemId: 'demo-chocolate-cake' },
];

const RECIPES: Readonly<Record<string, readonly RecipeLine[]>> = {
  'demo-espresso': [{ itemId: 'beans', qty: 18 }],
  'demo-latte': [{ itemId: 'beans', qty: 18 }, { itemId: 'milk', qty: 200 }],
  'demo-cappuccino': [{ itemId: 'beans', qty: 18 }, { itemId: 'milk', qty: 150 }],
  'demo-iced-coffee': [{ itemId: 'beans', qty: 18 }, { itemId: 'milk', qty: 150 }, { itemId: 'sugar', qty: 10 }],
  'demo-mojito': [{ itemId: 'mint', qty: 15 }, { itemId: 'sugar', qty: 20 }],
  'demo-cheesecake': [{ itemId: 'cheesecake', qty: 1 }],
  'demo-chocolate-cake': [{ itemId: 'chocolate-cake', qty: 1 }],
  'demo-croissant': [{ itemId: 'croissant', qty: 1 }],
};

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function generateInventorySample(book: BookData): InvData {
  const rnd = mulberry32(7);
  const inv = new Inventory();
  const ops: InvOp[] = [];
  const push = (op: InvOp) => { runInvOp(inv, op); ops.push(op); };
  for (const item of ITEMS) push({ k: 'item', input: item });
  for (const [id, lines] of Object.entries(RECIPES)) push({ k: 'recipe', catalogItemId: id, lines });

  let lastDate = '';
  const stockTake = (date: string) => {
    // Weekly count: what was really left after the week's (unitemised) daily sales.
    for (const item of ITEMS) {
      const on = inv.onHand(item.id).qty;
      if (on <= 0) continue;
      const left = Math.round(on * (0.38 + rnd() * 0.25));
      push({ k: 'count', input: { itemId: item.id, countedQty: left, date, note: 'شمارش هفتگی' } });
    }
  };
  for (const op of book.ops) {
    const date = 'input' in op && op.input && 'date' in op.input ? (op.input as { date: string }).date : null;
    if (!date) continue;
    if (lastDate && date !== lastDate && new Date(`${lastDate}T00:00:00Z`).getUTCDay() === 5) stockTake(lastDate);
    lastDate = date;
    if (op.k === 'expense') {
      const amount = op.input.amount;
      if (op.input.note === 'خرید شیر و لبنیات') {
        push({ k: 'receive', input: { itemId: 'milk', qty: Math.round(amount / 450) - (Math.round(amount / 450) % 1000), totalCost: amount, date, note: 'از لبنیات پگاه' } });
      } else if (op.input.note === 'دانه‌ی قهوه') {
        const g = Math.round(amount / 12_000);
        push({ k: 'receive', input: { itemId: 'beans', qty: g - (g % 250), totalCost: amount, date, note: 'از رُست‌کار قهوه' } });
        push({ k: 'receive', input: { itemId: 'sugar', qty: 5_000, totalCost: 2_500_000, date, note: 'شکر' } });
        push({ k: 'receive', input: { itemId: 'mint', qty: 2_000, totalCost: 3_000_000, date, note: 'نعناع و لیمو' } });
      } else if (op.input.note === 'نان و شیرینی') {
        const croissants = Math.round((amount * 0.5) / 300_000);
        const cakes = Math.round((amount * 0.3) / 700_000);
        const choc = Math.max(1, Math.round((amount * 0.2) / 650_000));
        push({ k: 'receive', input: { itemId: 'croissant', qty: croissants, totalCost: croissants * 300_000, date, note: 'از نانوایی سحر' } });
        push({ k: 'receive', input: { itemId: 'cheesecake', qty: cakes, totalCost: cakes * 700_000, date, note: 'از نانوایی سحر' } });
        push({ k: 'receive', input: { itemId: 'chocolate-cake', qty: choc, totalCost: choc * 650_000, date, note: 'از نانوایی سحر' } });
      }
    }
    for (const sale of salesFromAccountingOp(op, inv)) push(sale);
  }
  return { version: 1, ops };
}
