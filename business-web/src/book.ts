// The demo book is an append-only list of operations replayed into a fresh ledger on every load.
// Entry ids are assigned by the ledger in order (E1, E2, ...), so replay is deterministic and a
// reversal can safely refer to an entry id. In the demo the list lives only in this browser;
// the real product will store the same operations server-side per organization (step A2).

import {
  DEFAULT_VAT_RATE_BP, Ledger, postChequeBounced, postChequeCleared, postDailySales, postExpense, postOpening,
  postOtherIncome, postOwnerContribution, postOwnerWithdrawal, postPayment, postReceipt, postSaleInvoice, postTransfer,
  type DailySalesInput, type ExpenseInput, type OpeningInput, type Party, type SaleInvoiceInput, type SettlementInput, type Treasury,
} from './engine';

export type Settings = Readonly<{ businessName: string; vatRateBp: number; pricesIncludeVat: boolean }>;

type Simple = Readonly<{ id: string; date: string; treasuryId: string; amount: number; note?: string }>;
export type Op =
  | Readonly<{ k: 'party'; input: Party }>
  | Readonly<{ k: 'treasury'; input: Treasury }>
  | Readonly<{ k: 'opening'; input: OpeningInput }>
  | Readonly<{ k: 'daily'; input: DailySalesInput }>
  | Readonly<{ k: 'invoice'; input: SaleInvoiceInput }>
  | Readonly<{ k: 'expense'; input: ExpenseInput }>
  | Readonly<{ k: 'receipt'; input: SettlementInput }>
  | Readonly<{ k: 'payment'; input: SettlementInput }>
  | Readonly<{ k: 'cleared'; input: { id: string; chequeId: string; date: string; bankTreasuryId: string } }>
  | Readonly<{ k: 'bounced'; input: { id: string; chequeId: string; date: string } }>
  | Readonly<{ k: 'transfer'; input: { id: string; date: string; fromTreasuryId: string; toTreasuryId: string; amount: number; fee?: number; note?: string } }>
  | Readonly<{ k: 'contribution'; input: Simple }>
  | Readonly<{ k: 'withdrawal'; input: Simple }>
  | Readonly<{ k: 'income'; input: Simple & { note: string } }>
  | Readonly<{ k: 'reverse'; entryId: string; date: string; reason: string }>;

export type BookData = Readonly<{ version: 1; settings: Settings; ops: readonly Op[] }>;

export const DEFAULT_SETTINGS: Settings = { businessName: 'کافه‌ی نمونه', vatRateBp: DEFAULT_VAT_RATE_BP, pricesIncludeVat: true };

export function newLedger(): Ledger {
  let n = 0;
  return new Ledger({ newId: () => `E${(n += 1)}` });
}

export function runOp(ledger: Ledger, op: Op): void {
  switch (op.k) {
    case 'party': ledger.addParty(op.input); return;
    case 'treasury': ledger.addTreasury(op.input); return;
    case 'opening': postOpening(ledger, op.input); return;
    case 'daily': postDailySales(ledger, op.input); return;
    case 'invoice': postSaleInvoice(ledger, op.input); return;
    case 'expense': postExpense(ledger, op.input); return;
    case 'receipt': postReceipt(ledger, op.input); return;
    case 'payment': postPayment(ledger, op.input); return;
    case 'cleared': postChequeCleared(ledger, op.input); return;
    case 'bounced': postChequeBounced(ledger, op.input); return;
    case 'transfer': postTransfer(ledger, op.input); return;
    case 'contribution': postOwnerContribution(ledger, op.input); return;
    case 'withdrawal': postOwnerWithdrawal(ledger, op.input); return;
    case 'income': postOtherIncome(ledger, op.input); return;
    case 'reverse': ledger.reverse(op.entryId, op.date, op.reason); return;
  }
}

export function replay(data: BookData): Ledger {
  const ledger = newLedger();
  for (const op of data.ops) runOp(ledger, op);
  return ledger;
}

const KEY = 'mlino.accounting.demo.v1';

export function loadBook(): BookData | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as BookData;
    if (data?.version !== 1 || !Array.isArray(data.ops) || !data.settings) return null;
    return data;
  } catch {
    return null;
  }
}

export function saveBook(data: BookData): void {
  try { window.localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* storage full or blocked: the session keeps working */ }
}

export function clearBook(): void {
  try { window.localStorage.removeItem(KEY); } catch { /* ignore */ }
}

let seq = 0;
/** Short unique document id for new operations (letters, digits, dash only). */
export function docId(prefix: string): string {
  seq += 1;
  return `${prefix}-${Date.now().toString(36)}${seq.toString(36)}`.slice(0, 64);
}
