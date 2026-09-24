import { useEffect, useState } from 'react';
import { CHAT_ENABLED } from '../chat/chatApi';

// اعلان تخفیف‌های اطراف (D-77). فقط با زدن خود کاربر روشن می‌شود؛ ناشناس است (به هیچ شماره یا حسابی وصل نیست)؛
// موقعیت فقط تقریبی (حدود ۱۰۰ متر) و فقط وقتی ملینو باز است فرستاده می‌شود و پس از ۲۴ ساعت بی‌اثر است؛ خاموش کردن
// اشتراک را از سرور پاک می‌کند.

const KEY = 'mlino.v2.nearbyAlerts';
export const ALERTS_SUPPORTED = CHAT_ENABLED && typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

async function post(path: string, body: unknown) {
  const res = await fetch(`/api/push/${path}`, { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json', 'x-mlino-csrf': '1' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + pad).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.getRegistration('/');
  return (await reg?.pushManager.getSubscription()) ?? null;
}

export function alertsOn(): boolean { try { return localStorage.getItem(KEY) === 'on'; } catch { return false; } }

/** Called when the viewer's position changes while alerts are on (throttled by the caller). */
export async function refreshAlertLocation(point: readonly [number, number]): Promise<void> {
  if (!ALERTS_SUPPORTED || !alertsOn()) return;
  const sub = await currentSubscription();
  if (sub) await post('location', { endpoint: sub.endpoint, lat: point[0], lng: point[1] }).catch(() => undefined);
}

export default function NearbyAlerts({ point, onNeedLocation }: { point: readonly [number, number] | null; onNeedLocation: () => void }) {
  const [on, setOn] = useState(alertsOn);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const iosBrowser = /iphone|ipad/i.test(navigator.userAgent) && !(navigator as unknown as { standalone?: boolean }).standalone && !matchMedia('(display-mode: standalone)').matches;

  useEffect(() => { if (on && point) void refreshAlertLocation(point); }, [on, point]);

  if (!ALERTS_SUPPORTED) return null;

  const enable = async () => {
    if (!point) { setNote('اول موقعیتت را روشن کن (دکمه‌ی ◎)؛ اعلان‌ها بر اساس فاصله‌ی تو از کسب‌وکارهاست.'); onNeedLocation(); return; }
    setBusy(true); setNote(null);
    try {
      if ((await Notification.requestPermission()) !== 'granted') { setNote('اجازه‌ی اعلان داده نشد.'); return; }
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;
      const { publicKey } = await fetch('/api/push/key', { credentials: 'same-origin' }).then((r) => r.json()) as { publicKey: string };
      const sub = (await reg.pushManager.getSubscription()) ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) });
      await post('subscribe', { subscription: sub.toJSON(), lat: point[0], lng: point[1] });
      try { localStorage.setItem(KEY, 'on'); } catch { /* فقط برای راحتی */ }
      setOn(true); setAsking(false);
    } catch { setNote('روشن کردن اعلان انجام نشد؛ دوباره امتحان کن.'); } finally { setBusy(false); }
  };
  const disable = async () => {
    setBusy(true);
    try {
      const sub = await currentSubscription();
      if (sub) { await post('unsubscribe', { endpoint: sub.endpoint }).catch(() => undefined); await sub.unsubscribe(); }
    } finally {
      try { localStorage.removeItem(KEY); } catch { /* */ }
      setOn(false); setBusy(false);
    }
  };

  return <section className="nearby-alerts" aria-label="اعلان تخفیف‌های اطراف">
    <div className="nearby-alerts-row">
      <span><strong>اعلان تخفیف‌های اطراف</strong><small>{on ? 'روشن است؛ وقتی کسب‌وکاری نزدیکت تخفیف بدهد خبرت می‌کنیم.' : 'وقتی نزدیک کسب‌وکاری هستی که تخفیف تازه گذاشته، خبرت کنیم؟'}</small></span>
      <button className={on ? 'on' : ''} disabled={busy} onClick={() => (on ? void disable() : setAsking(true))} aria-pressed={on}>{on ? 'خاموش کن' : 'روشن کن'}</button>
    </div>
    {asking && !on && <div className="nearby-alerts-consent">
      <p>برای این کار موقعیت تقریبی‌ات (حدود ۱۰۰ متر) فقط وقتی ملینو باز است به سرور فرستاده می‌شود و پس از ۲۴ ساعت بی‌اثر است. این اشتراک به هیچ شماره یا حسابی وصل نیست. حداکثر ۳ اعلان در روز، هیچ اعلانی بین ۲۲ تا ۸، و با «خاموش کن» همه‌چیز از سرور پاک می‌شود.</p>
      {iosBrowser && <p className="nearby-alerts-ios">در آیفون اعلان فقط وقتی کار می‌کند که ملینو را با «Add to Home Screen» به صفحه‌ی اصلی اضافه کرده باشی و از همان‌جا بازش کنی.</p>}
      <div><button className="primary" disabled={busy} onClick={() => void enable()}>{busy ? 'در حال روشن کردن…' : 'موافقم، روشن کن'}</button><button onClick={() => setAsking(false)}>نه</button></div>
    </div>}
    {note && <p className="nearby-alerts-note" role="status">{note}</p>}
  </section>;
}
