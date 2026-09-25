// assistantIntent.ts — قرارداد پاسخ دروازه‌ی دستیار در سمت برنامه، و فهم محلی جایگزین.
// همان قواعد سمت سرور (gateway/assistantCore.mjs) دوباره اینجا سنجیده می‌شود: برنامه
// به دروازه هم اعتماد کورکورانه نمی‌کند. هر انحراف یعنی بازگشت به پردازش محلی.

import { tr } from '../i18n';

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

const STOP = new Set([
  // English, Arabic, Turkish, Spanish, German filler words
  'i', 'want', 'need', 'a', 'an', 'the', 'some', 'to', 'for', 'me', 'my', 'find', 'where', 'is', 'are', 'now', 'something', 'with', 'and', 'please', 'good', 'place', 'around', 'here',
  'أريد', 'أبحث', 'عن', 'في', 'من', 'قريب', 'مني', 'الآن', 'مكان', 'شيء',
  'bir', 've', 'için', 'istiyorum', 'arıyorum', 'nerede', 'şimdi', 'yer', 'bana',
  'quiero', 'busco', 'un', 'una', 'el', 'la', 'los', 'las', 'de', 'y', 'para', 'donde', 'dónde', 'ahora', 'algo', 'con', 'por', 'favor', 'aquí',
  'ich', 'will', 'möchte', 'suche', 'ein', 'eine', 'einen', 'der', 'die', 'das', 'und', 'für', 'wo', 'jetzt', 'etwas', 'mit', 'bitte', 'hier', 'in',
  // Persian
  'می‌خوام', 'میخوام', 'می‌خواهم', 'یه', 'یک', 'چیز', 'کجا', 'نزدیک', 'نزدیکم', 'من', 'برای', 'با', 'که', 'و', 'الان', 'باز', 'بازه', 'ارزون', 'ارزان', 'تخفیف', 'تخفیف‌دار', 'دار', 'داشته', 'باشه', 'هست', 'است', 'بده', 'پیدا', 'کن', 'بگو', 'کدوم', 'چی', 'خوب', 'خوبه', 'اطراف', 'این', 'اون', 'هم', 'به', 'از', 'در', 'رو', 'را', 'لطفا', 'لطفاً', 'دنبال', 'میگردم', 'می‌گردم', 'آفر', 'پیشنهاد']);

// Common words for the local understanding (no network), in the six languages of the app. Persian and Arabic words
// match anywhere in the text (they take prefixes and suffixes); Latin-script words must start a word and may take a short
// ending (pizzas, Burger, cafés). Each idea yields Persian keywords, because the businesses publish in Persian:
// «coffee», «Kaffee», «kahve» and «قهوة» all look for قهوه, اسپرسو, لاته… Words only; never a business.
type Idea = Readonly<{ script: readonly string[]; latin: readonly string[]; words: readonly string[]; category: AssistantCategory | null }>;
const IDEAS: readonly Idea[] = [
  { script: ['خنک', 'سرد', 'یخ', 'بارد', 'مثلج', 'عصير'], latin: ['cold', 'iced', 'ice', 'smoothie', 'juice', 'lemonade', 'soğuk', 'buzlu', 'limonata', 'frío', 'fría', 'frio', 'helado', 'granizado', 'zumo', 'jugo', 'limonada', 'kalt', 'eiskaffee', 'limonade', 'saft'],
    words: ['آیس‌کافی', 'موهیتو', 'لیموناد', 'نوشیدنی سرد', 'ماچا لاته'], category: 'cafe' },
  { script: ['شیرین', 'دسر', 'کیک', 'حلو', 'حلويات', 'كعك', 'تحلية'], latin: ['dessert', 'cake', 'sweet', 'pastry', 'chocolate', 'tatlı', 'pasta', 'kek', 'çikolata', 'postre', 'pastel', 'tarta', 'dulce', 'kuchen', 'torte', 'süß', 'schokolade', 'nachtisch'],
    words: ['چیزکیک', 'موکا', 'هات‌چاکلت', 'کروسان', 'دسر'], category: 'cafe' },
  { script: ['قهوه', 'کافه', 'کافی', 'قهوة', 'مقهى', 'كافيه'], latin: ['coffee', 'cafe', 'café', 'espresso', 'latte', 'cappuccino', 'kahve', 'kafe', 'cafetería', 'cafeteria', 'kaffee'],
    words: ['قهوه', 'اسپرسو', 'لاته', 'کاپوچینو', 'آمریکانو', 'موکا'], category: 'cafe' },
  { script: ['صبحانه', 'فطور', 'إفطار'], latin: ['breakfast', 'brunch', 'croissant', 'kahvaltı', 'desayuno', 'frühstück'],
    words: ['کروسان', 'صبحانه', 'کاپوچینو'], category: 'cafe' },
  { script: ['کباب', 'کوبیده', 'جوجه', 'مشاوي', 'شاورما'], latin: ['kebab', 'kabab', 'kebap', 'grill', 'ızgara', 'parrilla', 'döner'],
    words: ['کباب', 'کوبیده', 'جوجه‌کباب', 'چلوکباب'], category: 'restaurant' },
  { script: ['فست', 'برگر', 'همبرگر', 'برجر', 'همبرغر', 'ساندويش', 'وجبات سريعة'], latin: ['burger', 'hamburger', 'fast food', 'fastfood', 'fries', 'sandwich', 'sandviç', 'hamburguesa', 'sándwich', 'bocadillo', 'comida rápida', 'pommes', 'imbiss'],
    words: ['برگر', 'چیزبرگر', 'ساندویچ', 'سیب‌زمینی'], category: 'restaurant' },
  { script: ['پیتزا', 'بيتزا'], latin: ['pizza'], words: ['پیتزا', 'پپرونی', 'مارگاریتا'], category: 'restaurant' },
  { script: ['سوخاری', 'مرغ', 'دجاج', 'بروستد'], latin: ['chicken', 'nuggets', 'tavuk', 'pollo', 'hähnchen', 'hühnchen'],
    words: ['سوخاری', 'مرغ', 'ناگت'], category: 'restaurant' },
  { script: ['ناهار', 'نهار', 'شام', 'غذا', 'گرسنه', 'طعام', 'غداء', 'عشاء', 'مطعم', 'جائع', 'أكل'], latin: ['food', 'lunch', 'dinner', 'meal', 'hungry', 'restaurant', 'eat', 'yemek', 'restoran', 'comida', 'almuerzo', 'cena', 'restaurante', 'hambre', 'comer', 'essen', 'mittagessen', 'abendessen', 'hunger', 'hungrig'],
    words: ['غذا', 'کباب', 'خورش', 'پلو', 'برگر', 'پیتزا'], category: 'restaurant' },
  { script: ['ایرانی', 'سنتی', 'خورش', 'پلو', 'إيراني', 'فارسي', 'تقليدي'], latin: ['persian', 'iranian', 'traditional', 'stew', 'geleneksel', 'persa', 'iraní', 'tradicional', 'persisch', 'iranisch', 'traditionell'],
    words: ['خورش', 'پلو', 'قرمه‌سبزی', 'فسنجان', 'ته‌چین', 'کباب'], category: 'restaurant' },
  { script: ['نان', 'نون', 'نانوایی', 'خبز', 'مخبز'], latin: ['bread', 'bakery', 'ekmek', 'fırın', 'pan', 'panadería', 'brot', 'bäckerei'],
    words: ['نان', 'سنگک', 'بربری'], category: null },
  { script: ['کتاب', 'مكتبة'], latin: ['book', 'bookstore', 'bookshop', 'kitap', 'kitapçı', 'libro', 'librería', 'buch', 'bücher', 'buchhandlung'],
    words: ['کتاب'], category: null },
  { script: ['دارو', 'داروخانه', 'صيدلية', 'دواء'], latin: ['pharmacy', 'medicine', 'drugstore', 'vitamin', 'eczane', 'ilaç', 'farmacia', 'medicina', 'apotheke', 'medikament'],
    words: ['دارو', 'داروخانه', 'ویتامین'], category: null },
  { script: ['میوه', 'سوپر', 'خرید', 'فواكه', 'سوبرماركت', 'بقالة', 'تسوق'], latin: ['fruit', 'supermarket', 'grocery', 'shopping', 'meyve', 'market', 'süpermarket', 'alışveriş', 'fruta', 'supermercado', 'compras', 'obst', 'supermarkt', 'einkaufen', 'lebensmittel'],
    words: ['میوه', 'سوپرمارکت', 'لبنیات'], category: 'retail_shop' },
];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** One pattern per idea, written in the same normalized form as the text it is tested against. */
function pattern(script: readonly string[], latin: readonly string[]): RegExp {
  const parts: string[] = [];
  if (script.length) parts.push(`(?:${script.map((w) => escape(normalizeFa(w))).join('|')})`);
  if (latin.length) parts.push(`(?<!\\p{L})(?:${latin.map((w) => escape(normalizeFa(w))).join('|')})\\p{L}{0,3}(?!\\p{L})`);
  return new RegExp(parts.join('|'), 'u');
}
const EXPAND: ReadonlyArray<readonly [RegExp, readonly string[], AssistantCategory | null]> = IDEAS.map((i) => [pattern(i.script, i.latin), i.words, i.category] as const);

// Asking for deals, for something near, for a place open now, or for somewhere within walking distance.
const WANTS_OFFER = pattern(['تخفیف', 'آفر', 'پیشنهاد ویژه', 'خصم', 'تخفيض', 'عرض'], ['discount', 'deal', 'offer', 'sale', 'indirim', 'kampanya', 'fırsat', 'descuento', 'oferta', 'rebaja', 'rabatt', 'angebot']);
const WANTS_NEAR = pattern(['نزدیک', 'دور نباشه', 'پیاده', 'قريب', 'أقرب'], ['near', 'nearby', 'close', 'closest', 'yakın', 'yakında', 'cerca', 'cercano', 'nah', 'nähe', 'nächste']);
const WANTS_OPEN = pattern(['الان باز', 'باز باشه', 'بازه', 'مفتوح'], ['open', 'açık', 'abierto', 'abierta', 'geöffnet', 'offen']);
const WANTS_WALK = pattern(['خیلی نزدیک', 'پیاده', 'مشيا'], ['walking', 'walk', 'yürüme', 'yürüyerek', 'caminando', 'andando', 'zu fuß', 'fußläufig']);

/** فهم محلی (بدون شبکه): وقتی دروازه در دسترس نیست یا کاربر رضایت نداده است. */
export function localIntent(query: string): AssistantAnswer {
  const q = normalizeFa(query);
  const keywords: string[] = [];
  let category: AssistantCategory | null = null;
  for (const [pattern, words, cat] of EXPAND) {
    if (pattern.test(q)) { for (const w of words) if (!keywords.includes(w)) keywords.push(w); category = category ?? cat; }
  }
  for (const token of q.split(/[\s،,.!؟?¿¡]+/u)) {
    const t = token.trim();
    if (t.length >= 2 && !STOP.has(t) && !keywords.includes(t)) keywords.push(t);
  }
  const sort: AssistantIntent['sort'] = WANTS_OFFER.test(q) ? 'offer' : WANTS_NEAR.test(q) ? 'nearest' : 'relevance';
  const intent: AssistantIntent = { action: 'discover', keywords: keywords.slice(0, 24), category, open_now: WANTS_OPEN.test(q), radius_meters: WANTS_WALK.test(q) ? 300 : 1000, sort };
  return { intent, answer: tr('دنبال «{0}» در اطرافت می‌گردم.', query.trim().slice(0, 60)), source: 'local', model: null };
}
