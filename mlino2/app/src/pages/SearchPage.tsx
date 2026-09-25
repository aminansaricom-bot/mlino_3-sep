import { useEffect, useMemo, useRef, useState } from 'react';
import type { PublicUiRecord } from '../publicExport/uiAdapter';
import type { CatalogItem, CatalogRecord } from '../publicExport/catalog';
import { CatalogImage, catalogPrice } from '../publicExport/catalogCards';
import type { AssistantAnswer } from '../assistant/assistantIntent';
import { normalizeFa } from '../assistant/assistantIntent';
import type { RankedResult } from '../assistant/rankRecords';
import { activeOffersFor, offerPriceLabel } from '../ar/ArGlassCard';
import { offerUntil } from '../components/PublicBusinessDetails';
import { businessOpenLabel } from '../components/PublicBusinessRow';
import { businessThumb, clean } from '../live/liveData';
import { formatDistance } from '../uiFormat';
import { AppHeader, Button, EmptyState, Segmented, Skeleton } from '../design/ui';
import LiveIcon from '../live/icons';
import { tr } from '../i18n';

type Tab = 'businesses' | 'products' | 'offers';

/**
 * «جست‌وجو»: one query, three views of the same signed data (businesses, products, offers). The assistant only reads
 * the request; its short answer sits in a soft card with its source, and every result opens the real business or product.
 * Nothing here is guessed: no price, hour or stock that the business did not publish.
 */
export default function SearchPage(p: {
  query: string; onQuery: (q: string) => void; onAsk: () => void;
  assistant: { query: string; answer: AssistantAnswer | null; loading: boolean } | null; ranked: readonly RankedResult[];
  records: readonly PublicUiRecord[]; catalogByOrg: ReadonlyMap<string, CatalogRecord>; now: number; distanceById: ReadonlyMap<string, number>;
  voice?: { supported: boolean; listening: boolean; onMic: () => void };
  onOpenBusiness: (id: string) => void; onOpenItem: (organizationId: string, item: CatalogItem) => void; onShowMap: () => void; onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>('businesses');
  const input = useRef<HTMLInputElement | null>(null);
  useEffect(() => { input.current?.focus(); }, []);

  const q = normalizeFa(p.query);
  // With an assistant answer, its Persian keywords widen the match («coffee» → قهوه، اسپرسو…); otherwise the words typed.
  const words = useMemo(() => {
    const own = q ? [q] : [];
    const asked = p.assistant?.answer && p.assistant.query.trim() === p.query.trim() ? p.assistant.answer.intent.keywords.map(normalizeFa) : [];
    return [...new Set([...own, ...asked])].filter((w) => w.length >= 2);
  }, [q, p.assistant, p.query]);
  const hits = (text: string) => { const t = normalizeFa(text); return words.some((w) => t.includes(w)); };
  const distance = (id: string) => p.distanceById.get(id) ?? Infinity;

  const businesses = useMemo(() => {
    if (p.ranked.length && p.assistant?.answer) return p.ranked.map((r) => r.record);
    if (!words.length) return [];
    return p.records.filter((r) => hits(`${r.name} ${r.description ?? ''} ${tr(r.category.label)}`) || (p.catalogByOrg.get(r.id)?.items.some((i) => hits(`${i.name} ${i.short_description ?? ''}`)) ?? false))
      .sort((a, b) => distance(a.id) - distance(b.id));
  }, [p.ranked, p.assistant, p.records, p.catalogByOrg, words]); // eslint-disable-line react-hooks/exhaustive-deps
  const products = useMemo(() => {
    if (!words.length) return [];
    return p.records.flatMap((r) => (p.catalogByOrg.get(r.id)?.items ?? []).filter((i) => hits(`${i.name} ${i.short_description ?? ''} ${i.grouping_label ?? ''}`)).map((item) => ({ owner: r, item })))
      .sort((a, b) => distance(a.owner.id) - distance(b.owner.id)).slice(0, 60);
  }, [p.records, p.catalogByOrg, words]); // eslint-disable-line react-hooks/exhaustive-deps
  const offers = useMemo(() => {
    if (!words.length) return [];
    return p.records.flatMap((r) => activeOffersFor(r, p.now, 10).filter((o) => hits(`${o.name} ${o.short_description ?? ''} ${r.name}`)).map((offer) => ({ owner: r, offer })))
      .sort((a, b) => distance(a.owner.id) - distance(b.owner.id));
  }, [p.records, p.now, words]); // eslint-disable-line react-hooks/exhaustive-deps

  const answer = p.assistant && p.assistant.query.trim() === p.query.trim() ? p.assistant : null;
  const counts = { businesses: businesses.length, products: products.length, offers: offers.length };

  return <section className="rs-page rs-search" aria-labelledby="search-title">
    <div className="rs-inner">
      <AppHeader title={<span id="search-title">{tr('جست‌وجو')}</span>} onBack={p.onClose} />
      <form className="rs-searchbox" role="search" onSubmit={(e) => { e.preventDefault(); p.onAsk(); }}>
        <LiveIcon name="search" size={20} />
        <input ref={input} value={p.query} onChange={(e) => p.onQuery(e.target.value)} placeholder={tr('چی می‌خوای؟')} aria-label={tr('جست‌وجو یا پرسش از دستیار')} enterKeyHint="search" />
        {p.query && <button type="button" className="rs-search-clear" aria-label={tr('پاک کردن جست‌وجو')} onClick={() => p.onQuery('')}><LiveIcon name="close" size={18} /></button>}
        {p.voice?.supported && <button type="button" className={`rs-search-mic${p.voice.listening ? ' on' : ''}`} aria-pressed={p.voice.listening}
          aria-label={p.voice.listening ? tr('توقف شنیدن') : tr('پرسیدن با صدا')} onClick={p.voice.onMic}><img src="/icons/voice.png" alt="" aria-hidden="true" /></button>}
        <button type="submit" className="rs-search-ask" aria-label={tr('پرسیدن از دستیار')} disabled={p.query.trim().length < 2}>✦</button>
      </form>
      <Segmented label={tr('نوع نتیجه')} value={tab} onChange={setTab} options={[
        { id: 'businesses', label: tr('کسب‌وکارها'), count: words.length ? counts.businesses : undefined },
        { id: 'products', label: tr('محصولات'), count: words.length ? counts.products : undefined },
        { id: 'offers', label: tr('آفرها'), count: words.length ? counts.offers : undefined },
      ]} />

      {answer && <div className="rs-card tint rs-answer" aria-live="polite">
        <strong><span className="rs-spark" aria-hidden="true">✦</span> {tr('پاسخ دستیار ملینو')}</strong>
        {answer.loading ? <Skeleton lines={2} /> : <p>{answer.answer?.answer}</p>}
        {!answer.loading && <small>{tr('بر پایه‌ی اطلاعات ثبت‌شده‌ی کسب‌وکارها')} · {answer.answer?.source === 'ai' ? tr('هوش مصنوعی') : tr('پردازش محلی')}</small>}
      </div>}

      {!words.length ? <EmptyState title={tr('چی می‌خوای پیدا کنی؟')} text={tr('نام محصول، کسب‌وکار یا نیازت را بنویس؛ مثلاً «قهوه نزدیک من».')} />
        : counts[tab] === 0 ? <EmptyState title={tr('با این جست‌وجو یا فیلترها چیزی پیدا نشد.')} text={tr('کمی ساده‌تر بنویس یا از دستیار بپرس.')} />
        : <div className="rs-list">
          {tab === 'businesses' && businesses.map((r) => {
            const thumb = businessThumb(p.catalogByOrg.get(r.id));
            const d = p.distanceById.get(r.id);
            return <button type="button" key={r.id} className="rs-row" onClick={() => p.onOpenBusiness(r.id)}>
              <span className="rs-thumb">{thumb ? <CatalogImage media={thumb} load /> : <LiveIcon name="store" />}</span>
              <span className="rs-row-copy"><b>{clean(r.name)}</b><small>{[d !== undefined ? formatDistance(d) : null, businessOpenLabel(r, p.now)].filter(Boolean).join(' · ')}</small></span>
              <span className="rs-row-end"><LiveIcon name="chevron-left" size={18} /></span>
            </button>;
          })}
          {tab === 'products' && products.map(({ owner, item }) => <button type="button" key={`${owner.id}/${item.catalog_item_id}`} className="rs-row" onClick={() => p.onOpenItem(owner.id, item)}>
            <span className="rs-thumb">{item.media[0] ? <CatalogImage media={item.media[0]} load /> : <LiveIcon name="image" />}</span>
            <span className="rs-row-copy"><b>{clean(item.name)}</b><small>{clean(owner.name)}{item.grouping_label ? ` · ${item.grouping_label}` : ''}</small></span>
            <span className="rs-row-end">{catalogPrice(item)}</span>
          </button>)}
          {tab === 'offers' && offers.map(({ owner, offer }) => <button type="button" key={offer.offer_version_id} className="rs-row" onClick={() => p.onOpenBusiness(owner.id)}>
            <span className="rs-thumb"><LiveIcon name="offer" /></span>
            <span className="rs-row-copy"><b>{clean(offer.name)}</b><small>{clean(owner.name)} · {offerUntil(offer.valid_until)}</small></span>
            <span className="rs-row-end">{offerPriceLabel(offer)}</span>
          </button>)}
        </div>}
      {words.length > 0 && counts.businesses > 0 && <Button wide variant="secondary" icon="map" onClick={p.onShowMap}>{tr('نمایش روی نقشه')}</Button>}
    </div>
  </section>;
}
