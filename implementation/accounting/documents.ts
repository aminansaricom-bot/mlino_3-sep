// Posting rules: each business document an owner records becomes exactly one balanced journal entry.
// The owner never sees debits and credits; these functions are the only place that knows them.

import { SYSTEM } from './chart';
import { AccountingError } from './errors';
import type { ChequeOpen, Ledger, Posting } from './ledger';
import { assertRateBp, assertRial, sum, vatInGross, vatOnNet, type Rial } from './money';
import type { JournalEntry, JournalLine } from './types';

export type TreasuryAmount = Readonly<{ treasuryId: string; amount: Rial }>;
export type ChequeInput = Readonly<{ id: string; number: string; bank?: string; dueDate: string; amount: Rial }>;
export type VatMode = Readonly<{ rateBp: number; pricesIncludeVat: boolean }>;

export type InvoiceLine = Readonly<{
  name: string;
  quantity: number;
  unitPrice: Rial;
  /** Optional link to the Core catalog item the line was sold from; name and price are snapshotted. */
  catalogItemId?: string;
}>;

export type SaleInvoiceInput = Readonly<{
  id: string;
  date: string;
  customerId?: string;
  lines: readonly InvoiceLine[];
  discount?: Rial;
  vat: VatMode;
  payments?: readonly TreasuryAmount[];
  cheque?: ChequeInput;
  note?: string;
}>;

export type InvoiceTotals = Readonly<{ gross: Rial; discount: Rial; taxable: Rial; vat: Rial; total: Rial; paid: Rial; onCredit: Rial }>;

const debit = (account: string, amount: Rial, extra: Partial<JournalLine> = {}): JournalLine => ({ account, debit: amount, credit: 0, ...extra });
const credit = (account: string, amount: Rial, extra: Partial<JournalLine> = {}): JournalLine => ({ account, debit: 0, credit: amount, ...extra });

function invalid(message: string): never {
  throw new AccountingError('DOCUMENT_INVALID', message);
}

function treasuryLines(ledger: Ledger, payments: readonly TreasuryAmount[] | undefined, side: 'debit' | 'credit'): { lines: JournalLine[]; total: Rial } {
  const lines = (payments ?? []).map((p) => {
    const amount = assertRial(p.amount, 'payment.amount');
    const account = ledger.treasuryAccount(p.treasuryId);
    return side === 'debit' ? debit(account, amount, { treasuryId: p.treasuryId }) : credit(account, amount, { treasuryId: p.treasuryId });
  });
  return { lines, total: sum(lines.map((l) => l.debit + l.credit)) };
}

function chequeOpen(input: ChequeInput | undefined, direction: 'received' | 'issued', partyId: string | undefined): ChequeOpen | undefined {
  if (!input) return undefined;
  if (!partyId) invalid(direction === 'received' ? 'a received cheque needs the customer' : 'an issued cheque needs the supplier');
  return { id: input.id, direction, number: input.number, bank: input.bank, dueDate: input.dueDate, amount: assertRial(input.amount, 'cheque.amount'), partyId };
}

/** Pure arithmetic of an invoice, shared by the posting rule and the UI preview. */
export function invoiceTotals(input: Pick<SaleInvoiceInput, 'lines' | 'discount' | 'vat' | 'payments' | 'cheque'>): InvoiceTotals {
  if (!input.lines.length) invalid('an invoice needs at least one line');
  const rate = assertRateBp(input.vat.rateBp);
  const gross = sum(input.lines.map((line) => {
    if (typeof line.name !== 'string' || !line.name.trim() || line.name.length > 120) invalid('line name');
    if (!Number.isSafeInteger(line.quantity) || line.quantity <= 0 || line.quantity > 100_000) invalid('line quantity must be a whole number 1..100000');
    const lineTotal = line.quantity * assertRial(line.unitPrice, 'unitPrice');
    if (!Number.isSafeInteger(lineTotal)) invalid('line total too large');
    return lineTotal;
  }));
  const discount = assertRial(input.discount ?? 0, 'discount', { allowZero: true });
  if (discount > gross) invalid('discount exceeds the invoice');
  const afterDiscount = gross - discount;
  // Exclusive prices: VAT is added on the discounted amount. Inclusive prices: VAT is contained in it.
  const vat = input.vat.pricesIncludeVat ? vatInGross(afterDiscount, rate) : vatOnNet(afterDiscount, rate);
  const total = input.vat.pricesIncludeVat ? afterDiscount : afterDiscount + vat;
  const taxable = total - vat;
  const paid = sum([...(input.payments ?? []).map((p) => assertRial(p.amount, 'payment.amount')), input.cheque ? assertRial(input.cheque.amount, 'cheque.amount') : 0]);
  if (paid > total) invalid('payments exceed the invoice total');
  return { gross, discount, taxable, vat, total, paid, onCredit: total - paid };
}

/**
 * Sale invoice. Dr cash/bank (paid), Dr cheques received (cheque), Dr receivables (rest, needs a customer),
 * Dr sales discounts; Cr sales (taxable + discount), Cr output VAT.
 */
export function postSaleInvoice(ledger: Ledger, input: SaleInvoiceInput): JournalEntry {
  const totals = invoiceTotals(input);
  if (totals.total === 0) invalid('invoice total is zero');
  if (input.customerId) ledger.party(input.customerId);
  if (totals.onCredit > 0 && !input.customerId) invalid('an unpaid remainder needs a customer');
  const cheque = chequeOpen(input.cheque, 'received', input.customerId);
  const lines: JournalLine[] = [...treasuryLines(ledger, input.payments, 'debit').lines];
  if (cheque) lines.push(debit(SYSTEM.chequesReceived, cheque.amount, { chequeId: cheque.id }));
  if (totals.onCredit > 0) lines.push(debit(SYSTEM.receivables, totals.onCredit, { partyId: input.customerId }));
  if (totals.discount > 0) lines.push(debit(SYSTEM.salesDiscounts, totals.discount));
  lines.push(credit(SYSTEM.sales, totals.taxable + totals.discount));
  if (totals.vat > 0) lines.push(credit(SYSTEM.outputVat, totals.vat));
  const posting: Posting = {
    draft: { date: input.date, description: input.note?.trim() || `فاکتور فروش ${input.id}`, source: { type: 'sale_invoice', documentId: input.id }, lines },
    ...(cheque ? { openCheque: cheque } : {}),
  };
  return ledger.commit(posting);
}

export type DailySalesInput = Readonly<{ id: string; date: string; amount: Rial; vat: VatMode; payments: readonly TreasuryAmount[]; note?: string }>;

/** One line for a whole day's takings (the simplest way for a café to start). Payments must add up exactly. */
export function postDailySales(ledger: Ledger, input: DailySalesInput): JournalEntry {
  const totals = invoiceTotals({ lines: [{ name: 'فروش روزانه', quantity: 1, unitPrice: input.amount }], vat: input.vat, payments: input.payments });
  if (totals.onCredit !== 0) invalid('daily sales payments must equal the day total');
  const lines = [...treasuryLines(ledger, input.payments, 'debit').lines, credit(SYSTEM.sales, totals.taxable)];
  if (totals.vat > 0) lines.push(credit(SYSTEM.outputVat, totals.vat));
  return ledger.commit({ draft: { date: input.date, description: input.note?.trim() || 'فروش روزانه', source: { type: 'daily_sales', documentId: input.id }, lines } });
}

export type ExpenseInput = Readonly<{
  id: string;
  date: string;
  /** An expense (or purchase) category from the chart. */
  account: string;
  amount: Rial;
  /** VAT shown on a valid supplier invoice; claimable against output VAT. */
  inputVat?: Rial;
  supplierId?: string;
  payments?: readonly TreasuryAmount[];
  cheque?: ChequeInput;
  note?: string;
}>;

/** Expense or purchase. Dr expense, Dr input VAT; Cr cash/bank, Cr cheques issued, Cr payables (rest). */
export function postExpense(ledger: Ledger, input: ExpenseInput): JournalEntry {
  const account = ledger.account(input.account);
  if (account.kind !== 'expense' || !account.userSelectable) invalid(`${input.account} is not an expense category`);
  const amount = assertRial(input.amount, 'amount');
  const inputVat = assertRial(input.inputVat ?? 0, 'inputVat', { allowZero: true });
  const total = amount + inputVat;
  if (input.supplierId) ledger.party(input.supplierId);
  const paid = treasuryLines(ledger, input.payments, 'credit');
  const cheque = chequeOpen(input.cheque, 'issued', input.supplierId);
  const settled = paid.total + (cheque?.amount ?? 0);
  if (settled > total) invalid('payments exceed the expense');
  const rest = total - settled;
  if (rest > 0 && !input.supplierId) invalid('an unpaid remainder needs a supplier');
  const lines: JournalLine[] = [debit(account.code, amount)];
  if (inputVat > 0) lines.push(debit(SYSTEM.inputVat, inputVat));
  lines.push(...paid.lines);
  if (cheque) lines.push(credit(SYSTEM.chequesIssued, cheque.amount, { chequeId: cheque.id }));
  if (rest > 0) lines.push(credit(SYSTEM.payables, rest, { partyId: input.supplierId }));
  return ledger.commit({
    draft: { date: input.date, description: input.note?.trim() || account.name, source: { type: 'expense', documentId: input.id }, lines },
    ...(cheque ? { openCheque: cheque } : {}),
  });
}

export type SettlementInput = Readonly<{ id: string; date: string; partyId: string; payments?: readonly TreasuryAmount[]; cheque?: ChequeInput; note?: string }>;

/** Money received from a customer against what they owe. Dr cash/bank/cheques received; Cr receivables. */
export function postReceipt(ledger: Ledger, input: SettlementInput): JournalEntry {
  ledger.party(input.partyId);
  const paid = treasuryLines(ledger, input.payments, 'debit');
  const cheque = chequeOpen(input.cheque, 'received', input.partyId);
  const total = paid.total + (cheque?.amount ?? 0);
  if (total === 0) invalid('a receipt needs an amount');
  const lines = [...paid.lines];
  if (cheque) lines.push(debit(SYSTEM.chequesReceived, cheque.amount, { chequeId: cheque.id }));
  lines.push(credit(SYSTEM.receivables, total, { partyId: input.partyId }));
  return ledger.commit({
    draft: { date: input.date, description: input.note?.trim() || `دریافت از ${ledger.party(input.partyId).name}`, source: { type: 'receipt', documentId: input.id }, lines },
    ...(cheque ? { openCheque: cheque } : {}),
  });
}

/** Money paid to a supplier against what we owe. Dr payables; Cr cash/bank/cheques issued. */
export function postPayment(ledger: Ledger, input: SettlementInput): JournalEntry {
  ledger.party(input.partyId);
  const paid = treasuryLines(ledger, input.payments, 'credit');
  const cheque = chequeOpen(input.cheque, 'issued', input.partyId);
  const total = paid.total + (cheque?.amount ?? 0);
  if (total === 0) invalid('a payment needs an amount');
  const lines: JournalLine[] = [debit(SYSTEM.payables, total, { partyId: input.partyId }), ...paid.lines];
  if (cheque) lines.push(credit(SYSTEM.chequesIssued, cheque.amount, { chequeId: cheque.id }));
  return ledger.commit({
    draft: { date: input.date, description: input.note?.trim() || `پرداخت به ${ledger.party(input.partyId).name}`, source: { type: 'payment', documentId: input.id }, lines },
    ...(cheque ? { openCheque: cheque } : {}),
  });
}

/**
 * Cheque cleared. Received: Dr bank, Cr cheques received. Issued: Dr cheques issued, Cr bank.
 * The bank account must be a bank, not a cash box.
 */
export function postChequeCleared(ledger: Ledger, input: Readonly<{ id: string; chequeId: string; date: string; bankTreasuryId: string }>): JournalEntry {
  const cheque = ledger.cheque(input.chequeId);
  if (ledger.treasury(input.bankTreasuryId).kind !== 'bank') invalid('a cheque clears into a bank account');
  const bankLine = { treasuryId: input.bankTreasuryId };
  const lines = cheque.direction === 'received'
    ? [debit(SYSTEM.bank, cheque.amount, bankLine), credit(SYSTEM.chequesReceived, cheque.amount, { chequeId: cheque.id })]
    : [debit(SYSTEM.chequesIssued, cheque.amount, { chequeId: cheque.id }), credit(SYSTEM.bank, cheque.amount, bankLine)];
  return ledger.commit({
    draft: { date: input.date, description: `وصول چک ${cheque.number}`, source: { type: 'cheque_cleared', documentId: input.id }, lines },
    settleCheque: { chequeId: cheque.id, status: 'cleared' },
  });
}

/** Cheque bounced: the debt goes back to the party. Received: Dr receivables, Cr cheques received. Issued: Dr cheques issued, Cr payables. */
export function postChequeBounced(ledger: Ledger, input: Readonly<{ id: string; chequeId: string; date: string }>): JournalEntry {
  const cheque = ledger.cheque(input.chequeId);
  const lines = cheque.direction === 'received'
    ? [debit(SYSTEM.receivables, cheque.amount, { partyId: cheque.partyId }), credit(SYSTEM.chequesReceived, cheque.amount, { chequeId: cheque.id })]
    : [debit(SYSTEM.chequesIssued, cheque.amount, { chequeId: cheque.id }), credit(SYSTEM.payables, cheque.amount, { partyId: cheque.partyId })];
  return ledger.commit({
    draft: { date: input.date, description: `برگشت چک ${cheque.number}`, source: { type: 'cheque_bounced', documentId: input.id }, lines },
    settleCheque: { chequeId: cheque.id, status: 'bounced' },
  });
}

/** Moving money between cash boxes and bank accounts, with an optional bank fee. */
export function postTransfer(ledger: Ledger, input: Readonly<{ id: string; date: string; fromTreasuryId: string; toTreasuryId: string; amount: Rial; fee?: Rial; note?: string }>): JournalEntry {
  if (input.fromTreasuryId === input.toTreasuryId) invalid('transfer needs two different accounts');
  const amount = assertRial(input.amount, 'amount');
  const fee = assertRial(input.fee ?? 0, 'fee', { allowZero: true });
  const lines: JournalLine[] = [
    debit(ledger.treasuryAccount(input.toTreasuryId), amount, { treasuryId: input.toTreasuryId }),
    credit(ledger.treasuryAccount(input.fromTreasuryId), amount + fee, { treasuryId: input.fromTreasuryId }),
  ];
  if (fee > 0) lines.push(debit(SYSTEM.bankFees, fee));
  return ledger.commit({ draft: { date: input.date, description: input.note?.trim() || 'انتقال وجه', source: { type: 'transfer', documentId: input.id }, lines } });
}

export function postOwnerContribution(ledger: Ledger, input: Readonly<{ id: string; date: string; treasuryId: string; amount: Rial; note?: string }>): JournalEntry {
  const amount = assertRial(input.amount, 'amount');
  return ledger.commit({ draft: { date: input.date, description: input.note?.trim() || 'آورده‌ی مالک', source: { type: 'owner_contribution', documentId: input.id },
    lines: [debit(ledger.treasuryAccount(input.treasuryId), amount, { treasuryId: input.treasuryId }), credit(SYSTEM.capital, amount)] } });
}

export function postOwnerWithdrawal(ledger: Ledger, input: Readonly<{ id: string; date: string; treasuryId: string; amount: Rial; note?: string }>): JournalEntry {
  const amount = assertRial(input.amount, 'amount');
  return ledger.commit({ draft: { date: input.date, description: input.note?.trim() || 'برداشت مالک', source: { type: 'owner_withdrawal', documentId: input.id },
    lines: [debit(SYSTEM.drawings, amount), credit(ledger.treasuryAccount(input.treasuryId), amount, { treasuryId: input.treasuryId })] } });
}

export function postOtherIncome(ledger: Ledger, input: Readonly<{ id: string; date: string; treasuryId: string; amount: Rial; note: string }>): JournalEntry {
  const amount = assertRial(input.amount, 'amount');
  return ledger.commit({ draft: { date: input.date, description: input.note, source: { type: 'other_income', documentId: input.id },
    lines: [debit(ledger.treasuryAccount(input.treasuryId), amount, { treasuryId: input.treasuryId }), credit(SYSTEM.otherIncome, amount)] } });
}

export type OpeningInput = Readonly<{
  id: string;
  date: string;
  treasuries?: readonly TreasuryAmount[];
  receivables?: readonly Readonly<{ partyId: string; amount: Rial }>[];
  payables?: readonly Readonly<{ partyId: string; amount: Rial }>[];
}>;

/** Starting balances when a business begins using MLINO; the difference lands on opening equity. */
export function postOpening(ledger: Ledger, input: OpeningInput): JournalEntry {
  const lines: JournalLine[] = [...treasuryLines(ledger, input.treasuries, 'debit').lines];
  for (const r of input.receivables ?? []) lines.push(debit(SYSTEM.receivables, assertRial(r.amount, 'receivable'), { partyId: r.partyId }));
  for (const p of input.payables ?? []) lines.push(credit(SYSTEM.payables, assertRial(p.amount, 'payable'), { partyId: p.partyId }));
  const net = sum(lines.map((l) => l.debit)) - sum(lines.map((l) => l.credit));
  if (net > 0) lines.push(credit(SYSTEM.openingEquity, net));
  if (net < 0) lines.push(debit(SYSTEM.openingEquity, -net));
  return ledger.commit({ draft: { date: input.date, description: 'مانده‌های افتتاحیه', source: { type: 'opening', documentId: input.id }, lines } });
}
