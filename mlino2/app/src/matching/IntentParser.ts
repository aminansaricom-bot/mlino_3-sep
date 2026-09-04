// IntentParser.ts — فهم نیت مشتری (قاعده‌محور، آفلاین، تعیین‌کننده)
//
// NOTE(architecture): رابط واحد برای «فهم نیت» است. پیاده‌سازی فعلی قاعده‌محور است؛
// اگر مالک محصول بعداً LLM تصویب کرد، یک پیاده‌سازی LlmIntentParser با همین
// Interface اضافه می‌شود و هیچ‌جای دیگری از کد تغییر نمی‌کند.
//
// تضمین سند 01 بخش ۵: خروجی این پارسر فقط «پارامتر جست‌وجو» است — هرگز نام
// محصول/کسب‌وکار از خودش اختراع نمی‌شود؛ نتیجه‌ی نهایی همیشه از Directory
// واقعی (فعلاً Mock) می‌آید.

import type { V2BusinessCategory } from '../directory/contract';
import { stemFaTokens } from './normalize';

/** مترادف‌ها → دسته‌ی قراردادی (همه نرمال‌شده/ریشه‌ای) */
const CATEGORY_KEYWORDS: ReadonlyArray<readonly [V2BusinessCategory, readonly string[]]> = [
  ['dental_clinic', ['دندان', 'دندانپزشک', 'دندانپزشکی', 'جرمگیری', 'پرکردن', 'پرکاری', 'ایمپلنت', 'ارتودنسی', 'بلیچینگ', 'عصبکشی', 'فلوراید']],
  ['beauty_clinic', ['زیبایی', 'لیزر', 'بوتاکس', 'ژل', 'فیلر', 'پاکسازی', 'مزوتراپی', 'هایفو', 'کراتین', 'لایه', 'پوست', 'مو']],
  ['cafe', ['کافه', 'قهوه', 'اسپرسو', 'کاپوچینو', 'لاته', 'کیک', 'نوشیدنی']],
  ['restaurant', ['رستوران', 'غذا', 'پیتزا', 'پاستا', 'برگر', 'کباب', 'سوشی']],
  ['retail_shop', ['فروشگاه', 'خرید', 'عسل', 'روغن', 'ارگانیک', 'محصول']],
];

/** اصلاح‌گرهای رایج (برای رتبه‌بندی و پاسخ دستیار — فیلتر سخت نیست) */
export interface IntentModifiers {
  wantsOffer?: boolean;
  wantsCheap?: boolean;
  wantsNearest?: boolean;
}

export interface ParsedIntent {
  /** دسته‌ی حدس‌زده‌شده — null یعنی پارسر مطمئن نیست و به جست‌وجوی متنی کامل می‌رود */
  category: V2BusinessCategory | null;
  /** کلیدواژه‌های آزاد استخراج‌شده از جمله برای تطبیق متنی با محصولات/نام */
  keywords: string[];
  modifiers: IntentModifiers;
}

/** شعاع جست‌وجو اگر مشتری عبارت مکانی گفته باشد (متر) */
export function extractRadiusMeters(text: string): number | null {
  const m = text.match(/(\d+)\s*(متر|کیلومتر|km)/);
  if (!m) return null;
  const value = parseInt(m[1] ?? '0', 10);
  if (!Number.isFinite(value) || value <= 0) return null;
  return m[2] === 'کیلومتر' || m[2] === 'km' ? value * 1000 : value;
}

function includesAny(haystack: readonly string[], needles: readonly string[]): boolean {
  return needles.some((n) => haystack.includes(n));
}

export class RuleBasedIntentParser {
  /**
   * جمله‌ی فارسی مشتری را به پارامتر جست‌وجو تبدیل می‌کند.
   * تعیین‌کننده است: همان ورودی، همیشه همان خروجی.
   */
  parse(utterance: string): ParsedIntent {
    const stems = stemFaTokens(utterance);
    const joined = stems.join(' ');

    let category: V2BusinessCategory | null = null;
    for (const [cat, keywords] of CATEGORY_KEYWORDS) {
      if (includesAny(stems, keywords) || joined.length === 0) {
        category = cat;
        break;
      }
    }

    // کلیدواژه‌های آزاد: توکن‌های طولانی که احتمالاً نام محصول‌اند
    const stopwords = new Set([
      'می', 'خواهم', 'میخواهم', 'دنبال', 'برای', 'یک', 'یه', 'که', 'را', 'رو',
      'در', 'به', 'از', 'با', 'و', 'است', 'هست', 'کجا', 'چه', 'چی', 'کند',
      'میخوام', 'میشه', 'لطفا', 'الان', 'اینجا', 'اطراف', 'نزدیک', 'تا',
    ]);
    const keywords = stems.filter((t) => t.length >= 3 && !stopwords.has(t));

    const modifiers: IntentModifiers = {
      wantsOffer: includesAny(stems, ['تخفیف', 'آفر', 'پیشنهاد', 'حراج']),
      wantsCheap: includesAny(stems, ['ارزان', 'کم', 'قیمت کم', 'دونصیف', 'نصف']),
      wantsNearest: includesAny(stems, ['نزدیکترین', 'نزدیک', 'باعلاو', 'شلوغ نکنه']) || includesAny(stems, ['نزدیک']),
    };

    return { category, keywords, modifiers };
  }
}

export const intentParser = new RuleBasedIntentParser();
