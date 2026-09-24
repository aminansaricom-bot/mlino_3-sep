import { formatRating, type DemoRating } from '../demo/demoSocial';
import { tr, numberLocale } from '../i18n';

/** ستاره‌ی امتیاز؛ `compact` فقط «★ ۴٫۶ (۱۲۰)» را نشان می‌دهد. */
export default function Stars({ rating, compact = false, label = tr('امتیاز نمونه') }: { rating: DemoRating; compact?: boolean; label?: string }) {
  const full = Math.round(rating.average);
  const text = tr('{0} {1} از ۵ از {2} نظر', label, formatRating(rating.average), rating.count.toLocaleString(numberLocale()));
  if (compact) {
    return <span className="stars compact" role="img" aria-label={text}>
      <span className="star-glyph" aria-hidden="true">★</span>
      <b>{formatRating(rating.average)}</b>
      <small>({rating.count.toLocaleString(numberLocale())})</small>
    </span>;
  }
  return <span className="stars" role="img" aria-label={text}>
    <span className="star-row" aria-hidden="true">{[1, 2, 3, 4, 5].map((i) => <i key={i} className={i <= full ? 'on' : ''}>★</i>)}</span>
    <b>{formatRating(rating.average)}</b>
    <small>{tr('{0} نظر', rating.count.toLocaleString(numberLocale()))}</small>
  </span>;
}
