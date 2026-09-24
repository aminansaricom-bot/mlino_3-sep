import { useEffect, useRef, useState } from 'react';
import { tr, numberLocale } from '../i18n';

export const RADIUS_MIN = 15;
export const RADIUS_MAX = 200;
export const RADIUS_STEP = 5;
const TICKS = [200, 150, 100, 50, 15];

/** مقدار شعاع از موقعیت عمودی لمس: بالا = دور (۲۰۰)، پایین = نزدیک (۱۵)، گرد به گام ۵ متر. */
export function radiusFromRatio(ratioFromTop: number): number {
  const clamped = Math.min(1, Math.max(0, ratioFromTop));
  const raw = RADIUS_MAX - clamped * (RADIUS_MAX - RADIUS_MIN);
  const stepped = Math.round((raw - RADIUS_MIN) / RADIUS_STEP) * RADIUS_STEP + RADIUS_MIN;
  return Math.min(RADIUS_MAX, Math.max(RADIUS_MIN, stepped));
}

export function clampRadius(value: number): number {
  return Math.min(RADIUS_MAX, Math.max(RADIUS_MIN, Math.round(value / RADIUS_STEP) * RADIUS_STEP || RADIUS_MIN));
}

const fa = (n: number) => n.toLocaleString(numberLocale());

/**
 * دکمه‌ی گرد شیشه‌ای شعاع. با لمس، با انیمیشن نرم از وسط به بالا و پایین باز می‌شود و
 * به یک نوار عمودی تنظیم فاصله (۱۵ تا ۲۰۰ متر) تبدیل می‌شود. کشیدن انگشت، لمس روی نوار و
 * کلیدهای جهت‌نما هر سه کار می‌کنند.
 */
export default function RadiusDial({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const [open, setOpen] = useState(false);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false); };
    window.addEventListener('pointerdown', outside);
    return () => window.removeEventListener('pointerdown', outside);
  }, [open]);

  const pick = (clientY: number) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    onChange(radiusFromRatio((clientY - rect.top) / rect.height));
  };
  const fill = ((value - RADIUS_MIN) / (RADIUS_MAX - RADIUS_MIN)) * 100;

  return <div ref={rootRef} className={`radius-dial${open ? ' open' : ''}`}>
    <div className="radius-panel" aria-hidden={!open}>
      <div className="radius-value">{fa(value)}<small>{tr('متر')}</small></div>
      <div ref={trackRef} className="radius-track" role="slider" tabIndex={open ? 0 : -1}
        aria-label={tr('شعاع نمایش')} aria-valuemin={RADIUS_MIN} aria-valuemax={RADIUS_MAX} aria-valuenow={value} aria-valuetext={tr('{0} متر', fa(value))}
        onPointerDown={(event) => { dragging.current = true; event.currentTarget.setPointerCapture(event.pointerId); pick(event.clientY); }}
        onPointerMove={(event) => { if (dragging.current) pick(event.clientY); }}
        onPointerUp={() => { dragging.current = false; }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowUp' || event.key === 'ArrowRight') { event.preventDefault(); onChange(clampRadius(value + RADIUS_STEP)); }
          if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') { event.preventDefault(); onChange(clampRadius(value - RADIUS_STEP)); }
        }}>
        <span className="radius-rail" />
        <span className="radius-fill" style={{ height: `${fill}%` }} />
        <span className="radius-thumb" style={{ bottom: `${fill}%` }} />
        {TICKS.map((tick) => <span key={tick} className="radius-tick" style={{ bottom: `${((tick - RADIUS_MIN) / (RADIUS_MAX - RADIUS_MIN)) * 100}%` }}>{fa(tick)}</span>)}
      </div>
    </div>
    <button type="button" className="radius-button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label={tr('شعاع نمایش {0} متر', fa(value))}>
      <span className="radius-button-icon" aria-hidden="true">◎</span>
      <span className="radius-button-text">{fa(value)}<small>{tr('م')}</small></span>
    </button>
  </div>;
}
