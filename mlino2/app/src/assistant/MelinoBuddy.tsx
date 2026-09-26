import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import LiveIcon from '../live/icons';
import { tr } from '../i18n';
import { greeting, mayTip, nextTip, resultLine, type BuddyAction } from './buddyScript';
import './buddy.css';

/**
 * Melino, the owner's charcoal-teal robot from the entry page, as the search assistant in the corner of the page
 * (in place of the old ✦ button). Its eyes follow the finger or pointer, glance around, blink and wink. It greets
 * once, says what the search found when the person pauses, answers when tapped (the app's own assistant), and after
 * a quiet spell offers one tip about what MLINO can do. Closing its bubble keeps it quiet for the rest of the visit.
 */

type Bubble = Readonly<{ kind: 'greet' | 'result' | 'tip' | 'answer' | 'thinking'; text: string; action?: BuddyAction; actionLabel?: string; run?: () => void }>;

const SHOWN_KEY = 'mlino.buddy.tips.v1';
const VISIT_KEY = 'mlino.buddy.visits.v1';
const session = {
  get(key: string): string | null { try { return sessionStorage.getItem(key); } catch { return null; } },
  set(key: string, value: string) { try { sessionStorage.setItem(key, value); } catch { /* per-visit convenience only */ } },
};
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** The robot alone: the sphere and two living eyes. `track` = follow the pointer and glance around. */
export function MelinoOrb({ size = 64, track = true, thinking = false, lookAt }: { size?: number; track?: boolean; thinking?: boolean; lookAt?: RefObject<HTMLElement | null> }) {
  const orb = useRef<HTMLSpanElement | null>(null);
  const eyes = useRef<Array<HTMLSpanElement | null>>([]);
  useEffect(() => {
    let alive = true;
    const timers: number[] = [];
    const later = (fn: () => void, ms: number) => { timers.push(window.setTimeout(() => { if (alive) fn(); }, ms)); };
    const pos = { tx: 0, ty: 0, x: 0, y: 0, running: false, lastInput: 0 };
    const shift = () => (orb.current?.getBoundingClientRect().width ?? size) * 0.07;
    const tick = () => {
      pos.x += (pos.tx - pos.x) * 0.16; pos.y += (pos.ty - pos.y) * 0.16;
      const t = `translate(${pos.x.toFixed(2)}px, ${pos.y.toFixed(2)}px)`;
      eyes.current.forEach((e) => { if (e) e.style.transform = t; });
      if (alive && (Math.abs(pos.tx - pos.x) > 0.05 || Math.abs(pos.ty - pos.y) > 0.05)) requestAnimationFrame(tick); else pos.running = false;
    };
    const loop = () => { if (!pos.running) { pos.running = true; requestAnimationFrame(tick); } };
    const dir = (nx: number, ny: number) => { const m = shift(); pos.tx = nx * m; pos.ty = ny * m; loop(); };
    const at = (cx: number, cy: number) => {
      const r = orb.current?.getBoundingClientRect(); if (!r?.width) return;
      const dx = cx - (r.left + r.width / 2); const dy = cy - (r.top + r.height * 0.53);
      const d = Math.hypot(dx, dy) || 1; const k = Math.min(1, d / (r.width * 3)) * shift();
      pos.tx = (dx / d) * k; pos.ty = (dy / d) * k; pos.lastInput = Date.now(); loop();
    };
    const onPointer = (e: PointerEvent) => at(e.clientX, e.clientY);
    const onKey = () => { const el = lookAt?.current; if (el) { const r = el.getBoundingClientRect(); at(r.left + r.width / 2, r.top + r.height / 2); } };
    if (track) {
      window.addEventListener('pointermove', onPointer, { passive: true });
      window.addEventListener('pointerdown', onPointer, { passive: true });
      window.addEventListener('keydown', onKey);
      const glance = () => {
        if (Date.now() - pos.lastInput > 4000 && !reducedMotion()) dir((Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 1.1);
        later(glance, 2800 + Math.random() * 1600);
      };
      later(glance, 1500);
    }
    // Blink every few seconds; about one time in three it is a wink.
    const shut = (list: Array<HTMLSpanElement | null>, ms: number) => {
      list.forEach((e) => e?.classList.add('shut'));
      later(() => list.forEach((e) => e?.classList.remove('shut')), ms);
    };
    const blink = () => {
      if (!document.hidden) {
        if (Math.random() < 0.34) shut([eyes.current[Math.random() < 0.5 ? 0 : 1]], 260);
        else { shut(eyes.current, 120); if (Math.random() < 0.2) later(() => shut(eyes.current, 110), 260); }
      }
      later(blink, 2400 + Math.random() * 3200);
    };
    later(blink, 1400);
    return () => {
      alive = false; timers.forEach((id) => window.clearTimeout(id));
      window.removeEventListener('pointermove', onPointer); window.removeEventListener('pointerdown', onPointer); window.removeEventListener('keydown', onKey);
    };
  }, [track, size, lookAt]);
  return <span ref={orb} className={`mb-orb${thinking ? ' thinking' : ''}`} style={{ width: size, height: size }} aria-hidden="true">
    <span className="mb-aura" />
    <span className="mb-float">
      <span className="mb-base" />
      <span ref={(e) => { eyes.current[0] = e; }} className="mb-eye l"><i /></span>
      <span ref={(e) => { eyes.current[1] = e; }} className="mb-eye r"><i /></span>
    </span>
  </span>;
}

export default function MelinoBuddy(p: {
  query: string;
  /** What the search shows for the current words (null while nothing is typed). */
  counts: { businesses: number; products: number } | null;
  /** The assistant's answer for the current words, after the robot was tapped. */
  answer: { loading: boolean; text: string | null } | null;
  onAsk: () => void;
  /** The nearest business that matches, offered with the answer. */
  best?: { line: string; label: string; open: () => void } | null;
  actions: Partial<Record<BuddyAction, () => void>>;
  input: RefObject<HTMLInputElement | null>;
}) {
  const [bubble, setBubble] = useState<Bubble | null>(null);
  const [quiet, setQuiet] = useState(false);
  const lastActivity = useRef(Date.now());
  const tipsThisVisit = useRef(0);
  const asked = useRef(false);
  const hideTimer = useRef<number | null>(null);
  const available = new Set(Object.keys(p.actions) as BuddyAction[]);

  const show = useCallback((b: Bubble | null, hideAfter?: number) => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    setBubble(b);
    if (b && hideAfter) hideTimer.current = window.setTimeout(() => setBubble((cur) => (cur === b ? null : cur)), hideAfter);
  }, []);
  useEffect(() => () => { if (hideTimer.current) window.clearTimeout(hideTimer.current); }, []);

  // One greeting per visit, only while the box is empty.
  useEffect(() => {
    const visit = Number(session.get(VISIT_KEY) ?? '0') + 1;
    session.set(VISIT_KEY, String(visit));
    const t = window.setTimeout(() => { if (!p.input.current?.value) show({ kind: 'greet', text: greeting(visit) }, 12000); }, 700);
    return () => window.clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Activity (touch, keys, scrolling) postpones tips.
  useEffect(() => {
    const mark = () => { lastActivity.current = Date.now(); };
    window.addEventListener('pointerdown', mark, { passive: true });
    window.addEventListener('keydown', mark);
    window.addEventListener('scroll', mark, { passive: true, capture: true });
    return () => { window.removeEventListener('pointerdown', mark); window.removeEventListener('keydown', mark); window.removeEventListener('scroll', mark, { capture: true }); };
  }, []);

  // Typing hides the bubble; a pause says what was found.
  const q = p.query.trim();
  useEffect(() => {
    lastActivity.current = Date.now();
    asked.current = false;
    setBubble((cur) => (cur && cur.kind !== 'tip' ? null : cur));
  }, [q]);
  useEffect(() => {
    // After the robot was asked, its answer stays (the answer's words may change the counts).
    if (asked.current || q.length < 2 || !p.counts || quiet) return undefined;
    const counts = p.counts;
    const t = window.setTimeout(() => {
      if (asked.current) return; // the robot was tapped meanwhile: its answer wins
      const none = counts.businesses === 0 && counts.products === 0;
      show({ kind: 'result', text: resultLine(q, counts), ...(none && available.has('photo') ? { action: 'photo' as const, actionLabel: tr('جست‌وجو با عکس') } : {}) }, none ? 12000 : 7000);
    }, 1400);
    return () => window.clearTimeout(t);
  }, [q, p.counts?.businesses, p.counts?.products, quiet]); // eslint-disable-line react-hooks/exhaustive-deps

  // The assistant's answer, once the robot was asked.
  useEffect(() => {
    if (!asked.current || !p.answer) return;
    if (p.answer.loading) show({ kind: 'thinking', text: tr('دارم نگاه می‌کنم…') });
    else if (p.answer.text) show({ kind: 'answer', text: p.best ? `${p.answer.text} ${p.best.line}` : p.answer.text, ...(p.best ? { actionLabel: p.best.label, run: p.best.open } : {}) });
  }, [p.answer?.loading, p.answer?.text]); // eslint-disable-line react-hooks/exhaustive-deps

  // After a quiet spell: one tip, each tip once per session.
  useEffect(() => {
    const t = window.setInterval(() => {
      const typing = document.activeElement === p.input.current && !!p.input.current?.value;
      if (!mayTip({ idleFor: Date.now() - lastActivity.current, bubbleOpen: bubble !== null, quiet, tipsThisVisit: tipsThisVisit.current, typing })) return;
      const shown = (session.get(SHOWN_KEY) ?? '').split(',').filter(Boolean);
      const tip = nextTip(available, shown);
      if (!tip) return;
      session.set(SHOWN_KEY, [...shown, tip.id].join(','));
      tipsThisVisit.current += 1;
      lastActivity.current = Date.now();
      show({ kind: 'tip', text: tr(tip.text), action: tip.action, actionLabel: tip.actionLabel ? tr(tip.actionLabel) : undefined }, 11000);
    }, 1000);
    return () => window.clearInterval(t);
  }, [bubble, quiet]); // eslint-disable-line react-hooks/exhaustive-deps

  const tap = () => {
    setQuiet(false);
    if (q.length >= 2) { asked.current = true; show({ kind: 'thinking', text: tr('دارم نگاه می‌کنم…') }); p.onAsk(); return; }
    show({ kind: 'greet', text: tr('دنبال چی می‌گردی؟ بنویس یا بگو تا کمکت کنم.') }, 10000);
    p.input.current?.focus();
  };

  return <div className="mb-root">
    {bubble && <div className={`mb-bubble ${bubble.kind}`} role="status" aria-live="polite">
      <p>{bubble.text}</p>
      {bubble.run && <button type="button" className="mb-act" onClick={() => { show(null); bubble.run!(); }}>{bubble.actionLabel}</button>}
      {bubble.action && p.actions[bubble.action] && <button type="button" className="mb-act" onClick={() => { show(null); p.actions[bubble.action!]!(); }}>{bubble.actionLabel}</button>}
      <button type="button" className="mb-close" onClick={() => { show(null); setQuiet(true); }} aria-label={tr('بستن پیام ملینو')}><LiveIcon name="close" size={16} /></button>
    </div>}
    <button type="button" className="mb-bot" onClick={tap} aria-label={q.length >= 2 ? tr('پرسیدن از ملینو دربارهٔ «{0}»', q) : tr('ملینو، دستیار جست‌وجو')}>
      <MelinoOrb size={64} thinking={bubble?.kind === 'thinking'} lookAt={p.input} />
    </button>
  </div>;
}
