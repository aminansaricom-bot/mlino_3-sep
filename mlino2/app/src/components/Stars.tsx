import { formatRating, type DemoRating } from '../demo/demoSocial';

/** ستاره‌ی امتیاز؛ `compact` فقط «★ ۴٫۶ (۱۲۰)» را نشان می‌دهد. */
export default function Stars({ rating, compact = false, label = 'امتیاز نمونه' }: { rating: DemoRating; compact?: boolean; label?: string }) {
  const full = Math.round(rating.average);
  const text = `${label} ${formatRating(rating.average)} از ۵ از ${rating.count.toLocaleString('fa-IR')} نظر`;
  if (compact) {
    return <span className="stars compact" role="img" aria-label={text}>
      <span className="star-glyph" aria-hidden="true">★</span>
      <b>{formatRating(rating.average)}</b>
      <small>({rating.count.toLocaleString('fa-IR')})</small>
    </span>;
  }
  return <span className="stars" role="img" aria-label={text}>
    <span className="star-row" aria-hidden="true">{[1, 2, 3, 4, 5].map((i) => <i key={i} className={i <= full ? 'on' : ''}>★</i>)}</span>
    <b>{formatRating(rating.average)}</b>
    <small>{rating.count.toLocaleString('fa-IR')} نظر</small>
  </span>;
}
