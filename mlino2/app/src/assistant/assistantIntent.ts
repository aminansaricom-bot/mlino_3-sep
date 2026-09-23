// assistantIntent.ts — قرارداد پاسخ دروازه‌ی دستیار در سمت برنامه، و فهم محلی جایگزین.
// همان قواعد سمت سرور (gateway/assistantCore.mjs) دوباره اینجا سنجیده می‌شود: برنامه
// به دروازه هم اعتماد کورکورانه نمی‌کند. هر انحراف یعنی بازگشت به پردازش محلی.

export type AssistantCategory = 'dental_clinic' | 'beauty_clinic' | 'cafe' | 'restaurant' | 'retail_shop';
export type AssistantIntent = Readonly<{
  action: 'discover' | 'refine' | 'explain';
  keywords: readonly string[];
  category: AssistantCategory | null;
  open_now: boolean;
  radius_meters: number;
  sort: 'relevance' | 'nearest' | 'offer';
}>;
export type AssistantAnswer = Readonly<{ intent: AssistantIntent; answer: string; source: 'ai' | 'local'; model: string | null }>;

const CATEGORIES = ['dental_clinic', 'beauty_clinic', 'cafe', 'restaurant', 'retail_shop'];

export function validateGatewayResponse(raw: unknown): AssistantAnswer | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const body = raw as Record<string, unknown>;
  if (Object.keys(body).some((key) => !['intent', 'answer', 'route'].includes(key))) return null;
  const i = body.intent as Record<string, unknown> | null;
  if (!i || typeof i !== 'object' || Array.isArray(i)) return null;
  if (Object.keys(i).some((key) => !['action', 'keywords', 'category', 'open_now', 'radius_meters', 'sort'].includes(key))) return null;
  if (!['discover', 'refine', 'explain'].includes(i.action as string)) return null;
  if (!Array.isArray(i.keywords) || i.keywords.length > 24 || !i.keywords.every((k) => typeof k === 'string' && k.trim().length > 0 && k.length <= 64)) return null;
  if (!(i.category === null || CATEGORIES.includes(i.category as string))) return null;
  if (typeof i.open_now !== 'boolean') return null;
  if (!Number.isInteger(i.radius_meters) || (i.radius_meters as number) < 250 || (i.radius_meters as number) > 20000) return null;
  if (!['relevance', 'nearest', 'offer'].includes(i.sort as string)) return null;
  if (typeof body.answer !== 'string' || !body.answer.trim() || body.answer.length > 280) return null;
  const route = body.route as Record<string, unknown> | undefined;
  const model = route && typeof route.model === 'string' && route.model.length <= 64 ? route.model : null;
  return {
    intent: { action: i.action as AssistantIntent['action'], keywords: (i.keywords as string[]).map((k) => k.trim()), category: i.category as AssistantCategory | null,
      open_now: i.open_now, radius_meters: i.radius_meters as number, sort: i.sort as AssistantIntent['sort'] },
    answer: body.answer.trim(), source: 'ai', model,
  };
}

/** یکسان‌سازی نوشتار فارسی برای تطبیق: ی/ک عربی، نیم‌فاصله، اعراب، حروف کوچک. */
export function normalizeFa(text: string): string {
  return text.replace(/ي/gu, 'ی').replace(/ك/gu, 'ک').replace(/[ً-ٰٟ]/gu, '')
    .replace(/[‌‏‎]/gu, '').replace(/ـ/gu, '').toLocaleLowerCase('fa-IR').trim();
}

const STOP = new Set(['می‌خوام', 'میخوام', 'می‌خواهم', 'یه', 'یک', 'چیز', 'کجا', 'نزدیک', 'نزدیکم', 'من', 'برای', 'با', 'که', 'و', 'الان', 'باز', 'بازه', 'ارزون', 'ارزان', 'تخفیف', 'تخفیف‌دار', 'دار', 'داشته', 'باشه', 'هست', 'است', 'بده', 'پیدا', 'کن', 'بگو', 'کدوم', 'چی', 'خوب', 'خوبه', 'اطراف', 'این', 'اون', 'هم', 'به', 'از', 'در', 'رو', 'را', 'لطفا', 'لطفاً', 'دنبال', 'میگردم', 'می‌گردم', 'آفر', 'پیشنهاد']);

/** هم‌معناهای رایج برای فهم محلی؛ فقط واژه تولید می‌کند، هرگز کسب‌وکار. */
const EXPAND: ReadonlyArray<readonly [RegExp, readonly string[], AssistantCategory | null]> = [
  [/خنک|سرد|یخ/u, ['آیس‌کافی', 'موهیتو', 'لیموناد', 'نوشیدنی سرد', 'ماچا لاته'], 'cafe'],
  [/شیرین|دسر|کیک/u, ['چیزکیک', 'موکا', 'هات‌چاکلت', 'کروسان', 'دسر'], 'cafe'],
  [/قهوه|کافه|کافی/u, ['قهوه', 'اسپرسو', 'لاته', 'کاپوچینو', 'آمریکانو', 'موکا'], 'cafe'],
  [/صبحانه/u, ['کروسان', 'صبحانه', 'کاپوچینو'], 'cafe'],
  [/کباب|کوبیده|جوجه/u, ['کباب', 'کوبیده', 'جوجه‌کباب', 'چلوکباب'], 'restaurant'],
  [/فست|برگر|همبرگر/u, ['برگر', 'چیزبرگر', 'ساندویچ', 'سیب‌زمینی'], 'restaurant'],
  [/پیتزا/u, ['پیتزا', 'پپرونی', 'مارگاریتا'], 'restaurant'],
  [/سوخاری|مرغ/u, ['سوخاری', 'مرغ', 'ناگت'], 'restaurant'],
  [/ناهار|نهار|شام|غذا|گرسنه/u, ['غذا', 'کباب', 'خورش', 'پلو', 'برگر', 'پیتزا'], 'restaurant'],
  [/ایرانی|سنتی|خورش|پلو/u, ['خورش', 'پلو', 'قرمه‌سبزی', 'فسنجان', 'ته‌چین', 'کباب'], 'restaurant'],
  [/نان|نون|نانوایی/u, ['نان', 'سنگک', 'بربری'], null],
  [/کتاب/u, ['کتاب'], null],
  [/دارو|داروخانه/u, ['دارو', 'داروخانه', 'ویتامین'], null],
  [/میوه|سوپر|خرید/u, ['میوه', 'سوپرمارکت', 'لبنیات'], 'retail_shop'],
];

/** فهم محلی (بدون شبکه): وقتی دروازه در دسترس نیست یا کاربر رضایت نداده است. */
export function localIntent(query: string): AssistantAnswer {
  const q = normalizeFa(query);
  const keywords: string[] = [];
  let category: AssistantCategory | null = null;
  for (const [pattern, words, cat] of EXPAND) {
    if (pattern.test(q)) { for (const w of words) if (!keywords.includes(w)) keywords.push(w); category = category ?? cat; }
  }
  for (const token of q.split(/[\s،,.!؟?]+/u)) {
    const t = token.trim();
    if (t.length >= 2 && !STOP.has(t) && !keywords.includes(t)) keywords.push(t);
  }
  const sort: AssistantIntent['sort'] = /تخفیف|آفر|پیشنهاد ویژه/u.test(q) ? 'offer' : /نزدیک|دور نباشه|پیاده/u.test(q) ? 'nearest' : 'relevance';
  const intent: AssistantIntent = { action: 'discover', keywords: keywords.slice(0, 24), category, open_now: /الان باز|باز باشه|بازه/u.test(q), radius_meters: /خیلی نزدیک|پیاده/u.test(q) ? 300 : 1000, sort };
  return { intent, answer: `دنبال «${query.trim().slice(0, 60)}» در اطرافت می‌گردم.`, source: 'local', model: null };
}
