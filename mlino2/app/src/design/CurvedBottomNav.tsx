import { useEffect, useLayoutEffect, useRef, type KeyboardEvent } from 'react';
import { tr } from '../i18n';
import LiveIcon, { type LiveIconName } from '../live/icons';
import type { NavTab } from './ui';

/**
 * The customer app's bottom bar (owner's «فوتر منحنی ملینو» design): four places and, in the middle, the live
 * storefront in a raised orb that sits in a real cut-out of the bar (an SVG path, not a circle painted over it, so it
 * stays right over the map or the camera). The active place is marked by a dot that hops across; in the live
 * storefront the dot hides and the orb gets a ring. The app's own state stays the source of truth: the bar only asks
 * (onTab / onLive) and shows what it is given.
 *
 * Geometry from the design: orb 64 px, raised 28 px; cut-out 128 px wide and 42 px deep; bar 84 px + safe area.
 */
type Place = NavTab | 'live';
const ORDER: readonly Place[] = ['discover', 'offers', 'live', 'messages', 'saved'];

export function CurvedBottomNav({ tab, live, onTab, onLive, unread = 0 }: {
  tab: NavTab; live: boolean; onTab: (t: NavTab) => void; onLive: () => void; unread?: number;
}) {
  const root = useRef<HTMLElement | null>(null);
  const path = useRef<SVGPathElement | null>(null);
  const svg = useRef<SVGSVGElement | null>(null);
  const marker = useRef<HTMLSpanElement | null>(null);
  const buttons = useRef(new Map<Place, HTMLButtonElement>());
  const current: Place = live ? 'live' : tab;
  const shown = useRef<Place>(current);

  const items: readonly { id: NavTab; icon: LiveIconName; label: string }[] = [
    { id: 'discover', icon: 'compass', label: tr('کشف') },
    { id: 'offers', icon: 'offer', label: tr('آفرها') },
    { id: 'messages', icon: 'chat', label: tr('پیام‌ها') },
    { id: 'saved', icon: 'bookmark', label: tr('ذخیره‌ها') },
  ];

  // Surface with the cut-out, and the dot under the active place. Recomputed on every size change.
  const layout = () => {
    const el = root.current; const p = path.current; const s = svg.current;
    if (!el || !p || !s) return;
    const rect = el.getBoundingClientRect(); const w = rect.width; const h = rect.height; const c = w / 2;
    s.setAttribute('viewBox', `0 0 ${w} ${h}`);
    p.setAttribute('d', `M22 0H${c - 64}C${c - 43} 0 ${c - 43} 42 ${c} 42C${c + 43} 42 ${c + 43} 0 ${c + 64} 0H${w - 22}Q${w} 0 ${w} 22V${h}H0V22Q0 0 22 0Z`);
    if (shown.current !== 'live') {
      const b = buttons.current.get(shown.current)?.getBoundingClientRect();
      if (b) el.style.setProperty('--ml-x', `${b.left - rect.left + b.width / 2}px`);
    }
  };

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return undefined;
    let raf = 0;
    const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { el.setAttribute('data-instant', ''); layout(); void el.offsetWidth; el.removeAttribute('data-instant'); }); });
    ro.observe(el);
    el.setAttribute('data-instant', ''); layout(); void el.offsetWidth; el.removeAttribute('data-instant');
    return () => { ro.disconnect(); cancelAnimationFrame(raf); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // The app changed place: move the dot (a hop unless motion is reduced or it is the live storefront).
  useEffect(() => {
    const el = root.current; const m = marker.current;
    if (!el || !m || shown.current === current) return;
    shown.current = current;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    m.classList.remove('is-jumping');
    if (reduced) el.setAttribute('data-instant', '');
    if (!reduced && current !== 'live') { void m.offsetWidth; m.classList.add('is-jumping'); }
    layout();
    if (reduced) { void el.offsetWidth; el.removeAttribute('data-instant'); }
  }, [current]); // eslint-disable-line react-hooks/exhaustive-deps

  // Arrows only move focus between the five (in their order on screen); Enter/Space act through the button itself.
  const onKey = (e: KeyboardEvent<HTMLElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    const list = ORDER.map((id) => buttons.current.get(id)).filter((b): b is HTMLButtonElement => !!b)
      .sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
    const i = list.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    e.preventDefault();
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? list.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + list.length) % list.length;
    list[next].focus();
  };

  const place = (it: { id: NavTab; icon: LiveIconName; label: string }) => (
    <button key={it.id} type="button" ref={(b) => { if (b) buttons.current.set(it.id, b); }} className="ml-footer__item"
      aria-current={current === it.id ? 'page' : undefined} onClick={() => onTab(it.id)}>
      <span className="ml-footer__ico"><LiveIcon name={it.icon} size={24} />
        {it.id === 'messages' && unread > 0 && <span className="rs-badge-dot" aria-hidden="true">{unread > 9 ? '9+' : unread}</span>}</span>
      <span className="ml-footer__label">{it.label}</span>
      {it.id === 'messages' && unread > 0 && <span className="sr-only">{tr('{0} خوانده‌نشده', unread)}</span>}
    </button>
  );

  return <nav ref={root} className="ml-footer" data-live={live ? 'true' : 'false'} aria-label={tr('بخش‌های ملینو')} onKeyDown={onKey}>
    <svg ref={svg} className="ml-footer__surface" aria-hidden="true" preserveAspectRatio="none"><path ref={path} /></svg>
    <span ref={marker} className="ml-footer__marker" aria-hidden="true"><i className="ml-footer__dot" /><i className="ml-footer__ripple" /></span>
    <div className="ml-footer__items">
      {place(items[0])}
      {place(items[1])}
      <button type="button" ref={(b) => { if (b) buttons.current.set('live', b); }} className="ml-footer__item ml-footer__live"
        aria-current={live ? 'page' : undefined} onClick={onLive}>
        <span className="ml-footer__orb"><img src="/icons/vitrine-live.png" alt="" width={44} height={44} /></span>
        <span className="ml-footer__label">{tr('ویترین زنده')}</span>
      </button>
      {place(items[2])}
      {place(items[3])}
    </div>
  </nav>;
}
