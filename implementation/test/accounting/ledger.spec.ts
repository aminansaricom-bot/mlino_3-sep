import {
  AccountingError, Ledger, SYSTEM, balanceSheet, chequeRegister, invoiceTotals, monthlySummary, partyBalances,
  postChequeBounced, postChequeCleared, postDailySales, postExpense, postOpening, postOwnerContribution,
  postOwnerWithdrawal, postPayment, postReceipt, postSaleInvoice, postTransfer, profitAndLoss, treasuryBalances,
  trialBalance, vatReport,
} from '../../accounting';

function book() {
  let n = 0;
  const ledger = new Ledger({ newId: () => `E${(n += 1)}`, now: () => new Date('2026-09-23T08:00:00Z') });
  ledger.addTreasury({ id: 'cash', name: 'صندوق کافه', kind: 'cash' });
  ledger.addTreasury({ id: 'mellat', name: 'بانک ملت', kind: 'bank' });
  ledger.addParty({ id: 'office', name: 'شرکت همسایه', role: 'customer' });
  ledger.addParty({ id: 'milk', name: 'لبنیات پگاه', role: 'supplier' });
  return ledger;
}

const code = (e: unknown) => (e instanceof AccountingError ? e.code : String(e));
function expectCode(fn: () => unknown, expected: string) {
  let caught: unknown;
  try { fn(); } catch (error) { caught = error; }
  expect(code(caught)).toBe(expected);
}

describe('invoice arithmetic', () => {
  it('adds VAT on exclusive prices after the discount', () => {
    const t = invoiceTotals({ lines: [{ name: 'لاته', quantity: 2, unitPrice: 1_200_000 }], discount: 400_000, vat: { rateBp: 1000, pricesIncludeVat: false }, payments: [] });
    expect(t).toEqual({ gross: 2_400_000, discount: 400_000, taxable: 2_000_000, vat: 200_000, total: 2_200_000, paid: 0, onCredit: 2_200_000 });
  });
  it('extracts VAT from inclusive prices', () => {
    const t = invoiceTotals({ lines: [{ name: 'کیک', quantity: 1, unitPrice: 1_100_000 }], vat: { rateBp: 1000, pricesIncludeVat: true } });
    expect(t).toMatchObject({ total: 1_100_000, vat: 100_000, taxable: 1_000_000 });
  });
  it('rejects fractional quantities, over-discounts and over-payments', () => {
    expectCode(() => invoiceTotals({ lines: [{ name: 'x', quantity: 1.5, unitPrice: 10 }], vat: { rateBp: 0, pricesIncludeVat: false } }), 'DOCUMENT_INVALID');
    expectCode(() => invoiceTotals({ lines: [{ name: 'x', quantity: 1, unitPrice: 10 }], discount: 11, vat: { rateBp: 0, pricesIncludeVat: false } }), 'DOCUMENT_INVALID');
    expectCode(() => invoiceTotals({ lines: [{ name: 'x', quantity: 1, unitPrice: 10 }], vat: { rateBp: 0, pricesIncludeVat: false }, payments: [{ treasuryId: 'cash', amount: 11 }] }), 'DOCUMENT_INVALID');
  });
});

describe('ledger invariants', () => {
  it('refuses unbalanced, one-sided, zero and mixed lines', () => {
    const l = book();
    const base = { date: '2026-09-23', description: 'x', source: { type: 'transfer' as const } };
    expectCode(() => l.commit({ draft: { ...base, lines: [{ account: SYSTEM.sales, debit: 0, credit: 5 }, { account: SYSTEM.capital, debit: 4, credit: 0 }] } }), 'ENTRY_UNBALANCED');
    expectCode(() => l.commit({ draft: { ...base, lines: [{ account: SYSTEM.sales, debit: 0, credit: 5 }] } }), 'ENTRY_EMPTY');
    expectCode(() => l.commit({ draft: { ...base, lines: [{ account: SYSTEM.sales, debit: 5, credit: 5 }, { account: SYSTEM.capital, debit: 0, credit: 0 }] } }), 'LINE_INVALID');
    expectCode(() => l.commit({ draft: { ...base, lines: [{ account: SYSTEM.sales, debit: 0, credit: 5.5 }, { account: SYSTEM.capital, debit: 5.5, credit: 0 }] } }), 'AMOUNT_INVALID');
    expect(l.listEntries()).toHaveLength(0);
  });
  it('demands exactly the right sub-ledger dimension', () => {
    const l = book();
    const base = { date: '2026-09-23', description: 'x', source: { type: 'transfer' as const } };
    expectCode(() => l.commit({ draft: { ...base, lines: [{ account: SYSTEM.cash, debit: 5, credit: 0 }, { account: SYSTEM.capital, debit: 0, credit: 5 }] } }), 'TREASURY_REQUIRED');
    expectCode(() => l.commit({ draft: { ...base, lines: [{ account: SYSTEM.cash, debit: 5, credit: 0, treasuryId: 'mellat' }, { account: SYSTEM.capital, debit: 0, credit: 5 }] } }), 'LINE_INVALID');
    expectCode(() => l.commit({ draft: { ...base, lines: [{ account: SYSTEM.receivables, debit: 5, credit: 0 }, { account: SYSTEM.capital, debit: 0, credit: 5 }] } }), 'PARTY_REQUIRED');
    expectCode(() => l.commit({ draft: { ...base, lines: [{ account: SYSTEM.sales, debit: 0, credit: 5, partyId: 'office' }, { account: SYSTEM.cash, debit: 5, credit: 0, treasuryId: 'cash' }] } }), 'DIMENSION_NOT_ALLOWED');
  });
  it('cannot be tricked into posting a reversal or moving a cheque directly', () => {
    const l = book();
    expectCode(() => l.commit({ draft: { date: '2026-09-23', description: 'x', source: { type: 'reversal' }, lines: [] } }), 'DOCUMENT_INVALID');
    postSaleInvoice(l, { id: 'INV1', date: '2026-09-23', customerId: 'office', lines: [{ name: 'قهوه', quantity: 1, unitPrice: 500_000 }], vat: { rateBp: 0, pricesIncludeVat: false }, cheque: { id: 'CH1', number: '123', dueDate: '2026-10-01', amount: 500_000 } });
    expectCode(() => l.commit({ draft: { date: '2026-09-24', description: 'x', source: { type: 'transfer' }, lines: [
      { account: SYSTEM.cash, debit: 500_000, credit: 0, treasuryId: 'cash' }, { account: SYSTEM.chequesReceived, debit: 0, credit: 500_000, chequeId: 'CH1' }] } }), 'CHEQUE_TRANSITION');
  });
  it('closed periods reject postings and the lock only moves forward', () => {
    const l = book();
    l.lockThrough('2026-09-22');
    expectCode(() => postOwnerContribution(l, { id: 'C1', date: '2026-09-22', treasuryId: 'cash', amount: 1 }), 'PERIOD_LOCKED');
    expect(() => postOwnerContribution(l, { id: 'C1', date: '2026-09-23', treasuryId: 'cash', amount: 1 })).not.toThrow();
    expectCode(() => l.lockThrough('2026-09-01'), 'PERIOD_LOCKED');
  });
});

describe('a month of a small café', () => {
  function month() {
    const l = book();
    postOpening(l, { id: 'OPEN', date: '2026-09-23', treasuries: [{ treasuryId: 'cash', amount: 20_000_000 }, { treasuryId: 'mellat', amount: 300_000_000 }], payables: [{ partyId: 'milk', amount: 15_000_000 }] });
    // day takings, VAT inclusive menu prices, cash + card
    postDailySales(l, { id: 'D1', date: '2026-09-24', amount: 55_000_000, vat: { rateBp: 1000, pricesIncludeVat: true }, payments: [{ treasuryId: 'cash', amount: 15_000_000 }, { treasuryId: 'mellat', amount: 40_000_000 }] });
    // catering invoice on credit to an office, with a discount
    postSaleInvoice(l, { id: 'INV1', date: '2026-09-25', customerId: 'office', lines: [{ name: 'لاته', quantity: 20, unitPrice: 1_200_000, catalogItemId: 'cat-latte' }, { name: 'کیک', quantity: 10, unitPrice: 900_000 }], discount: 3_000_000, vat: { rateBp: 1000, pricesIncludeVat: false } });
    // milk purchase with VAT invoice, half paid by bank, rest on account
    postExpense(l, { id: 'X1', date: '2026-09-26', account: '5101', amount: 10_000_000, inputVat: 1_000_000, supplierId: 'milk', payments: [{ treasuryId: 'mellat', amount: 5_500_000 }] });
    postExpense(l, { id: 'X2', date: '2026-09-27', account: '6102', amount: 80_000_000, payments: [{ treasuryId: 'mellat', amount: 80_000_000 }], note: 'اجاره‌ی مهر' });
    // the office pays by a post-dated cheque, which later clears
    postReceipt(l, { id: 'R1', date: '2026-09-28', partyId: 'office', cheque: { id: 'CHQ-office', number: '778899', bank: 'صادرات', dueDate: '2026-10-10', amount: 33_000_000 } });
    // we pay the milk supplier with our own cheque, which bounces (no funds that day), then pay cash
    postPayment(l, { id: 'P1', date: '2026-09-29', partyId: 'milk', cheque: { id: 'CHQ-ours', number: '000451', dueDate: '2026-10-05', amount: 19_500_000 } });
    postChequeBounced(l, { id: 'B1', chequeId: 'CHQ-ours', date: '2026-10-05' });
    postPayment(l, { id: 'P2', date: '2026-10-06', partyId: 'milk', payments: [{ treasuryId: 'cash', amount: 19_500_000 }] });
    postChequeCleared(l, { id: 'C1', chequeId: 'CHQ-office', date: '2026-10-10', bankTreasuryId: 'mellat' });
    postTransfer(l, { id: 'T1', date: '2026-10-11', fromTreasuryId: 'cash', toTreasuryId: 'mellat', amount: 10_000_000, fee: 0 });
    postOwnerWithdrawal(l, { id: 'W1', date: '2026-10-12', treasuryId: 'mellat', amount: 5_000_000 });
    return l;
  }

  it('every entry balances and the trial balance proves it', () => {
    const l = month();
    for (const e of l.listEntries()) expect(e.lines.reduce((s, x) => s + x.debit, 0)).toBe(e.lines.reduce((s, x) => s + x.credit, 0));
    expect(trialBalance(l).balanced).toBe(true);
  });

  it('profit and loss for Mehr 1405 matches hand calculation', () => {
    const l = month();
    // D1: 55,000,000 incl. 10% → VAT 5,000,000, sales 50,000,000
    // INV1: gross 33,000,000 − 3,000,000 = 30,000,000 + VAT 3,000,000 = 33,000,000; sales credited 33,000,000, discount 3,000,000
    const pnl = profitAndLoss(l, { from: '2026-09-23', to: '2026-10-22' });
    expect(pnl.sales).toBe(83_000_000);
    expect(pnl.discounts).toBe(3_000_000);
    expect(pnl.netSales).toBe(80_000_000);
    expect(pnl.totalExpenses).toBe(90_000_000);
    expect(pnl.netProfit).toBe(-10_000_000);
    expect(pnl.expenses.map((r) => r.code)).toEqual(['6102', '5101']);
  });

  it('treasury, customer and supplier balances', () => {
    const l = month();
    // cash: 20 + 15 − 19.5 − 10 = 5.5M ; bank: 300 + 40 − 5.5 − 80 + 33 + 10 − 5 = 292.5M
    expect(treasuryBalances(l).map((t) => [t.id, t.balance])).toEqual([['cash', 5_500_000], ['mellat', 292_500_000]]);
    // office: 33M invoice − 33M cheque = 0 ; milk: 15 + 5.5 (unpaid part of 11M) − 19.5 cheque + 19.5 bounced − 19.5 cash = 1.0M
    expect(partyBalances(l)).toEqual([{ id: 'milk', name: 'لبنیات پگاه', role: 'supplier', receivable: 0, payable: 1_000_000 }]);
  });

  it('VAT for the period: output minus claimable input', () => {
    expect(vatReport(month(), { from: '2026-09-23', to: '2026-10-22' })).toEqual({ output: 8_000_000, input: 1_000_000, payable: 7_000_000 });
  });

  it('balance sheet balances, drawings reduce equity', () => {
    const bs = balanceSheet(month(), '2026-10-22');
    expect(bs.balanced).toBe(true);
    expect(bs.currentEarnings).toBe(-10_000_000);
    expect(bs.equity.find((r) => r.code === SYSTEM.drawings)?.balance).toBe(-5_000_000);
  });

  it('cheque register tracks the lifecycle and due dates', () => {
    const l = month();
    const rows = chequeRegister(l, '2026-10-20');
    expect(rows.map((r) => [r.id, r.status])).toEqual([['CHQ-ours', 'bounced'], ['CHQ-office', 'cleared']]);
    expectCode(() => postChequeCleared(l, { id: 'again', chequeId: 'CHQ-office', date: '2026-10-21', bankTreasuryId: 'mellat' }), 'CHEQUE_TRANSITION');
  });

  it('monthly summary splits by Jalali month', () => {
    const rows = monthlySummary(month(), 1405);
    expect(rows[6]).toMatchObject({ name: 'مهر', sales: 80_000_000, expenses: 90_000_000, profit: -10_000_000 });
    expect(rows[5]).toMatchObject({ name: 'شهریور', sales: 0 });
  });
});

describe('corrections are reversals, never edits', () => {
  it('reverses an invoice once, keeps the history, and cancels its effect', () => {
    const l = book();
    const inv = postSaleInvoice(l, { id: 'INV9', date: '2026-09-23', lines: [{ name: 'اسپرسو', quantity: 3, unitPrice: 700_000 }], vat: { rateBp: 1000, pricesIncludeVat: false }, payments: [{ treasuryId: 'cash', amount: 2_310_000 }] });
    const rev = l.reverse(inv.id, '2026-09-23', 'ثبت اشتباه');
    expect(rev.reversalOf).toBe(inv.id);
    expect(l.listEntries()).toHaveLength(2);
    expect(profitAndLoss(l, {}).netSales).toBe(0);
    expect(treasuryBalances(l)[0].balance).toBe(0);
    expectCode(() => l.reverse(inv.id, '2026-09-24', 'دوباره'), 'ENTRY_ALREADY_REVERSED');
    expectCode(() => l.reverse(rev.id, '2026-09-24', 'برگشتِ برگشت'), 'ENTRY_ALREADY_REVERSED');
  });

  it('cheques follow reversals: settlement reopens, opening voids, and order is enforced', () => {
    const l = book();
    const r = postReceipt(l, { id: 'R', date: '2026-09-23', partyId: 'office', cheque: { id: 'Q', number: '1', dueDate: '2026-09-30', amount: 1_000_000 } });
    const c = postChequeCleared(l, { id: 'C', chequeId: 'Q', date: '2026-09-30', bankTreasuryId: 'mellat' });
    expectCode(() => l.reverse(r.id, '2026-10-01', 'x'), 'CHEQUE_TRANSITION');
    l.reverse(c.id, '2026-10-01', 'وصول اشتباه ثبت شد');
    expect(l.cheque('Q').status).toBe('open');
    l.reverse(r.id, '2026-10-01', 'چک پس داده شد');
    expect(l.cheque('Q').status).toBe('void');
    expect(trialBalance(l).balanced).toBe(true);
  });

  it('a cheque cannot clear into a cash box', () => {
    const l = book();
    postReceipt(l, { id: 'R', date: '2026-09-23', partyId: 'office', cheque: { id: 'Q', number: '1', dueDate: '2026-09-30', amount: 1_000_000 } });
    expectCode(() => postChequeCleared(l, { id: 'C', chequeId: 'Q', date: '2026-09-30', bankTreasuryId: 'cash' }), 'DOCUMENT_INVALID');
  });

  it('credit sales need a customer; expenses need an expense category', () => {
    const l = book();
    expectCode(() => postSaleInvoice(l, { id: 'I', date: '2026-09-23', lines: [{ name: 'x', quantity: 1, unitPrice: 5 }], vat: { rateBp: 0, pricesIncludeVat: false } }), 'DOCUMENT_INVALID');
    expectCode(() => postExpense(l, { id: 'X', date: '2026-09-23', account: SYSTEM.sales, amount: 5, payments: [{ treasuryId: 'cash', amount: 5 }] }), 'DOCUMENT_INVALID');
  });
});
