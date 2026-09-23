// Reports read only posted entries. Periods are inclusive ISO date ranges (see jalali.ts for Persian
// months and seasons). Balances are signed by each account's normal side, so a healthy cash box is positive.

import { SYSTEM, normalSign, type AccountDef } from './chart';
import { AccountingError } from './errors';
import { assertIsoDate, jalaliMonthRange, JALALI_MONTHS } from './jalali';
import type { Ledger } from './ledger';
import type { Rial } from './money';
import type { Cheque, JournalLine } from './types';

export type Period = Readonly<{ from?: string; to?: string }>;

function checkPeriod(period: Period): void {
  if (period.from) assertIsoDate(period.from, 'from');
  if (period.to) assertIsoDate(period.to, 'to');
  if (period.from && period.to && period.from > period.to) throw new AccountingError('DATE_INVALID', 'from is after to');
}

function* linesIn(ledger: Ledger, period: Period): Generator<JournalLine> {
  checkPeriod(period);
  for (const entry of ledger.listEntries()) {
    if (period.from && entry.date < period.from) continue;
    if (period.to && entry.date > period.to) continue;
    yield* entry.lines;
  }
}

export type AccountRow = Readonly<{ code: string; name: string; kind: AccountDef['kind']; debit: Rial; credit: Rial; balance: Rial }>;

function accountRows(ledger: Ledger, period: Period): Map<string, { debit: number; credit: number }> {
  const totals = new Map<string, { debit: number; credit: number }>();
  for (const line of linesIn(ledger, period)) {
    const row = totals.get(line.account) ?? { debit: 0, credit: 0 };
    row.debit += line.debit;
    row.credit += line.credit;
    totals.set(line.account, row);
  }
  return totals;
}

function toRow(ledger: Ledger, code: string, t: { debit: number; credit: number }): AccountRow {
  const account = ledger.account(code);
  return { code, name: account.name, kind: account.kind, debit: t.debit, credit: t.credit, balance: normalSign(account) * (t.debit - t.credit) + 0 }; // + 0 turns -0 into 0
}

/** Trial balance through a date: every account with movement, and proof that debits equal credits. */
export function trialBalance(ledger: Ledger, to?: string) {
  const rows = [...accountRows(ledger, { to }).entries()].map(([code, t]) => toRow(ledger, code, t)).sort((a, b) => a.code.localeCompare(b.code));
  const debit = rows.reduce((s, r) => s + r.debit, 0);
  const credit = rows.reduce((s, r) => s + r.credit, 0);
  return { rows, debit, credit, balanced: debit === credit };
}

export type ProfitAndLoss = Readonly<{
  sales: Rial; discounts: Rial; netSales: Rial; otherIncome: Rial;
  expenses: readonly AccountRow[]; totalExpenses: Rial; netProfit: Rial;
}>;

export function profitAndLoss(ledger: Ledger, period: Period): ProfitAndLoss {
  const totals = accountRows(ledger, period);
  const balance = (code: string) => { const t = totals.get(code); return t ? toRow(ledger, code, t).balance : 0; };
  const sales = balance(SYSTEM.sales);
  const discounts = balance(SYSTEM.salesDiscounts);
  const otherIncome = [...totals.keys()].filter((code) => { const a = ledger.account(code); return a.kind === 'revenue' && code !== SYSTEM.sales && code !== SYSTEM.salesDiscounts; })
    .reduce((s, code) => s + balance(code), 0);
  const expenses = [...totals.entries()].filter(([code]) => ledger.account(code).kind === 'expense')
    .map(([code, t]) => toRow(ledger, code, t)).filter((r) => r.balance !== 0).sort((a, b) => b.balance - a.balance);
  const totalExpenses = expenses.reduce((s, r) => s + r.balance, 0);
  const netSales = sales - discounts;
  return { sales, discounts, netSales, otherIncome, expenses, totalExpenses, netProfit: netSales + otherIncome - totalExpenses };
}

/** Balance sheet at a date. Profit not yet closed into equity is shown as current earnings. */
export function balanceSheet(ledger: Ledger, asOf: string) {
  const rows = [...accountRows(ledger, { to: asOf }).entries()].map(([code, t]) => toRow(ledger, code, t));
  const pick = (kind: AccountDef['kind']) => rows.filter((r) => r.kind === kind && r.balance !== 0).sort((a, b) => a.code.localeCompare(b.code));
  const assets = pick('asset');
  const liabilities = pick('liability');
  const equity = rows.filter((r) => r.kind === 'equity' && r.balance !== 0).map((r) => (ledger.account(r.code).contra ? { ...r, balance: -r.balance } : r));
  const currentEarnings = profitAndLoss(ledger, { to: asOf }).netProfit;
  const totalAssets = assets.reduce((s, r) => s + r.balance, 0);
  const totalLiabilities = liabilities.reduce((s, r) => s + r.balance, 0);
  const totalEquity = equity.reduce((s, r) => s + r.balance, 0) + currentEarnings;
  return { assets, liabilities, equity, currentEarnings, totalAssets, totalLiabilities, totalEquity, balanced: totalAssets === totalLiabilities + totalEquity };
}

/** Cash boxes and bank accounts with their balances. */
export function treasuryBalances(ledger: Ledger, asOf?: string) {
  const balances = new Map<string, number>();
  for (const line of linesIn(ledger, { to: asOf })) {
    if (line.treasuryId) balances.set(line.treasuryId, (balances.get(line.treasuryId) ?? 0) + line.debit - line.credit);
  }
  return ledger.listTreasuries().map((t) => ({ ...t, balance: balances.get(t.id) ?? 0 }));
}

/** What each customer owes us (receivable) and what we owe each supplier (payable). */
export function partyBalances(ledger: Ledger, asOf?: string) {
  const receivable = new Map<string, number>();
  const payable = new Map<string, number>();
  for (const line of linesIn(ledger, { to: asOf })) {
    if (!line.partyId) continue;
    if (line.account === SYSTEM.receivables) receivable.set(line.partyId, (receivable.get(line.partyId) ?? 0) + line.debit - line.credit);
    if (line.account === SYSTEM.payables) payable.set(line.partyId, (payable.get(line.partyId) ?? 0) + line.credit - line.debit);
  }
  return ledger.listParties().map((p) => ({ ...p, receivable: receivable.get(p.id) ?? 0, payable: payable.get(p.id) ?? 0 }))
    .filter((p) => p.receivable !== 0 || p.payable !== 0);
}

export type ChequeRow = Cheque & Readonly<{ partyName: string; overdue: boolean; daysToDue: number }>;

/** Cheques by due date. `today` decides what is overdue; open cheques come first. */
export function chequeRegister(ledger: Ledger, today: string, filter: Readonly<{ direction?: Cheque['direction']; status?: Cheque['status'] }> = {}): ChequeRow[] {
  assertIsoDate(today, 'today');
  const dayMs = 86_400_000;
  return ledger.listCheques()
    .filter((c) => (!filter.direction || c.direction === filter.direction) && (!filter.status || c.status === filter.status))
    .map((c) => {
      const daysToDue = Math.round((Date.parse(`${c.dueDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / dayMs);
      return { ...c, partyName: ledger.party(c.partyId).name, overdue: c.status === 'open' && daysToDue < 0, daysToDue };
    })
    .sort((a, b) => Number(b.status === 'open') - Number(a.status === 'open') || a.dueDate.localeCompare(b.dueDate) || a.id.localeCompare(b.id));
}

/** VAT for a period (usually a Jalali season): output on sales minus input on purchases. */
export function vatReport(ledger: Ledger, period: Period) {
  const totals = accountRows(ledger, period);
  const output = (() => { const t = totals.get(SYSTEM.outputVat); return t ? t.credit - t.debit : 0; })();
  const input = (() => { const t = totals.get(SYSTEM.inputVat); return t ? t.debit - t.credit : 0; })();
  return { output, input, payable: output - input };
}

/** Month-by-month sales, expenses and profit for a Jalali year. */
export function monthlySummary(ledger: Ledger, jy: number) {
  return JALALI_MONTHS.map((name, index) => {
    const range = jalaliMonthRange(jy, index + 1);
    const pnl = profitAndLoss(ledger, range);
    return { month: index + 1, name, from: range.from, to: range.to, sales: pnl.netSales + pnl.otherIncome, expenses: pnl.totalExpenses, profit: pnl.netProfit };
  });
}
