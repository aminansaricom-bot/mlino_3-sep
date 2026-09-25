import { describe, expect, it } from 'vitest';
import { EN } from './en';
import { AR } from './ar';
import { TR } from './tr';
import { ES } from './es';
import { DE } from './de';
import { internationalNumber, plausibleNumber, flag, COUNTRIES } from './countries';
import { pickLocale, regionAt, regionFromTimeZone } from './region';

// Every tr('…') and msg('…') in the app needs an English and an Arabic entry with the same {n} placeholders.
// The app's source files as text (read by Vite); the dictionaries and the language core are skipped.
const SOURCES = import.meta.glob(['../**/*.ts', '../**/*.tsx', '!../**/*.test.ts', '!../**/*.test.tsx', '!./index.ts', '!./region.ts', '!./en.ts', '!./ar.ts'],
  { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
function keysInSource(): Map<string, string> {
  const found = new Map<string, string>();
  for (const [file, text] of Object.entries(SOURCES)) {
    for (const m of text.matchAll(/\b(?:tr|msg)\(\s*'((?:[^'\\]|\\.)*)'/g)) {
      const key = m[1].replace(/\\'/g, "'").replace(/\\n/g, '\n').replace(/\\\\/g, '\\');
      if (!found.has(key)) found.set(key, file);
    }
  }
  return found;
}
const holes = (s: string) => [...s.matchAll(/\{\d+\}/g)].map((m) => m[0]).sort().join(',');

describe('dictionaries', () => {
  const keys = keysInSource();
  it('finds the app texts', () => { expect(keys.size).toBeGreaterThan(300); });
  for (const [name, dict] of [['English', EN], ['Arabic', AR], ['Turkish', TR], ['Spanish', ES], ['German', DE]] as const) {
    it(`${name} has every text`, () => {
      const missing = [...keys].filter(([k]) => !dict[k]).map(([k, f]) => `${f}: ${k}`);
      expect(missing).toEqual([]);
    });
    it(`${name} keeps the spaces around text fragments`, () => {
      const edge = (s: string) => [/^\s/.test(s), /\s$/.test(s)].join();
      const wrong = [...keys.keys()].filter((k) => dict[k] && edge(dict[k]) !== edge(k));
      expect(wrong).toEqual([]);
    });
    it(`${name} keeps every placeholder`, () => {
      const wrong = [...keys.keys()].filter((k) => dict[k] && holes(dict[k]) !== holes(k));
      expect(wrong).toEqual([]);
    });
  }
});

describe('language from place', () => {
  it.each([
    ['Tehran', 35.7, 51.4, 'fa'], ['Tabriz', 38.08, 46.29, 'fa'], ['Mashhad', 36.3, 59.6, 'fa'], ['Bandar Abbas', 27.18, 56.27, 'fa'],
    ['Kish', 26.53, 53.98, 'fa'], ['Khorramshahr', 30.44, 48.18, 'fa'], ['Zahedan', 29.5, 60.86, 'fa'], ['Kabul', 34.53, 69.17, 'fa'],
    ['Herat', 34.35, 62.2, 'fa'], ['Basra', 30.51, 47.81, 'ar'], ['Baghdad', 33.31, 44.36, 'ar'], ['Najaf', 32.0, 44.33, 'ar'],
    ['Kuwait', 29.37, 47.98, 'ar'], ['Dubai', 25.2, 55.27, 'ar'], ['Musandam', 26.2, 56.25, 'ar'], ['Muscat', 23.59, 58.4, 'ar'],
    ['Doha', 25.29, 51.53, 'ar'], ['Riyadh', 24.71, 46.68, 'ar'], ['Beirut', 33.89, 35.5, 'ar'], ['Cairo', 30.04, 31.24, 'ar'],
    ['Istanbul', 41.0, 28.97, 'tr'], ['Van', 38.5, 43.38, 'tr'], ['Antakya', 36.2, 36.16, 'tr'], ['Izmir', 38.42, 27.14, 'tr'], ['Edirne', 41.68, 26.56, 'tr'],
    ['Aleppo', 36.2, 37.16, 'ar'], ['Rhodes', 36.43, 28.22, 'other'], ['Lesbos', 39.1, 26.55, 'other'], ['Tbilisi', 41.72, 44.79, 'other'],
    ['Berlin', 52.52, 13.4, 'de'], ['Munich', 48.14, 11.58, 'de'], ['Vienna', 48.21, 16.37, 'de'], ['Zurich', 47.37, 8.54, 'other'], ['Prague', 50.08, 14.44, 'other'],
    ['Madrid', 40.42, -3.7, 'es'], ['Barcelona', 41.39, 2.17, 'es'], ['Palma', 39.57, 2.65, 'es'], ['Tenerife', 28.29, -16.63, 'es'], ['Lisbon', 38.72, -9.14, 'other'],
    ['Mexico City', 19.43, -99.13, 'es'], ['Bogota', 4.71, -74.07, 'es'], ['Lima', -12.05, -77.04, 'es'], ['Buenos Aires', -34.6, -58.38, 'es'],
    ['Santiago', -33.45, -70.67, 'es'], ['Sao Paulo', -23.55, -46.63, 'other'], ['Brasilia', -15.79, -47.88, 'other'], ['Paris', 48.86, 2.35, 'other'], ['Yerevan', 40.18, 44.51, 'other'], ['Baku', 40.4, 49.87, 'other'],
    ['Ashgabat', 37.95, 58.38, 'other'], ['Karachi', 24.86, 67.0, 'other'], ['London', 51.5, -0.12, 'other'],
  ] as const)('%s', (_, lat, lng, region) => { expect(regionAt(lat, lng)).toBe(region); });

  it('uses the time zone before any location', () => {
    expect(regionFromTimeZone('Asia/Tehran')).toBe('fa');
    expect(regionFromTimeZone('Asia/Dubai')).toBe('ar');
    expect(regionFromTimeZone('Europe/Berlin')).toBe('de');
    expect(regionFromTimeZone('Europe/Istanbul')).toBe('tr');
    expect(regionFromTimeZone('America/Argentina/Buenos_Aires')).toBe('es');
    expect(regionFromTimeZone('Europe/Paris')).toBe('other');
    expect(regionFromTimeZone(undefined)).toBeNull();
  });

  it('keeps a chosen language, then the country of the phone number, then the phone language, then follows the place', () => {
    expect(pickLocale({ chosen: 'en', deviceLanguages: ['fa-IR'], region: 'fa' })).toBe('en');
    expect(pickLocale({ deviceLanguages: ['fa-IR'], region: 'other' })).toBe('fa');
    expect(pickLocale({ deviceLanguages: ['ar-IQ'], region: 'fa' })).toBe('ar');
    // Many phones in Iran are left in English: the place wins over an English phone.
    expect(pickLocale({ deviceLanguages: ['en-US'], region: 'fa' })).toBe('fa');
    expect(pickLocale({ deviceLanguages: ['en-US'], region: 'ar' })).toBe('ar');
    expect(pickLocale({ deviceLanguages: ['de-DE'], region: 'other' })).toBe('de');
    expect(pickLocale({ deviceLanguages: ['fr-FR'], region: 'other' })).toBe('en');
    expect(pickLocale({ deviceLanguages: ['en-US'], region: 'tr' })).toBe('tr');
    expect(pickLocale({ countryLang: 'de', deviceLanguages: ['fa-IR'], region: 'fa' })).toBe('de');
    expect(pickLocale({ chosen: 'es', countryLang: 'de' })).toBe('es');
    expect(pickLocale({ deviceLanguages: ['en-US'], region: null })).toBe('fa');
  });
});

describe('switching with the place', () => {
  it('follows a new region, offers the previous language back, and stops once the person chooses', async () => {
    const i18n = await import('./index');
    Object.defineProperty(navigator, 'languages', { value: ['en-US'], configurable: true });
    i18n.noteLocation(35.7, 51.4); // Tehran
    expect(i18n.locale()).toBe('fa');
    i18n.noteLocation(25.2, 55.27); // Dubai
    expect(i18n.locale()).toBe('ar');
    expect(i18n.pendingAutoSwitch()).toEqual({ from: 'fa', to: 'ar' });
    i18n.noteLocation(25.21, 55.28); // same region: nothing changes
    expect(i18n.locale()).toBe('ar');
    i18n.chooseLocale('en');
    expect(i18n.pendingAutoSwitch()).toBeNull();
    i18n.noteLocation(35.7, 51.4);
    expect(i18n.locale()).toBe('en');
    expect(i18n.tr('{0} از {1}', 2, 5)).toBe('2 of 5');
    expect(i18n.num(76000)).toBe('76,000');
    i18n.chooseLocale('fa');
    expect(i18n.num(76000)).toBe('۷۶٬۰۰۰');
    i18n.chooseLocale('ar');
    expect(i18n.num(76000)).toBe('٧٦٬٠٠٠');
    i18n.chooseLocale('fa');
  });
});

describe('phone number with a country code', () => {
  const ir = COUNTRIES.find((c) => c.iso === 'IR')!;
  const de = COUNTRIES.find((c) => c.iso === 'DE')!;
  it('sends the number as the server takes it', () => {
    expect(internationalNumber(ir, '0912 345 6789')).toBe('+989123456789');
    expect(internationalNumber(ir, '9000000090')).toBe('+989000000090');
    expect(internationalNumber(de, '0151 2345678')).toBe('+491512345678');
    expect(internationalNumber(ir, '+98 912 345 6789')).toBe('+989123456789');
    expect(internationalNumber(ir, '0098 9123456789')).toBe('+989123456789');
  });
  it('knows when a number is complete', () => {
    expect(plausibleNumber(ir, '912345678')).toBe(false);
    expect(plausibleNumber(ir, '09123456789')).toBe(true);
    expect(plausibleNumber(de, '1512345678')).toBe(true);
  });
  it('draws each flag from its two letters', () => { expect(flag('IR')).toBe('🇮🇷'); expect(flag('de')).toBe('🇩🇪'); });
  it('lists every country once', () => { expect(new Set(COUNTRIES.map((c) => c.iso)).size).toBe(COUNTRIES.length); });
  it('a language chosen in My space is not overridden by the country', async () => {
    const i18n = await import('./index');
    i18n.chooseLocale('tr');
    expect(i18n.dir()).toBe('ltr');
    i18n.setCountryLanguage('de');
    expect(i18n.locale()).toBe('tr');
    i18n.chooseLocale('fa');
  });
});
