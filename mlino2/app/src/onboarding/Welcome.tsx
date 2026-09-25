import { useEffect, useState } from 'react';
import { CHAT_ENABLED, ChatApiError, chatApi, chatErrorText, faDigits, type ChatConfig, type ChatPerson } from '../chat/chatApi';
import { inApp, onBackButton } from '../native/bridge';
import { tr, latinDigits, setCountryLanguage } from '../i18n';
import { PhoneField } from '../i18n/PhoneField';
import { SMS_COUNTRIES, defaultCountry, internationalNumber, plausibleNumber, type Country } from '../i18n/countries';
import { AppHeader, Button, ErrorNotice } from '../design/ui';
import LiveIcon from '../live/icons';
import MlinoRobot from './MlinoRobot';

// First screen of the «ملینو» app («روشنای محله» design): the robot and two choices, sign-up with a mobile number
// (Core identity, D-74) in real steps, then location. Signing up is asked for, never forced: «بعداً» opens the map as a
// guest. Shown once per device.

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

/** «۰۱:۲۰» from seconds, in the current language's digits. */
const clock = (s: number) => faDigits(`${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`);

export default function Welcome({ onClose, onLocate }: { onClose: () => void; onLocate: () => void }) {
  const [step, setStep] = useState<Step>('intro');
  const [config, setConfig] = useState<ChatConfig | null>(null);
  const [country, setCountry] = useState<Country>(() => defaultCountry());
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [challenge, setChallenge] = useState<{ id: string; testCode?: string; expiresAt: number } | null>(null);
  // When the service allows another code (from its «retry after» answer); until then «ارسال دوباره» waits.
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
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
  useEffect(() => {
    if (step !== 'code') return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [step]);

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
    try {
      const r = await chatApi<{ challengeId: string; testCode?: string; expiresInSeconds?: number }>('POST', '/auth/otp/start', { phone: internationalNumber(country, phone) });
      setChallenge({ id: r.challengeId, testCode: r.testCode, expiresAt: Date.now() + (r.expiresInSeconds ?? 120) * 1000 });
      setResendAt(Date.now() + 60_000); setNow(Date.now()); setCode(''); setStep('code');
    } catch (e) {
      if (e instanceof ChatApiError && e.code === 'RATE_LIMITED' && typeof e.detail.retryAfterSeconds === 'number') setResendAt(Date.now() + e.detail.retryAfterSeconds * 1000);
      setError(chatErrorText(e));
    } finally { setBusy(false); }
  };
  const verify = async () => {
    if (!challenge) return;
    setBusy(true); setError(null);
    try { await chatApi('POST', '/auth/otp/verify', { challengeId: challenge.id, code }); setStep('location'); }
    catch (e) { setError(chatErrorText(e)); } finally { setBusy(false); }
  };
  const left = challenge ? Math.max(0, Math.round((challenge.expiresAt - now) / 1000)) : 0;
  const resendIn = Math.max(0, Math.round((resendAt - now) / 1000));

  return <div className="welcome rs-welcome" role="dialog" aria-modal="true" aria-label={tr('به ملینو خوش آمدی')}>
    <div className="welcome-body">
      {step === 'intro' && <>
        <div className="welcome-robot"><MlinoRobot size={260} /></div>
        <div className="welcome-actions">
          <Button wide onClick={() => setStep('phone')}>{tr('ثبت‌نام با شماره‌ی موبایل')}</Button>
          <Button wide variant="ghost" onClick={() => setStep('location')}>{tr('بعداً؛ اول نقشه را ببینم')}</Button>
        </div>
      </>}

      {step === 'phone' && <form className="welcome-form" onSubmit={(e) => { e.preventDefault(); if (ready) void start(); }}>
        <AppHeader title={tr('ورود')} onBack={() => { setError(null); setStep('intro'); }} />
        <h2>{tr('شماره‌ی موبایلت')}</h2>
        <p className="welcome-lead">{tr('یک کد ۶ رقمی برایت می‌فرستیم. شماره فقط برای ورود است؛ به هیچ کسب‌وکاری نشان داده نمی‌شود.')}</p>
        {config?.delivery === 'test' && config.testNumbers && <p className="welcome-note">{tr('نسخه‌ی آزمایشی: فقط شماره‌های {0} تا {1} پذیرفته می‌شوند و کد همین‌جا نشان داده می‌شود.', faDigits(config.testNumbers.from), faDigits(config.testNumbers.to))}</p>}
        <div className="welcome-field"><span>{tr('شماره‌ی موبایل')}</span>
          <PhoneField country={country} onCountry={pickCountry} national={phone} onNational={setPhone} autoFocus />
          {!canSend && <p className="phone-unsupported">{tr('ورود با شماره‌ی خارج از ایران هنوز فعال نیست؛ فعلاً بدون ورود از نقشه و ویترین استفاده کن.')}</p>}
        </div>
        {error && <ErrorNotice>{error}</ErrorNotice>}
        <div className="welcome-actions">
          <Button type="submit" wide busy={busy} disabled={!ready}>{tr('گرفتن کد')}</Button>
          <Button wide variant="ghost" onClick={() => setStep('location')}>{tr('بعداً')}</Button>
        </div>
      </form>}

      {step === 'code' && challenge && <form className="welcome-form" onSubmit={(e) => { e.preventDefault(); if (code.trim().length === 6) void verify(); }}>
        <AppHeader title={tr('تأیید شماره')} onBack={() => { setError(null); setChallenge(null); setStep('phone'); }} />
        <h2>{tr('کد تأیید')}</h2>
        {challenge.testCode ? <p className="welcome-note">{tr('کد آزمایشی:')} <b dir="ltr">{faDigits(challenge.testCode)}</b></p>
          : <p className="welcome-lead">{tr('کد ۶ رقمی به {0} پیامک شد.', faDigits(internationalNumber(country, phone)))}</p>}
        <label className="welcome-field"><span>{tr('کد ۶ رقمی')}</span>
          <input dir="ltr" inputMode="numeric" autoComplete="one-time-code" autoFocus maxLength={6} value={code} onChange={(e) => setCode(latinDigits(e.target.value).replace(/\D/g, ''))} className="welcome-code" /></label>
        <p className="welcome-timer" aria-live="polite">{left > 0 ? tr('کد تا {0} دیگر معتبر است.', clock(left)) : tr('زمان این کد تمام شد؛ کد تازه بگیر.')}</p>
        {error && <ErrorNotice>{error}</ErrorNotice>}
        <div className="welcome-actions">
          <Button type="submit" wide busy={busy} disabled={code.trim().length < 6 || left === 0}>{tr('تأیید و ورود')}</Button>
          <Button wide variant="secondary" disabled={resendIn > 0 || busy} onClick={() => void start()}>
            {resendIn > 0 ? tr('ارسال دوباره‌ی کد · {0}', clock(resendIn)) : tr('ارسال دوباره‌ی کد')}</Button>
          <Button wide variant="ghost" onClick={() => { setError(null); setChallenge(null); setStep('phone'); }}>{tr('تغییر شماره')}</Button>
        </div>
      </form>}

      {step === 'location' && <>
        <AppHeader title={tr('موقعیت من')} />
        <div className="rs-hero-icon" aria-hidden="true"><LiveIcon name="my-location" size={48} /></div>
        <h2>{tr('کسب‌وکارهای کنارت را پیدا کنیم؟')}</h2>
        <p className="welcome-lead">{tr('فاصله‌ی کسب‌وکارها روی گوشی‌ات حساب می‌شود. موقعیت دقیقت برای هیچ کسب‌وکاری فرستاده نمی‌شود.')}</p>
        <div className="rs-card"><strong>{tr('با اجازه‌ی تو')}</strong><p>{tr('هر وقت خواستی می‌توانی این اجازه را در تنظیمات گوشی تغییر بدهی.')}</p></div>
        <div className="welcome-actions">
          <Button wide onClick={() => { finish(); onLocate(); }}>{tr('اجازه‌ی موقعیت')}</Button>
          <Button wide variant="ghost" onClick={finish}>{tr('بعداً؛ شهر را دستی ببینم')}</Button>
        </div>
      </>}
    </div>
  </div>;
}
