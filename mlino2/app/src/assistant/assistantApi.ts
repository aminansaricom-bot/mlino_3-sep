import { localIntent, validateGatewayResponse, type AssistantAnswer } from './assistantIntent';

export const ASSISTANT_ENDPOINT = '/assistant/intent';
const TIMEOUT_MS = 10_000;

/**
 * پرسیدن از دستیار: فقط متن پرسش به دروازه‌ی هم‌مبدأ می‌رود (کلید هرگز در مرورگر نیست).
 * هر خطا، کندی، پاسخ نامعتبر یا نبود رضایت یعنی پردازش محلی، که صادقانه برچسب می‌خورد.
 */
export async function askAssistant(query: string, options: { consented: boolean; fetcher?: typeof fetch; signal?: AbortSignal }): Promise<AssistantAnswer> {
  if (!options.consented) return localIntent(query);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const abort = () => controller.abort();
  options.signal?.addEventListener('abort', abort);
  try {
    const fetcher = options.fetcher ?? ((input: RequestInfo | URL, init?: RequestInit) => globalThis.fetch(input, init));
    const response = await fetcher(ASSISTANT_ENDPOINT, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
      body: JSON.stringify({ query: query.slice(0, 500) }), signal: controller.signal,
    });
    if (!response.ok) return localIntent(query);
    const answer = validateGatewayResponse(await response.json());
    return answer ?? localIntent(query);
  } catch {
    return localIntent(query);
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', abort);
  }
}

const CONSENT_KEY = 'mlino.assistant.consent.v1';
export type ConsentState = 'unknown' | 'granted' | 'local';
export function readConsent(): ConsentState {
  try { const v = window.localStorage.getItem(CONSENT_KEY); return v === 'granted' || v === 'local' ? v : 'unknown'; } catch { return 'unknown'; }
}
export function writeConsent(value: 'granted' | 'local'): void {
  try { window.localStorage.setItem(CONSENT_KEY, value); } catch { /* optional */ }
}
