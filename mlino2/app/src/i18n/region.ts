// Which language a place speaks, worked out on the phone: the location never leaves the device for this.
// The shapes are deliberately coarse (tens of kilometres at a border); they only choose a starting language,
// which the person can change at any time. Countries outside these shapes fall back to English.

export type Locale = 'fa' | 'en' | 'ar' | 'tr' | 'es' | 'de';
export type Region = 'fa' | 'ar' | 'tr' | 'de' | 'es' | 'other';

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

// Turkey, including Thrace and Hatay; tested before the Arab shape, and kept off the Greek islands.
const TURKEY: Ring = [
  [42.05, 28.0], [41.95, 27.3], [41.7, 26.3], [40.9, 26.35], [40.05, 26.15], [39.5, 26.45], [38.9, 26.9], [38.3, 26.4],
  [37.8, 27.3], [37.0, 27.5], [36.8, 28.3], [36.2, 29.6], [36.1, 32.5], [36.2, 33.9], [36.6, 34.9], [36.0, 35.8],
  [35.85, 35.95], [36.25, 36.55], [36.65, 36.6], [36.62, 37.2], [36.8, 38.0], [36.68, 39.0], [36.9, 40.2], [37.05, 41.2],
  [37.1, 42.3], [37.35, 43.5], [37.2, 44.6], [37.9, 44.35], [38.7, 44.3], [39.4, 44.4], [39.8, 44.6], [40.1, 43.7],
  [41.0, 43.45], [41.2, 42.8], [41.5, 41.55], [42.2, 41.0], [42.3, 35.0], [41.9, 31.0],
];

// Germany and Austria (not Switzerland, which is several languages).
const GERMAN: Ring = [
  [54.9, 8.5], [54.8, 9.9], [54.8, 11.0], [54.7, 13.5], [53.9, 14.2], [52.8, 14.6], [52.1, 14.7], [51.0, 15.0],
  [50.9, 14.8], [50.6, 13.9], [50.3, 12.2], [49.3, 12.6], [48.8, 13.6], [48.6, 13.8], [48.8, 14.9], [49.0, 15.3],
  [48.8, 16.9], [48.0, 17.1], [47.5, 16.5], [46.9, 16.1], [46.5, 15.0], [46.6, 13.7], [46.9, 12.2], [46.8, 10.5],
  [47.0, 9.6], [47.55, 9.6], [47.6, 8.5], [47.55, 7.6], [48.9, 8.2], [49.1, 6.8], [49.6, 6.4], [50.3, 6.1],
  [50.75, 6.0], [51.8, 6.0], [52.2, 7.0], [53.3, 7.2], [53.6, 7.0], [54.0, 8.3],
];

// Spain with the Balearic Islands (Portugal and France stay outside), and the Canary Islands.
const SPAIN: Ring = [
  [43.8, -8.0], [43.6, -1.8], [42.8, 0.0], [42.5, 3.3], [41.5, 3.3], [39.8, 4.4], [38.6, 1.2], [37.5, -0.6],
  [36.7, -2.2], [36.0, -5.6], [36.8, -6.4], [37.2, -7.4], [38.0, -7.0], [38.8, -7.1], [39.6, -7.5], [40.0, -6.9],
  [41.0, -6.8], [41.9, -6.5], [41.9, -8.2], [42.1, -8.9], [42.9, -9.3],
];
const CANARIES: Ring = [[29.5, -18.3], [29.5, -13.2], [27.5, -13.2], [27.5, -18.3]];

// Spanish-speaking America: Mexico and Central America, and South America without Brazil.
const MEXICO_CENTRAL: Ring = [
  [32.7, -117.1], [32.5, -114.8], [31.3, -111.0], [31.3, -108.2], [31.8, -106.5], [29.5, -104.5], [29.8, -101.4],
  [27.5, -99.5], [25.9, -97.2], [21.5, -86.8], [15.9, -88.2], [10.9, -83.6], [9.5, -79.5], [7.2, -77.8],
  [8.0, -82.9], [13.0, -87.8], [14.5, -92.3], [15.8, -96.5], [18.5, -103.5], [22.9, -110.0], [28.0, -115.5],
];
const SOUTH_SPANISH: Ring = [
  [12.5, -71.7], [10.6, -66.0], [10.7, -62.0], [8.5, -60.0], [5.2, -60.7], [4.0, -62.5], [1.2, -64.0], [1.2, -66.9],
  [-0.1, -70.0], [-4.2, -69.9], [-7.5, -73.7], [-9.4, -72.7], [-10.9, -69.6], [-11.0, -65.3], [-13.5, -61.0],
  [-16.3, -58.3], [-19.8, -58.1], [-22.2, -55.8], [-24.0, -54.3], [-25.6, -54.6], [-27.1, -53.8], [-28.0, -55.8],
  [-30.2, -57.6], [-31.0, -55.9], [-32.4, -53.3], [-33.75, -53.4], [-35.0, -53.0], [-40.0, -60.0], [-55.5, -66.0],
  [-56.0, -68.0], [-53.0, -75.5], [-45.0, -76.0], [-30.0, -72.5], [-18.3, -70.8], [-15.5, -75.5], [-12.0, -77.6], [-8.0, -79.6], [-5.0, -82.0], [1.5, -80.5],
  [7.0, -78.5], [8.7, -77.3],
];

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
  if (inside(p, TURKEY)) return 'tr';
  if (inside(p, ARAB_EAST) || inside(p, EGYPT)) return 'ar';
  if (inside(p, GERMAN)) return 'de';
  if (inside(p, SPAIN) || inside(p, CANARIES) || inside(p, MEXICO_CENTRAL) || inside(p, SOUTH_SPANISH)) return 'es';
  return 'other';
}

const FA_ZONES = new Set(['Asia/Tehran', 'Asia/Kabul']);
const AR_ZONES = new Set(['Asia/Baghdad', 'Asia/Riyadh', 'Asia/Kuwait', 'Asia/Qatar', 'Asia/Bahrain', 'Asia/Dubai', 'Asia/Muscat',
  'Asia/Aden', 'Asia/Amman', 'Asia/Beirut', 'Asia/Damascus', 'Africa/Cairo']);
const TR_ZONES = new Set(['Europe/Istanbul', 'Asia/Istanbul']);
const DE_ZONES = new Set(['Europe/Berlin', 'Europe/Vienna', 'Europe/Busingen']);
const ES_ZONES = new Set(['Europe/Madrid', 'Atlantic/Canary', 'Africa/Ceuta', 'America/Mexico_City', 'America/Monterrey', 'America/Cancun',
  'America/Tijuana', 'America/Guatemala', 'America/El_Salvador', 'America/Tegucigalpa', 'America/Managua', 'America/Costa_Rica',
  'America/Panama', 'America/Bogota', 'America/Caracas', 'America/Guayaquil', 'America/Lima', 'America/La_Paz', 'America/Santiago',
  'America/Asuncion', 'America/Montevideo', 'America/Havana', 'America/Santo_Domingo', 'America/Puerto_Rico']);

/** Before any location is known, the phone's time zone gives a first guess of the region (no permission needed). */
export function regionFromTimeZone(zone: string | undefined): Region | null {
  if (!zone) return null;
  if (FA_ZONES.has(zone)) return 'fa';
  if (AR_ZONES.has(zone)) return 'ar';
  if (TR_ZONES.has(zone)) return 'tr';
  if (DE_ZONES.has(zone)) return 'de';
  if (ES_ZONES.has(zone) || zone.startsWith('America/Argentina/')) return 'es';
  return 'other';
}

const DEVICE: ReadonlyArray<[string, Locale]> = [['fa', 'fa'], ['prs', 'fa'], ['ar', 'ar'], ['tr', 'tr'], ['es', 'es'], ['de', 'de']];

/**
 * The starting language.
 * 1. A language the person chose themselves always wins.
 * 2. The country of the phone number they entered on the welcome screen (+49 → Deutsch).
 * 3. A phone set to Persian, Arabic, Turkish, Spanish or German is a deliberate choice, so it is kept wherever the person is.
 * 4. Otherwise the place decides: many phones in Iran are left in English, so an English phone in Tehran starts in Persian,
 *    and the same phone in Dubai starts in Arabic, in Istanbul in Turkish, in London in English.
 */
export function pickLocale(input: { chosen?: Locale | null; countryLang?: Locale | null; deviceLanguages?: readonly string[]; region?: Region | null }): Locale {
  if (input.chosen) return input.chosen;
  if (input.countryLang) return input.countryLang;
  const device = (input.deviceLanguages?.[0] ?? '').toLowerCase();
  const fromDevice = DEVICE.find(([prefix]) => device === prefix || device.startsWith(prefix + '-'));
  if (fromDevice) return fromDevice[1];
  if (input.region && input.region !== 'other') return input.region;
  if (input.region === 'other') return 'en';
  return 'fa'; // nothing known yet: MLINO's home market.
}
