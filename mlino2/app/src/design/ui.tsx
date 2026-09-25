import type { ButtonHTMLAttributes, ReactNode } from 'react';
import LiveIcon, { type LiveIconName } from '../live/icons';
import { tr } from '../i18n';
import './components.css';

// Shared building blocks of the «روشنای محله» design. Pages use these instead of their own colours and sizes.

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost'; busy?: boolean; wide?: boolean; icon?: LiveIconName };
export function Button({ variant = 'primary', busy = false, wide = false, icon, className = '', children, disabled, ...rest }: ButtonProps) {
  return <button type="button" {...rest} disabled={disabled || busy} aria-busy={busy || undefined}
    className={`rs-btn ${variant}${wide ? ' wide' : ''} ${className}`}>
    {busy ? <span className="rs-spin" aria-hidden="true" /> : icon ? <LiveIcon name={icon} size={20} /> : null}
    <span>{children}</span>
  </button>;
}

export function IconButton({ icon, label, className = '', badge, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { icon: LiveIconName; label: string; badge?: number }) {
  return <button type="button" {...rest} className={`rs-icon-btn ${className}`} aria-label={label} title={label}>
    <LiveIcon name={icon} size={22} />
    {badge ? <span className="rs-badge-dot" aria-hidden="true">{badge > 9 ? '9+' : badge}</span> : null}
  </button>;
}

/** Top row of a page: back, title, and one optional action at the end. */
export function AppHeader({ title, onBack, action, sub }: { title: ReactNode; onBack?: () => void; action?: ReactNode; sub?: ReactNode }) {
  return <header className="rs-head">
    {onBack ? <IconButton icon="chevron-right" label={tr('بازگشت')} onClick={onBack} /> : <span className="rs-head-space" />}
    <div className="rs-head-title"><h1>{title}</h1>{sub && <small>{sub}</small>}</div>
    {action ?? <span className="rs-head-space" />}
  </header>;
}

export function StatusBadge({ tone = 'neutral', children }: { tone?: 'neutral' | 'good' | 'special' | 'bad' | 'draft'; children: ReactNode }) {
  return <span className={`rs-status ${tone}`}>{children}</span>;
}

export function EmptyState({ title, text, action }: { title: ReactNode; text?: ReactNode; action?: ReactNode }) {
  return <div className="rs-empty" role="status"><strong>{title}</strong>{text && <p>{text}</p>}{action}</div>;
}

export function Skeleton({ lines = 2 }: { lines?: number }) {
  return <div className="rs-skeleton" aria-hidden="true">{Array.from({ length: lines }, (_, i) => <span key={i} className={i === lines - 1 ? 'short' : ''} />)}</div>;
}

export function ErrorNotice({ children, onRetry }: { children: ReactNode; onRetry?: () => void }) {
  return <div className="rs-error" role="alert"><span>{children}</span>{onRetry && <button type="button" onClick={onRetry}>{tr('تلاش دوباره')}</button>}</div>;
}

/** A row of choices where exactly one is on (tabs over one list). */
export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: readonly { id: T; label: string; count?: number }[]; onChange: (v: T) => void; label: string }) {
  return <div className="rs-segmented" role="tablist" aria-label={label}>
    {options.map((o) => <button key={o.id} type="button" role="tab" aria-selected={value === o.id} className={value === o.id ? 'on' : ''} onClick={() => onChange(o.id)}>
      {o.label}{o.count !== undefined && <small>{o.count}</small>}
    </button>)}
  </div>;
}

export type NavTab = 'discover' | 'offers' | 'messages' | 'saved';
/** The customer app's four places, always at the bottom on a phone. */
export function CustomerBottomNav({ tab, onTab, unread = 0 }: { tab: NavTab; onTab: (t: NavTab) => void; unread?: number }) {
  const items: readonly { id: NavTab; icon: LiveIconName; label: string }[] = [
    { id: 'discover', icon: 'compass', label: tr('کشف') },
    { id: 'offers', icon: 'offer', label: tr('آفرها') },
    { id: 'messages', icon: 'chat', label: tr('پیام‌ها') },
    { id: 'saved', icon: 'bookmark', label: tr('ذخیره‌ها') },
  ];
  return <nav className="rs-bottom-nav" aria-label={tr('بخش‌های ملینو')}>
    {items.map((it) => <button key={it.id} type="button" className={tab === it.id ? 'on' : ''} aria-current={tab === it.id ? 'page' : undefined} onClick={() => onTab(it.id)}>
      <span className="rs-nav-ico"><LiveIcon name={it.icon} size={22} />{it.id === 'messages' && unread > 0 && <span className="rs-badge-dot" aria-hidden="true">{unread > 9 ? '9+' : unread}</span>}</span>
      <span>{it.label}</span>
      {it.id === 'messages' && unread > 0 && <span className="sr-only">{tr('{0} خوانده‌نشده', unread)}</span>}
    </button>)}
  </nav>;
}
