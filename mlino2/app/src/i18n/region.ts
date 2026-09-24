// Which language a place speaks, worked out on the phone: the location never leaves the device for this.
// The shapes are deliberately coarse (tens of kilometres at a border); they only choose a starting language,
// which the person can change at any time. Countries outside these shapes fall back to English.

export type Locale = 'fa' | 'en' | 'ar';
export type Region = 'fa' | 'ar' | 'other';

type Ring = ReadonlyArray<readonly [number, number]>; // [lat, lng]

// Iran, following the land borders and staying offshore of the Gulf states (Musandam, the UAE, Kuwait, Basra).
const IRAN: Ring = [
  [39.78, 44.77], [39.7, 45.9], [38.87, 46.5], [39.6, 47.8], [38.4, 48.9], [37.4, 49.9], [37.3, 53.9],
  [37.35, 54.4], [38.1, 57.2], [37.6, 59.4], [36.6, 61.1], [35.6, 61.3], [34.6, 61.05], [33.5, 60.9],
  [31.3, 61.8], [29.86, 60.87], [28.3, 62.8], [27.2, 63.3], [26.2, 61.9], [25.15, 61.6], [25.2, 58.0],
  [26.4, 57.0], [26.9, 56.0], [26.4, 54.5], [26.6, 53.3], [27.3, 52.2], [28.2, 51.0], [29.3, 50.3],
  [29.95, 48.95], [30.0, 48.6], [30.45, 48.05], [31.0, 47.7], [32.0, 47.45], [32.9, 46.15], [33.5, 45.8],
  [34.3, 45.45], [35.1, 45.95], [35.8, 45.95], [36.7, 45.05], [37.2, 44.85], [37.9, 44.3], [38.7, 44.3],
  [39.4, 44.4],
];

// Afghanistan (Dari is Persian).
const AFGHANISTAN: Ring = [
  [29.86, 60.87], [31.3, 61.8], [33.5, 60.9], [34.6, 61.05], [35.6, 61.3], [35.3, 62.3], [35.9, 63.1],
  [36.6, 64.6], [37.2, 65.7], [37.4, 67.8], [37.1, 68.9], [37.5, 70.2], [38.4, 71.4], [37.0, 74.9],
  [36.9, 72.5], [35.6, 71.6], [34.0, 71.1], [33.0, 70.0], [31.9, 69.3], [31.0, 68.0], [29.8, 66.3],
  [29.4, 64.5], [29.4, 62.5],
];

// Iraq, Syria, Lebanon, Jordan and the Arabian peninsula. Iran is tested first, so this shape may overlap its border.
const ARAB_EAST: Ring = [
  [35.9, 35.9], [36.8, 36.6], [36.7, 37.2], [37.1, 38.2], [37.1, 42.3], [37.4, 42.8], [37.2, 44.8],
  [35.0, 46.2], [33.0, 46.4], [31.0, 48.0], [29.9, 48.7], [28.5, 49.8], [26.3, 52.0], [26.35, 56.2],
  [26.1, 56.6], [24.9, 57.1], [23.2, 59.2], [22.5, 59.9], [19.5, 58.3], [16.6, 53.1], [12.5, 45.0],
  [12.6, 43.4], [16.0, 42.7], [21.5, 39.1], [28.0, 34.6], [29.4, 34.97], [29.5, 35.0], [31.5, 35.5],
  [32.3, 35.55], [32.7, 35.65], [33.1, 35.85], [33.1, 35.1], [34.7, 35.9],
];

// Egypt.
const EGYPT: Ring = [[31.6, 25.0], [31.5, 32.3], [31.3, 34.2], [29.5, 34.9], [22.0, 36.9], [22.0, 25.0]];

function inside([lat, lng]: readonly [number, number], ring: Ring): boolean {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [ay, ax] = ring[i]; const [by, bx] = ring[j];
    if ((ay > lat) !== (by > lat) && lng < ((bx - ax) * (lat - ay)) / (by - ay) + ax) hit = !hit;
  }
  return hit;
}

/** The language region of a point; `other` everywhere outside the shapes above. */
export function regionAt(lat: number, lng: number): Region {
  const p = [lat, lng] as const;
  if (inside(p, IRAN) || inside(p, AFGHANISTAN)) return 'fa';
  if (inside(p, ARAB_EAST) || inside(p, EGYPT)) return 'ar';
  return 'other';
}

const FA_ZONES = new Set(['Asia/Tehran', 'Asia/Kabul']);
const AR_ZONES = new Set(['Asia/Baghdad', 'Asia/Riyadh', 'Asia/Kuwait', 'Asia/Qatar', 'Asia/Bahrain', 'Asia/Dubai', 'Asia/Muscat',
  'Asia/Aden', 'Asia/Amman', 'Asia/Beirut', 'Asia/Damascus', 'Africa/Cairo']);

/** Before any location is known, the phone's time zone gives a first guess of the region (no permission needed). */
export function regionFromTimeZone(zone: string | undefined): Region | null {
  if (!zone) return null;
  if (FA_ZONES.has(zone)) return 'fa';
  if (AR_ZONES.has(zone)) return 'ar';
  return 'other';
}

/**
 * The starting language.
 * 1. A language the person chose themselves always wins.
 * 2. A phone set to Persian or Arabic is a deliberate choice, so it is kept wherever the person is.
 * 3. Otherwise the place decides: many phones in Iran are left in English, so an English phone in Tehran starts in Persian,
 *    and the same phone in Dubai starts in Arabic, in London in English.
 */
export function pickLocale(input: { chosen?: Locale | null; deviceLanguages?: readonly string[]; region?: Region | null }): Locale {
  if (input.chosen) return input.chosen;
  const device = (input.deviceLanguages?.[0] ?? '').toLowerCase();
  if (device.startsWith('fa') || device.startsWith('prs')) return 'fa';
  if (device.startsWith('ar')) return 'ar';
  if (input.region === 'fa') return 'fa';
  if (input.region === 'ar') return 'ar';
  if (input.region === 'other') return 'en';
  return 'fa'; // nothing known yet: MLINO's home market.
}
