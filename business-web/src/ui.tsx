import { useEffect, useId, useState, type ReactNode } from 'react';
import { compactRial, faNum, jDate, parseAmount, parseJalaliInput, rial, toFaDigits } from './format';

export function Money({ value, compact = false, tone }: { value: number; compact?: boolean; tone?: 'auto' }) {
  const cls = tone === 'auto' ? (value < 0 ? 'neg' : value > 0 ? 'pos' : '') : '';
  return <span className={`money ${cls}`}>{compact ? compactRial(value) : rial(value)}</span>;
}

export function Card({ title, children, action, className = '' }: { title?: ReactNode; children: ReactNode; action?: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>
    {(title || action) && <header className="card-head">{title && <h3>{title}</h3>}{action}</header>}
    {children}
  </section>;
}

export function Field({ label, hint, error, children }: { label: string; hint?: ReactNode; error?: string | null; children: (id: string) => ReactNode }) {
  const id = useId();
  return <div className={`field${error ? ' has-error' : ''}`}>
    <label htmlFor={id}>{label}</label>
    {children(id)}
    {error ? <small className="err">{error}</small> : hint ? <small>{hint}</small> : null}
  </div>;
}

/** Rial amount with live thousand separators; accepts Persian digits. */
export function AmountInput({ value, onChange, placeholder, id }: { value: number | null; onChange: (v: number | null) => void; placeholder?: string; id?: string }) {
  const [text, setText] = useState(value === null ? '' : faNum(value));
  useEffect(() => { setText((current) => (parseAmount(current) === value ? current : value === null ? '' : faNum(value))); }, [value]);
  return <div className="amount-input">
    <input id={id} inputMode="numeric" dir="ltr" value={text} placeholder={placeholder ?? '۰'}
      onChange={(e) => { const v = parseAmount(e.target.value); setText(e.target.value === '' ? '' : v === null ? e.target.value : faNum(v)); onChange(e.target.value === '' ? null : v); }} />
    <span>ریال</span>
  </div>;
}

/** Jalali date field with quick «امروز / دیروز». Holds an ISO date. */
export function DateInput({ value, onChange, today, id }: { value: string; onChange: (iso: string) => void; today: string; id?: string }) {
  const [text, setText] = useState(jDate(value));
  const [bad, setBad] = useState(false);
  useEffect(() => { setText(jDate(value)); setBad(false); }, [value]);
  const yesterday = new Date(Date.parse(`${today}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
  return <div className="date-input">
    <input id={id} dir="ltr" value={text} className={bad ? 'bad' : ''} placeholder="۱۴۰۵/۰۷/۰۱"
      onChange={(e) => { setText(e.target.value); const iso = parseJalaliInput(e.target.value); setBad(!iso); if (iso) onChange(iso); }} />
    <button type="button" className={value === today ? 'on' : ''} onClick={() => onChange(today)}>امروز</button>
    <button type="button" className={value === yesterday ? 'on' : ''} onClick={() => onChange(yesterday)}>دیروز</button>
  </div>;
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: readonly (readonly [T, string])[]; onChange: (v: T) => void; label: string }) {
  return <div className="segmented" role="radiogroup" aria-label={label}>
    {options.map(([v, text]) => <button key={v} type="button" role="radio" aria-checked={value === v} className={value === v ? 'on' : ''} onClick={() => onChange(v)}>{text}</button>)}
  </div>;
}

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.classList.add('sheet-open');
    return () => { window.removeEventListener('keydown', onKey); document.body.classList.remove('sheet-open'); };
  }, [onClose]);
  return <div className="sheet-backdrop" onClick={onClose}>
    <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
      <header className="sheet-head"><h2>{title}</h2><button type="button" className="icon-btn" onClick={onClose} aria-label="بستن">✕</button></header>
      <div className="sheet-body">{children}</div>
    </div>
  </div>;
}

export function Badge({ tone, children }: { tone: 'ok' | 'warn' | 'bad' | 'muted' | 'info'; children: ReactNode }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export const fa = toFaDigits;
