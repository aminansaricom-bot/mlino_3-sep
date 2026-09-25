import { useEffect, useState } from 'react';
import { CHAT_ENABLED, chatApi, chatErrorText, faDigits, type ChatConfig, type ChatPerson } from '../chat/chatApi';
import { inApp, onBackButton } from '../native/bridge';
import { tr, latinDigits, setCountryLanguage } from '../i18n';
import { PhoneField } from '../i18n/PhoneField';
import { SMS_COUNTRIES, defaultCountry, internationalNumber, plausibleNumber, type Country } from '../i18n/countries';
import MlinoRobot from './MlinoRobot';

// First screen of the «ملینو» app: what the app is for, sign-up with a mobile number (Core identity, D-74), then
// location. Signing up is asked for, never forced: «بعداً» opens the map right away. Shown once per device.

const DONE_KEY = 'mlino.welcome.done';

/** In the Android app on first launch (or on the web with ?welcome=1 for a preview). */
export function shouldWelcome(): boolean {
  try {
    const preview = new URLSearchParams(window.location.search).get('welcome') === '1';
    if (preview) return true;
    return CHAT_ENABLED && inApp() && localStorage.getItem(DONE_KEY) !== '1';
  } catch { return false; }
}

const isPreview = () => { try { return new URLSearchParams(window.location.search).get('welcome') === '1'; } catch { return false; } };

function markDone(): void { try { localStorage.setItem(DONE_KEY, '1'); } catch { /* per-device convenience */ } }

type Step = 'intro' | 'phone' | 'code' | 'location';

export default function Welcome({ onClose, onLocate }: { onClose: () => void; onLocate: () => void }) {
  const [step, setStep] = useState<Step>('intro');
  const [config, setConfig] = useState<ChatConfig | null>(null);
  const [country, setCountry] = useState<Country>(() => defaultCountry());
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [challenge, setChallenge] = useState<{ id: string; testCode?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already signed in on this device: nothing to ask.
  useEffect(() => {
    let alive = true;
    Promise.all([chatApi<ChatConfig>('GET', '/auth/config'), chatApi<{ person: ChatPerson }>('GET', '/auth/me')])
      .then(([cfg, me]) => { if (!alive) return; setConfig(cfg); if (me.person && step === 'intro' && !isPreview()) { markDone(); onClose(); } })
      .catch(() => undefined);
    return () => { alive = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const finish = () => { markDone(); onClose(); };
  // Back steps through the screens; on the first one it lets the phone leave the app as usual.
  useEffect(() => onBackButton(() => {
    if (step === 'code') { setChallenge(null); setStep('phone'); return true; }
    if (step === 'phone' || step === 'location') { setError(null); setStep('intro'); return true; }
    return false;
  }), [step]);
  // The country of the number also sets the starting language (+90 → Türkçe), unless one was chosen in My space.
  const pickCountry = (c: Country) => { setCountry(c); setCountryLanguage(c.lang); setError(null); };
  const canSend = SMS_COUNTRIES.has(country.iso);
  const ready = canSend && plausibleNumber(country, phone);
  const start = async () => {
    setBusy(true); setError(null);
    try { const r = await chatApi<{ challengeId: string; testCode?: string }>('POST', '/auth/otp/start', { phone: internationalNumber(country, phone) }); setChallenge({ id: r.challengeId, testCode: r.testCode }); setCode(''); setStep('code'); }
    catch (e) { setError(chatErrorText(e)); } finally { setBusy(false); }
  };
  const verify = async () => {
    if (!challenge) return;
    setBusy(true); setError(null);
    try { await chatApi('POST', '/auth/otp/verify', { challengeId: challenge.id, code }); setStep('location'); }
    catch (e) { setError(chatErrorText(e)); } finally { setBusy(false); }
  };

  return <div className="welcome" role="dialog" aria-modal="true" aria-label={tr('به ملینو خوش آمدی')}>
    <div className="welcome-glow" aria-hidden="true" />
    <div className="welcome-body">
      {step === 'intro' && <>
        <div className="welcome-robot"><MlinoRobot size={280} /></div>
        <div className="welcome-actions">
          <button type="button" className="welcome-primary" onClick={() => setStep('phone')}>{tr('ثبت‌نام با شماره‌ی موبایل')}</button>
          <button type="button" className="welcome-link" onClick={() => setStep('location')}>{tr('بعداً؛ اول نقشه را ببینم')}</button>
        </div>
      </>}

      {step === 'phone' && <form className="welcome-form" onSubmit={(e) => { e.preventDefault(); if (ready) void start(); }}>
        <h2>{tr('شماره‌ی موبایلت')}</h2>
        <p className="welcome-lead">{tr('یک کد ۶ رقمی برایت می‌فرستیم. شماره فقط برای ورود است؛ به هیچ کسب‌وکاری نشان داده نمی‌شود.')}</p>
        {config?.delivery === 'test' && config.testNumbers && <p className="welcome-note">{tr('نسخه‌ی آزمایشی: فقط شماره‌های {0} تا {1} پذیرفته می‌شوند و کد همین‌جا نشان داده می‌شود.', faDigits(config.testNumbers.from), faDigits(config.testNumbers.to))}</p>}
        <div className="welcome-field"><span>{tr('شماره‌ی موبایل')}</span>
          <PhoneField country={country} onCountry={pickCountry} national={phone} onNational={setPhone} autoFocus />
          {!canSend && <p className="phone-unsupported">{tr('ورود با شماره‌ی خارج از ایران هنوز فعال نیست؛ فعلاً بدون ورود از نقشه و ویترین استفاده کن.')}</p>}
        </div>
        {error && <p className="welcome-error" role="alert">{error}</p>}
        <div className="welcome-actions">
          <button type="submit" className="welcome-primary" disabled={busy || !ready}>{busy ? tr('در حال ارسال…') : tr('گرفتن کد')}</button>
          <button type="button" className="welcome-link" onClick={() => { setError(null); setStep('intro'); }}>{tr('برگشت')}</button>
        </div>
      </form>}

      {step === 'code' && <form className="welcome-form" onSubmit={(e) => { e.preventDefault(); if (code.trim().length === 6) void verify(); }}>
        <h2>{tr('کد تأیید')}</h2>
        {challenge?.testCode ? <p className="welcome-note">{tr('کد آزمایشی:')} <b dir="ltr">{faDigits(challenge.testCode)}</b></p>
          : <p className="welcome-lead">{tr('کد ۶ رقمی به {0} پیامک شد. تا ۲ دقیقه معتبر است.', faDigits(internationalNumber(country, phone)))}</p>}
        <label className="welcome-field"><span>{tr('کد ۶ رقمی')}</span>
          <input dir="ltr" inputMode="numeric" autoComplete="one-time-code" autoFocus maxLength={6} value={code} onChange={(e) => setCode(latinDigits(e.target.value))} className="welcome-code" /></label>
        {error && <p className="welcome-error" role="alert">{error}</p>}
        <div className="welcome-actions">
          <button type="submit" className="welcome-primary" disabled={busy || code.trim().length < 6}>{busy ? tr('در حال بررسی…') : tr('تأیید و ورود')}</button>
          <button type="button" className="welcome-link" onClick={() => { setError(null); setChallenge(null); setStep('phone'); }}>{tr('تغییر شماره')}</button>
        </div>
      </form>}

      {step === 'location' && <>
        <div className="welcome-icon" aria-hidden="true">📍</div>
        <h2>{tr('کسب‌وکارهای کنارت را پیدا کنیم؟')}</h2>
        <p className="welcome-lead">{tr('با موقعیتت، نزدیک‌ترین‌ها و فاصله‌شان را نشان می‌دهیم. موقعیت روی همین گوشی حساب می‌شود و برای کسی فرستاده نمی‌شود.')}</p>
        <div className="welcome-actions">
          <button type="button" className="welcome-primary" onClick={() => { finish(); onLocate(); }}>{tr('استفاده از موقعیت من')}</button>
          <button type="button" className="welcome-link" onClick={finish}>{tr('بعداً')}</button>
        </div>
      </>}
    </div>
  </div>;
}
