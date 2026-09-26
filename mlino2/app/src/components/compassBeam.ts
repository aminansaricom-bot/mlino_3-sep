import { headingFromCompassEvent } from '../ar/arOrientation';

/**
 * The «which way am I facing» beam on the map's location dot. It reads the same compass events as the live
 * storefront (only a true north reference: iOS webkitCompassHeading or an absolute Android reading) but turns the
 * beam element directly, once per frame, so the map page does not re-render sixty times a second. No compass or
 * only a relative reading: no beam, never a guessed direction.
 */

type OrientationEventIOS = DeviceOrientationEvent & { webkitCompassHeading?: number };

/** iOS asks for motion access only inside a tap; elsewhere this does nothing. */
export function requestCompassPermission(): void {
  const withIOS = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<'granted' | 'denied'> };
  if (typeof withIOS?.requestPermission === 'function') withIOS.requestPermission().catch(() => undefined);
}

/** Degrees to add for a turned screen (landscape): the compass reports the phone's top edge. */
function screenAngle(): number {
  const angle = (screen.orientation && typeof screen.orientation.angle === 'number') ? screen.orientation.angle
    : typeof (window as unknown as { orientation?: number }).orientation === 'number' ? (window as unknown as { orientation: number }).orientation : 0;
  return angle;
}

/** Shortest turn from `from` to `to`, so 359° → 1° goes forward by 2°, not back by 358°. */
export function unwrapTurn(previous: number, next: number): number {
  const last = ((previous % 360) + 360) % 360;
  const delta = ((next - last + 540) % 360) - 180;
  return previous + delta;
}

export function attachCompassBeam(element: () => HTMLElement | null): () => void {
  if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) return () => undefined;
  let angle: number | null = null;
  let pending: number | null = null;
  let frame = 0;
  let lastGood = 0;

  const draw = () => {
    frame = 0;
    const el = element();
    if (!el || pending === null) return;
    angle = angle === null ? pending : unwrapTurn(angle, pending);
    el.style.setProperty('--beam', `${angle.toFixed(1)}deg`);
    el.classList.add('has-heading');
  };
  const handler = (event: Event) => {
    const e = event as OrientationEventIOS;
    const result = headingFromCompassEvent({
      webkitCompassHeading: e.webkitCompassHeading,
      alpha: typeof e.alpha === 'number' ? e.alpha : null,
      absolute: e.absolute === true || event.type === 'deviceorientationabsolute',
    });
    if (result.kind !== 'ok') return;
    lastGood = Date.now();
    pending = ((result.headingDeg + screenAngle()) % 360 + 360) % 360;
    if (!frame) frame = requestAnimationFrame(draw);
  };
  // The beam goes away when the compass stops giving a true reading.
  const watchdog = window.setInterval(() => {
    if (lastGood && Date.now() - lastGood > 3000) element()?.classList.remove('has-heading');
  }, 1000);

  window.addEventListener('deviceorientationabsolute', handler, true);
  window.addEventListener('deviceorientation', handler, true);
  return () => {
    window.removeEventListener('deviceorientationabsolute', handler, true);
    window.removeEventListener('deviceorientation', handler, true);
    window.clearInterval(watchdog);
    if (frame) cancelAnimationFrame(frame);
    element()?.classList.remove('has-heading');
  };
}
