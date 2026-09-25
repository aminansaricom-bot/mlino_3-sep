import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { onBackButton } from '../native/bridge';
import { COUNTRIES, countryName, flag, flagsDrawn, type Country } from './countries';
import { dir, latinDigits, tr, useLocale } from './index';
import './phone.css';

/**
 * A phone number as two parts: the country code, picked from a list with each country's flag, and the rest of the number.
 * Always laid out left to right (+98 | 912 …), as numbers are written in every language.
 */
export function PhoneField({ country, onCountry, national, onNational, autoFocus = false }: {
  country: Country; onCountry: (c: Country) => void; national: string; onNational: (v: string) => void; autoFocus?: boolean;
}) {
  useLocale();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const listId = useId();
  const numberId = useId();
  const root = useRef<HTMLDivElement | null>(null);
  const search = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    search.current?.focus();
    const away = (e: PointerEvent) => { if (root.current && !root.current.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', key);
    const release = onBackButton(() => { setOpen(false); return true; });
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', key); release(); };
  }, [open]);

  const list = useMemo(() => {
    const q = latinDigits(query).trim().toLocaleLowerCase().replace(/^\+/, '');
    if (!q) return COUNTRIES;
    return COUNTRIES.filter((c) => c.dial.startsWith(q) || countryName(c.iso).toLocaleLowerCase().includes(q) || c.iso.toLowerCase() === q);
  }, [query]);

  const pick = (c: Country) => { onCountry(c); setOpen(false); setQuery(''); };

  return <div className="phone-field" dir="ltr" ref={root}>
    <button type="button" className="phone-code" aria-haspopup="listbox" aria-expanded={open} aria-controls={listId}
      aria-label={tr('کد کشور: {0} +{1}', countryName(country.iso), country.dial)} onClick={() => setOpen((v) => !v)}>
      <Flag iso={country.iso} />
      <span className="phone-dial">+{country.dial}</span>
      <span className="phone-caret" aria-hidden="true">▾</span>
    </button>
    <input id={numberId} className="phone-national" inputMode="tel" autoComplete="tel-national" autoFocus={autoFocus}
      value={national} onChange={(e) => onNational(latinDigits(e.target.value))}
      placeholder={country.iso === 'IR' ? '912 345 6789' : ''} aria-label={tr('شماره‌ی موبایل بدون کد کشور')} />
    {open && <div className="phone-menu" dir={dir()}>
      <input ref={search} className="phone-search" value={query} onChange={(e) => setQuery(e.target.value)}
        placeholder={tr('جست‌وجوی کشور یا کد')} aria-label={tr('جست‌وجوی کشور یا کد')} />
      <ul id={listId} role="listbox" aria-label={tr('کد کشور')}>
        {list.map((c) => <li key={c.iso} role="option" aria-selected={c.iso === country.iso}>
          <button type="button" className={c.iso === country.iso ? 'on' : ''} onClick={() => pick(c)}>
            <Flag iso={c.iso} />
            <span className="phone-country">{countryName(c.iso)}</span>
            <span className="phone-dial">+{c.dial}</span>
          </button>
        </li>)}
        {list.length === 0 && <li className="phone-none">{tr('کشوری پیدا نشد.')}</li>}
      </ul>
    </div>}
  </div>;
}

/** The flag as the system draws it, or the two-letter code where the system has no flag emoji. */
function Flag({ iso }: { iso: string }) {
  return flagsDrawn() ? <span className="phone-flag" aria-hidden="true">{flag(iso)}</span> : <span className="phone-flag as-code" aria-hidden="true">{iso}</span>;
}
