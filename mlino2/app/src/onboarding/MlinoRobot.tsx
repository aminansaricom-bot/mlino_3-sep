import { useEffect, useRef } from 'react';
import './robot.css';

/**
 * The MLINO robot from the app icon, drawn as SVG so it can come alive: the eyes wander, follow a finger or the pointer,
 * and blink every few seconds (sometimes twice). With «reduce motion» on, only the floating stops: glances and blinks are small.
 */
export default function MlinoRobot({ size = 260 }: { size?: number }) {
  const eyes = useRef<SVGGElement | null>(null);
  const lids = useRef<SVGGElement | null>(null);
  const root = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    let alive = true;
    let followUntil = 0;
    const timers: number[] = [];
    const later = (fn: () => void, ms: number) => { timers.push(window.setTimeout(() => { if (alive) fn(); }, ms)); };
    const look = (x: number, y: number) => { if (eyes.current) eyes.current.style.transform = `translate(${x}px, ${y}px)`; };

    // Wandering glances: a new spot every 1.2–3 s, back to the middle now and then.
    const wander = () => {
      if (Date.now() > followUntil) {
        const centre = Math.random() < 0.35;
        look(centre ? 0 : (Math.random() * 2 - 1) * 14, centre ? 0 : (Math.random() * 2 - 1) * 7);
      }
      later(wander, 1200 + Math.random() * 1800);
    };
    // Blinks every 2.5–5 s; one in four is a double blink.
    const blinkOnce = (then?: () => void) => {
      lids.current?.classList.add('closed');
      later(() => { lids.current?.classList.remove('closed'); then?.(); }, 140);
    };
    const blink = () => {
      if (Math.random() < 0.25) blinkOnce(() => later(() => blinkOnce(), 160)); else blinkOnce();
      later(blink, 2500 + Math.random() * 2500);
    };
    // Eyes follow the finger or pointer for a moment.
    const follow = (e: PointerEvent) => {
      const svg = root.current; if (!svg) return;
      const r = svg.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2); const dy = e.clientY - (r.top + r.height * 0.3);
      const d = Math.max(1, Math.hypot(dx, dy));
      followUntil = Date.now() + 1500;
      look((dx / d) * Math.min(14, d / 12), (dy / d) * Math.min(7, d / 20));
    };
    later(wander, 800);
    later(blink, 1600);
    window.addEventListener('pointermove', follow);
    window.addEventListener('pointerdown', follow);
    return () => { alive = false; timers.forEach((id) => window.clearTimeout(id)); window.removeEventListener('pointermove', follow); window.removeEventListener('pointerdown', follow); };
  }, []);

  return <svg ref={root} className="mlino-robot" width={size} height={size} viewBox="0 0 512 512" role="img" aria-label="MLINO">
    <defs>
      <linearGradient id="robot-line" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#9be7ff" />
        <stop offset=".55" stopColor="#38bdf8" />
        <stop offset="1" stopColor="#2563eb" />
      </linearGradient>
      <linearGradient id="robot-body" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#7dd3fc" />
        <stop offset="1" stopColor="#1d8cf0" />
      </linearGradient>
      <radialGradient id="robot-face" cx=".5" cy=".42" r=".6">
        <stop offset="0" stopColor="#1e3a8a" stopOpacity=".55" />
        <stop offset="1" stopColor="#0b1033" stopOpacity=".9" />
      </radialGradient>
      <radialGradient id="robot-eye" cx=".4" cy=".35" r=".7">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset=".6" stopColor="#c8f3ff" />
        <stop offset="1" stopColor="#67d4ff" />
      </radialGradient>
      <filter id="robot-glow" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="10" result="b" />
        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs>
    <g className="robot-float">
      {/* Body: the arch under the head. */}
      <path d="M150 452 V372 A106 96 0 0 1 362 372 V452" fill="none" stroke="url(#robot-body)" strokeWidth="64" strokeLinecap="round" filter="url(#robot-glow)" />
      <path d="M150 452 V372 A106 96 0 0 1 362 372 V452" fill="none" stroke="#e0f7ff" strokeOpacity=".35" strokeWidth="10" strokeLinecap="round" transform="translate(-10 -12)" />
      {/* Head: a glowing ring around a dark face. */}
      <circle cx="256" cy="150" r="104" fill="url(#robot-face)" />
      <circle cx="256" cy="150" r="104" fill="none" stroke="url(#robot-line)" strokeWidth="18" filter="url(#robot-glow)" />
      <circle cx="256" cy="150" r="80" fill="none" stroke="#9be7ff" strokeOpacity=".35" strokeWidth="4" />
      {/* Eyes: the outer group moves, the inner one blinks. */}
      <g ref={eyes} className="robot-eyes">
        <g ref={lids} className="robot-lids">
          <ellipse cx="216" cy="146" rx="25" ry="25" fill="url(#robot-eye)" filter="url(#robot-glow)" />
          <ellipse cx="296" cy="146" rx="25" ry="25" fill="url(#robot-eye)" filter="url(#robot-glow)" />
        </g>
      </g>
    </g>
  </svg>;
}
