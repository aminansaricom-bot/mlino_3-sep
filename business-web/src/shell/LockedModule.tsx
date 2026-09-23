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
  crm: {
    lead: 'CRM یعنی نگه‌داشتن پروفایل و تاریخچه‌ی مشتری‌ها — یعنی داده‌ی شخصی افراد واقعی.',
    points: [
      'طبق تصمیم ثبت‌شده (D-07 · D-36) تا تصویب سیاست رضایت (OD-01 / R8-a) هیچ پروفایل مشتری، هیچ داده‌ی قابل‌انتساب به فرد و هیچ ارسال داده‌ی مشتری به هوش مصنوعی ساخته نمی‌شود.',
      'پیشنهاد موجود برای نسخه‌ی اول: فقط داده‌ای که خود کسب‌وکار با رضایت مشتری جمع کرده (مثلاً فرم عضویت باشگاه مشتریان)، با تاریخ انقضا و بدون برداشت از شبکه‌های اجتماعی.',
      'دسته‌های حساس (مثل سلامت) حتی در این سطح هم مستثنا می‌شوند.',
    ],
    after: 'با تصویب OD-01، این ماژول با همان الگوی حسابداری و انبار ساخته می‌شود: موتور آزموده، ذخیره‌سازی جدا و دستیار با تأیید صریح.',
  },
} as const;

export default function LockedModule({ id }: { id: 'content' | 'crm' }) {
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
