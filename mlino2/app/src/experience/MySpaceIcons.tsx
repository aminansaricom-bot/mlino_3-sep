import type { ReactNode } from 'react';

// The owner's «فضای من» icons (melino-my-space-icons, transparent 24×24 set), drawn inline so they take the theme
// colour: #246B62 on #E7F4EF in light, #78D4BE on #163932 in dark (from the frame in design/app.css).
// Decorative: every row already says its name, so the icons are hidden from screen readers.

export type SpaceIconName = 'account' | 'language' | 'appearance' | 'sound-vibration' | 'my-places' | 'watch-later' | 'for-me' | 'small-discovery' | 'discovery-steps';

const SHAPES: Record<SpaceIconName, ReactNode> = {
  account: <><circle cx="12" cy="7" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2Z" /></>,
  language: <><circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><path d="M3 12h18M5 6.5h14M5 17.5h14" /></>,
  appearance: <><circle cx="12" cy="12" r="5" /><path d="M12 7a5 5 0 0 1 0 10Z" fill="currentColor" stroke="none" />
    <path d="M12 1v2M12 21v2M1 12h2M21 12h2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" /></>,
  'sound-vibration': <path d="M3 9h4l5-4v14l-5-4H3ZM16 8a6 6 0 0 1 0 8M19 5a10 10 0 0 1 0 14" />,
  'my-places': <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><path d="M12 13s-4-2.5-4-4.4A2.2 2.2 0 0 1 12 7a2.2 2.2 0 0 1 4 1.6C16 10.5 12 13 12 13Z" /></>,
  'watch-later': <path d="M6 3h12v18l-6-4-6 4Z" />,
  'for-me': <><path d="M12 20S3 14 3 8a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 1-.2 2-.6 3" /><circle cx="18" cy="18" r="5" fill="currentColor" stroke="none" />
    <path d="m15.6 18 1.6 1.6 3-3.4" strokeWidth="1.6" style={{ stroke: 'var(--brand-soft)' }} /></>,
  'small-discovery': <><circle cx="10.5" cy="13.5" r="8.5" /><path d="m14 10-2 5-5 2 2-5ZM20 1l1.2 2.8L24 5l-2.8 1.2L20 9l-1.2-2.8L16 5l2.8-1.2Z" /></>,
  'discovery-steps': <path d="M6 5c-2 0-3.5 2.5-3.5 5.5S4 15 6 15s3.5-1.5 3.5-4.5S8 5 6 5ZM4 18h4v2a2 2 0 0 1-4 0ZM18 2c-2 0-3.5 2.5-3.5 5.5S16 12 18 12s3.5-1.5 3.5-4.5S20 2 18 2ZM16 15h4v2a2 2 0 0 1-4 0Z" />,
};

export default function SpaceIcon({ name, size = 24 }: { name: SpaceIconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true" focusable="false">{SHAPES[name]}</svg>;
}
