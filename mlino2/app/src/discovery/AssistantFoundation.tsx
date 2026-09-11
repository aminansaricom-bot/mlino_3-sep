import { useEffect, useRef } from 'react';
import { useFoundation } from '../core/useFoundation';
import './AssistantFoundation.css';

export default function AssistantFoundation({ onClose, onLegacySearch }: {
  onClose: () => void;
  onLegacySearch: () => void;
}) {
  const { state, experience, send } = useFoundation();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => { element?.close(); };
  }, []);
  function leave(legacy = false) {
    send('dismiss');
    if (legacy) onLegacySearch(); else onClose();
  }
  const ended = state.endedBy === 'expired' ? 'زمان این نشست به پایان رسید.'
    : state.endedBy === 'permission' ? 'این نسخه فقط برای اجرای محلی در دسترس است.'
    : state.endedBy === 'declined' ? 'پردازش محلی را نپذیرفتید.'
    : state.endedBy === 'withdrawn' ? 'رضایت شما لغو و نشست بسته شد.'
    : 'نشست بسته شد.';
  return (
    <dialog ref={dialog} className="foundation-dialog" aria-labelledby="foundation-title"
      onCancel={(event) => { event.preventDefault(); leave(); }}>
      <header className="foundation-header">
        <div><span className="foundation-eyebrow">ملینو · نسخهٔ آزمایشی</span><h2 id="foundation-title">دستیار ملینو</h2></div>
        <button type="button" onClick={() => leave()} aria-label="بستن دستیار">✕</button>
      </header>
      <div className="foundation-content">
        <span className="foundation-symbol" aria-hidden="true">✦</span>
        <div role="status" aria-live="polite">
          {state.phase === 'idle' && <><h3>یک شروع روشن</h3><p>فضای دستیار برای همراهی در کشف اطراف آماده می‌شود. در این مرحله می‌توانید یک نشست محلی را شروع و مدیریت کنید.</p></>}
          {experience.mode === 'request-consent' && <><h3>با پردازش محلی موافقید؟</h3><p>این نشست فقط روی همین دستگاه اجرا می‌شود. در این مرحله متن نیاز یا موقعیت شما دریافت نمی‌شود. اطلاعات نشست ذخیره نمی‌شود و با پایان یا خروج از صفحه پاک می‌شود.</p></>}
          {state.phase === 'active' && <><h3>نشست شما آماده است</h3><p>کنترل دستیار در اختیار شماست. دریافت نیاز و پیشنهاد کسب‌وکار در این مرحله هنوز فعال نیست.</p></>}
          {state.phase === 'paused' && <><h3>نشست مکث شده است</h3><p>برای ادامه، خودتان «ادامهٔ نشست» را انتخاب کنید. بازگشت به صفحه به‌تنهایی نشست را ادامه نمی‌دهد.</p></>}
          {state.phase === 'closed' && <><h3>{ended}</h3><p>می‌توانید به مرور نقشه برگردید یا یک نشست تازه شروع کنید.</p></>}
        </div>
        <div className="foundation-actions">
          {(state.phase === 'idle' || state.phase === 'closed') && state.endedBy !== 'permission' &&
            <button type="button" className="foundation-primary" onClick={() => send('start')}>شروع نشست تازه</button>}
          {state.phase === 'consent' && <>
            <button type="button" className="foundation-primary" onClick={() => send('accept')}>موافقم؛ شروع نشست</button>
            <button type="button" onClick={() => send('decline')}>نمی‌پذیرم</button>
          </>}
          {state.phase === 'active' && <button type="button" onClick={() => send('pause')}>مکث نشست</button>}
          {state.phase === 'paused' && <button type="button" className="foundation-primary" onClick={() => send('resume')}>ادامهٔ نشست</button>}
          {(state.phase === 'active' || state.phase === 'paused') && <>
            <button type="button" onClick={() => send('done')}>پایان نشست</button>
            <button type="button" onClick={() => send('withdraw')}>لغو رضایت</button>
          </>}
          <button type="button" onClick={() => leave()}>بازگشت به نقشه</button>
        </div>
        <p className="foundation-note">نشست پس از ۳۰ دقیقه بی‌فعالیتی یا حداکثر ۲ ساعت پایان می‌یابد. مکث این زمان را تمدید نمی‌کند.</p>
      </div>
      <footer className="foundation-footer">
        <button type="button" onClick={() => leave(true)}>بازکردن جست‌وجوی آزمایشی قبلی</button>
        <p>با این انتخاب از نشست دستیار خارج می‌شوید.</p>
      </footer>
    </dialog>
  );
}
