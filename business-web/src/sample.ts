// Sample book for the demo: about three Jalali months of a small café up to today, generated
// deterministically (fixed seed) and posted through the real engine, so every number is consistent.
// All names are fictional.

import { fromJalali, jalaliMonthLength, partyBalances, toJalali, treasuryBalances, type InvoiceLine } from './engine';
import { DEFAULT_SETTINGS, newLedger, runOp, type BookData, type Op } from './book';
import { addDays } from './format';

export type MenuItem = Readonly<{ id: string; name: string; price: number }>;

/** Menu used by the invoice form (prices include VAT, in Rials). */
export const DEMO_MENU: readonly MenuItem[] = [
  { id: 'demo-espresso', name: 'اسپرسو', price: 850_000 },
  { id: 'demo-latte', name: 'لاته', price: 1_200_000 },
  { id: 'demo-cappuccino', name: 'کاپوچینو', price: 1_150_000 },
  { id: 'demo-iced-coffee', name: 'آیس‌کافی', price: 1_450_000 },
  { id: 'demo-mojito', name: 'موهیتو', price: 1_450_000 },
  { id: 'demo-masala', name: 'چای ماسالا', price: 950_000 },
  { id: 'demo-cheesecake', name: 'چیزکیک', price: 1_650_000 },
  { id: 'demo-chocolate-cake', name: 'کیک شکلاتی', price: 1_300_000 },
  { id: 'demo-croissant', name: 'کروسان', price: 750_000 },
];

const item = (id: string, quantity: number): InvoiceLine => {
  const m = DEMO_MENU.find((x) => x.id === id)!;
  return { name: m.name, quantity, unitPrice: m.price, catalogItemId: m.id };
};

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateSample(today: string): BookData {
  const rnd = mulberry32(1405);
  const round = (x: number, step = 100_000) => Math.max(step, Math.round(x / step) * step);
  const ledger = newLedger();
  const ops: Op[] = [];
  const push = (op: Op) => { runOp(ledger, op); ops.push(op); };
  let n = 0;
  const id = (p: string) => `${p}-${(n += 1)}`;
  const vat = { rateBp: DEFAULT_SETTINGS.vatRateBp, pricesIncludeVat: true };

  const t = toJalali(today);
  let sy = t.jy;
  let sm = t.jm - 3;
  if (sm < 1) { sm += 12; sy -= 1; }
  const start = fromJalali(sy, sm, 1);

  push({ k: 'treasury', input: { id: 'cash', name: 'صندوق کافه', kind: 'cash' } });
  push({ k: 'treasury', input: { id: 'mellat', name: 'بانک ملت (کارت‌خوان)', kind: 'bank' } });
  push({ k: 'treasury', input: { id: 'saman', name: 'بانک سامان (جاری)', kind: 'bank' } });
  push({ k: 'party', input: { id: 'office', name: 'شرکت نوآوران پارس', role: 'customer' } });
  push({ k: 'party', input: { id: 'event', name: 'خانم احمدی (مراسم)', role: 'customer' } });
  push({ k: 'party', input: { id: 'milk', name: 'لبنیات پگاه', role: 'supplier' } });
  push({ k: 'party', input: { id: 'bakery', name: 'نانوایی سحر', role: 'supplier' } });
  push({ k: 'party', input: { id: 'beans', name: 'رُست‌کار قهوه', role: 'supplier' } });
  push({ k: 'opening', input: { id: 'opening', date: start, treasuries: [{ treasuryId: 'cash', amount: 30_000_000 }, { treasuryId: 'mellat', amount: 300_000_000 }, { treasuryId: 'saman', amount: 400_000_000 }], payables: [{ partyId: 'beans', amount: 25_000_000 }] } });

  const cheques: { id: string; due: string; direction: 'received' | 'issued'; bounce: boolean }[] = [];
  const later = new Map<string, Op[]>();
  const schedule = (date: string, op: Op) => { if (date <= today) later.set(date, [...(later.get(date) ?? []), op]); };
  let week = 0;

  for (let d = start; d <= today; d = addDays(d, 1)) {
    const j = toJalali(d);
    const dow = new Date(`${d}T00:00:00Z`).getUTCDay(); // 6 = Saturday … 5 = Friday
    const monthIndex = (j.jy - sy) * 12 + (j.jm - sm);
    const lastDay = j.jd === jalaliMonthLength(j.jy, j.jm);
    if (dow === 6) week += 1;

    for (const c of cheques.filter((x) => x.due === d)) {
      if (c.bounce) {
        push({ k: 'bounced', input: { id: id('bounce'), chequeId: c.id, date: d } });
        schedule(addDays(d, 5), { k: 'receipt', input: { id: id('rcpt'), date: addDays(d, 5), partyId: 'office', payments: [{ treasuryId: 'mellat', amount: ledger.cheque(c.id).amount }], note: 'تسویه‌ی چک برگشتی با کارت' } });
      } else {
        push({ k: 'cleared', input: { id: id('clear'), chequeId: c.id, date: d, bankTreasuryId: c.direction === 'received' ? 'mellat' : 'saman' } });
      }
    }
    for (const op of later.get(d) ?? []) push(op);

    // Daily takings: Thursday and Friday are busier; about two thirds by card.
    const busy = dow === 5 ? 1.45 : dow === 4 ? 1.2 : 1;
    const amount = round((30_000_000 + rnd() * 22_000_000) * busy);
    const card = round(amount * (0.62 + rnd() * 0.12));
    push({ k: 'daily', input: { id: id('day'), date: d, amount, vat, payments: [{ treasuryId: 'cash', amount: amount - card }, { treasuryId: 'mellat', amount: card }] } });

    if (dow === 6) { // milk every Saturday, half paid by card, rest on account
      const milk = round(24_000_000 + rnd() * 10_000_000);
      push({ k: 'expense', input: { id: id('milk'), date: d, account: '5101', amount: milk, inputVat: milk / 10, supplierId: 'milk', payments: [{ treasuryId: 'mellat', amount: round((milk * 1.1) / 2) }], note: 'خرید شیر و لبنیات' } });
    }
    if (dow === 1) { // bread and pastry every Monday, cash
      const bread = round(10_000_000 + rnd() * 5_000_000);
      push({ k: 'expense', input: { id: id('bakery'), date: d, account: '5101', amount: bread, supplierId: 'bakery', payments: [{ treasuryId: 'cash', amount: bread }], note: 'نان و شیرینی' } });
    }
    if (dow === 3 && week % 2 === 0) { // coffee beans every other Wednesday, paid by a 30-day cheque
      const beans = round(80_000_000 + rnd() * 30_000_000);
      const chequeId = id('chq-out');
      push({ k: 'expense', input: { id: id('beans'), date: d, account: '5101', amount: beans, inputVat: beans / 10, supplierId: 'beans', cheque: { id: chequeId, number: String(451200 + n), bank: 'سامان', dueDate: addDays(d, 30), amount: beans + beans / 10 }, note: 'دانه‌ی قهوه' } });
      cheques.push({ id: chequeId, due: addDays(d, 30), direction: 'issued', bounce: false });
    }
    if (dow === 0) { // every Sunday most of the cash goes to the bank
      const cash = treasuryBalances(ledger, d).find((x) => x.id === 'cash')!.balance;
      if (cash > 8_000_000) push({ k: 'transfer', input: { id: id('xfer'), date: d, fromTreasuryId: 'cash', toTreasuryId: 'mellat', amount: round(cash - 5_000_000), note: 'واریز نقد به بانک' } });
    }
    if (j.jd === 1) push({ k: 'expense', input: { id: id('rent'), date: d, account: '6102', amount: 250_000_000, payments: [{ treasuryId: 'saman', amount: 250_000_000 }], note: 'اجاره‌ی ماه' } });
    if (j.jd === 5) {
      const util = round(12_000_000 + rnd() * 4_000_000);
      push({ k: 'expense', input: { id: id('util'), date: d, account: '6103', amount: util, payments: [{ treasuryId: 'mellat', amount: util }], note: 'قبض آب، برق و گاز' } });
    }
    if (j.jd === 10) push({ k: 'expense', input: { id: id('ads'), date: d, account: '6104', amount: 20_000_000, inputVat: 2_000_000, payments: [{ treasuryId: 'mellat', amount: 22_000_000 }], note: 'تبلیغ در اینستاگرام' } });
    if (j.jd === 12) { // catering for an office, on credit
      push({ k: 'invoice', input: { id: id('inv'), date: d, customerId: 'office', lines: [item('demo-latte', 30), item('demo-cheesecake', 20), item('demo-croissant', 30)], discount: 3_000_000, vat, note: 'پذیرایی جلسه‌ی شرکت نوآوران' } });
    }
    if (j.jd === 20) { // the office settles by a 15-day cheque; the one from the second month bounces
      const owed = partyBalances(ledger, d).find((p) => p.id === 'office')?.receivable ?? 0;
      if (owed > 0) {
        const chequeId = id('chq-in');
        push({ k: 'receipt', input: { id: id('rcpt'), date: d, partyId: 'office', cheque: { id: chequeId, number: String(778800 + n), bank: 'صادرات', dueDate: addDays(d, 15), amount: owed } } });
        cheques.push({ id: chequeId, due: addDays(d, 15), direction: 'received', bounce: monthIndex === 1 });
      }
    }
    if (j.jd === 17 && monthIndex === 1) { // a birthday order: half now, rest in five days
      const lines = [item('demo-chocolate-cake', 4), item('demo-mojito', 25), item('demo-iced-coffee', 15)];
      push({ k: 'invoice', input: { id: id('inv'), date: d, customerId: 'event', lines, vat, payments: [{ treasuryId: 'cash', amount: 30_000_000 }], note: 'سفارش جشن تولد' } });
      const owed = partyBalances(ledger, d).find((p) => p.id === 'event')!.receivable;
      schedule(addDays(d, 5), { k: 'receipt', input: { id: id('rcpt'), date: addDays(d, 5), partyId: 'event', payments: [{ treasuryId: 'mellat', amount: owed }] } });
    }
    if (j.jd === 25) { // pay the milk supplier what we owe
      const owed = partyBalances(ledger, d).find((p) => p.id === 'milk')?.payable ?? 0;
      if (owed > 0) push({ k: 'payment', input: { id: id('pay'), date: d, partyId: 'milk', payments: [{ treasuryId: 'mellat', amount: owed }] } });
    }
    if (j.jd === 27) push({ k: 'transfer', input: { id: id('xfer'), date: d, fromTreasuryId: 'mellat', toTreasuryId: 'saman', amount: 450_000_000, fee: 0, note: 'تأمین حساب جاری' } });
    if (lastDay) {
      push({ k: 'expense', input: { id: id('salary'), date: d, account: '6101', amount: 350_000_000, payments: [{ treasuryId: 'mellat', amount: 350_000_000 }], note: 'حقوق همکاران' } });
      push({ k: 'withdrawal', input: { id: id('draw'), date: d, treasuryId: 'mellat', amount: 60_000_000 } });
    }
  }
  return { version: 1, settings: DEFAULT_SETTINGS, ops };
}
