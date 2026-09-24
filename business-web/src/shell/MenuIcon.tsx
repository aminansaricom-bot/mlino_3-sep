import type { ReactNode } from 'react';

// Sidebar icons from the owner's «milino-menu-icons» set (24×24, stroke 1.8). Drawn with currentColor so the
// active item can change colour; the two last ones (start page, sign out) are drawn in the same style.

export type MenuIconName =
  | 'today' | 'accounting' | 'inventory' | 'products' | 'storefront' | 'content' | 'crm' | 'plan'
  | 'settings' | 'members' | 'customer-view' | 'start' | 'logout';

const PATHS: Record<MenuIconName, ReactNode> = {
  today: <><path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" /><path d="M9 21v-7h6v7" /></>,
  accounting: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h8M8 11h8M8 15h3m4 0h1m-8 3h3m4 0h1" /></>,
  inventory: <><path d="m12 2 9 5-9 5-9-5 9-5Zm-9 5v10l9 5 9-5V7M12 12v10" /><path d="m7.5 4.5 9 5" /></>,
  products: <><path d="M3 5a2 2 0 0 1 2-2h8l8 8-10 10-8-8V5Z" /><circle cx="8" cy="8" r="1.4" /></>,
  storefront: <><path d="M3 10h18l-2-6H5l-2 6Z" /><path d="M4 10v11h16V10M9 21v-7h6v7M3 10c0 2 3 3 4.5 0 1.5 3 4.5 2 4.5 0 1.5 2 4.5 3 4.5 0 1.5 3 4.5 2 4.5 0" /></>,
  content: <path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3ZM19 17l.6 1.4L21 19l-1.4.6L19 21l-.6-1.4L17 19l1.4-.6L19 17ZM4 17l.4 1.1L5.5 18.5l-1.1.4L4 20l-.4-1.1-1.1-.4 1.1-.4L4 17Z" />,
  crm: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v2H3ZM16 5a3 3 0 0 1 0 6m1 2a5 5 0 0 1 4 5v2h-4" /></>,
  plan: <><path d="m12 2 8 5v10l-8 5-8-5V7l8-5Z" /><path d="m4 7 8 5 8-5M12 12v10M8 4.5l8 5" /></>,
  settings: <><path d="M10 2h4l.6 2.2 1.8.8 2-.9 2.8 2.8-.9 2 .8 1.8L23 11v4l-2.2.6-.8 1.8.9 2-2.8 2.8-2-.9-1.8.8L14 23h-4l-.6-2.2-1.8-.8-2 .9-2.8-2.8.9-2-.8-1.8L1 15v-4l2.2-.6.8-1.8-.9-2 2.8-2.8 2 .9 1.8-.8L10 2Z" /><circle cx="12" cy="13" r="3" /></>,
  members: <><circle cx="8" cy="8" r="3" /><path d="M2 20v-2a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v2H2ZM16 10h6m-3-3v6M17 17h5" /></>,
  'customer-view': <><rect x="2" y="3" width="20" height="18" rx="2" /><path d="M2 8h20M5 5.5h.01M8 5.5h.01M12 15s2-3 5-3 5 3 5 3-2 3-5 3-5-3-5-3Z" /><circle cx="17" cy="15" r="1" /></>,
  start: <><path d="M9 14 4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 0 10h-3" /></>,
  logout: <><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" /><path d="M9 16l-4-4 4-4M5 12h11" /></>,
};

/** Module id → icon; modules without their own icon fall back to the storefront one. */
export const MODULE_ICON: Record<string, MenuIconName> = {
  accounting: 'accounting', inventory: 'inventory', products: 'products', storefront: 'storefront',
  offers: 'storefront', chat: 'storefront', content: 'content', crm: 'crm', plan: 'plan',
};

export default function MenuIcon({ name }: { name: MenuIconName }) {
  return <svg className="menu-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{PATHS[name]}</svg>;
}
