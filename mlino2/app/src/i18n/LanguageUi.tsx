import { useEffect } from 'react';
import { LOCALES, chooseLocale, dismissAutoSwitch, pendingAutoSwitch, tr, useLocale } from './index';
import './language.css';

/** Three buttons, each language written in its own script so anyone can find theirs. */
export function LanguagePicker({ compact = false }: { compact?: boolean }) {
  const current = useLocale();
  return <div className={`lang-picker${compact ? ' compact' : ''}`} role="radiogroup" aria-label={tr('زبان برنامه')}>
    {LOCALES.map((l) => <button key={l.id} type="button" role="radio" aria-checked={current === l.id} lang={l.id}
      dir={l.id === 'en' ? 'ltr' : 'rtl'} className={current === l.id ? 'on' : ''} onClick={() => chooseLocale(l.id)}>{l.name}</button>)}
  </div>;
}

const BACK: Record<string, string> = { fa: 'فارسی', en: 'English', ar: 'العربية' };

/**
 * After a location fix changed the language by itself: says so in the new language and offers the previous one
 * in one tap. Disappears after a few seconds; choosing either language makes it the person's own choice.
 */
export function AutoSwitchNotice() {
  useLocale();
  const change = pendingAutoSwitch();
  useEffect(() => {
    if (!change) return undefined;
    const timer = window.setTimeout(dismissAutoSwitch, 9000);
    return () => window.clearTimeout(timer);
  }, [change]);
  if (!change) return null;
  return <div className="lang-notice" role="status">
    <span>{tr('زبان برنامه بر اساس موقعیتت تنظیم شد.')}</span>
    <button type="button" lang={change.from} onClick={() => chooseLocale(change.from)}>{BACK[change.from]}</button>
    <button type="button" className="ok" onClick={() => chooseLocale(change.to)} aria-label={tr('همین زبان بماند')}>✓</button>
  </div>;
}
