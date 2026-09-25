import { useSyncExternalStore } from 'react';
import { pickLocale, regionAt, regionFromTimeZone, type Locale, type Region } from './region';
import { EN } from './en';
import { AR } from './ar';
import { TR } from './tr';
import { ES } from './es';
import { DE } from './de';

// The app's texts are written in Persian, and the Persian text itself is the key: tr('ویترین زنده') returns
// «Live storefront» in English. A text missing from a dictionary shows in Persian rather than breaking the screen,
// and i18n.test.ts fails the build when any tr('…') in the code has no English or Arabic entry.
// Business content (names, products, descriptions) is shown exactly as the business published it.

export type { Locale, Region } from './region';
export { regionAt } from './region';

const DICTS: Record<Locale, Readonly<Record<string, string>> | null> = { fa: null, en: EN, ar: AR, tr: TR, es: ES, de: DE };
export const LOCALES: ReadonlyArray<{ id: Locale; name: string }> = [
  { id: 'fa', name: 'فارسی' }, { id: 'en', name: 'English' }, { id: 'ar', name: 'العربية' },
  { id: 'tr', name: 'Türkçe' }, { id: 'es', name: 'Español' }, { id: 'de', name: 'Deutsch' },
];
const STORE_KEY = 'mlino.locale';

// chosen: picked in My space; countryLang: from the phone number's country on the welcome screen; region: last place seen.
type Saved = { chosen?: Locale; countryLang?: Locale; region?: Region };
function readSaved(): Saved {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}') as Saved; } catch { return {}; }
}
function writeSaved(s: Saved) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch { /* private window: the choice lasts this visit */ }
}
function deviceLanguages(): string[] {
  try { return [...(navigator.languages ?? [navigator.language])].filter(Boolean); } catch { return []; }
}
function timeZone(): string | undefined {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return undefined; }
}
function urlChoice(): Locale | null {
  try {
    const q = new URLSearchParams(location.search).get('lang');
    return LOCALES.some((l) => l.id === q) ? q as Locale : null;
  } catch { return null; }
}

let saved = readSaved();
const fromUrl = urlChoice();
if (fromUrl) { saved = { ...saved, chosen: fromUrl }; writeSaved(saved); }
let current: Locale = pickLocale({ chosen: saved.chosen, countryLang: saved.countryLang, deviceLanguages: deviceLanguages(), region: saved.region ?? regionFromTimeZone(timeZone()) });

/** Set when the language changed by itself after a location fix, so the screen can offer a one-tap undo. */
let autoSwitch: { from: Locale; to: Locale } | null = null;
const listeners = new Set<() => void>();
function emit() { applyDocument(); listeners.forEach((fn) => fn()); }

function applyDocument() {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = current;
  document.documentElement.dir = dir();
  document.title = current === 'fa' ? 'ملینو' : current === 'ar' ? 'ملينو' : 'MLINO';
}
applyDocument();

export function locale(): Locale { return current; }
export function dir(l: Locale = current): 'rtl' | 'ltr' { return l === 'fa' || l === 'ar' ? 'rtl' : 'ltr'; }
export function isChosen(): boolean { return !!saved.chosen; }

/** The person picked a language: it is kept until they pick another. */
export function chooseLocale(l: Locale) {
  saved = { ...saved, chosen: l }; writeSaved(saved);
  autoSwitch = null;
  if (l !== current) { current = l; }
  emit();
}

/**
 * Called with every real location fix. Unless the person chose a language, the place decides it
 * (see pickLocale). Only a change of region switches the language, so walking around never flips it.
 */
export function noteLocation(lat: number, lng: number) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
  const region = regionAt(lat, lng);
  if (region === saved.region) return;
  saved = { ...saved, region }; writeSaved(saved);
  if (saved.chosen) return;
  const next = pickLocale({ countryLang: saved.countryLang, deviceLanguages: deviceLanguages(), region });
  if (next === current) return;
  autoSwitch = { from: current, to: next };
  current = next;
  emit();
}

/**
 * The country picked for the phone number on the welcome screen sets the default language (+90 → Türkçe),
 * unless the person already chose a language in My space.
 */
export function setCountryLanguage(l: Locale) {
  saved = { ...saved, countryLang: l }; writeSaved(saved);
  if (saved.chosen || l === current) return;
  autoSwitch = null;
  current = l;
  emit();
}

export function pendingAutoSwitch() { return autoSwitch; }
export function dismissAutoSwitch() { autoSwitch = null; emit(); }

export function subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
/** Re-renders the calling component when the language changes. */
export function useLocale(): Locale { return useSyncExternalStore(subscribe, locale, locale); }

/**
 * The text in the current language. `{0}`, `{1}`… are filled from `args`, so a sentence keeps its own word order
 * in every language: tr('{0} از ۵', avg) → «{0} of 5».
 */
export function tr(fa: string, ...args: ReadonlyArray<string | number>): string {
  const dict = DICTS[current];
  const text = (dict && dict[fa]) || fa;
  return args.length ? text.replace(/\{(\d+)\}/g, (m, i: string) => (Number(i) < args.length ? String(args[Number(i)]) : m)) : text;
}

// Arabic with Arabic-Indic digits (٠١٢…), as read in Iraq and the Gulf; plain 'ar' gives Latin digits in some browsers.
const NUMBER_LOCALE: Record<Locale, string> = { fa: 'fa-IR', en: 'en-US', ar: 'ar-u-nu-arab', tr: 'tr-TR', es: 'es-ES', de: 'de-DE' };
export function numberLocale(): string { return NUMBER_LOCALE[current]; }
/** A number written with the current language's digits and grouping. */
export function num(n: number, options?: Intl.NumberFormatOptions): string { return n.toLocaleString(NUMBER_LOCALE[current], options); }
/** Digits inside a ready string (phone hints, times) in the current language's script. */
export function digits(text: string): string {
  const s = String(text);
  if (current === 'fa') return s.replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
  if (current === 'ar') return s.replace(/[0-9۰-۹]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[/[0-9]/.test(d) ? Number(d) : '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)]);
  // Latin digits for English, Turkish, Spanish and German.
  return s.replace(/[۰-۹٠-٩]/g, (d) => String(Math.max('۰۱۲۳۴۵۶۷۸۹'.indexOf(d), '٠١٢٣٤٥٦٧٨٩'.indexOf(d))));
}
/** Speech recognition and synthesis language. */
const SPEECH: Record<Locale, string> = { fa: 'fa-IR', en: 'en-US', ar: 'ar-SA', tr: 'tr-TR', es: 'es-ES', de: 'de-DE' };
export function speechLang(): string { return SPEECH[current]; }

/** Marks a Persian text kept in a constant; it is translated with tr() where it is shown (the dictionary test collects both). */
export function msg(fa: string): string { return fa; }
/** Persian or Arabic-Indic digits typed by the person, as Latin digits for codes and phone numbers. */
export function latinDigits(text: string): string {
  return text.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}
