import { mediaUrl, priceLabel, type PublishedBusiness, type PublishedState } from '../../published';
import { faNum, jDate, toFaDigits } from '../../format';
import { useWorkspace } from '../../workspace';

const clean = (s: string) => s.replace(/\s*\(آزمایشی\)/g, '').replace(/\s*—\s*داده‌ی آزمایشی.*$/, '');
const DAYS = ['', 'شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

function Guard({ state, children }: { state: PublishedState; children: (b: PublishedBusiness) => React.ReactNode }) {
  if (state.status === 'loading') return <p className="empty">در حال خواندن آنچه منتشر شده…</p>;
  if (state.status === 'error') return <p className="empty">فایل منتشرشده خوانده نشد. چیزی حدس زده نمی‌شود؛ کمی بعد دوباره امتحان کن.</p>;
  if (!state.business) return <p className="empty">این کسب‌وکار هنوز چیزی منتشر نکرده است.</p>;
  return <>{children(state.business)}</>;
}

function PublishNote() {
  return <p className="note publish-note">🔒 ویرایش و انتشار پس از ورود عضو فعال می‌شود. انتشار همیشه کار خود شماست — با دکمه‌ی انتشار روی همان مورد؛ دستیار فقط آماده می‌کند و هرگز خودش منتشر نمی‌کند.</p>;
}

export function ProductsPage({ state }: { state: PublishedState }) {
  return <div className="stack">
    <header className="page-head"><h1>محصولات و منو</h1><span className="badge info">هسته — کاتالوگ</span></header>
    <Guard state={state}>{(b) => {
      const groups = new Map<string, typeof b.items[number][]>();
      for (const item of b.items) groups.set(item.grouping_label ?? 'سایر', [...(groups.get(item.grouping_label ?? 'سایر') ?? []), item]);
      return <>
        <p className="muted">{faNum(b.items.length)} قلم منتشرشده در V2. قیمت، عکس و بازه‌ی در دسترس بودن همان است که مشتری می‌بیند.</p>
        {[...groups.entries()].map(([group, items]) => <section key={group} className="card">
          <header className="card-head"><h3>{group}</h3></header>
          <ul className="product-list">{items.map((i) => <li key={i.catalog_item_id}>
            <span className="product-thumb">{i.media[0] ? <img src={mediaUrl(i.media[0].path)} alt={i.media[0].alt_text ?? ''} loading="lazy" /> : <span aria-hidden="true">🖼️</span>}</span>
            <span className="product-main"><strong>{clean(i.name)}</strong>{i.short_description && <small>{clean(i.short_description)}</small>}
              <small>{i.media.length ? `${faNum(i.media.length)} عکس` : <b className="bad">بدون عکس</b>}، منتشر {jDate(i.published_at.slice(0, 10))}</small></span>
            <span className="product-price">{priceLabel(i.price_amount)}</span>
          </li>)}</ul>
        </section>)}
        <PublishNote />
      </>;
    }}</Guard>
  </div>;
}

export function StorefrontPage({ state }: { state: PublishedState }) {
  return <div className="stack">
    <header className="page-head"><h1>ویترین مجازی در V2</h1><span className="badge info">هسته — پروفایل و انتشار</span></header>
    <Guard state={state}>{(b) => <>
      <section className="card storefront">
        <div className="sf-cover">{b.items.find((i) => i.media.length) ? <img src={mediaUrl(b.items.find((i) => i.media.length)!.media[0].path)} alt="" /> : null}<span className="badge ok">منتشرشده</span></div>
        <h2>{clean(b.name)}</h2>
        {b.description && <p>{clean(b.description)}</p>}
        {b.location?.address && <p className="muted">📍 {clean(b.location.address)}</p>}
        <div className="chips">{b.capabilities.map((c) => <span key={c.capability_id} className="chip">{c.name}</span>)}</div>
        {b.hours && <details><summary>ساعت کاری اعلام‌شده</summary><ul className="rows">{b.hours.weekly.map((d) => <li key={d.day}><span>{DAYS[d.day] ?? d.day}</span><span>{d.intervals.map((iv) => toFaDigits(`${iv.open}–${iv.close}`)).join('، ') || 'تعطیل'}</span></li>)}</ul></details>}
        <div className="sf-menu">{b.items.slice(0, 6).map((i) => <figure key={i.catalog_item_id}>{i.media[0] ? <img src={mediaUrl(i.media[0].path)} alt="" loading="lazy" /> : <span aria-hidden="true">🖼️</span>}<figcaption>{clean(i.name)}</figcaption></figure>)}</div>
        <a className="btn primary" href="https://explore.mlino.site/">دیدن در نقشه و ویترین زنده</a>
      </section>
      <section className="card">
        <header className="card-head"><h3>چه چیزی به V2 می‌رود و چه چیزی نه</h3></header>
        <ul className="points">
          <li>فقط آنچه شما منتشر کرده‌اید؛ پیش‌نویس، داده‌ی مالی، موجودی انبار و هر چیز داخلی هرگز به V2 نمی‌رود (لایه‌ی قابل‌انتشار، AC-2).</li>
          <li>ساعت کاری «اعلام‌شده» است، نه «الان باز است» (D-56).</li>
          <li>پیش از اولین انتشار واقعی، هویت کسب‌وکار راستی‌آزمایی می‌شود (D-61).</li>
        </ul>
        <PublishNote />
      </section>
    </>}</Guard>
  </div>;
}

export function OffersPage({ state }: { state: PublishedState }) {
  const { today } = useWorkspace();
  return <div className="stack">
    <header className="page-head"><h1>آفر و تخفیف</h1><span className="badge info">هسته — آفر</span></header>
    <Guard state={state}>{(b) => <>
      <section className="card">
        {b.offers.length === 0 ? <p className="empty">آفر منتشرشده‌ای نیست.</p> :
          <ul className="offer-list">{b.offers.map((o) => {
            const active = (!o.valid_from || o.valid_from.slice(0, 10) <= today) && (!o.valid_until || o.valid_until.slice(0, 10) >= today);
            return <li key={o.offer_id}>
              <div><strong>{clean(o.name)}</strong>{o.short_description && <small>{clean(o.short_description)}</small>}
                <small>{o.valid_from ? `از ${jDate(o.valid_from.slice(0, 10))} ` : ''}{o.valid_until ? `تا ${jDate(o.valid_until.slice(0, 10))}` : 'بدون تاریخ پایان'}</small></div>
              <div className="offer-side"><span className="product-price">{priceLabel(o.price_amount)}</span><span className={`badge ${active ? 'ok' : 'muted'}`}>{active ? 'فعال' : 'غیرفعال'}</span></div>
            </li>;
          })}</ul>}
      </section>
      <section className="card">
        <header className="card-head"><h3>آفر بر اساس موقعیت</h3></header>
        <ul className="points">
          <li>امروز: V2 آفرهای شما را کنار نتیجه‌ها و در ویترین زنده‌ی کاربرانی نشان می‌دهد که نزدیک کسب‌وکارند — این منطق تطبیق V2 است و شرط آفر را عوض نمی‌کند.</li>
          <li>اگر بخواهید آفری «فقط برای افراد تا شعاع مشخص» باشد، آن یک شرط تازه‌ی آفر است و تصمیم شما و تغییر قرارداد آفر را لازم دارد (سند طراحی، بخش ۹).</li>
          <li>V2 هیچ شرطی اختراع نمی‌کند و قیمت را برای هر کاربر عوض نمی‌کند (D-53).</li>
        </ul>
        <PublishNote />
      </section>
    </>}</Guard>
  </div>;
}
