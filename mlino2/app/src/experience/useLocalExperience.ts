import { useEffect, useState } from 'react';

export const EXPERIENCE_KEY = 'mlino.v2.experience.v1';
export type Collection = 'saved' | 'later' | 'liked';
export interface LocalExperience {
  version: 1;
  theme: 'light' | 'dark';
  saved: string[];
  later: string[];
  liked: string[];
  hidden: string[];
  viewed: string[];
  /** Saved products as «organizationId/catalogItemId». */
  savedItems: string[];
  sound: boolean;
  haptics: boolean;
}
export const freshExperience = (): LocalExperience => ({version: 1, theme: 'light', saved: [], later: [], liked: [], hidden: [], viewed: [], savedItems: [], sound: false, haptics: false});
export function parseExperience(raw: string | null): LocalExperience {
  const base = freshExperience();
  if (!raw) return base;
  try {
    const data = JSON.parse(raw);
    if (!data || data.version !== 1) return base;
    for (const key of ['saved','later','liked','hidden','viewed','savedItems'] as const) {
      if (Array.isArray(data[key])) base[key] = [...new Set<string>(data[key].filter((id: unknown) => typeof id === 'string'))].slice(0, 1000);
    }
    // Existing hidden choices take precedence when repairing older browser state.
    for (const key of ['saved', 'later', 'liked'] as const) {
      base[key] = base[key].filter(id => !base.hidden.includes(id));
    }
    base.theme = data.theme === 'dark' ? 'dark' : 'light';
    base.sound = data.sound === true;
    base.haptics = data.haptics === true;
  } catch { /* Invalid browser state is discarded, never a reason to stop discovery. */ }
  return base;
}

/** Personal browser collections only; never passed to matching or the directory. */
export function toggleExperience(prev: LocalExperience, key: Collection | 'hidden', id: string): LocalExperience {
  if (prev[key].includes(id)) return {...prev, [key]: prev[key].filter(x => x !== id)};
  const next = {...prev, [key]: [...prev[key], id]};
  if (key === 'hidden') {
    for (const collection of ['saved', 'later', 'liked'] as const) {
      next[collection] = prev[collection].filter(x => x !== id);
    }
  } else {
    next.hidden = prev.hidden.filter(x => x !== id);
  }
  return next;
}

export function useLocalExperience() {
  const [data, setData] = useState(() => {
    try { return parseExperience(localStorage.getItem(EXPERIENCE_KEY)); }
    catch { return freshExperience(); }
  });
  const [storageFailed, setStorageFailed] = useState(false);
  useEffect(() => {
    document.documentElement.dataset.theme = data.theme;
  }, [data.theme]);
  useEffect(() => {
    try { localStorage.setItem(EXPERIENCE_KEY, JSON.stringify(data)); setStorageFailed(false); }
    catch { setStorageFailed(true); }
  }, [data]);
  function toggle(key: Collection | 'hidden', id: string) {
    setData(prev => toggleExperience(prev, key, id));
  }
  /** Save or unsave one product; the key names its business too. */
  function toggleItem(organizationId: string, itemId: string) {
    const key = `${organizationId}/${itemId}`;
    setData(prev => ({...prev, savedItems: prev.savedItems.includes(key) ? prev.savedItems.filter(x => x !== key) : [...prev.savedItems, key]}));
  }
  function viewed(id: string) {
    setData(prev => prev.viewed.includes(id) ? prev : {...prev, viewed: [...prev.viewed, id]});
  }
  return { data, setData, toggle, toggleItem, viewed, storageFailed };
}

/** Explicit user gestures only; sounds never autoplay in response to map updates. */
export function feedback(settings: Pick<LocalExperience, 'sound' | 'haptics'>) {
  if (settings.haptics && 'vibrate' in navigator) navigator.vibrate(15);
  if (!settings.sound || !('AudioContext' in window)) return;
  try {
    const context = new AudioContext();
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.frequency.value = 660;
    gain.gain.setValueAtTime(0.035, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.09);
    osc.connect(gain); gain.connect(context.destination);
    osc.start(); osc.stop(context.currentTime + 0.1);
    osc.onended = () => { void context.close(); };
  } catch { /* Device feedback is optional. */ }
}
