// وضعیت فقط در حافظه‌ی نشست Core نگهداری می‌شود؛ هیچ اثر بیرونی ندارد.
export type IntentStatus = 'empty' | 'collecting' | 'interpreted' | 'awaiting_confirmation' | 'confirmed' | 'expired' | 'cancelled';
export const MAX_INTENT_LENGTH = 2000;
export type IntentState = {
  status: Exclude<IntentStatus, 'empty'>;
  revision: number;
  text: string | null;
  interpretation: string | null;
  confirmedRevision: number | null;
  confirmedAt: number | null;
  expiresAt: number | null;
  problem: 'empty' | 'too_long' | 'invalid_text' | 'invalid_deadline' | null;
};
export type IntentToken = { generation: number; revision: number };
export type IntentAction =
  | { kind: 'edit'; text: string; expiresAt?: number }
  | { kind: 'interpret' | 'request_confirmation' | 'confirm' | 'correct' | 'reject' | 'cancel' };

// empty عمداً null است تا پایان نشست هیچ محتوایی باقی نگذارد.
export const intentStatus = (intent: IntentState | null): IntentStatus => intent?.status ?? 'empty';

function cleared(revision: number, status: IntentState['status']): IntentState {
  return { status, revision, text: null, interpretation: null, confirmedRevision: null,
    confirmedAt: null, expiresAt: null, problem: null };
}
export function expireIntent(intent: IntentState | null, now: number): IntentState | null {
  if (!intent || intent.status === 'cancelled' || intent.status === 'expired' || intent.expiresAt === null) return intent;
  return !Number.isFinite(now) || now >= intent.expiresAt ? cleared(intent.revision, 'expired') : intent;
}

// فراخواننده‌ی Core پیش از ورود، اجازه، رضایت، ساعت، foreground و token را بررسی می‌کند.
export function reduceIntent(intent: IntentState | null, action: IntentAction, now: number, sessionDeadline: number): IntentState | null {
  if (action.kind === 'edit') {
    const text = typeof action.text === 'string' ? action.text.replace(/\r\n?/g, '\n') : '';
    const expiresAt = action.expiresAt ?? intent?.expiresAt ?? sessionDeadline;
    const problem: IntentState['problem'] = !text.trim() ? 'empty' : text.length > MAX_INTENT_LENGTH ? 'too_long'
      : /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text) ? 'invalid_text'
      : !Number.isFinite(expiresAt) || expiresAt <= now || expiresAt > sessionDeadline ? 'invalid_deadline' : null;
    if (!problem && intent?.text?.trim() === text.trim() && intent.expiresAt === expiresAt) {
      return intent.text === text ? intent : { ...intent, text };
    }
    // حتی ورودی نامعتبر، اختیار تأیید قبلی را از بین می‌برد؛ متن نامعتبر نگه داشته نمی‌شود.
    return { ...cleared((intent?.revision ?? 0) + 1, 'collecting'), text: problem ? null : text,
      expiresAt: problem ? null : expiresAt, problem };
  }
  if (!intent || intent.status === 'expired' || intent.status === 'cancelled') return intent;
  switch (action.kind) {
    case 'cancel':
    case 'reject':
      return cleared(intent.revision, 'cancelled');
    case 'correct':
      return { ...cleared(intent.revision + 1, 'collecting'), text: intent.text, expiresAt: intent.expiresAt };
    case 'interpret':
      // بنیاد فعلی فقط بیان صریح کاربر را بازنمایی می‌کند؛ parser یا استنتاج معنایی ندارد.
      return intent.status === 'collecting' && intent.text && !intent.problem
        ? { ...intent, status: 'interpreted', interpretation: intent.text.trim() } : intent;
    case 'request_confirmation':
      return intent.status === 'interpreted' ? { ...intent, status: 'awaiting_confirmation' } : intent;
    case 'confirm':
      return intent.status === 'awaiting_confirmation' && intent.interpretation && !intent.problem
        ? { ...intent, status: 'confirmed', confirmedRevision: intent.revision, confirmedAt: now } : intent;
  }
}
