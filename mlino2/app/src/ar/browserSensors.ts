// browserSensors.ts — هوک‌های لایه‌ی مرورگر برای AR (دوربین + قطب‌نما)
// لایه‌ی نازک Side-Effect: تمام منطق قابل‌تست در arOrientation/ArOverlayService است.
// صداقت: شکست دوربین/حسگر هرگز پنهان نمی‌شود — پیام صریح + حالت شبیه‌سازی برچسب‌خورده.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { headingFromCompassEvent } from './arOrientation';

export type CameraState =
  | { kind: 'idle' }
  | { kind: 'starting' }
  | { kind: 'active' }
  | { kind: 'denied'; message: string }
  | { kind: 'unavailable'; message: string };

/** پیام خطای دوربین اگر در حالت خطا باشد — برای UI تایپ‌امن */
export function cameraErrorMessage(state: CameraState): string | null {
  return state.kind === 'denied' || state.kind === 'unavailable' ? state.message : null;
}

/**
 * فعال‌سازی دوربین پشتی (environment). روی HTTP غیر localhost یا بدون مجوز،
 * حالت خطای صریح برمی‌گرداند — UI باید حالت شبیه‌سازی را نشان دهد.
 */
export function useCameraStream(): {
  state: CameraState;
  videoRef: RefObject<HTMLVideoElement | null>;
  start: () => Promise<void>;
  stop: () => void;
} {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<CameraState>({ kind: 'idle' });

  const start = useCallback(async () => {
    if (streamRef.current !== null) return;
    if (!('mediaDevices' in navigator) || navigator.mediaDevices.getUserMedia === undefined) {
      setState({
        kind: 'unavailable',
        message: 'مرورگر از دوربین پشتیبانی نمی‌کند — حالت شبیه‌سازی فعال شد',
      });
      return;
    }
    setState({ kind: 'starting' });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current !== null) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setState({ kind: 'active' });
    } catch (err) {
      const name = err instanceof Error ? err.name : '';
      setState({
        kind: name === 'NotAllowedError' ? 'denied' : 'unavailable',
        message:
          name === 'NotAllowedError'
            ? 'مجوز دوربین رد شد — حالت شبیه‌سازی فعال شد'
            : 'دوربین در دسترس نیست (روی HTTP غیر localhost معمولاً غیرفعال است) — حالت شبیه‌سازی فعال شد',
      });
    }
  }, []);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current !== null) videoRef.current.srcObject = null;
    setState({ kind: 'idle' });
  }, []);

  useEffect(() => stop, [stop]);

  return { state, videoRef, start, stop };
}

interface OrientationEventIOS extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
}

/** مهلتی که پس از آخرین خوانش absolute، رویداد غیر-absolute نادیده گرفته می‌شود. */
export const ABSOLUTE_GRACE_MS = 2000;

/**
 * کروم اندروید هر دو رویداد `deviceorientationabsolute` (absolute) و
 * `deviceorientation` (نسبی) را پشت سر هم می‌فرستد. اگر هر دو مستقیم وضعیت را
 * عوض کنند، نوار «قطب‌نما مرجع شمال ندارد» چند بار در ثانیه روشن و خاموش
 * می‌شود — همان چیزی که در ویدئوی آزمون روی گوشی دیده شد. پس رویداد نسبی فقط
 * وقتی «notAbsolute» اعلام می‌شود که در این مهلت هیچ خوانش absolute نرسیده باشد.
 * `null` یعنی وضعیت فعلی دست نخورد.
 */
export function resolveHeadingSource(
  kind: 'ok' | 'not-absolute' | 'none',
  lastAbsoluteAt: number | null,
  now: number,
): 'compass' | 'notAbsolute' | null {
  if (kind === 'ok') return 'compass';
  if (kind !== 'not-absolute') return null;
  return lastAbsoluteAt !== null && now - lastAbsoluteAt < ABSOLUTE_GRACE_MS ? null : 'notAbsolute';
}

/**
 * قطب‌نما — رفع یافته‌ی A-1 بازبینی فاز ۳:
 * - iOS: webkitCompassHeading (واقعاً جهت جغرافیایی).
 * - اندروید/استاندارد: فقط رویداد absolute (deviceorientationabsolute یا absolute=true)
 *   معتبر است و با تبدیل «360 − alpha» (پادساعتگرد → ساعتگرد).
 * - اگر فقط رویداد غیر-absolute بیاید، صادقانه «notAbsolute» اعلام می‌شود و
 *   UI باید به «جهت دستی» برگردد — هرگز alpha نسبی به‌عنوان شمال تفسیر نمی‌شود.
 */
export function useDeviceHeading(enabled: boolean): {
  headingDeg: number | null;
  simulated: boolean;
  /** وضعیت منبع heading — برای نوار وضعیت صادقانه UI */
  source: 'none' | 'compass' | 'manual' | 'notAbsolute';
  setSimulatedHeading: (deg: number) => void;
  request: () => void;
} {
  const [headingDeg, setHeadingDeg] = useState<number | null>(null);
  const [simulated, setSimulated] = useState(false);
  const [source, setSource] = useState<'none' | 'compass' | 'manual' | 'notAbsolute'>('none');
  const simulatedRef = useRef(false);
  const lastAbsoluteRef = useRef<number | null>(null);

  const request = useCallback(() => {
    const withIOS = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };
    if (typeof withIOS.requestPermission === 'function') {
      withIOS.requestPermission().catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const handler = (event: Event) => {
      if (simulatedRef.current) return;
      const e = event as OrientationEventIOS;
      const result = headingFromCompassEvent({
        webkitCompassHeading: e.webkitCompassHeading,
        alpha: typeof e.alpha === 'number' ? e.alpha : null,
        absolute: e.absolute === true,
      });
      const now = Date.now();
      if (result.kind === 'ok') {
        lastAbsoluteRef.current = now;
        setHeadingDeg(result.headingDeg);
      }
      // صادقانه: مرجع رویداد نسبی شمال نیست — ولی فقط وقتی اعلام می‌شود که خوانش absolute تازه‌ای نباشد
      const next = resolveHeadingSource(
        result.kind === 'ok' || result.kind === 'not-absolute' ? result.kind : 'none',
        lastAbsoluteRef.current,
        now,
      );
      if (next !== null) setSource(next);
    };
    // چنل absolute اولویت دارد؛ چنل معمولی فقط وقتی absolute=true است مقدار می‌دهد (داخل handler گارد هست)
    window.addEventListener('deviceorientationabsolute', handler, true);
    window.addEventListener('deviceorientation', handler, true);
    return () => {
      window.removeEventListener('deviceorientationabsolute', handler, true);
      window.removeEventListener('deviceorientation', handler, true);
    };
  }, [enabled]);

  const setSimulatedHeading = useCallback((deg: number) => {
    simulatedRef.current = true;
    setSimulated(true);
    setSource('manual');
    setHeadingDeg(((deg % 360) + 360) % 360);
  }, []);

  return { headingDeg, simulated, source, setSimulatedHeading, request };
}
