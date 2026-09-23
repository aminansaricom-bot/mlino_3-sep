// گفتگوی مشتری با کسب‌وکار (D-73) — فقط با `VITE_CHAT=1` روشن می‌شود و فقط با /api همین دامنه حرف می‌زند.
// Session یک کوکی HttpOnly است که صفحه هرگز آن را نمی‌بیند (D-74).

export const CHAT_ENABLED = import.meta.env.VITE_CHAT === '1';

export class ChatApiError extends Error {
  constructor(readonly code: string, readonly status: number, readonly detail: Record<string, unknown> = {}) { super(code); }
}

export async function chatApi<T>(method: 'GET' | 'POST' | 'DELETE', path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method, credentials: 'same-origin',
      headers: { 'content-type': 'application/json', ...(method !== 'GET' ? { 'x-mlino-csrf': '1' } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch { throw new ChatApiError('NETWORK', 0); }
  let data: Record<string, unknown> = {};
  try { data = await res.json(); } catch { /* بدنهٔ خالی */ }
  if (!res.ok) throw new ChatApiError(String(data.error ?? 'HTTP'), res.status, data);
  return data as T;
}

const fa = (n: unknown) => String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);

const TEXT: Record<string, string> = {
  NETWORK: 'به سرور نرسیدیم؛ اینترنت را بررسی کن.',
  PHONE_INVALID: 'شمارهٔ موبایل را به شکل ۰۹xxxxxxxxx بنویس.',
  REAL_NUMBER_NEEDS_SMS: 'سرویس پیامک هنوز وصل نشده؛ فعلاً فقط شماره‌های آزمایشی پذیرفته می‌شوند.',
  RATE_LIMITED: 'کمی صبر کن و دوباره امتحان کن.',
  CHALLENGE_INVALID: 'کد منقضی شده؛ کد تازه بگیر.',
  CODE_WRONG: 'کد درست نیست.',
  TOO_MANY_ATTEMPTS: 'تلاش زیاد شد؛ کد تازه بگیر.',
  LOGIN_REQUIRED: 'اول وارد شو.',
  BLOCKED: 'این گفتگو مسدود است.',
  NOT_FOUND: 'این گفتگو دیگر وجود ندارد.',
  INPUT_INVALID: 'نام ۲ تا ۴۰ نویسه و پیام حداکثر ۱۰۰۰ نویسه باشد.',
  SENSITIVE_BUSINESS: 'برای کسب‌وکارهای حوزهٔ سلامت و مانند آن، گفتگو خاموش است.',
  CHAT_UNAVAILABLE: 'این کسب‌وکار فعلاً پیام نمی‌پذیرد.',
  BUSINESS_UNKNOWN: 'این کسب‌وکار منتشر نشده است.',
};

export function chatErrorText(e: unknown): string {
  if (!(e instanceof ChatApiError)) return 'کار انجام نشد؛ دوباره امتحان کن.';
  const base = TEXT[e.code] ?? 'کار انجام نشد؛ دوباره امتحان کن.';
  if (e.code === 'CODE_WRONG' && typeof e.detail.remainingAttempts === 'number') return `${base} ${fa(e.detail.remainingAttempts)} تلاش دیگر مانده.`;
  if (e.code === 'RATE_LIMITED' && typeof e.detail.retryAfterSeconds === 'number') return `${base} (${fa(e.detail.retryAfterSeconds)} ثانیه)`;
  return base;
}

export type ChatConfig = { delivery: 'test' | 'sms'; testNumbers: { from: string; to: string } | null };
export type ChatPerson = { phoneHint: string; test: boolean } | null;
export type CustomerThread = { id: string; organizationId: string; businessName: string; name: string; blockedBy: 'customer' | 'business' | null; lastMessageAt: string; expiresAt: string; lastBody: string; lastSender: 'customer' | 'business'; unread: number; test: boolean };
export type ChatMessage = { id: string; seq: number; sender: 'customer' | 'business'; body: string; createdAt: string };
export { fa as faDigits };
