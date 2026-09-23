import { balanceSheet, chequeRegister, jalaliMonthRange, jalaliSeasonRange, partyBalances, profitAndLoss, toJalali, treasuryBalances, vatReport, JALALI_MONTHS, type Ledger } from '../../../engine';
import { addDays, compactRial, faNum, jDate, toFaDigits } from '../../../format';
import { Badge, Card, Money } from '../../../ui';

export default function Dashboard({ ledger, today, onRecord, onTab }: { ledger: Ledger; today: string; onRecord: (form: string) => void; onTab: (tab: string) => void }) {
  const t = toJalali(today);
  // In the first days of a month the new month is mostly rent and little else; show the last full month instead.
  const early = t.jd <= 5;
  const pm = early ? (t.jm === 1 ? { jy: t.jy - 1, jm: 12 } : { jy: t.jy, jm: t.jm - 1 }) : { jy: t.jy, jm: t.jm };
  const month = jalaliMonthRange(pm.jy, pm.jm);
  const pnl = profitAndLoss(ledger, { from: month.from, to: month.to < today ? month.to : today });
  const monthName = JALALI_MONTHS[pm.jm - 1];
  const treasuries = treasuryBalances(ledger, today);
  const money = treasuries.reduce((s, x) => s + x.balance, 0);
  const parties = partyBalances(ledger, today);
  const receivable = parties.reduce((s, p) => s + p.receivable, 0);
  const payable = parties.reduce((s, p) => s + p.payable, 0);
  const season = jalaliSeasonRange(t.jy, (Math.floor((t.jm - 1) / 3) + 1) as 1 | 2 | 3 | 4);
  const vat = vatReport(ledger, season);
  const bs = balanceSheet(ledger, today);
  const soon = chequeRegister(ledger, today, { status: 'open' }).filter((c) => c.dueDate <= addDays(today, 14));

  // Last four Jalali months, sales vs expenses.
  const months = [3, 2, 1, 0].map((back) => {
    let jy = t.jy; let jm = t.jm - back;
    if (jm < 1) { jm += 12; jy -= 1; }
    const r = jalaliMonthRange(jy, jm);
    const p = profitAndLoss(ledger, { from: r.from, to: r.to < today ? r.to : today });
    return { name: JALALI_MONTHS[jm - 1], sales: p.netSales + p.otherIncome, expenses: p.totalExpenses, current: back === 0 };
  });
  const max = Math.max(1, ...months.flatMap((m) => [m.sales, m.expenses]));

  return <div className="stack">
    <div className="kpis">
      <button type="button" className="kpi" onClick={() => onTab('reports')}>
        <span>فروش {monthName}</span><strong>{compactRial(pnl.netSales + pnl.otherIncome)}</strong><small>بدون ارزش افزوده</small>
      </button>
      <button type="button" className="kpi" onClick={() => onTab('reports')}>
        <span>هزینه {monthName}</span><strong>{compactRial(pnl.totalExpenses)}</strong><small>{pnl.expenses[0] ? `بیشترین: ${pnl.expenses[0].name}` : '—'}</small>
      </button>
      <button type="button" className={`kpi ${pnl.netProfit >= 0 ? 'good' : 'bad'}`} onClick={() => onTab('reports')}>
        <span>{pnl.netProfit >= 0 ? 'سود' : 'زیان'} {monthName}</span><strong>{compactRial(pnl.netProfit)}</strong><small>{early ? 'ماه کامل گذشته' : 'تا امروز'}</small>
      </button>
      <button type="button" className="kpi" onClick={() => onTab('reports')}>
        <span>نقد و بانک</span><strong>{compactRial(money)}</strong><small>{faNum(treasuries.length)} حساب</small>
      </button>
    </div>

    <div className="quick">
      {[['daily', '💵', 'فروش امروز'], ['invoice', '🧾', 'فاکتور'], ['expense', '🛒', 'هزینه'], ['receipt', '📥', 'دریافت']].map(([form, icon, label]) =>
        <button key={form} type="button" onClick={() => onRecord(form)}><span aria-hidden="true">{icon}</span>{label}</button>)}
    </div>

    <Card title="فروش و هزینه‌ی چهار ماه اخیر">
      <div className="bars" role="img" aria-label="نمودار فروش و هزینه">
        {months.map((m) => <div key={m.name} className={`bar-group${m.current ? ' current' : ''}`}>
          <div className="bar-pair">
            <i className="bar sales" style={{ height: `${(m.sales / max) * 100}%` }} title={`فروش ${compactRial(m.sales)}`} />
            <i className="bar exp" style={{ height: `${(m.expenses / max) * 100}%` }} title={`هزینه ${compactRial(m.expenses)}`} />
          </div>
          <span>{m.name}{m.current ? ' (تا امروز)' : ''}</span>
        </div>)}
      </div>
      <div className="legend"><span><i className="dot sales" />فروش خالص</span><span><i className="dot exp" />هزینه</span></div>
    </Card>

    <div className="grid2">
      <Card title="موجودی‌ها">
        <ul className="rows">
          {treasuries.map((x) => <li key={x.id}><span>{x.kind === 'cash' ? '💵' : '🏦'} {x.name}</span><Money value={x.balance} /></li>)}
        </ul>
      </Card>
      <Card title="طلب و بدهی" action={<button type="button" className="link" onClick={() => onTab('reports:parties')}>جزئیات</button>}>
        <ul className="rows">
          <li><span>طلب از مشتری‌ها</span><Money value={receivable} /></li>
          <li><span>بدهی به تأمین‌کننده‌ها</span><Money value={payable} /></li>
          <li><span>ارزش افزوده‌ی {toFaDigits(season.label)}</span><Money value={vat.payable} /></li>
        </ul>
      </Card>
    </div>

    <Card title="ترازنامه در یک نگاه" action={<button type="button" className="link" onClick={() => onTab('reports:balance')}>ترازنامه‌ی کامل</button>}>
      <div className="bs-summary">
        <div><span>دارایی‌ها</span><strong><Money value={bs.totalAssets} compact /></strong></div>
        <b aria-hidden="true">=</b>
        <div><span>بدهی‌ها</span><strong><Money value={bs.totalLiabilities} compact /></strong></div>
        <b aria-hidden="true">+</b>
        <div><span>سرمایه</span><strong><Money value={bs.totalEquity} compact /></strong></div>
      </div>
    </Card>

    <Card title="چک‌های دو هفته‌ی پیش رو" action={<button type="button" className="link" onClick={() => onTab('cheques')}>همه‌ی چک‌ها</button>}>
      {soon.length === 0 ? <p className="empty">چک سررسیدی در دو هفته‌ی آینده نیست.</p> :
        <ul className="rows">
          {soon.map((c) => <li key={c.id}>
            <span>{c.direction === 'received' ? '📥' : '📤'} {c.partyName}<small>، سررسید {jDate(c.dueDate)}</small></span>
            <span className="row-end"><Money value={c.amount} />{c.overdue ? <Badge tone="bad">گذشته</Badge> : <Badge tone={c.daysToDue <= 3 ? 'warn' : 'info'}>{c.daysToDue === 0 ? 'امروز' : `${faNum(c.daysToDue)} روز`}</Badge>}</span>
          </li>)}
        </ul>}
    </Card>
  </div>;
}
