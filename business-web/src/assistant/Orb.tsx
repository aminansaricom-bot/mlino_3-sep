import { useEffect, useRef } from 'react';

// Melino's face, carried over from Content Studio (components/assistant/AssistantOrb.tsx) without
// changing the character: fixed body, two eyes, a halo whose colour follows the state. Eight states.
// The eyes follow the pointer exactly as on the mlino.site landing (melino.js): eased toward the pointer,
// displacement growing with distance; on touch screens they glance around now and then. `glance` points the
// eyes at something the robot is showing (its tip bubble), overriding the pointer until cleared.

export type AssistantState = 'idle' | 'thinking' | 'happy' | 'concerned' | 'warning' | 'suggesting' | 'celebrating' | 'processing';
export type Glance = Readonly<{ x: number; y: number }> | null;

const MOOD: Record<AssistantState, [string, string]> = {
  idle: ['#8a6bff', '#4d8dff'],
  thinking: ['#6a3fd6', '#402a8f'],
  happy: ['#2fe3e3', '#3ddc8a'],
  concerned: ['#f5a742', '#d6842a'],
  warning: ['#ff6b6b', '#d6483f'],
  suggesting: ['#4d8dff', '#2fe3e3'],
  celebrating: ['#8a6bff', '#ff6cc8'],
  processing: ['#2f8bff', '#00c2ff'],
};

function eyeTransform(state: AssistantState): string {
  switch (state) {
    case 'thinking': return 'scaleY(0.88)';
    case 'processing': return 'scale(0.92, 0.8)';
    case 'warning': return 'scaleY(0.55)';
    case 'suggesting': return 'scaleY(1.05)';
    default: return 'none';
  }
}

function arcEyes(state: AssistantState): 'up' | 'down' | null {
  if (state === 'happy' || state === 'celebrating') return 'up';
  if (state === 'concerned') return 'down';
  return null;
}

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = () => typeof matchMedia === 'function' && matchMedia('(pointer: fine)').matches;

/** Landing's eye loop: target from the pointer, eased by 0.12 per frame, stops when settled. */
function useEyes(root: React.RefObject<HTMLSpanElement | null>, size: number, glance: Glance) {
  const glanceRef = useRef<Glance>(glance);
  const aim = useRef<(x: number, y: number) => void>(() => undefined);
  useEffect(() => {
    glanceRef.current = glance;
    if (glance) aim.current(glance.x, glance.y);
  }, [glance]);

  useEffect(() => {
    const el = root.current;
    if (!el) return undefined;
    const max = Math.max(2.5, size * 0.075); // landing: 9 px at 380 px, too small to see at 58 px
    const s = { tx: 0, ty: 0, cx: 0, cy: 0 };
    let running = false;
    let frame = 0;
    const apply = () => el.querySelectorAll<HTMLElement>('.orb-eye').forEach((eye) => { eye.style.translate = `${s.cx.toFixed(2)}px ${s.cy.toFixed(2)}px`; });
    const tick = () => {
      s.cx += (s.tx - s.cx) * 0.12;
      s.cy += (s.ty - s.cy) * 0.12;
      apply();
      if (Math.abs(s.tx - s.cx) > 0.05 || Math.abs(s.ty - s.cy) > 0.05) frame = requestAnimationFrame(tick); else running = false;
    };
    const loop = () => { if (!running) { running = true; frame = requestAnimationFrame(tick); } };
    aim.current = (x, y) => {
      const r = el.getBoundingClientRect();
      if (!r.width) return;
      const dx = x - (r.left + r.width / 2);
      const dy = y - (r.top + r.height / 2);
      const dist = Math.hypot(dx, dy) || 1;
      const scale = Math.min(1, dist / (r.width * 0.9));
      s.tx = (dx / dist) * scale * max;
      s.ty = (dy / dist) * scale * max;
      loop();
    };
    const onMove = (e: PointerEvent) => { if (!glanceRef.current) aim.current(e.clientX, e.clientY); };
    const onLeave = () => { if (!glanceRef.current) { s.tx = 0; s.ty = 0; loop(); } };
    let timer = 0;
    if (finePointer()) {
      window.addEventListener('pointermove', onMove, { passive: true });
      document.addEventListener('mouseleave', onLeave);
    } else {
      // Touch: look where the finger lands, and glance around now and then (landing: every 3.2 s; not with reduced motion).
      window.addEventListener('pointerdown', onMove, { passive: true });
      if (!reducedMotion()) timer = window.setInterval(() => {
        if (glanceRef.current || document.visibilityState !== 'visible') return;
        s.tx = (Math.random() - 0.5) * max * 0.8 * 2;
        s.ty = (Math.random() - 0.5) * max * 0.6 * 2;
        loop();
      }, 3200);
    }
    if (glanceRef.current) aim.current(glanceRef.current.x, glanceRef.current.y);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onMove);
      document.removeEventListener('mouseleave', onLeave);
      window.clearInterval(timer);
      cancelAnimationFrame(frame);
      aim.current = () => undefined;
    };
  }, [root, size]);
}

export default function Orb({ state, size = 60, glance = null }: { state: AssistantState; size?: number; glance?: Glance }) {
  const root = useRef<HTMLSpanElement>(null);
  useEyes(root, size, glance);
  const [a, b] = MOOD[state] ?? MOOD.idle;
  const arc = arcEyes(state);
  const motion = state === 'thinking' || state === 'processing' ? 'orb-tilt' : state === 'idle' || state === 'happy' || state === 'suggesting' ? 'orb-float' : '';
  const halo = state === 'thinking' || state === 'processing' || state === 'suggesting' || state === 'celebrating' ? 'orb-halo-fast' : 'orb-halo';
  const eye = (side: 'left' | 'right') => (
    <span key={side} className="orb-eye" style={{ left: side === 'left' ? '35%' : '65%' }}>
      {arc ? <svg viewBox="0 0 100 100" style={{ overflow: 'visible', width: '100%', height: '100%' }}>
        <path d={arc === 'up' ? 'M8,62 Q50,18 92,62' : 'M8,40 Q50,84 92,40'} fill="none" stroke={a} strokeWidth="14" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 4px ${a})` }} />
      </svg> : <picture>
        <source srcSet={`/melino/melino-eye-${side}.webp`} type="image/webp" />
        <img src={`/melino/melino-eye-${side}.png`} alt="" style={{ transform: eyeTransform(state) }} />
      </picture>}
    </span>
  );
  return <span ref={root} className={`orb ${motion}`} style={{ width: size, height: size }} aria-hidden="true">
    <span className={`orb-halo ${halo}`} style={{ background: `radial-gradient(closest-side, ${a} 0%, ${b} 45%, transparent 72%)` }} />
    <span className="orb-body">
      <picture><source srcSet="/melino/melino-core-base.webp" type="image/webp" /><img src="/melino/melino-core-base.png" alt="" draggable={false} /></picture>
      {eye('left')}{eye('right')}
    </span>
  </span>;
}
