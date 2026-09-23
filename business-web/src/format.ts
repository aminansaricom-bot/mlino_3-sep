import { AccountingError, assertIsoDate, formatJalali, fromJalali, toJalali, JALALI_MONTHS } from './engine';

const FA = new Intl.NumberFormat('fa-IR');
export const faNum = (n: number) => FA.format(n);
export const rial = (n: number) => `${faNum(n)} ریال`;

/** Short form for dashboards: 1,260,000,000 → «۱٫۲۶ میلیارد». */
export function compactRial(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  const fmt = (v: number, unit: string) => `${sign}${new Intl.NumberFormat('fa-IR', { maximumFractionDigits: v < 10 ? 2 : v < 100 ? 1 : 0 }).format(v)} ${unit}`;
  if (abs >= 1e9) return fmt(abs / 1e9, 'میلیارد ریال');
  if (abs >= 1e6) return fmt(abs / 1e6, 'میلیون ریال');
  return `${sign}${faNum(abs)} ریال`;
}

/** Accepts Persian, Arabic or Latin digits with separators; returns a whole number or null. */
export function parseAmount(text: string): number | null {
  const latin = text.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
  const clean = latin.replace(/[,،٬\s]/g, '');
  if (!/^\d{1,16}$/.test(clean)) return null;
  const n = Number(clean);
  return Number.isSafeInteger(n) ? n : null;
}

export const toFaDigits = (s: string) => s.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
export const jDate = (iso: string) => toFaDigits(formatJalali(iso));
export function jDateLong(iso: string): string {
  const j = toJalali(iso);
  return `${faNum(j.jd)} ${JALALI_MONTHS[j.jm - 1]} ${toFaDigits(String(j.jy))}`;
}

/** «۱۴۰۵/۰۷/۰۱» or «1405/7/1» → ISO date, or null. */
export function parseJalaliInput(text: string): string | null {
  const latin = text.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).trim();
  const m = /^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/.exec(latin);
  if (!m) return null;
  try { return fromJalali(Number(m[1]), Number(m[2]), Number(m[3])); } catch { return null; }
}

export function todayIso(now = new Date()): string {
  // The business day follows Tehran time (UTC+3:30, no DST since 1402).
  const tehran = new Date(now.getTime() + 210 * 60_000);
  return assertIsoDate(tehran.toISOString().slice(0, 10));
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const MESSAGES: Record<string, string> = {
  AMOUNT_INVALID: 'مبلغ باید یک عدد صحیح مثبت (ریال) باشد.',
  VAT_RATE_INVALID: 'نرخ ارزش افزوده نامعتبر است.',
  DATE_INVALID: 'تاریخ درست نیست.',
  ENTRY_UNBALANCED: 'سند تراز نیست.',
  ENTRY_EMPTY: 'سند خالی است.',
  LINE_INVALID: 'یکی از ردیف‌های سند درست نیست.',
  ACCOUNT_UNKNOWN: 'حساب پیدا نشد.',
  ACCOUNT_INACTIVE: 'این حساب غیرفعال است.',
  PARTY_REQUIRED: 'برای مانده‌ی نسیه، طرف حساب را انتخاب کن.',
  PARTY_UNKNOWN: 'طرف حساب پیدا نشد.',
  TREASURY_REQUIRED: 'صندوق یا بانک را انتخاب کن.',
  TREASURY_UNKNOWN: 'صندوق یا بانک پیدا نشد.',
  CHEQUE_REQUIRED: 'اطلاعات چک کامل نیست.',
  CHEQUE_UNKNOWN: 'چک پیدا نشد.',
  CHEQUE_EXISTS: 'این چک قبلاً ثبت شده است.',
  CHEQUE_TRANSITION: 'وضعیت این چک اجازه‌ی این کار را نمی‌دهد.',
  PERIOD_LOCKED: 'این دوره بسته شده و ثبت در آن ممکن نیست.',
  ENTRY_ALREADY_REVERSED: 'این سند قبلاً برگشت خورده است.',
  ID_EXISTS: 'این مورد قبلاً ثبت شده است.',
};

export function errorText(error: unknown): string {
  if (error instanceof AccountingError) {
    if (error.code === 'DOCUMENT_INVALID') return docInvalid(error.message);
    return MESSAGES[error.code] ?? 'ثبت انجام نشد.';
  }
  return 'ثبت انجام نشد.';
}

function docInvalid(message: string): string {
  if (message.includes('remainder needs a customer')) return 'برای فروش نسیه، مشتری را انتخاب کن.';
  if (message.includes('remainder needs a supplier')) return 'برای خرید نسیه، تأمین‌کننده را انتخاب کن.';
  if (message.includes('exceed')) return 'مبلغ پرداخت از جمع بیشتر است.';
  if (message.includes('daily sales payments')) return 'جمع نقد و کارت باید با فروش روز برابر باشد.';
  if (message.includes('discount')) return 'تخفیف از جمع فاکتور بیشتر است.';
  if (message.includes('cheque needs')) return 'برای چک، طرف حساب را انتخاب کن.';
  if (message.includes('clears into a bank')) return 'چک فقط به حساب بانکی وصول می‌شود.';
  if (message.includes('transfer needs')) return 'مبدأ و مقصد انتقال باید متفاوت باشند.';
  if (message.includes('at least one line')) return 'دست‌کم یک قلم به فاکتور اضافه کن.';
  if (message.includes('needs an amount')) return 'مبلغ را وارد کن.';
  if (message.includes('party.name') || message.includes('characters')) return 'نام را وارد کن.';
  return 'اطلاعات فرم کامل یا درست نیست.';
}
