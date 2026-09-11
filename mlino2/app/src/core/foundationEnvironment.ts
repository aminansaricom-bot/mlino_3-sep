import type { FoundationCommand } from './foundation';

export interface FoundationEnvironment {
  document: Pick<Document, 'addEventListener' | 'removeEventListener' | 'visibilityState'>;
  window: Pick<Window, 'addEventListener' | 'removeEventListener'>;
  every: (callback: () => void, ms: number) => () => void;
}
// Only lifecycle signals cross this boundary. No storage, sensors, business data or providers.
export function bindFoundationEnvironment(env: FoundationEnvironment, send: (command: FoundationCommand) => void) {
  const visibility = () => send(env.document.visibilityState === 'visible' ? 'visible' : 'hidden');
  const pagehide = () => send('navigate');
  env.document.addEventListener('visibilitychange', visibility);
  env.window.addEventListener('pagehide', pagehide);
  const stopTimer = env.every(() => send('check'), 1000);
  visibility();
  let disposed = false;
  return () => {
    if (disposed) return;
    disposed = true;
    env.document.removeEventListener('visibilitychange', visibility);
    env.window.removeEventListener('pagehide', pagehide);
    stopTimer();
  };
}
