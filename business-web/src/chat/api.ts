// Client for the MLINO API (/api on this same host). The session is an HttpOnly cookie the page never sees.

export class ApiError extends Error {
  constructor(readonly code: string, readonly status: number, readonly detail: Record<string, unknown> = {}) { super(code); }
}

export async function api<T>(method: 'GET' | 'POST' | 'DELETE', path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method, credentials: 'same-origin',
      headers: { 'content-type': 'application/json', ...(method !== 'GET' ? { 'x-mlino-csrf': '1' } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('NETWORK', 0);
  }
  let data: Record<string, unknown> = {};
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) throw new ApiError(String(data.error ?? 'HTTP'), res.status, data);
  return data as T;
}

const TEXT: Record<string, string> = {
  NETWORK: 'به سرور نرسیدیم. اینترنت را بررسی کن و دوباره امتحان کن.',
  PHONE_INVALID: 'شماره‌ی موبایل را به شکل ۰۹xxxxxxxxx بنویس.',
  REAL_NUMBER_NEEDS_SMS: 'هنوز سرویس پیامک وصل نشده؛ در حالت آزمایشی فقط شماره‌های آزمایشی پذیرفته می‌شوند.',
  TEST_NUMBER_NOT_ALLOWED: 'شماره‌ی آزمایشی دیگر پذیرفته نمی‌شود.',
  RATE_LIMITED: 'کمی صبر کن و دوباره امتحان کن.',
  SMS_FAILED: 'پیامک کد فرستاده نشد؛ یک دقیقه‌ی دیگر دوباره امتحان کن.',
  CHALLENGE_INVALID: 'کد منقضی شده یا دیگر معتبر نیست؛ کد تازه بگیر.',
  CODE_WRONG: 'کد درست نیست.',
  TOO_MANY_ATTEMPTS: 'تعداد تلاش زیاد شد؛ کد تازه بگیر.',
  LOGIN_REQUIRED: 'اول وارد شو.',
  PERMISSION_REQUIRED: 'برای گفتگوهای این کسب‌وکار اجازه‌ی chat.reply لازم است.',
  BLOCKED: 'این گفتگو مسدود است.',
  NOT_FOUND: 'این گفتگو دیگر وجود ندارد.',
  INPUT_INVALID: 'متن خالی است یا از ۱۰۰۰ نویسه بیشتر است.',
  SENSITIVE_BUSINESS: 'گفتگو برای کسب‌وکارهای حساس (مثل حوزه‌ی سلامت) خاموش است.',
  CHAT_UNAVAILABLE: 'این کسب‌وکار فعلاً پیام نمی‌پذیرد.',
  BUSINESS_UNKNOWN: 'این کسب‌وکار منتشر نشده است.',
  MEMBER_OF_ORGANIZATION: 'تا وقتی عضو یک کسب‌وکار هستی، حذف حساب از اینجا ممکن نیست.',
  CSRF: 'درخواست از جای نامعتبر آمد.',
  PLAN_LIMIT: 'این امکان در پلن فعلی نیست؛ از «پلن و اشتراک» ارتقا بده.',
  MEMBERSHIP_REQUIRED: 'این شماره عضو این کسب‌وکار نیست.',
  ADMIN_REQUIRED: 'دیدن اعضا فقط برای کسی است که اجازه‌ی مدیریت اعضا دارد.',
  ALREADY_MEMBER: 'این شماره همین حالا عضو این کسب‌وکار است.',
  SELF_REMOVAL: 'خودت را از اینجا نمی‌توانی حذف کنی؛ مدیر دیگری باید این کار را بکند.',
  CONFLICT: 'این تغییر ممکن نیست؛ مثلاً آخرین کسی که اجازه می‌دهد نمی‌تواند حذف شود.',
  AUTHORIZATION_DENIED: 'این کار اجازه‌ای می‌خواهد که این عضو ندارد.',
  VALIDATION_FAILED: 'مقدارها درست نیست.',
};

export function apiErrorText(e: unknown): string {
  if (e instanceof ApiError) {
    const base = TEXT[e.code] ?? 'کار انجام نشد؛ دوباره امتحان کن.';
    if (e.code === 'CODE_WRONG' && typeof e.detail.remainingAttempts === 'number') return `${base} ${String(e.detail.remainingAttempts).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])} تلاش دیگر مانده.`;
    if (e.code === 'RATE_LIMITED' && typeof e.detail.retryAfterSeconds === 'number') return `${base} (${String(e.detail.retryAfterSeconds).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])} ثانیه)`;
    return base;
  }
  return 'کار انجام نشد؛ دوباره امتحان کن.';
}

export type AuthConfig = { delivery: 'test' | 'sms'; testNumbers: { from: string; to: string } | null };
export type Organization = { organizationId: string; name: string; published: boolean; canChat: boolean; permissions: string[] };
export type Me = { person: { phoneHint: string; test: boolean } | null; organizations?: Organization[] };
export type ChatSummary = { conversations: number; unreadConversations: number; unreadMessages: number; pendingQuestions: number; enabled: boolean; sensitive: boolean; autoReply: boolean; autoReplyAllowed: boolean };
export type Thread = { id: string; organizationId: string; customerName: string; blockedBy: 'customer' | 'business' | null; lastMessageAt: string; expiresAt: string; lastBody: string; lastSender: 'customer' | 'business'; unread: number; test: boolean };
export type Message = { id: string; seq: number; sender: 'customer' | 'business'; body: string; createdAt: string; auto?: boolean };
export type Pending = { id: string; threadId: string; customerName: string; question: string; askedAt: string };
export type Knowledge = { id: string; question: string; answer: string; uses: number; learned: boolean; updatedAt: string };
