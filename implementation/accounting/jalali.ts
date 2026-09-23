// Jalali (Solar Hijri) calendar, used for Persian dates, monthly reports and seasonal VAT periods.
// Arithmetic follows the well-known break-year algorithm (as in jalaali-js, MIT), written out here
// so the module adds no dependency. Internally the ledger stores ISO Gregorian dates (YYYY-MM-DD).

import { AccountingError } from './errors';

export type JalaliDate = Readonly<{ jy: number; jm: number; jd: number }>;

const BREAKS = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];
const div = (a: number, b: number) => Math.trunc(a / b);
const mod = (a: number, b: number) => a - Math.trunc(a / b) * b;

function jalCal(jy: number) {
  const gy = jy + 621;
  let leapJ = -14;
  let jp = BREAKS[0];
  let jump = 0;
  if (jy < jp || jy >= BREAKS[BREAKS.length - 1]) throw new AccountingError('DATE_INVALID', `Jalali year ${jy} out of range`);
  for (let i = 1; i < BREAKS.length; i += 1) {
    const jm = BREAKS[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  let n = jy - jp;
  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;
  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;
  return { leap, gy, march };
}

function g2d(gy: number, gm: number, gd: number): number {
  let d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4) + div(153 * mod(gm + 9, 12) + 2, 5) + gd - 34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

function d2g(jdn: number) {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

function j2d(jy: number, jm: number, jd: number): number {
  const r = jalCal(jy);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}

function d2j(jdn: number): JalaliDate {
  const gy = d2g(jdn).gy;
  let jy = gy - 621;
  const r = jalCal(jy);
  const jdn1f = g2d(gy, 3, r.march);
  let k = jdn - jdn1f;
  if (k >= 0) {
    if (k <= 185) return { jy, jm: 1 + div(k, 31), jd: mod(k, 31) + 1 };
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    if (r.leap === 1) k += 1;
  }
  return { jy, jm: 7 + div(k, 30), jd: mod(k, 30) + 1 };
}

export function isJalaliLeap(jy: number): boolean {
  return jalCal(jy).leap === 0;
}

export function jalaliMonthLength(jy: number, jm: number): number {
  if (jm < 1 || jm > 12) throw new AccountingError('DATE_INVALID', `month ${jm}`);
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isJalaliLeap(jy) ? 30 : 29;
}

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Validates an ISO Gregorian date string (YYYY-MM-DD) and returns it unchanged. */
export function assertIsoDate(value: unknown, field = 'date'): string {
  const m = typeof value === 'string' ? ISO.exec(value) : null;
  if (!m) throw new AccountingError('DATE_INVALID', `${field} must be YYYY-MM-DD`);
  const [gy, gm, gd] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const back = d2g(g2d(gy, gm, gd));
  if (back.gy !== gy || back.gm !== gm || back.gd !== gd) throw new AccountingError('DATE_INVALID', `${field} is not a real date`);
  return value as string;
}

const pad = (n: number, w = 2) => String(n).padStart(w, '0');

export function toJalali(iso: string): JalaliDate {
  const m = ISO.exec(assertIsoDate(iso))!;
  return d2j(g2d(Number(m[1]), Number(m[2]), Number(m[3])));
}

export function fromJalali(jy: number, jm: number, jd: number): string {
  if (!Number.isInteger(jd) || jd < 1 || jd > jalaliMonthLength(jy, jm)) throw new AccountingError('DATE_INVALID', `day ${jd}`);
  const g = d2g(j2d(jy, jm, jd));
  return `${pad(g.gy, 4)}-${pad(g.gm)}-${pad(g.gd)}`;
}

export function formatJalali(iso: string): string {
  const j = toJalali(iso);
  return `${j.jy}/${pad(j.jm)}/${pad(j.jd)}`;
}

export const JALALI_MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'] as const;

export type DateRange = Readonly<{ from: string; to: string; label: string }>;

/** Inclusive ISO range of a Jalali month. */
export function jalaliMonthRange(jy: number, jm: number): DateRange {
  return { from: fromJalali(jy, jm, 1), to: fromJalali(jy, jm, jalaliMonthLength(jy, jm)), label: `${JALALI_MONTHS[jm - 1]} ${jy}` };
}

/** Inclusive ISO range of a Jalali season (فصل), the usual period of an Iranian VAT return. */
export function jalaliSeasonRange(jy: number, season: 1 | 2 | 3 | 4): DateRange {
  const first = (season - 1) * 3 + 1;
  const names = ['بهار', 'تابستان', 'پاییز', 'زمستان'];
  return { from: fromJalali(jy, first, 1), to: fromJalali(jy, first + 2, jalaliMonthLength(jy, first + 2)), label: `${names[season - 1]} ${jy}` };
}
