import { useState } from 'react';
import type { JournalEntry, Ledger, SourceType } from '../engine';
import { faNum, jDate } from '../format';
import { Badge, Card, Money } from '../ui';
import type { Commit } from './Record';

const TYPE: Record<SourceType, string> = {
  opening: 'افتتاحیه', sale_invoice: 'فاکتور فروش', daily_sales: 'فروش روزانه', expense: 'هزینه و خرید', receipt: 'دریافت',
  payment: 'پرداخت', cheque_cleared: 'وصول چک', cheque_bounced: 'برگشت چک', transfer: 'انتقال', owner_contribution: 'آورده‌ی مالک',
  owner_withdrawal: 'برداشت مالک', other_income: 'درآمد دیگر', reversal: 'برگشت سند',
};

const PAGE = 40;

export default function Journal({ ledger, today, commit }: { ledger: Ledger; today: string; commit: Commit }) {
  const [open, setOpen] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE);
  const [filter, setFilter] = useState<SourceType | ''>('');
  const [error, setError] = useState<string | null>(null);
  const entries = [...ledger.listEntries()].reverse().filter((e) => !filter || e.source.type === filter);
  const amount = (e: JournalEntry) => e.lines.reduce((s, l) => s + l.debit, 0);
  const name = (id?: string, kind?: 'party' | 'treasury') => { try { return id ? (kind === 'party' ? ledger.party(id).name : ledger.treasury(id).name) : ''; } catch { return ''; } };

  return <div className="stack">
    <div className="toolbar">
      <select value={filter} onChange={(e) => { setFilter(e.target.value as SourceType | ''); setLimit(PAGE); }} aria-label="نوع سند">
        <option value="">همه‌ی اسناد ({faNum(ledger.listEntries().length)})</option>
        {(Object.keys(TYPE) as SourceType[]).map((k) => <option key={k} value={k}>{TYPE[k]}</option>)}
      </select>
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <Card>
      <ul className="journal">
        {entries.slice(0, limit).map((e) => {
          const reversed = ledger.isReversed(e.id);
          return <li key={e.id} className={reversed || e.reversalOf ? 'muted' : ''}>
            <button type="button" className="j-head" aria-expanded={open === e.id} onClick={() => setOpen(open === e.id ? null : e.id)}>
              <span className="j-date">{jDate(e.date)}</span>
              <span className="j-desc"><strong>{e.description}</strong><small>{TYPE[e.source.type]}، سند {faNum(Number(e.id.slice(1)))}</small></span>
              <span className="j-amt"><Money value={amount(e)} />{reversed && <Badge tone="muted">برگشت خورده</Badge>}</span>
            </button>
            {open === e.id && <div className="j-body">
              <table className="lines">
                <thead><tr><th>حساب</th><th>بدهکار</th><th>بستانکار</th></tr></thead>
                <tbody>{e.lines.map((l, i) => <tr key={i}>
                  <td>{ledger.account(l.account).name}{l.treasuryId ? `، ${name(l.treasuryId, 'treasury')}` : ''}{l.partyId ? `، ${name(l.partyId, 'party')}` : ''}{l.chequeId ? `، چک ${ledger.cheque(l.chequeId).number}` : ''}</td>
                  <td>{l.debit ? faNum(l.debit) : ''}</td><td>{l.credit ? faNum(l.credit) : ''}</td>
                </tr>)}</tbody>
              </table>
              {!reversed && !e.reversalOf && <button type="button" className="btn small ghost danger" onClick={() => {
                const reason = window.prompt('چرا این سند برگشت می‌خورد؟ (مثلاً «ثبت تکراری»)');
                if (reason && reason.trim()) setError(commit({ k: 'reverse', entryId: e.id, date: today < e.date ? e.date : today, reason: reason.trim().slice(0, 150) }, 'سند برگشت خورد.'));
              }}>برگشت این سند</button>}
              <p className="note">سند ثبت‌شده ویرایش یا پاک نمی‌شود؛ اصلاح فقط با سند برگشتی است تا سابقه بماند.</p>
            </div>}
          </li>;
        })}
      </ul>
      {entries.length > limit && <button type="button" className="btn ghost wide" onClick={() => setLimit(limit + PAGE)}>اسناد بیشتر</button>}
    </Card>
  </div>;
}
