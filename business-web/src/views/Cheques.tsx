import { useState } from 'react';
import { chequeRegister, type Ledger } from '../engine';
import { docId } from '../book';
import { faNum, jDate, toFaDigits } from '../format';
import { Badge, Card, Money, Segmented } from '../ui';
import type { Commit } from './Record';

const STATUS = { open: ['در جریان', 'info'], cleared: ['وصول شد', 'ok'], bounced: ['برگشتی', 'bad'], void: ['باطل', 'muted'] } as const;

export default function Cheques({ ledger, today, commit }: { ledger: Ledger; today: string; commit: Commit }) {
  const [direction, setDirection] = useState<'received' | 'issued'>('received');
  const [bankId, setBankId] = useState(ledger.listTreasuries().find((t) => t.kind === 'bank')?.id ?? '');
  const [error, setError] = useState<string | null>(null);
  const rows = chequeRegister(ledger, today, { direction });
  const open = rows.filter((r) => r.status === 'open');
  const banks = ledger.listTreasuries().filter((t) => t.kind === 'bank');

  return <div className="stack">
    <Segmented label="نوع چک" value={direction} onChange={setDirection} options={[['received', 'چک‌های دریافتی'], ['issued', 'چک‌های پرداختی']]} />
    <div className="kpis two">
      <div className="kpi"><span>در جریان</span><strong>{faNum(open.length)} چک</strong><small><Money value={open.reduce((s, r) => s + r.amount, 0)} compact /></small></div>
      <div className={`kpi ${open.some((r) => r.overdue) ? 'bad' : ''}`}><span>سررسید گذشته</span><strong>{faNum(open.filter((r) => r.overdue).length)} چک</strong><small>{open.some((r) => r.overdue) ? 'پیگیری کن' : 'همه به‌موقع'}</small></div>
    </div>
    {open.length > 0 && <label className="inline-field">وصول به حساب: <select value={bankId} onChange={(e) => setBankId(e.target.value)}>{banks.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <Card>
      {rows.length === 0 ? <p className="empty">چکی ثبت نشده است.</p> :
        <ul className="cheques">
          {rows.map((r) => {
            const [label, tone] = STATUS[r.status];
            return <li key={r.id} className={r.overdue ? 'overdue' : ''}>
              <div className="ch-main">
                <strong>{r.partyName}</strong>
                <small>شماره {toFaDigits(r.number)}{r.bank ? `، ${r.bank}` : ''}، سررسید {jDate(r.dueDate)}</small>
              </div>
              <div className="ch-side">
                <Money value={r.amount} />
                <span className="badges">{r.overdue ? <Badge tone="bad">گذشته</Badge> : null}<Badge tone={tone}>{label}</Badge></span>
              </div>
              {r.status === 'open' && <div className="ch-actions">
                <button type="button" className="btn small" onClick={() => setError(commit({ k: 'cleared', input: { id: docId('clr'), chequeId: r.id, date: today, bankTreasuryId: bankId } }, 'وصول چک ثبت شد.'))}>وصول شد</button>
                <button type="button" className="btn small ghost danger" onClick={() => { if (window.confirm('این چک برگشت خورده است؟ مبلغ دوباره به حساب طرف برمی‌گردد.')) setError(commit({ k: 'bounced', input: { id: docId('bnc'), chequeId: r.id, date: today } }, 'برگشت چک ثبت شد.')); }}>برگشت خورد</button>
              </div>}
            </li>;
          })}
        </ul>}
    </Card>
  </div>;
}
