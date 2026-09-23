// MLINO Inventory module (B1): stock of materials and goods for an owner-run business.
// Module, not Core (ADR-0011): it may reference Core ids (catalog items) but Core never references it,
// and its storage is separate from Core's (D-71). Pure: no database, no network, no hidden clock.
//
// Quantities are whole numbers of a base unit (g, ml, pcs), so there is no floating point anywhere.
// Stock value uses the moving-average cost: a receipt adds its full cost, an issue removes value at the
// current average (rounded once, half-up). Movements are never edited; corrections are new movements.

export type BaseUnit = 'g' | 'ml' | 'pcs';
export type ItemKind = 'material' | 'goods';

export type StockItem = Readonly<{
  id: string;
  name: string;
  unit: BaseUnit;
  kind: ItemKind;
  /** Alert when on-hand falls to or below this many base units. */
  reorderLevel: number;
  /** Optional Core catalog item this stock item is sold as (goods sold as they are). */
  catalogItemId?: string;
}>;

export type MovementType = 'receive' | 'issue' | 'sale' | 'count';

export type Movement = Readonly<{
  id: string;
  date: string;
  itemId: string;
  type: MovementType;
  /** Signed base units: positive in, negative out. */
  qty: number;
  /** Signed Rial value moved (receipts: cost paid; issues: at average cost). */
  value: number;
  note?: string;
  /** For sales: the catalog item sold, so consumption can be traced to menu lines. */
  catalogItemId?: string;
}>;

export type RecipeLine = Readonly<{ itemId: string; qty: number }>;

export type InventoryErrorCode = 'ITEM_UNKNOWN' | 'ITEM_EXISTS' | 'QTY_INVALID' | 'VALUE_INVALID' | 'DATE_INVALID' | 'INSUFFICIENT_STOCK' | 'RECIPE_INVALID' | 'INPUT_INVALID';

export class InventoryError extends Error {
  constructor(readonly code: InventoryErrorCode, message: string) {
    super(`${code}: ${message}`);
    this.name = 'InventoryError';
  }
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const ID = /^[A-Za-z0-9_-]{1,64}$/;

function wholePositive(n: unknown, field: string): number {
  if (typeof n !== 'number' || !Number.isSafeInteger(n) || n <= 0) throw new InventoryError('QTY_INVALID', `${field} must be a positive whole number`);
  return n;
}
function wholeNonNegative(n: unknown, field: string, code: InventoryErrorCode = 'QTY_INVALID'): number {
  if (typeof n !== 'number' || !Number.isSafeInteger(n) || n < 0) throw new InventoryError(code, `${field} must be a non-negative whole number`);
  return n;
}
function date(value: unknown): string {
  if (typeof value !== 'string' || !ISO.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) throw new InventoryError('DATE_INVALID', 'date must be YYYY-MM-DD');
  return value;
}
function divideHalfUp(numerator: number, denominator: number): number {
  const sign = numerator < 0 ? -1 : 1;
  const n = Math.abs(numerator);
  const q = Math.floor(n / denominator);
  return sign * (n - q * denominator >= denominator / 2 ? q + 1 : q);
}

export type InventoryOptions = Readonly<{ newId?: () => string }>;

export class Inventory {
  private readonly items = new Map<string, StockItem>();
  private readonly movements: Movement[] = [];
  private readonly recipes = new Map<string, readonly RecipeLine[]>();
  private readonly stock = new Map<string, { qty: number; value: number }>();
  private readonly newId: () => string;

  constructor(options: InventoryOptions = {}) {
    let n = 0;
    this.newId = options.newId ?? (() => `M${(n += 1)}`);
  }

  addItem(item: StockItem): StockItem {
    if (typeof item.id !== 'string' || !ID.test(item.id)) throw new InventoryError('INPUT_INVALID', 'item.id');
    if (this.items.has(item.id)) throw new InventoryError('ITEM_EXISTS', item.id);
    if (typeof item.name !== 'string' || !item.name.trim() || item.name.length > 80) throw new InventoryError('INPUT_INVALID', 'item.name');
    if (!['g', 'ml', 'pcs'].includes(item.unit)) throw new InventoryError('INPUT_INVALID', 'item.unit');
    if (item.kind !== 'material' && item.kind !== 'goods') throw new InventoryError('INPUT_INVALID', 'item.kind');
    const clean: StockItem = { id: item.id, name: item.name.trim(), unit: item.unit, kind: item.kind, reorderLevel: wholeNonNegative(item.reorderLevel, 'reorderLevel'), ...(item.catalogItemId ? { catalogItemId: item.catalogItemId } : {}) };
    this.items.set(clean.id, clean);
    this.stock.set(clean.id, { qty: 0, value: 0 });
    return clean;
  }

  item(id: string): StockItem {
    const item = this.items.get(id);
    if (!item) throw new InventoryError('ITEM_UNKNOWN', id);
    return item;
  }
  listItems(): readonly StockItem[] { return [...this.items.values()]; }
  listMovements(): readonly Movement[] { return this.movements; }
  recipe(catalogItemId: string): readonly RecipeLine[] { return this.recipes.get(catalogItemId) ?? []; }
  listRecipes(): ReadonlyMap<string, readonly RecipeLine[]> { return this.recipes; }

  onHand(itemId: string): { qty: number; value: number; averageCost: number } {
    this.item(itemId);
    const s = this.stock.get(itemId)!;
    return { qty: s.qty, value: s.value, averageCost: s.qty > 0 ? s.value / s.qty : 0 };
  }

  /** What a menu item uses per unit sold. Replaces the previous recipe (recipes are settings, not history). */
  setRecipe(catalogItemId: string, lines: readonly RecipeLine[]): void {
    if (typeof catalogItemId !== 'string' || !ID.test(catalogItemId)) throw new InventoryError('RECIPE_INVALID', 'catalogItemId');
    const seen = new Set<string>();
    const clean = lines.map((l) => {
      this.item(l.itemId);
      if (seen.has(l.itemId)) throw new InventoryError('RECIPE_INVALID', `duplicate ${l.itemId}`);
      seen.add(l.itemId);
      return { itemId: l.itemId, qty: wholePositive(l.qty, 'recipe qty') };
    });
    if (clean.length === 0) this.recipes.delete(catalogItemId);
    else this.recipes.set(catalogItemId, clean);
  }

  /** Goods or materials bought: quantity in, full cost in. */
  receive(input: Readonly<{ itemId: string; qty: number; totalCost: number; date: string; note?: string }>): Movement {
    this.item(input.itemId);
    return this.push({ itemId: input.itemId, type: 'receive', qty: wholePositive(input.qty, 'qty'), value: wholeNonNegative(input.totalCost, 'totalCost', 'VALUE_INVALID'), date: date(input.date), note: input.note });
  }

  /** Used, wasted or given away. Cannot take more than is on hand. */
  issue(input: Readonly<{ itemId: string; qty: number; date: string; note?: string }>): Movement {
    const qty = wholePositive(input.qty, 'qty');
    const s = this.onHand(input.itemId);
    if (qty > s.qty) throw new InventoryError('INSUFFICIENT_STOCK', `${this.item(input.itemId).name}: on hand ${s.qty}, asked ${qty}`);
    return this.push({ itemId: input.itemId, type: 'issue', qty: -qty, value: -this.valueOut(input.itemId, qty), date: date(input.date), note: input.note });
  }

  /**
   * A physical count. Records the difference as a movement so the history explains the correction.
   * Returns null when the count matches the books.
   */
  count(input: Readonly<{ itemId: string; countedQty: number; date: string; note?: string }>): Movement | null {
    const counted = wholeNonNegative(input.countedQty, 'countedQty');
    const s = this.onHand(input.itemId);
    const diff = counted - s.qty;
    if (diff === 0) return null;
    // Found stock is valued at the current average cost (zero if there is no cost basis); missing stock leaves at it.
    const value = diff > 0 ? (s.qty > 0 ? divideHalfUp(diff * s.value, s.qty) : 0) : -this.valueOut(input.itemId, -diff);
    return this.push({ itemId: input.itemId, type: 'count', qty: diff, value, date: date(input.date), note: input.note ?? 'شمارش انبار' });
  }

  /**
   * A sale of a menu item: every recipe line is issued. Sales never fail on stock (the sale happened);
   * stock may go below zero, which the negative-stock report surfaces for a count.
   * Menu items without a recipe move nothing.
   */
  sell(input: Readonly<{ catalogItemId: string; quantity: number; date: string; note?: string }>): Movement[] {
    const quantity = wholePositive(input.quantity, 'quantity');
    const when = date(input.date);
    const out: Movement[] = [];
    for (const line of this.recipe(input.catalogItemId)) {
      const qty = line.qty * quantity;
      const s = this.stock.get(line.itemId)!;
      const value = s.qty > 0 ? this.valueOut(line.itemId, Math.min(qty, s.qty)) : 0;
      out.push(this.push({ itemId: line.itemId, type: 'sale', qty: -qty, value: -value, date: when, note: input.note, catalogItemId: input.catalogItemId }));
    }
    return out;
  }

  private valueOut(itemId: string, qty: number): number {
    const s = this.stock.get(itemId)!;
    if (qty >= s.qty) return s.value;
    return divideHalfUp(s.value * qty, s.qty);
  }

  private push(m: Omit<Movement, 'id'>): Movement {
    const movement: Movement = { id: this.newId(), ...m, ...(m.note ? { note: m.note.slice(0, 120) } : {}) };
    const s = this.stock.get(movement.itemId)!;
    s.qty += movement.qty;
    s.value += movement.value;
    // Nothing (or less than nothing) on hand carries no value; this also clears rounding residue.
    if (s.qty <= 0) s.value = 0;
    this.movements.push(movement);
    return movement;
  }
}

// ---------- reports ----------

export type StockRow = StockItem & Readonly<{ qty: number; value: number; low: boolean; negative: boolean }>;

export function stockReport(inv: Inventory): StockRow[] {
  return inv.listItems().map((item) => {
    const s = inv.onHand(item.id);
    return { ...item, qty: s.qty, value: s.value, low: s.qty <= item.reorderLevel, negative: s.qty < 0 };
  });
}

export function lowStock(inv: Inventory): StockRow[] {
  return stockReport(inv).filter((r) => r.low).sort((a, b) => a.qty / Math.max(a.reorderLevel, 1) - b.qty / Math.max(b.reorderLevel, 1));
}

export function stockValue(inv: Inventory): number {
  return stockReport(inv).reduce((s, r) => s + Math.max(0, r.value), 0);
}

/** Base units used (issued + sold) per item in an inclusive date range. */
export function consumption(inv: Inventory, from: string, to: string): Map<string, number> {
  const used = new Map<string, number>();
  for (const m of inv.listMovements()) {
    if (m.date < from || m.date > to || (m.type !== 'issue' && m.type !== 'sale')) continue;
    used.set(m.itemId, (used.get(m.itemId) ?? 0) - m.qty);
  }
  return used;
}

/** Human-friendly quantity: 12500 g → «۱۲٫۵ کیلوگرم» is done by the UI; this gives value + unit label. */
export function displayQty(qty: number, unit: BaseUnit): { value: number; label: string } {
  if (unit === 'g' && Math.abs(qty) >= 1000) return { value: qty / 1000, label: 'کیلوگرم' };
  if (unit === 'ml' && Math.abs(qty) >= 1000) return { value: qty / 1000, label: 'لیتر' };
  return { value: qty, label: unit === 'g' ? 'گرم' : unit === 'ml' ? 'میلی‌لیتر' : 'عدد' };
}
