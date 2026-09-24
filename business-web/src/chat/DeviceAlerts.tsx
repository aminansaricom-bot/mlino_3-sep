import { useState } from 'react';
import { api, apiErrorText } from './api';
import { INBOX_LABEL, RUNNER, callNative, inApp } from '../native/bridge';

// Only inside the «ملینو کسب‌وکار» Android app (D-79): tell this phone when customers write or a question waits.
// The phone gets a device key that can read ONE thing — the aggregate chat summary of this business (counts only,
// no message text, no customer name). Membership and chat.reply are checked on every use; turning this off or
// «خروج از همه‌ی دستگاه‌ها» ends the key.

const KEY = 'mlino.panel.deviceAlerts';
const LABEL = 'android';

export default function DeviceAlerts({ orgId }: { orgId: string }) {
  const [on, setOn] = useState(() => { try { return localStorage.getItem(KEY) === orgId; } catch { return false; } });
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  if (!inApp()) return null;

  const enable = async () => {
    setBusy(true); setNote(null);
    try {
      const perm = await callNative<{ notifications?: string }>(RUNNER, 'requestPermissions', { apis: ['notifications'] });
      if (perm.notifications && perm.notifications !== 'granted') { setNote('اجازه‌ی اعلان داده نشد.'); return; }
      const { key } = await api<{ key: string }>('POST', '/auth/device', { organizationId: orgId, label: LABEL });
      await callNative(RUNNER, 'dispatchEvent', { label: INBOX_LABEL, event: 'configure', details: { enabled: true, key } });
      try { localStorage.setItem(KEY, orgId); } catch { /* per-viewer convenience only */ }
      setOn(true);
    } catch (e) { setNote(e instanceof Error && e.message === 'not in app' ? 'این کار فقط در اپ اندروید است.' : apiErrorText(e)); } finally { setBusy(false); }
  };
  const disable = async () => {
    setBusy(true);
    try {
      await api('DELETE', '/auth/device', { organizationId: orgId, label: LABEL }).catch(() => undefined);
      await callNative(RUNNER, 'dispatchEvent', { label: INBOX_LABEL, event: 'configure', details: { enabled: false } }).catch(() => undefined);
    } finally {
      try { localStorage.removeItem(KEY); } catch { /* */ }
      setOn(false); setBusy(false);
    }
  };

  return <section className="card chat-status">
    <div><strong>اعلان روی این گوشی {on ? 'روشن است' : 'خاموش است'}</strong>
      <small>هر حدود ۱۵ دقیقه، حتی وقتی اپ بسته است، گوشی فقط شمار پیام‌های تازه و سؤال‌های بی‌جواب را می‌پرسد و اگر چیز تازه‌ای بود خبرت می‌کند. متن پیام و نام مشتری هرگز در اعلان نمی‌آید.</small></div>
    <button type="button" className="btn small ghost" disabled={busy} onClick={() => void (on ? disable() : enable())}>{on ? 'خاموش کردن' : 'روشن کردن'}</button>
    {note && <p className="note bad" role="alert">{note}</p>}
  </section>;
}
