import { useState } from 'react';
import {
  balanceSheet, trialBalance, jalaliMonthRange, jalaliSeasonRange, monthlySummary, partyBalances, profitAndLoss, toJalali, treasuryBalances, vatReport,
  JALALI_MONTHS, type Ledger,
} from '../../../engine';
import { jDate, toFaDigits } from '../../../format';
import { Card, Money, Segmented } from '../../../ui';

type Report = 'pnl' | 'months' | 'balance' | 'parties' | 'vat' | 'trial';
const REPORTS: readonly (readonly [Report, string])[] = [['balance', 'ترازنامه'], ['pnl', 'سود و زیان'], ['months', 'ماه‌به‌ماه'], ['parties', 'طرف حساب‌ها'], ['vat', 'ارزش افزوده'], ['trial', 'تراز آزمایشی']];

export default function Reports({ ledger, today, initial }: { ledger: Ledger; today: string; initial?: string }) {
  const [report, setReport] = useState<Report>(REPORTS.some(([k]) => k === initial) ? (initial as Report) : 'balance');
  return <div className="stack">
    <div className="scroll-x">
      <Segmented label="گزارش" value={report} onChange={setReport} options={REPORTS} />
    </div>
    {report === 'pnl' && <ProfitLoss ledger={ledger} today={today} />}
    {report === 'months' && <Months ledger={ledger} today={today} />}
    {report === 'balance' && <Balance ledger={ledger} today={today} />}
    {report === 'parties' && <Parties ledger={ledger} today={today} />}
    {report === 'vat' && <Vat ledger={ledger} today={today} />}
    {report === 'trial' && <Trial ledger={ledger} today={today} />}
  </div>;
}

function monthOptions(today: string, count = 6) {
  const t = toJalali(today);
  return Array.from({ length: count }, (_, back) => {
    let jy = t.jy; let jm = t.jm - back;
    while (jm < 1) { jm += 12; jy -= 1; }
    return { key: `${jy}-${jm}`, ...jalaliMonthRange(jy, jm) };
  });
}

function ProfitLoss({ ledger, today }: { ledger: Ledger; today: string }) {
  const options = monthOptions(today);
  // Early in a month the last full month is the useful default.
  const [key, setKey] = useState(options[toJalali(today).jd <= 5 ? 1 : 0].key);
  const range = options.find((o) => o.key === key)!;
  const p = profitAndLoss(ledger, { from: range.from, to: range.to < today ? range.to : today });
  return <Card title="سود و زیان" action={<select value={key} onChange={(e) => setKey(e.target.value)} aria-label="ماه">{options.map((o) => <option key={o.key} value={o.key}>{toFaDigits(o.label)}</option>)}</select>}>
    <table className="report">
      <tbody>
        <tr><th>فروش</th><td><Money value={p.sales} /></td></tr>
        {p.discounts > 0 && <tr><th>تخفیف‌ها</th><td><Money value={-p.discounts} /></td></tr>}
        {p.otherIncome > 0 && <tr><th>درآمدهای دیگر</th><td><Money value={p.otherIncome} /></td></tr>}
        <tr className="sub"><th>درآمد خالص</th><td><Money value={p.netSales + p.otherIncome} /></td></tr>
        {p.expenses.map((e) => <tr key={e.code}><th className="indent">{e.name}</th><td><Money value={-e.balance} /></td></tr>)}
        <tr className="sub"><th>جمع هزینه‌ها</th><td><Money value={-p.totalExpenses} /></td></tr>
        <tr className="grand"><th>{p.netProfit >= 0 ? 'سود' : 'زیان'} {toFaDigits(range.label)}</th><td><Money value={p.netProfit} tone="auto" /></td></tr>
      </tbody>
    </table>
    <p className="note">مبلغ‌ها بدون ارزش افزوده‌اند. {range.to > today ? 'ماه جاری تا امروز حساب شده است.' : ''}</p>
  </Card>;
}

function Months({ ledger, today }: { ledger: Ledger; today: string }) {
  const t = toJalali(today);
  const rows = monthlySummary(ledger, t.jy).filter((r) => r.from <= today && (r.sales || r.expenses));
  return <Card title={`ماه‌به‌ماه ${toFaDigits(String(t.jy))}`}>
    {rows.length === 0 ? <p className="empty">هنوز در این سال سندی نیست.</p> :
      <table className="report cols">
        <thead><tr><th>ماه</th><th>فروش</th><th>هزینه</th><th>نتیجه</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.month}><th>{r.name}</th><td><Money value={r.sales} compact /></td><td><Money value={r.expenses} compact /></td><td><Money value={r.profit} compact tone="auto" /></td></tr>)}</tbody>
      </table>}
  </Card>;
}

/** Dates a balance sheet can be read at: today and the last day of each of the previous five Jalali months. */
function balanceDates(today: string) {
  const t = toJalali(today);
  const list = [{ key: today, label: `امروز (${jDate(today)})` }];
  for (let back = 1; back <= 5; back += 1) {
    let jy = t.jy; let jm = t.jm - back;
    while (jm < 1) { jm += 12; jy -= 1; }
    const r = jalaliMonthRange(jy, jm);
    list.push({ key: r.to, label: `پایان ${toFaDigits(r.label)}` });
  }
  return list;
}

function Balance({ ledger, today }: { ledger: Ledger; today: string }) {
  const dates = balanceDates(today);
  const [asOf, setAsOf] = useState(today);
  const b = balanceSheet(ledger, asOf);
  const cash = treasuryBalances(ledger, asOf);
  return <Card title="ترازنامه" action={<select value={asOf} onChange={(e) => setAsOf(e.target.value)} aria-label="تاریخ ترازنامه">{dates.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}</select>}>
    <div className="bs-summary">
      <div><span>دارایی‌ها</span><strong><Money value={b.totalAssets} compact /></strong></div>
      <b aria-hidden="true">=</b>
      <div><span>بدهی‌ها</span><strong><Money value={b.totalLiabilities} compact /></strong></div>
      <b aria-hidden="true">+</b>
      <div><span>سرمایه</span><strong><Money value={b.totalEquity} compact /></strong></div>
    </div>
    <div className="bs-grid">
      <table className="report">
        <tbody>
          <tr className="head"><th colSpan={2}>دارایی‌ها</th></tr>
          {b.assets.map((r) => <tr key={r.code}><th className="indent">{r.name}</th><td><Money value={r.balance} /></td></tr>)}
          <tr className="sub"><th>جمع دارایی‌ها</th><td><Money value={b.totalAssets} /></td></tr>
        </tbody>
      </table>
      <table className="report">
        <tbody>
          <tr className="head"><th colSpan={2}>بدهی‌ها</th></tr>
          {b.liabilities.length === 0 ? <tr><th className="indent">—</th><td /></tr> : b.liabilities.map((r) => <tr key={r.code}><th className="indent">{r.name}</th><td><Money value={r.balance} /></td></tr>)}
          <tr className="sub"><th>جمع بدهی‌ها</th><td><Money value={b.totalLiabilities} /></td></tr>
          <tr className="head"><th colSpan={2}>سرمایه</th></tr>
          {b.equity.map((r) => <tr key={r.code}><th className="indent">{r.name}</th><td><Money value={r.balance} /></td></tr>)}
          <tr><th className="indent">سود و زیان انباشته</th><td><Money value={b.currentEarnings} tone="auto" /></td></tr>
          <tr className="sub"><th>جمع سرمایه</th><td><Money value={b.totalEquity} /></td></tr>
          <tr className="grand"><th>جمع بدهی‌ها و سرمایه</th><td><Money value={b.totalLiabilities + b.totalEquity} /></td></tr>
        </tbody>
      </table>
    </div>
    <p className={`note ${b.balanced ? 'ok' : 'bad'}`}>{b.balanced ? '✓ ترازنامه تراز است: دارایی‌ها برابر بدهی‌ها به‌علاوه‌ی سرمایه.' : 'ترازنامه تراز نیست.'}</p>
    <details><summary>جزئیات صندوق و بانک</summary><ul className="rows">{cash.map((x) => <li key={x.id}><span>{x.name}</span><Money value={x.balance} /></li>)}</ul></details>
  </Card>;
}

/** Accountant view: every account with its debit and credit totals. */
function Trial({ ledger, today }: { ledger: Ledger; today: string }) {
  const tb = trialBalance(ledger, today);
  return <Card title={`تراز آزمایشی تا ${jDate(today)}`}>
    <div className="table-scroll">
      <table className="report cols trial">
        <thead><tr><th>کد</th><th>حساب</th><th>گردش بدهکار</th><th>گردش بستانکار</th><th>مانده</th></tr></thead>
        <tbody>{tb.rows.map((r) => <tr key={r.code}><td>{toFaDigits(r.code)}</td><th>{r.name}</th><td><Money value={r.debit} compact /></td><td><Money value={r.credit} compact /></td><td><Money value={r.balance} compact /></td></tr>)}</tbody>
        <tfoot><tr className="grand"><td /><th>جمع</th><td><Money value={tb.debit} compact /></td><td><Money value={tb.credit} compact /></td><td /></tr></tfoot>
      </table>
    </div>
    <p className={`note ${tb.balanced ? 'ok' : 'bad'}`}>{tb.balanced ? '✓ جمع بدهکار و بستانکار برابر است.' : 'تراز آزمایشی برابر نیست.'}</p>
  </Card>;
}

function Parties({ ledger, today }: { ledger: Ledger; today: string }) {
  const rows = partyBalances(ledger, today);
  const customers = rows.filter((r) => r.receivable !== 0);
  const suppliers = rows.filter((r) => r.payable !== 0);
  return <>
    <Card title="طلب از مشتری‌ها">
      {customers.length === 0 ? <p className="empty">از هیچ مشتری‌ای طلبی نداری.</p> :
        <ul className="rows">{customers.map((r) => <li key={r.id}><span>{r.name}</span><Money value={r.receivable} /></li>)}</ul>}
    </Card>
    <Card title="بدهی به تأمین‌کننده‌ها">
      {suppliers.length === 0 ? <p className="empty">به هیچ تأمین‌کننده‌ای بدهی نداری.</p> :
        <ul className="rows">{suppliers.map((r) => <li key={r.id}><span>{r.name}</span><Money value={r.payable} /></li>)}</ul>}
    </Card>
  </>;
}

function Vat({ ledger, today }: { ledger: Ledger; today: string }) {
  const t = toJalali(today);
  const seasons = [0, 1, 2, 3].map((back) => {
    let jy = t.jy; let s = Math.floor((t.jm - 1) / 3) + 1 - back;
    while (s < 1) { s += 4; jy -= 1; }
    return { key: `${jy}-${s}`, ...jalaliSeasonRange(jy, s as 1 | 2 | 3 | 4) };
  });
  const [key, setKey] = useState(seasons[0].key);
  const range = seasons.find((s) => s.key === key)!;
  const v = vatReport(ledger, range);
  return <Card title="مالیات بر ارزش افزوده" action={<select value={key} onChange={(e) => setKey(e.target.value)} aria-label="فصل">{seasons.map((s) => <option key={s.key} value={s.key}>{toFaDigits(s.label)}</option>)}</select>}>
    <table className="report">
      <tbody>
        <tr><th>ارزش افزوده‌ی فروش</th><td><Money value={v.output} /></td></tr>
        <tr><th>ارزش افزوده‌ی خرید (قابل کسر)</th><td><Money value={-v.input} /></td></tr>
        <tr className="grand"><th>{v.payable >= 0 ? 'پرداختنی به سازمان امور مالیاتی' : 'طلب از سازمان امور مالیاتی'}</th><td><Money value={Math.abs(v.payable)} /></td></tr>
      </tbody>
    </table>
    <p className="note">بازه: {jDate(range.from)} تا {jDate(range.to)}. فقط خریدهایی کسر می‌شوند که فاکتور رسمی با ارزش افزوده دارند. اتصال به سامانه‌ی مؤدیان در مرحله‌ی بعد است.</p>
    <p className="note">ماه‌های {JALALI_MONTHS.slice((Math.floor((toJalali(range.from).jm - 1) / 3)) * 3, (Math.floor((toJalali(range.from).jm - 1) / 3)) * 3 + 3).join('، ')}</p>
  </Card>;
}
