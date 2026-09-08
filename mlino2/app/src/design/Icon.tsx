import paths from './icon-paths.json';
import type { V2BusinessCategory } from '../directory/contract';

export type IconName = keyof typeof paths;
export const categoryIcon: Record<V2BusinessCategory, IconName> = {
  dental_clinic: 'dental', beauty_clinic: 'beauty', cafe: 'cafe',
  restaurant: 'restaurant', retail_shop: 'shop',
};

/** Only static, owned SVG paths are interpolated; no directory text enters markup. */
export function iconMarkup(name: IconName): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]}"/></svg>`;
}

export function Icon({name, className = ''}: {name: IconName; className?: string}) {
  return <svg className={`ml-icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}

/** Category emblem, never described as an actual business logo. */
export function CategoryCoin({category, offer = false}: {category: V2BusinessCategory; offer?: boolean}) {
  return <span className={`category-coin coin-${category}${offer ? ' coin-offer' : ''}`} aria-hidden="true"><Icon name={categoryIcon[category]} /></span>;
}
