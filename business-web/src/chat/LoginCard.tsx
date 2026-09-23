import { useState } from 'react';
import { api, apiErrorText, type AuthConfig } from './api';
import { toFaDigits } from '../format';

// Phone number → one-time code → session cookie. In test delivery the code is shown here, and only the fictional
// test range is accepted; nothing is sent to anyone.

export default function LoginCard({ config, onDone, hint }: { config: AuthConfig | null; onDone: () => void; hint?: string }) {
  const [phone, setPhone] = useState('');
  const [challenge, setChallenge] = useState<{ id: string; testCode?: string } | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const test = config?.delivery === 'test';

  const start = async () => {
    setBusy(true); setError(null);
    try {
      const r = await api<{ challengeId: string; testCode?: string }>('POST', '/auth/otp/start', { phone });
      setChallenge({ id: r.challengeId, testCode: r.testCode });
      setCode('');
    } catch (e) { setError(apiErrorText(e)); } finally { setBusy(false); }
  };
  const verify = async () => {
    if (!challenge) return;
    setBusy(true); setError(null);
    try { await api('POST', '/auth/otp/verify', { challengeId: challenge.id, code }); onDone(); } catch (e) { setError(apiErrorText(e)); } finally { setBusy(false); }
  };

  return <section className="card login-card">
    <header className="card-head"><h3>ورود عضو با شماره‌ی موبایل</h3>{test && <span className="badge warn">حالت آزمایشی</span>}</header>
    {test && <p className="policy-note">سرویس پیامک هنوز وصل نشده. فقط شماره‌های آزمایشی {toFaDigits(config!.testNumbers!.from)} تا {toFaDigits(config!.testNumbers!.to)} پذیرفته می‌شوند و کد همین‌جا نشان داده می‌شود. پیام‌های حالت آزمایشی ۲۴ ساعت پس از آخرین پیام پاک می‌شوند؛ اطلاعات واقعی ننویس.{hint ? ` ${hint}` : ''}</p>}
    {!challenge ? <form onSubmit={(e) => { e.preventDefault(); void start(); }}>
      <div className="field"><label htmlFor="login-phone">شماره‌ی موبایل</label>
        <input id="login-phone" dir="ltr" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09…" /></div>
      <button type="submit" className="btn primary wide" disabled={busy || phone.trim().length < 10}>{busy ? 'در حال ارسال…' : 'گرفتن کد'}</button>
    </form> : <form onSubmit={(e) => { e.preventDefault(); void verify(); }}>
      {challenge.testCode && <p className="test-code">کد آزمایشی: <b dir="ltr">{toFaDigits(challenge.testCode)}</b></p>}
      <div className="field"><label htmlFor="login-code">کد ۶ رقمی</label>
        <input id="login-code" dir="ltr" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} /></div>
      <button type="submit" className="btn primary wide" disabled={busy || code.trim().length < 6}>{busy ? 'در حال بررسی…' : 'ورود'}</button>
      <button type="button" className="link" onClick={() => { setChallenge(null); setError(null); }}>تغییر شماره</button>
    </form>}
    {error && <p className="note bad" role="alert">{error}</p>}
  </section>;
}
