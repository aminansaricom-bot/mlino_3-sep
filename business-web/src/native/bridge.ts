// Inside the «ملینو کسب‌وکار» Android app (D-79) the page is the same live panel; Capacitor's native bridge is
// injected into it. These helpers use the bridge's low-level calls, so the panel needs no native package and
// behaves exactly as before in a normal browser.

type Bridge = {
  isNativePlatform?: () => boolean;
  nativePromise?: (plugin: string, method: string, options?: unknown) => Promise<unknown>;
  addListener?: (plugin: string, event: string, cb: (data: unknown) => void) => { remove: () => Promise<void> };
};

const bridge = (): Bridge | null => (typeof window === 'undefined' ? null : ((window as unknown as { Capacitor?: Bridge }).Capacitor ?? null));

export function inApp(): boolean {
  try { return bridge()?.isNativePlatform?.() === true && typeof bridge()?.nativePromise === 'function'; } catch { return false; }
}

export function callNative<T>(plugin: string, method: string, options: unknown = {}): Promise<T> {
  const b = bridge();
  if (!b?.nativePromise) return Promise.reject(new Error('not in app'));
  return b.nativePromise(plugin, method, options) as Promise<T>;
}

export function onNative(plugin: string, event: string, cb: (data: unknown) => void): () => void {
  const b = bridge();
  if (!b?.addListener) return () => undefined;
  const handle = b.addListener(plugin, event, cb);
  return () => { void handle.remove(); };
}

export const RUNNER = 'BackgroundRunner';
export const INBOX_LABEL = 'site.mlino.inbox';
