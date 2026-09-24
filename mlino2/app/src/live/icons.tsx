import type { ReactNode } from 'react';

// Line icons from the owner's implementation kit (24×24, stroke 1.8, currentColor), inline so colour follows text.

export type LiveIconName =
  | 'close' | 'menu' | 'search' | 'chat' | 'bookmark' | 'offer' | 'pause' | 'play' | 'chevron-left' | 'chevron-right'
  | 'chevron-down' | 'send' | 'location' | 'my-location' | 'store' | 'clock' | 'camera' | 'refresh' | 'warning' | 'lock'
  | 'grid' | 'food' | 'shop' | 'service' | 'health' | 'more' | 'map';

const P: Record<LiveIconName, ReactNode> = {
  close: <path d="m5 5 14 14M5 19 19 5" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  search: <path d="M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Zm-2 5 6 6" />,
  chat: <path d="M21 11a9 8 0 0 1-9 8H5l-3 3V11a9 8 0 0 1 19 0ZM7 9h10M7 13h6" />,
  bookmark: <path d="M5 3h14v18l-7-4-7 4Z" />,
  offer: <path d="M3 3h9l9 9-9 9-9-9ZM7 7h.01M10 15l5-5" />,
  pause: <path d="M8 4v16M16 4v16" />,
  play: <path d="m8 4 12 8-12 8Z" />,
  'chevron-left': <path d="m15 5-7 7 7 7" />,
  'chevron-right': <path d="m9 5 7 7-7 7" />,
  'chevron-down': <path d="m6 9 6 6 6-6" />,
  send: <path d="M21 3 3 12l18 9-4-9ZM3 12h14" />,
  location: <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0ZM14 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0" />,
  'my-location': <><circle cx="12" cy="12" r="6.5" /><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" /><path d="M12 2v3.5M12 18.5V22M2 12h3.5M18.5 12H22" /></>,
  store: <path d="M4 10v11h16V10M3 4h18l1 6a3 3 0 0 1-5 2 3 3 0 0 1-5 0 3 3 0 0 1-5 0 3 3 0 0 1-5-2ZM9 21v-7h6v7" />,
  clock: <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 7v5l4 2" />,
  camera: <path d="M3 7h5l2-3h4l2 3h5v14H3ZM16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0" />,
  refresh: <path d="M20 8a8 8 0 1 0 0 8M20 3v5h-5" />,
  warning: <path d="m12 3 10 18H2ZM12 9v5M12 18h.01" />,
  lock: <path d="M6 11h12v10H6ZM8 11V8a4 4 0 0 1 8 0v3" />,
  grid: <path d="M4 4h7v7H4ZM13 4h7v7h-7ZM4 13h7v7H4ZM13 13h7v7h-7Z" />,
  food: <path d="M5 8h12v5a6 6 0 0 1-12 0ZM17 10h1.5a2.5 2.5 0 0 1 0 5H17M8 3v2M11 3v2M14 3v2" />,
  shop: <path d="M5 8h14l-1 13H6ZM9 8V6a3 3 0 0 1 6 0v2" />,
  service: <path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />,
  health: <path d="M12 20s-8-4.6-8-10.2A4.8 4.8 0 0 1 12 7a4.8 4.8 0 0 1 8 2.8C20 15.4 12 20 12 20ZM12 10v5M9.5 12.5h5" />,
  more: <><circle cx="12" cy="12" r="9" /><path d="M8 12h.01M12 12h.01M16 12h.01" /></>,
  map: <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3ZM9 3v15M15 6v15" />,
};

export default function LiveIcon({ name, size = 22, className = '' }: { name: LiveIconName; size?: number; className?: string }) {
  // Left/right chevrons mean «back/forward» in reading order, so they are mirrored in English (see language.css).
  const directional = name === 'chevron-left' || name === 'chevron-right';
  return <svg className={`lv-icon${directional ? ' lv-dir' : ''} ${className}`} viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{P[name]}</svg>;
}
