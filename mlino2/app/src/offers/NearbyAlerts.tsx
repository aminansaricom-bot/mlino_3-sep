import { useEffect, useState } from 'react';
import { CHAT_ENABLED } from '../chat/chatApi';
import { NEARBY_LABEL, RUNNER, callNative, inApp } from '../native/bridge';
import { tr } from '../i18n';

// اعلان تخفیف‌های اطراف (D-77). فقط با زدن خود کاربر روشن می‌شود.
// • در مرورگر: اعلان وب؛ ناشناس، موقعیت تقریبی (حدود ۱۰۰ متر) فقط وقتی ملینو باز است، ۲۴ ساعت اعتبار.
// • در اپ اندروید «ملینو» (D-79): بررسی روی خود گوشی. گوشی فایل عمومی آفرها را می‌خواند و با موقعیت خودش مقایسه
//   می‌کند؛ موقعیت هرگز از گوشی بیرون نمی‌رود و سرور چیزی از آن نمی‌داند.

const KEY = 'mlino.v2.nearbyAlerts';
const APP = inApp();
const WEB_PUSH = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
export const ALERTS_SUPPORTED = CHAT_ENABLED && (APP || WEB_PUSH);
export type DemoFrame = { anchor: readonly [number, number]; target: readonly [number, number] } | null;

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

/** Web: keep the coarse position fresh (throttled by the caller). App: nothing to send — the phone checks itself. */
export async function refreshAlertLocation(point: readonly [number, number]): Promise<void> {
  if (APP || !ALERTS_SUPPORTED || !alertsOn()) return;
  const sub = await currentSubscription();
  if (sub) await post('location', { endpoint: sub.endpoint, lat: point[0], lng: point[1] }).catch(() => undefined);
}

/** App: tell the on-phone check where the demo businesses are drawn (demo relocation), or switch it off. */
export async function configureAppCheck(enabled: boolean, frame: DemoFrame): Promise<void> {
  if (!APP) return;
  await callNative(RUNNER, 'dispatchEvent', { label: NEARBY_LABEL, event: 'configure', details: { enabled, anchor: frame?.anchor ?? null, target: frame?.target ?? null } });
}

type Perms = { location: boolean; background: boolean; notifications: boolean };

export default function NearbyAlerts({ point, demoFrame, demoBuild, onNeedLocation }: { point: readonly [number, number] | null; demoFrame: DemoFrame; demoBuild: boolean; onNeedLocation: () => void }) {
  const [on, setOn] = useState(alertsOn);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [needsAlways, setNeedsAlways] = useState(false);
  const iosBrowser = !APP && /iphone|ipad/i.test(navigator.userAgent) && !(navigator as unknown as { standalone?: boolean }).standalone && !matchMedia('(display-mode: standalone)').matches;

  useEffect(() => { if (on && point && !APP) void refreshAlertLocation(point); }, [on, point]);
  // In the app, keep the phone's check in the same frame the map is drawn in.
  useEffect(() => { if (on && APP) void configureAppCheck(true, demoFrame).catch(() => undefined); }, [on, demoFrame]);
  useEffect(() => {
    if (!APP || !on) return;
    void callNative<Perms>('MlinoLocation', 'status').then((p) => setNeedsAlways(!p.background)).catch(() => undefined);
  }, [on]);

  if (!ALERTS_SUPPORTED) return null;

  const enableApp = async () => {
    if (demoBuild && !demoFrame) { setNote(tr('اول دکمه‌ی ◎ را بزن تا کسب‌وکارهای نمایشی کنار تو چیده شوند.')); onNeedLocation(); return; }
    setBusy(true); setNote(null);
    try {
      const p = await callNative<Perms>('MlinoLocation', 'request');
      if (!p.notifications) { setNote(tr('اجازه‌ی اعلان داده نشد.')); return; }
      if (!p.location) { setNote(tr('بدون اجازه‌ی موقعیت، گوشی نمی‌تواند نزدیکی را بسنجد.')); return; }
      await configureAppCheck(true, demoFrame);
      try { localStorage.setItem(KEY, 'on'); } catch { /* فقط برای راحتی */ }
      setOn(true); setAsking(false); setNeedsAlways(!p.background);
    } catch { setNote(tr('روشن کردن اعلان انجام نشد؛ دوباره امتحان کن.')); } finally { setBusy(false); }
  };

  const enableWeb = async () => {
    if (!point) { setNote(tr('اول موقعیتت را روشن کن (دکمه‌ی ◎)؛ اعلان‌ها بر اساس فاصله‌ی تو از کسب‌وکارهاست.')); onNeedLocation(); return; }
    setBusy(true); setNote(null);
    try {
      if ((await Notification.requestPermission()) !== 'granted') { setNote(tr('اجازه‌ی اعلان داده نشد.')); return; }
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;
      const { publicKey } = await fetch('/api/push/key', { credentials: 'same-origin' }).then((r) => r.json()) as { publicKey: string };
      const sub = (await reg.pushManager.getSubscription()) ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) });
      await post('subscribe', { subscription: sub.toJSON(), lat: point[0], lng: point[1] });
      try { localStorage.setItem(KEY, 'on'); } catch { /* فقط برای راحتی */ }
      setOn(true); setAsking(false);
    } catch { setNote(tr('روشن کردن اعلان انجام نشد؛ دوباره امتحان کن.')); } finally { setBusy(false); }
  };

  const disable = async () => {
    setBusy(true);
    try {
      if (APP) await configureAppCheck(false, null).catch(() => undefined);
      else {
        const sub = await currentSubscription();
        if (sub) { await post('unsubscribe', { endpoint: sub.endpoint }).catch(() => undefined); await sub.unsubscribe(); }
      }
    } finally {
      try { localStorage.removeItem(KEY); } catch { /* */ }
      setOn(false); setBusy(false); setNeedsAlways(false);
    }
  };

  return <section className="nearby-alerts" aria-label={tr('اعلان تخفیف‌های اطراف')}>
    <div className="nearby-alerts-row">
      <span><strong>{tr('اعلان تخفیف‌های اطراف')}</strong><small>{on ? tr('روشن است؛ وقتی نزدیک کسب‌وکاری باشی که تخفیف تازه دارد خبرت می‌کنیم.') : tr('وقتی نزدیک کسب‌وکاری هستی که تخفیف تازه گذاشته، خبرت کنیم؟')}</small></span>
      <button className={on ? 'on' : ''} disabled={busy} onClick={() => (on ? void disable() : setAsking(true))} aria-pressed={on}>{on ? tr('خاموش کن') : tr('روشن کن')}</button>
    </div>
    {asking && !on && <div className="nearby-alerts-consent">
      {APP
        ? <p>{tr('این بررسی روی همین گوشی انجام می‌شود: هر حدود ۱۵ دقیقه گوشی فهرست عمومی آفرها را می‌خواند و با موقعیت خودش مقایسه می‌کند.')} <b>{tr('موقعیتت از گوشی بیرون نمی‌رود')}</b> {tr('و به هیچ سروری فرستاده نمی‌شود. حداکثر ۳ اعلان در روز، هیچ اعلانی بین ۲۲ تا ۸. برای کار وقتی اپ بسته است، اندروید اجازه‌ی موقعیت «همیشه» را جدا می‌پرسد.')}</p>
        : <p>{tr('برای این کار موقعیت تقریبی‌ات (حدود ۱۰۰ متر) فقط وقتی ملینو باز است به سرور فرستاده می‌شود و پس از ۲۴ ساعت بی‌اثر است. این اشتراک به هیچ شماره یا حسابی وصل نیست. حداکثر ۳ اعلان در روز، هیچ اعلانی بین ۲۲ تا ۸، و با «خاموش کن» همه‌چیز از سرور پاک می‌شود.')}</p>}
      {iosBrowser && <p className="nearby-alerts-ios">{tr('در آیفون اعلان فقط وقتی کار می‌کند که ملینو را با «Add to Home Screen» به صفحه‌ی اصلی اضافه کرده باشی و از همان‌جا بازش کنی.')}</p>}
      <div><button className="primary" disabled={busy} onClick={() => void (APP ? enableApp() : enableWeb())}>{busy ? tr('در حال روشن کردن…') : tr('موافقم، روشن کن')}</button><button onClick={() => setAsking(false)}>{tr('نه')}</button></div>
    </div>}
    {on && APP && needsAlways && <p className="nearby-alerts-note" role="status">
      {tr('فعلاً فقط وقتی اپ باز است بررسی می‌شود. برای خبر گرفتن وقتی اپ بسته است، در تنظیمات اجازه‌ی موقعیت را روی «همیشه» بگذار.')}{' '}
      <button onClick={() => void callNative('MlinoLocation', 'openSettings').catch(() => undefined)}>{tr('تنظیمات')}</button>
    </p>}
    {note && <p className="nearby-alerts-note" role="status">{note}</p>}
  </section>;
}
