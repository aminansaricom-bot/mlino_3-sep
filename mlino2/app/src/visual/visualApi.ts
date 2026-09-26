import { tr, msg } from '../i18n';

/** The answer of POST /api/visual/search (D-91). No similarity score is sent, by design. */
export interface VisualResult {
  kind: 'visually_similar';
  organizationId: string;
  businessName: string;
  catalogItemId: string;
  name: string;
  priceAmount: string | null;
  priceCurrency: string | null;
  onRequest: boolean;
  imagePath: string | null;
  matchedImagePath: string;
}
export interface VisualAnswer { results: VisualResult[]; total: number; scope: 'all' | 'subset'; indexed: number }

export type VisualErrorCode = 'IMAGE_TOO_LARGE' | 'IMAGE_INVALID' | 'IMAGE_UNSUPPORTED' | 'IMAGE_TOO_SMALL' | 'MODEL_UNAVAILABLE' | 'BUSY' | 'TIMEOUT'
  | 'BAD_FILTER' | 'RATE_LIMITED' | 'OFFLINE' | 'NOT_FOUND' | 'UNKNOWN' | 'PHOTO_TOO_LARGE' | 'PHOTO_UNREADABLE';
export class VisualApiError extends Error { constructor(readonly code: VisualErrorCode) { super(code); } }

const TEXT: Record<VisualErrorCode, string> = {
  IMAGE_TOO_LARGE: msg('عکس خیلی بزرگ است؛ بخش کوچک‌تری را برش بده یا عکس دیگری بردار.'),
  PHOTO_TOO_LARGE: msg('این فایل خیلی بزرگ است؛ عکس دیگری انتخاب کن.'),
  IMAGE_INVALID: msg('این فایل عکس سالمی نیست؛ عکس دیگری انتخاب کن.'),
  PHOTO_UNREADABLE: msg('این عکس باز نشد؛ عکس دیگری انتخاب کن.'),
  IMAGE_UNSUPPORTED: msg('فقط عکس JPG، PNG یا WebP پذیرفته می‌شود.'),
  IMAGE_TOO_SMALL: msg('عکس خیلی کوچک است؛ بخش بزرگ‌تری از محصول را برش بده.'),
  MODEL_UNAVAILABLE: msg('جست‌وجو با عکس الان در دسترس نیست؛ کمی بعد دوباره امتحان کن.'),
  BUSY: msg('الان جست‌وجوهای زیادی در صف است؛ چند ثانیه بعد دوباره امتحان کن.'),
  RATE_LIMITED: msg('چند جست‌وجوی پشت‌سرهم انجام شد؛ کمی صبر کن و دوباره امتحان کن.'),
  TIMEOUT: msg('جست‌وجو زمان زیادی گرفت؛ دوباره امتحان کن.'),
  OFFLINE: msg('به اینترنت وصل نیستی؛ اتصال را بررسی کن و دوباره امتحان کن.'),
  BAD_FILTER: msg('فیلترها درست نیستند؛ فیلترها را پاک کن و دوباره امتحان کن.'),
  NOT_FOUND: msg('جست‌وجو با عکس روی این نسخه فعال نیست.'),
  UNKNOWN: msg('چیزی درست پیش نرفت؛ دوباره امتحان کن.'),
};
export const visualErrorText = (code: VisualErrorCode) => tr(TEXT[code] ?? TEXT.UNKNOWN);

/**
 * Sends the prepared photo (cropped, small, EXIF-free JPEG) to MLINO's own server. The phone's filters travel as
 * business ids only; its position never does.
 */
export async function searchByPhoto(photo: Blob, opts: { organizationIds?: readonly string[]; limit?: number; offset?: number }, signal?: AbortSignal): Promise<VisualAnswer> {
  const params = new URLSearchParams({ limit: String(opts.limit ?? 12), offset: String(opts.offset ?? 0) });
  if (opts.organizationIds) params.set('orgs', opts.organizationIds.join(','));
  let res: Response;
  try {
    res = await fetch(`/api/visual/search?${params}`, { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'image/jpeg', 'x-mlino-csrf': '1' }, body: photo, signal });
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') throw e;
    throw new VisualApiError('OFFLINE');
  }
  const body = await res.json().catch(() => ({})) as { error?: string } & Partial<VisualAnswer>;
  if (!res.ok) {
    const code = (res.status === 429 && body.error === 'RATE_LIMITED') ? 'RATE_LIMITED' : (body.error as VisualErrorCode | undefined);
    throw new VisualApiError(code && code in TEXT ? code : res.status === 404 ? 'NOT_FOUND' : 'UNKNOWN');
  }
  if (!Array.isArray(body.results)) throw new VisualApiError('UNKNOWN');
  return body as VisualAnswer;
}
