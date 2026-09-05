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
      switch (result.kind) {
        case 'ok':
          setHeadingDeg(result.headingDeg);
          setSource('compass');
          break;
        case 'not-absolute':
          // صادقانه: مرجع این رویداد شمال نیست — UI به جهت دستی برمی‌گردد
          setSource('notAbsolute');
          break;
        default:
          break;
      }
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
