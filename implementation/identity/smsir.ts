import { IdentityError, type OtpDelivery } from './index';

/**
 * One-time codes by SMS through sms.ir's «verify» (quick send) API: a template the account holder had approved,
 * with one parameter that carries the code. The API key lives only in the server's environment; it is never logged,
 * and neither is the phone number or the code. A failed or refused send is reported as SMS_FAILED — the caller
 * never learns why from the provider, and the login simply asks to try again.
 */
export interface SmsIrOptions {
  readonly apiKey: string;
  readonly templateId: number;
  /** Parameter name in the approved template, e.g. #CODE# → 'CODE'. */
  readonly parameter?: string;
  readonly endpoint?: string;
  readonly timeoutMs?: number;
  readonly fetchImpl?: typeof fetch;
}

export function smsIrDelivery(options: SmsIrOptions): OtpDelivery {
  if (!options.apiKey || options.apiKey.length < 20) throw new Error('sms.ir api key missing');
  if (!Number.isInteger(options.templateId) || options.templateId <= 0) throw new Error('sms.ir template id missing');
  const endpoint = options.endpoint ?? 'https://api.sms.ir/v1/send/verify';
  const doFetch = options.fetchImpl ?? fetch;
  return {
    mode: 'sms',
    async send(phone: string, code: string) {
      let ok = false;
      try {
        const res = await doFetch(endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json', accept: 'application/json', 'x-api-key': options.apiKey },
          body: JSON.stringify({ mobile: phone, templateId: options.templateId, parameters: [{ name: options.parameter ?? 'CODE', value: code }] }),
          signal: AbortSignal.timeout(options.timeoutMs ?? 10_000),
        });
        const body = (await res.json().catch(() => ({}))) as { status?: number };
        ok = res.ok && body.status === 1;
      } catch {
        ok = false;
      }
      if (!ok) throw new IdentityError('SMS_FAILED', 'the code could not be sent; try again in a minute');
      return {};
    },
  };
}
