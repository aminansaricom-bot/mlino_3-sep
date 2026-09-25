// Inside the «ملینو» Android app (D-79) the page is the same live web app; Capacitor's native bridge is injected
// into it. These helpers use the bridge's low-level calls, so the website needs no native package at all and
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
export const SPEECH = 'MlinoSpeech';

/**
 * The phone's back button (Android app). The app asks the page first; a handler returns true when it closed
 * something. Handlers stack: the most recently mounted layer (e.g. the welcome screen) answers first.
 */
const backStack: Array<() => boolean> = [];
export function onBackButton(handler: () => boolean): () => void {
  if (typeof window === 'undefined') return () => undefined;
  backStack.push(handler);
  (window as unknown as { __mlinoBack?: () => boolean }).__mlinoBack = () => {
    for (let i = backStack.length - 1; i >= 0; i -= 1) if (backStack[i]()) return true;
    return false;
  };
  return () => { const i = backStack.lastIndexOf(handler); if (i >= 0) backStack.splice(i, 1); };
}
export const NEARBY_LABEL = 'site.mlino.nearby';

/** The same «back» as the phone's back button: closes the top-most layer; false when nothing was open. */
export function goBack(): boolean {
  const back = (window as unknown as { __mlinoBack?: () => boolean }).__mlinoBack;
  return back ? back() : false;
}

/**
 * In a browser, the phone's back button moves through the browser history, not through the app, so it used to leave
 * the site from any page. One «guard» history entry sits on top: pressing back pops it, the app closes its top-most
 * layer (the same stack the Android app uses) and the guard is put back. Only when nothing is open does back really
 * leave. The Android app handles its back button natively and does not need this.
 */
export function installWebBackGuard(): void {
  if (typeof window === 'undefined' || inApp()) return;
  const guard = () => { try { window.history.pushState({ mlinoGuard: true }, ''); } catch { /* history unavailable */ } };
  guard();
  window.addEventListener('popstate', () => {
    if (goBack()) guard();
    else window.history.back();
  });
}
