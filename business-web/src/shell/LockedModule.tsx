import { moduleById } from '../modules/registry';

const COPY = {
  content: {
    lead: 'Content Studio همان ماژول تولید محتوا و هوش شبکه‌های اجتماعی ملیناست: ایده و تقویم محتوا، ساخت پست قبل/بعد، انتشار و یادگیری از نتیجه‌ها.',
    points: [
      'Content Studio ماژول است و مخزن و ذخیره‌سازی خودش را دارد؛ اینجا فقط وصل می‌شود، بازنویسی نمی‌شود.',
      'وصل شدنش به این کسب‌وکار «پیوند فضای کاری به سازمان» است که رضایت دوطرفه می‌خواهد: یک عضو مجاز کسب‌وکار و اثبات کنترل از درون Content Studio (D-62).',
      'ورود Content Studio هرگز ورود ملینو حساب نمی‌شود؛ ورود فقط با هویت هسته است (ADR-0012).',
      'پیش از اتصال، Content Studio باید پشتیبان بیرونی داشته باشد (OD-09).',
    ],
    after: 'پس از اتصال: کارت‌های «امروز» پیشنهادهای محتوایی را هم نشان می‌دهند و دستیار ملینو همان پیام‌های Content Studio را در همین پنل می‌گوید.',
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
