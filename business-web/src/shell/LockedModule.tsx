import { moduleById } from '../modules/registry';

const COPY = {
  content: {
    lead: 'به‌زودی: ایده و تقویم پست برای اینستاگرام و شبکه‌های دیگر، ساخت پست از عکس محصولات و دیدن اینکه کدام پست بهتر جواب داده.',
    points: [
      'پست‌ها از همین محصولات و آفرهای شما ساخته می‌شوند؛ چیزی دوباره وارد نمی‌کنید.',
      'هیچ پستی بدون تأیید خودتان منتشر نمی‌شود.',
      'وصل کردن حساب‌های شبکه‌ی اجتماعی با اجازه‌ی خودتان است و هر وقت بخواهید قطع می‌شود.',
    ],
    after: 'وقتی آماده شد، پیشنهادهای محتوایی در «امروز» و در دستیار ملینو هم دیده می‌شوند.',
  },
} as const;

export default function LockedModule({ id }: { id: 'content' }) {
  const m = moduleById(id);
  const copy = COPY[id];
  return <div className="stack">
    <section className="card locked">
      <div className="locked-head"><span className="module-icon big" aria-hidden="true">{m.icon}</span><div><h1>{m.title}</h1><span className={`badge ${m.status === 'blocked' ? 'bad' : 'muted'}`}>{m.statusNote}</span></div></div>
      <p className="lead">{copy.lead}</p>
      <ul className="points">{copy.points.map((p) => <li key={p}>{p}</li>)}</ul>
      <p className="note">{copy.after}</p>
    </section>
  </div>;
}
