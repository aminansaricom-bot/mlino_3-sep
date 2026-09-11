import { MAX_INTENT_LENGTH, intentStatus } from '../core/intent';
import type { IntentAction, IntentState, IntentToken } from '../core/intent';

// فقط نمایش و ارسال فرمان؛ هیچ وضعیت موازی یا موتور تفسیر در UI وجود ندارد.
export default function IntentFoundation({ intent, token, send }: {
  intent: IntentState | null;
  token: IntentToken;
  send: (action: IntentAction, token: IntentToken) => void;
}) {
  const status = intentStatus(intent);
  const editable = ['empty', 'collecting', 'cancelled', 'expired'].includes(status);
  const act = (action: IntentAction) => send(action, token);
  const problem = intent?.problem;
  return <section className="intent-foundation" aria-labelledby="intent-title">
    <h3 id="intent-title">نیازتان را مشخص کنید</h3>
    <p>فعلاً فقط متن نیاز را مرور و تأیید می‌کنید. جست‌وجو و پیشنهاد کسب‌وکار هنوز فعال نیست.</p>
    {editable && <>
      <label htmlFor="intent-text">دنبال چه چیزی هستید؟</label>
      <textarea id="intent-text" rows={3} maxLength={MAX_INTENT_LENGTH} autoComplete="off"
        aria-describedby="intent-help intent-feedback" aria-invalid={!!problem}
        value={intent?.text ?? ''} onChange={event => act({ kind: 'edit', text: event.target.value })} />
      <p id="intent-help">فقط در همین نشست؛ متن شما تحلیل هوشمند یا به کسب‌وکارها ارسال نمی‌شود.</p>
      <button type="button" disabled={!intent?.text || !!problem} onClick={() => act({ kind: 'interpret' })}>مرور متن نیاز</button>
    </>}
    <div id="intent-feedback" role="status" aria-live="polite">
      {problem && <p>{problem === 'empty' ? 'متن نیاز را وارد کنید.'
        : problem === 'too_long' ? 'متن نیاز بیش از حد طولانی است.'
        : problem === 'invalid_deadline' ? 'زمان اعتبار نیاز معتبر نیست؛ نیاز تازه‌ای وارد کنید.'
        : 'متن نیاز معتبر نیست؛ دوباره وارد کنید.'}</p>}
      {status === 'cancelled' && <p>این نیاز کنار گذاشته و متن آن پاک شد. می‌توانید نیاز تازه‌ای بنویسید.</p>}
      {status === 'expired' && <p>اعتبار این نیاز تمام شده است. برای ادامه نیاز تازه‌ای بنویسید.</p>}
      {intent && ['interpreted', 'awaiting_confirmation', 'confirmed'].includes(status) && <>
        <p>نسخهٔ {intent.revision.toLocaleString('fa-IR')} · بازنمایی مستقیم متن شما</p>
        <blockquote>{intent.interpretation}</blockquote>
        {status === 'awaiting_confirmation' && <p>همین نسخه بیان درست نیاز شماست؟</p>}
        {status === 'confirmed' && <p>همین نسخه تأیید شد. تطبیق کسب‌وکار همچنان غیرفعال است.</p>}
      </>}
    </div>
    <div className="foundation-actions">
      {status === 'interpreted' && <button type="button" onClick={() => act({ kind: 'request_confirmation' })}>ادامه به تأیید</button>}
      {status === 'awaiting_confirmation' && <button type="button" className="foundation-primary" onClick={() => act({ kind: 'confirm' })}>تأیید همین نسخه</button>}
      {['interpreted', 'awaiting_confirmation', 'confirmed'].includes(status) && <>
        <button type="button" onClick={() => act({ kind: 'correct' })}>اصلاح نیاز</button>
        <button type="button" onClick={() => act({ kind: 'reject' })}>این نیاز را نمی‌خواهم</button>
      </>}
      {status === 'collecting' && <button type="button" onClick={() => act({ kind: 'cancel' })}>پاک‌کردن نیاز</button>}
    </div>
  </section>;
}
