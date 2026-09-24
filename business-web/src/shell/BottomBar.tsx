import type { MouseEvent } from 'react';
import { useWorkspace } from '../workspace';

// Mobile bottom bar. Pattern after the owner's reference reel (motion and shape only; icons drawn here):
// – the active item rides a raised brand-gradient circle that overlaps the bar's top edge and springs sideways
//   to the next item;
// – the bar takes the active item's tint. (The rising tap bubble from the reel was removed at the owner's request.)
// prefers-reduced-motion turns all of it off (global rule in styles.css).

type Key = 'home' | 'accounting' | 'inventory' | 'storefront' | 'more';

const P = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;

export function NavIcon({ name }: { name: Key }) {
  switch (name) {
    case 'home': return <svg {...P}><path d="M4 10.4 12 4l8 6.4V19a1.5 1.5 0 0 1-1.5 1.5H15v-5.2H9v5.2H5.5A1.5 1.5 0 0 1 4 19z" /></svg>;
    case 'accounting': return <svg {...P}><path d="M6.5 4H18a1 1 0 0 1 1 1v15H8.5a2 2 0 0 1-2-2z" /><path d="M6.5 18a2 2 0 0 1 2-2H19" /><path d="M10 8h5.5M10 11.2h3.5" /></svg>;
    case 'inventory': return <svg {...P}><path d="M4 8 12 4l8 4v8.2L12 20l-8-3.8z" /><path d="m4 8 8 4 8-4M12 12v8" /><path d="m8 6 8 4" /></svg>;
    case 'storefront': return <svg {...P}><path d="M5 9.5 6.4 4.5h11.2L19 9.5" /><path d="M4.5 9.5a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0" /><path d="M5.5 11.5V20h13v-8.5M10 20v-4.5h4V20" /></svg>;
    default: return <svg {...P}><rect x="4.5" y="4.5" width="6" height="6" rx="2" /><rect x="13.5" y="4.5" width="6" height="6" rx="2" /><rect x="4.5" y="13.5" width="6" height="6" rx="2" /><rect x="13.5" y="13.5" width="6" height="6" rx="2" /></svg>;
  }
}

const ITEMS: readonly { key: Key; to?: string; label: string; tint: string }[] = [
  { key: 'home', to: '/', label: 'امروز', tint: '#ddd3ff' },
  { key: 'accounting', to: '/accounting', label: 'حسابداری', tint: '#fbd3ef' },
  { key: 'inventory', to: '/inventory', label: 'انبار', tint: '#ffe3bf' },
  { key: 'storefront', to: '/storefront', label: 'ویترین', tint: '#c9eefa' },
  { key: 'more', label: 'همه', tint: '#e4e2ee' },
];

export default function BottomBar({ active, onMore }: { active: string; onMore: () => void }) {
  const { navigate } = useWorkspace();
  const index = ITEMS.findIndex((it) => it.key === active);
  const tint = ITEMS[index]?.tint ?? 'transparent';

  const tap = (i: number, e: MouseEvent) => {
    const it = ITEMS[i];
    if (it.to && (e.metaKey || e.ctrlKey)) return;
    e.preventDefault();
    if (it.to) navigate(it.to); else onMore();
  };

  return <nav className="bottom-bar" aria-label="میان‌بر" style={{ ['--tint' as string]: tint }}>
    <span className={`bb-orb${index < 0 ? ' off' : ''}`} style={{ ['--i' as string]: Math.max(index, 0) }} aria-hidden="true" />
    {ITEMS.map((it, i) => {
      const inner = <>
        <span className="bb-ico"><NavIcon name={it.key} /></span>
        <span className="bb-label">{it.label}</span>
      </>;
      return it.to
        ? <a key={it.key} href={it.to} className={i === index ? 'on' : ''} aria-current={i === index ? 'page' : undefined} onClick={(e) => tap(i, e)}>{inner}</a>
        : <button key={it.key} type="button" onClick={(e) => tap(i, e)}>{inner}</button>;
    })}
  </nav>;
}
