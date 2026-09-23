import type { ArVitrineItem } from './ArOverlayService';
import type { CatalogRecord } from '../publicExport/catalog';
import { CatalogImage } from '../publicExport/catalogCards';
import { formatDistance } from '../uiFormat';

export type BubbleLayout = Readonly<{ businessId: string; leftPercent: number; topPercent: number; size: number; depth: number }>;

const NEAR_SIZE = 108;
const FAR_SIZE = 46;

/**
 * چیدمان حباب‌ها: افقی از جهت واقعی کسب‌وکار نسبت به گوشی، اندازه و ارتفاع از فاصله.
 * نزدیک‌تر یعنی بزرگ‌تر و پایین‌تر، دورتر یعنی کوچک‌تر و نزدیک‌تر به افق؛ همین حس
 * عمق سه‌بعدی را می‌سازد. حباب نزدیک‌تر روی حباب دورتر می‌نشیند.
 */
export function layoutBubbles(items: readonly ArVitrineItem[], radiusMeters: number): BubbleLayout[] {
  const radius = Math.max(1, radiusMeters);
  const sorted = [...items].sort((a, b) => b.distanceMeters - a.distanceMeters || a.businessId.localeCompare(b.businessId));
  return sorted.map((item, index) => {
    const t = Math.min(1, Math.max(0, item.distanceMeters / radius));
    const size = Math.round(NEAR_SIZE - (NEAR_SIZE - FAR_SIZE) * Math.sqrt(t));
    // لایه‌ی کوچک عمودی تا حباب‌های هم‌جهت و هم‌فاصله کاملاً روی هم نیفتند
    const lane = (index % 3) - 1;
    return {
      businessId: item.businessId,
      leftPercent: Math.min(92, Math.max(8, item.placement.screenXPercent)),
      topPercent: 66 - 38 * t + lane * 5,
      size,
      // فهرست از دور به نزدیک مرتب است؛ پس حباب نزدیک‌تر شماره‌ی بزرگ‌تر می‌گیرد و رو قرار می‌گیرد
      depth: index + 1,
    };
  });
}

const GLYPH: Record<string, string> = { cafe: '☕', restaurant: '🍽', retail_shop: '🛍', dental_clinic: '🦷', beauty_clinic: '💠' };

/** نمای حبابی: لوگو یا عکس هر کسب‌وکار در یک حباب شیشه‌ای؛ کسب‌وکار دارای پیشنهاد طلایی می‌درخشد. */
export default function ArBubbles({ items, radiusMeters, catalogByOrg, onSelect }: {
  items: readonly ArVitrineItem[];
  radiusMeters: number;
  catalogByOrg?: ReadonlyMap<string, CatalogRecord>;
  onSelect: (businessId: string) => void;
}) {
  const layout = layoutBubbles(items, radiusMeters);
  const byId = new Map(items.map((item) => [item.businessId, item]));
  return <div className="ar-bubbles">
    {layout.map((spot) => {
      const item = byId.get(spot.businessId)!;
      const cover = catalogByOrg?.get(item.businessId)?.items.find((entry) => entry.media.length > 0)?.media[0];
      const name = item.name.replace('(آزمایشی)', '').trim();
      return <button key={item.businessId} type="button" className={`orb${item.activeOffer ? ' orb-offer' : ''}`}
        style={{ left: `${spot.leftPercent}%`, top: `${spot.topPercent}%`, zIndex: 10 + spot.depth, ['--orb' as string]: `${spot.size}px` }}
        onClick={() => onSelect(item.businessId)}
        aria-label={`${name} — ${formatDistance(item.distanceMeters)}${item.activeOffer ? ' — پیشنهاد ویژه' : ''}`}>
        <span className="orb-sphere">
          {cover ? <CatalogImage media={cover} load /> : <span className="orb-glyph" aria-hidden="true">{GLYPH[item.category] ?? '📍'}</span>}
          <span className="orb-shine" aria-hidden="true" />
          {item.activeOffer && <span className="orb-badge" aria-hidden="true">٪</span>}
        </span>
        <span className="orb-label"><b>{name}</b><small>{formatDistance(item.distanceMeters)}</small></span>
      </button>;
    })}
  </div>;
}
