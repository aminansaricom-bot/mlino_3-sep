import { locale, type Locale } from './index';

// Countries for the phone number's code. Each one also names the language MLINO starts in when it is picked.
// The flag is the system's own emoji (drawn by the phone; no image is downloaded) and the name comes from
// the browser in the current language, so no country names are stored here.

export type Country = Readonly<{ iso: string; dial: string; lang: Locale }>;

export const COUNTRIES: readonly Country[] = [
  { iso: 'IR', dial: '98', lang: 'fa' },
  { iso: 'AF', dial: '93', lang: 'fa' },
  { iso: 'TR', dial: '90', lang: 'tr' },
  { iso: 'IQ', dial: '964', lang: 'ar' },
  { iso: 'AE', dial: '971', lang: 'ar' },
  { iso: 'SA', dial: '966', lang: 'ar' },
  { iso: 'KW', dial: '965', lang: 'ar' },
  { iso: 'QA', dial: '974', lang: 'ar' },
  { iso: 'BH', dial: '973', lang: 'ar' },
  { iso: 'OM', dial: '968', lang: 'ar' },
  { iso: 'JO', dial: '962', lang: 'ar' },
  { iso: 'LB', dial: '961', lang: 'ar' },
  { iso: 'SY', dial: '963', lang: 'ar' },
  { iso: 'EG', dial: '20', lang: 'ar' },
  { iso: 'DE', dial: '49', lang: 'de' },
  { iso: 'AT', dial: '43', lang: 'de' },
  { iso: 'CH', dial: '41', lang: 'de' },
  { iso: 'ES', dial: '34', lang: 'es' },
  { iso: 'MX', dial: '52', lang: 'es' },
  { iso: 'AR', dial: '54', lang: 'es' },
  { iso: 'CO', dial: '57', lang: 'es' },
  { iso: 'CL', dial: '56', lang: 'es' },
  { iso: 'PE', dial: '51', lang: 'es' },
  { iso: 'VE', dial: '58', lang: 'es' },
  { iso: 'GB', dial: '44', lang: 'en' },
  { iso: 'US', dial: '1', lang: 'en' },
  { iso: 'CA', dial: '1', lang: 'en' },
  { iso: 'AU', dial: '61', lang: 'en' },
  { iso: 'FR', dial: '33', lang: 'en' },
  { iso: 'IT', dial: '39', lang: 'en' },
  { iso: 'NL', dial: '31', lang: 'en' },
  { iso: 'SE', dial: '46', lang: 'en' },
  { iso: 'AM', dial: '374', lang: 'en' },
  { iso: 'AZ', dial: '994', lang: 'en' },
  { iso: 'GE', dial: '995', lang: 'en' },
  { iso: 'PK', dial: '92', lang: 'en' },
  { iso: 'IN', dial: '91', lang: 'en' },
];

/** Numbers MLINO can send a sign-in code to today (the SMS service reaches Iranian mobiles only). */
export const SMS_COUNTRIES: ReadonlySet<string> = new Set(['IR']);

/** 🇮🇷 from «IR»: two regional-indicator letters, which the phone draws as the flag. */
export function flag(iso: string): string {
  return String.fromCodePoint(...[...iso.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

let flagSupport: boolean | null = null;
/** Whether this system draws flag emoji in colour (phones do; Windows shows two letters instead). */
export function flagsDrawn(): boolean {
  if (flagSupport !== null) return flagSupport;
  try {
    const c = document.createElement('canvas'); c.width = 32; c.height = 32;
    const g = c.getContext('2d', { willReadFrequently: true });
    if (!g) return (flagSupport = true);
    g.font = '28px sans-serif'; g.textBaseline = 'top'; g.fillText(flag('DE'), 0, 0);
    const d = g.getImageData(0, 0, 32, 32).data;
    let coloured = false;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 0 && (Math.abs(d[i] - d[i + 1]) > 40 || Math.abs(d[i + 1] - d[i + 2]) > 40)) { coloured = true; break; }
    flagSupport = coloured;
  } catch { flagSupport = true; }
  return flagSupport;
}

const names = new Map<string, Intl.DisplayNames | null>();
/** The country's name in the current language («Iran», «ایران», «İran»…); the code itself when the browser can't name it. */
export function countryName(iso: string): string {
  const l = locale();
  if (!names.has(l)) {
    try { names.set(l, new Intl.DisplayNames([l], { type: 'region' })); } catch { names.set(l, null); }
  }
  try { return names.get(l)?.of(iso) ?? iso; } catch { return iso; }
}

const ZONE_COUNTRY: Readonly<Record<string, string>> = {
  'Asia/Tehran': 'IR', 'Asia/Kabul': 'AF', 'Europe/Istanbul': 'TR', 'Asia/Baghdad': 'IQ', 'Asia/Dubai': 'AE', 'Asia/Riyadh': 'SA',
  'Asia/Kuwait': 'KW', 'Asia/Qatar': 'QA', 'Asia/Bahrain': 'BH', 'Asia/Muscat': 'OM', 'Asia/Amman': 'JO', 'Asia/Beirut': 'LB',
  'Asia/Damascus': 'SY', 'Africa/Cairo': 'EG', 'Europe/Berlin': 'DE', 'Europe/Vienna': 'AT', 'Europe/Zurich': 'CH', 'Europe/Madrid': 'ES',
  'America/Mexico_City': 'MX', 'America/Bogota': 'CO', 'America/Santiago': 'CL', 'America/Lima': 'PE', 'America/Caracas': 'VE',
  'Europe/London': 'GB', 'America/New_York': 'US', 'America/Chicago': 'US', 'America/Los_Angeles': 'US', 'America/Toronto': 'CA',
  'Australia/Sydney': 'AU', 'Europe/Paris': 'FR', 'Europe/Rome': 'IT', 'Europe/Amsterdam': 'NL', 'Europe/Stockholm': 'SE',
  'Asia/Yerevan': 'AM', 'Asia/Baku': 'AZ', 'Asia/Tbilisi': 'GE', 'Asia/Karachi': 'PK', 'Asia/Kolkata': 'IN',
};

/** The first guess for the code: the phone's time zone, else Iran. */
export function defaultCountry(): Country {
  let zone: string | undefined;
  try { zone = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { zone = undefined; }
  const iso = zone ? ZONE_COUNTRY[zone] ?? (zone.startsWith('America/Argentina/') ? 'AR' : undefined) : undefined;
  return COUNTRIES.find((c) => c.iso === iso) ?? COUNTRIES[0];
}

/**
 * The number as the server takes it. For Iran «0912 345 6789», «912…» and «+98 912…» all become «+989123456789»;
 * for other countries the national number follows the code without its leading 0.
 */
export function internationalNumber(country: Country, national: string): string {
  return `+${country.dial}${nationalDigits(country, national)}`;
}

/** The digits after the code: a pasted «+98 912…» or «0098 912…» loses its code, and «0912…» its leading 0. */
function nationalDigits(country: Country, national: string): string {
  const raw = national.trim();
  let digits = raw.replace(/\D/g, '');
  if (/^(\+|00)/.test(raw)) {
    digits = digits.replace(/^00/, '');
    if (digits.startsWith(country.dial)) digits = digits.slice(country.dial.length);
  }
  return digits.replace(/^0+/, '');
}

/** Enough digits to try: Iranian mobiles are 9 and 9 more digits; elsewhere at least 6. */
export function plausibleNumber(country: Country, national: string): boolean {
  const digits = nationalDigits(country, national);
  return country.iso === 'IR' ? /^9\d{9}$/.test(digits) : digits.length >= 6 && digits.length <= 14;
}
