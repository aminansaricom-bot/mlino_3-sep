// planRouting.ts — مسیریابی «پلن → موتور intent» به‌صورت config، نه کد سخت
// اصل مصوب ۲.۱ (پلن‌بندی AI): تناسب کیفیت خروجی با هزینه — نگاشت پلن→مدل باید
// داده‌ی قابل‌تغییر باشد. ⚠️ ساختار واقعی پلن‌ها (نام/سقف/قیمت) هنوز از مالک
// محصول نیامده — اینجا فقط «قابلیت مسیریابی» است؛ PLAN_ROUTES صرفاً نمونه‌ی
// آزمایشی برچسب‌خورده است و هرگز ساختار پلن واقعی محصول نیست.
//
// اصل مصوب ۲.۲ (Edge-first): پارسر قاعده‌محور روی دستگاه، پیش‌فرض و پلن پایه است؛
// LLM فقط وقتی که config ایجاب کند فراخوانی می‌شود.
//
// ⚠️ محدودیت صادقانه‌ی الزامی: تا وقتی V2 Backend ندارد، اعمال پلن فقط سمت
// کلاینت است — UX، نه امنیت. کاربر فنی می‌تواند از آن عبور کند. (سند 0۲ و
// دستور LLM بند ۲.۲ — در گزارش هم صریح شده است.)

import type { IntentEngineKind } from './intentContract';

export interface PlanRoute {
  /** موتور intent که این پلن استفاده می‌کند */
  engine: IntentEngineKind;
  /** شناسه‌ی مدل — فقط برای موتورهای LLM (مثلاً deepseek-chat یا gemini-2.0-flash) */
  model?: string;
}

/**
 * جدول مسیریابی پلن‌ها — داده‌ی قابل‌تعویض، نه منطق پراکنده.
 * تقسیم کار مصوب (دستور Dual-Provider بند ۲.۲، پیشنهاد ممد):
 *   - Gemini Flash = فهم نیت روزمره (سریع/ارزان) → مسیر پیش‌فرض پلن‌های دارای LLM
 *   - DeepSeek = کاربرد تحلیلی/پیچیده‌تر → رزرو (فعلاً هیچ مصرف‌کننده‌ای ندارد)
 * ⚠️ داده‌ی آزمایشی (MOCK): نام پلن‌ها ساختگی‌اند تا شکل config روشن شود؛
 * ساختار واقعی پلن‌ها هنوز تصمیم مالک محصول است.
 */
export const PLAN_ROUTES: Readonly<Record<string, PlanRoute>> = {
  plan_mock_free: { engine: 'rule-based' },
  plan_mock_pro: { engine: 'llm-gemini', model: 'gemini-2.0-flash' },
  plan_mock_max: { engine: 'llm-deepseek', model: 'deepseek-chat' },
};

/** پلن پایه‌ی Edge-first — وقتی پلنی اعلام نشده یا ناشناخته است */
export const DEFAULT_PLAN_ID = 'plan_mock_free';

export interface ResolvedRoute {
  engine: IntentEngineKind;
  model: string | null;
  /** پلنی که واقعاً استفاده شد — برای ثبت در پاسخ (الزام ۲ دستور) */
  planId: string;
  /** true اگر پلن اعلامی ناشناخته بود و به پایه برگشتیم */
  fellBackToDefault: boolean;
}

/**
 * پلن → مسیر intent. تعیین‌کننده: همان ورودی، همان خروجی.
 * پلن ناشناخته → پلن پایه با fellBackToDefault=true (حدس جعلی ممنوع)؛
 * پلن اعلام‌نشده → پلن پایه با fellBackToDefault=false (انتخاب پایه، نه fallback).
 */
export function resolvePlanRoute(planId: string | null | undefined): ResolvedRoute {
  const declared = typeof planId === 'string' && planId.length > 0;
  const id = declared && planId in PLAN_ROUTES ? planId : DEFAULT_PLAN_ID;
  const route = PLAN_ROUTES[id];
  if (route === undefined) {
    // unreachable: DEFAULT_PLAN_ID همیشه در جدول هست — گارد صریح برای تایپ
    return { engine: 'rule-based', model: null, planId: DEFAULT_PLAN_ID, fellBackToDefault: true };
  }
  return {
    engine: route.engine,
    model: route.model ?? null,
    planId: id,
    // فقط «اعلام‌شده اما ناشناخته» fallback است؛ اعلام‌نشده یعنی انتخاب پایه
    fellBackToDefault: declared && id !== planId,
  };
}
