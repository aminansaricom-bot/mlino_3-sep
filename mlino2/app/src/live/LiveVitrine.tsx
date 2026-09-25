import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCameraStream, useDeviceHeading } from '../ar/browserSensors';
import { AR_DEFAULT_RADIUS, buildPublicArView, composeArScene, type ArSceneItem } from '../ar/ArOverlayService';
import { clampRadius } from '../ar/RadiusDial';
import type { PublicUiRecord } from '../publicExport/uiAdapter';
import type { CatalogItem, CatalogRecord } from '../publicExport/catalog';
import { CatalogImage } from '../publicExport/catalogCards';
import { openNow } from '../publicExport/businessHours';
import { chatApi, type ChatPerson, type CustomerThread } from '../chat/chatApi';
import { CHAT_ENABLED } from '../chat/chatApi';
import { onBackButton } from '../native/bridge';
import { formatDistance } from '../uiFormat';
import LiveIcon from './icons';
import SearchDrawer from './SearchDrawer';
import ChatSheet, { type ChatContext } from './ChatSheet';
import { activeOffers, businessThumb, clean, faNum, itemPrice, rial, untilLabel, visibleItems, type CategoryGroup, groupOf } from './liveData';
import { RatingBadge, useRatings } from '../ratings/ratings';
import './live.css';
import { tr, dir } from '../i18n';

// «ویترین زنده»: full-screen camera with HTML on top. Businesses are placed by the phone's direction and GPS, so
// their spot on the picture is approximate — the dotted link to a point is drawn only when the compass is real.
// Products of the chosen business sit in a hand-swiped carousel (no autoplay). Nothing is sent from the camera.

type Props = {
  records: readonly PublicUiRecord[];
  catalogByOrg: ReadonlyMap<string, CatalogRecord>;
  now: number;
  searchPoint: [number, number];
  locationPending: boolean;
  initialRadius?: number;
  offersOnly: boolean;
  onOffersOnly: (v: boolean) => void;
  query: string;
  onQuery: (q: string) => void;
  savedIds: readonly string[];
  onToggleSave: (businessId: string) => void;
  onOpenItem: (organizationId: string, item: CatalogItem) => void;
  onOpenBusiness: (organizationId: string) => void;
  onClose: () => void;
  /** Demo build: the businesses are samples — said on screen, not hidden. */
  demo?: boolean;
};

export default function LiveVitrine(p: Props) {
  const camera = useCameraStream();
  const heading = useDeviceHeading(camera.state.kind === 'active');
  const video = camera.videoRef;
  const [radius, setRadius] = useState(clampRadius(p.initialRadius ?? AR_DEFAULT_RADIUS));
  const [manual, setManual] = useState(0);
  const [paused, setPaused] = useState(false);
  const [group, setGroup] = useState<CategoryGroup>('all');
  const [picked, setPicked] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [drawer, setDrawer] = useState(false);
  const [chat, setChat] = useState<ChatContext | null>(null);
  const [unread, setUnread] = useState<Map<string, number>>(new Map());
  const track = useRef<HTMLDivElement | null>(null);
  // The marker and side controls start just under the top controls, whatever their height (chips wrap, direction bar).
  const topStack = useRef<HTMLDivElement | null>(null);
  const [below, setBelow] = useState(170);
  useEffect(() => {
    const el = topStack.current; if (!el) return undefined;
    const measure = () => setBelow(Math.round(el.getBoundingClientRect().bottom + 12));
    measure(); const ro = new ResizeObserver(measure); ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => { heading.request(); void camera.start(); return () => camera.stop(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // No compass on this phone: start facing north (0°) so the page is not empty; the «جهت» bar turns it.
  useEffect(() => {
    if (heading.source !== 'none' || heading.headingDeg !== null) return undefined;
    const t = window.setTimeout(() => heading.setSimulatedHeading(0), 1200);
    return () => window.clearTimeout(t);
  }, [heading.source, heading.headingDeg]); // eslint-disable-line react-hooks/exhaustive-deps

  // Shared filters: text and «فقط آفرها» come from the map; the menu's group narrows further.
  const q = p.query.trim().toLocaleLowerCase('fa-IR');
  const pool = useMemo(() => p.records.filter((r) => {
    if (group !== 'all' && groupOf(r.category.key) !== group) return false;
    if (p.offersOnly && activeOffers(r, p.now).length === 0) return false;
    if (!q) return true;
    const cat = p.catalogByOrg.get(r.id);
    return `${r.name} ${(cat?.items ?? []).map((i) => i.name).join(' ')}`.toLocaleLowerCase('fa-IR').includes(q);
  }), [p.records, p.catalogByOrg, p.offersOnly, p.now, group, q]);

  const headingDeg = heading.headingDeg;
  const reliable = heading.source === 'compass';
  const scene = useMemo(() => {
    if (headingDeg === null) return null;
    const view = buildPublicArView(pool, { latitude: p.searchPoint[0], longitude: p.searchPoint[1], radiusMeters: radius, headingDeg }, p.now);
    return composeArScene(view, radius, { headingReliable: reliable });
  }, [pool, p.searchPoint, radius, headingDeg, reliable, p.now]);

  const inView: ArSceneItem[] = useMemo(() => (scene ? [scene.primary, ...scene.secondary].filter((x): x is ArSceneItem => x !== null) : []), [scene]);
  const selectedId = picked ?? scene?.primary?.businessId ?? null;
  const selected = selectedId ? p.records.find((r) => r.id === selectedId) : undefined;
  const selectedInView = inView.find((x) => x.businessId === selectedId);
  const offers = useMemo(() => activeOffers(selected, p.now), [selected, p.now]);
  const catalog = selectedId ? p.catalogByOrg.get(selectedId) : undefined;
  const items = useMemo(() => visibleItems(catalog, offers, p.offersOnly), [catalog, offers, p.offersOnly]);
  const current = items[Math.min(index, Math.max(0, items.length - 1))];
  const thumb = businessThumb(catalog);
  const ratings = useRatings(selectedId);
  const name = selected ? clean(selected.name) : '';

  // A new business starts at its first product; an explicit pick from the menu may set another.
  const lastBiz = useRef<string | null>(null);
  useEffect(() => { if (lastBiz.current !== selectedId) { lastBiz.current = selectedId; setIndex(0); track.current?.scrollTo({ left: 0 }); } }, [selectedId]);

  // Real unread counts for this person's conversations (only when signed in; nothing invented).
  const refreshUnread = useCallback(async () => {
    if (!CHAT_ENABLED) return;
    try {
      const me = await chatApi<{ person: ChatPerson }>('GET', '/auth/me');
      if (!me.person) { setUnread(new Map()); return; }
      const list = (await chatApi<{ threads: CustomerThread[] }>('GET', '/chat/threads')).threads;
      setUnread(new Map(list.filter((t) => t.unread > 0).map((t) => [t.organizationId, t.unread])));
    } catch { /* keep the last known counts */ }
  }, []);
  useEffect(() => { void refreshUnread(); const t = window.setInterval(() => { if (document.visibilityState === 'visible' && !chat) void refreshUnread(); }, 30_000); return () => window.clearInterval(t); }, [refreshUnread, chat]);

  // Back button: chat → menu → leave the storefront.
  useEffect(() => onBackButton(() => {
    if (chat) { setChat(null); return true; }
    if (drawer) { setDrawer(false); return true; }
    p.onClose(); return true;
  }), [chat, drawer, p]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !drawer) { if (chat) setChat(null); else p.onClose(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [chat, drawer, p]);

  const togglePause = () => {
    const v = video.current; if (!v) return;
    if (paused) { void v.play().catch(() => undefined); setPaused(false); } else { v.pause(); setPaused(true); }
  };
  const goTo = (i: number) => {
    const el = track.current?.children[i] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', inline: 'center', block: 'nearest' });
    setIndex(i);
  };
  const onScroll = () => {
    const el = track.current; if (!el) return;
    const mid = el.getBoundingClientRect().left + el.clientWidth / 2;
    let best = 0; let dist = Infinity;
    [...el.children].forEach((c, i) => { const r = (c as HTMLElement).getBoundingClientRect(); const d = Math.abs(r.left + r.width / 2 - mid); if (d < dist) { dist = d; best = i; } });
    if (best !== index) setIndex(best);
  };
  const openChat = () => { if (selected) setChat({ organizationId: selected.id, name: selected.name, thumb, item: current }); };

  const cameraOff = camera.state.kind === 'denied' || camera.state.kind === 'unavailable';
  const bizOffer = offers[0];
  const markerLeft = selectedInView ? Math.min(78, Math.max(22, selectedInView.screenXPercent)) : 50;
  const hours = selected ? openNow(selected, p.now) : 'unknown';
  const unreadHere = selectedId ? unread.get(selectedId) ?? 0 : 0;

  const noCompass = heading.source !== 'compass';
  return <div className={`lv-root${noCompass ? ' no-compass' : ''}`} dir={dir()} style={{ ['--lv-below' as string]: `${below}px` }}>
    <video ref={video} className="lv-video" playsInline muted autoPlay style={{ display: camera.state.kind === 'active' ? 'block' : 'none' }} />
    {camera.state.kind !== 'active' && <div className="lv-video lv-video-sim" aria-hidden="true" />}
    <div className="lv-shade" aria-hidden="true" />

    <header className="lv-top">
      <button type="button" className="lv-iconbtn" onClick={p.onClose} aria-label={tr('بازگشت')}><LiveIcon name="chevron-right" /></button>
      <h1 className="lv-title">{tr('ویترین زنده')}</h1>
      <button type="button" className="lv-iconbtn" onClick={() => setDrawer(true)} aria-label={tr('جست‌وجو و دسته‌بندی')}><LiveIcon name="menu" /></button>
    </header>
    <div className="lv-topstack" ref={topStack}>
    <div className="lv-chips">
      {p.demo && <span className="lv-chip static">{tr('نمونه‌ها ساختگی‌اند')}</span>}
      {cameraOff && <button type="button" className="lv-chip warn" onClick={p.onClose}><LiveIcon name="camera" size={16} />{tr('دوربین خاموش · رفتن به نقشه')}</button>}
      <button type="button" className={`lv-chip${p.offersOnly ? ' on' : ''}`} aria-pressed={p.offersOnly} onClick={() => p.onOffersOnly(!p.offersOnly)}><LiveIcon name="offer" size={16} />{tr('فقط آفرها')}</button>
      {paused && <span className="lv-chip static" role="status">{tr('تصویر ثابت')}</span>}
      {(q || group !== 'all') && <button type="button" className="lv-chip" onClick={() => { p.onQuery(''); setGroup('all'); }} aria-label={tr('پاک کردن جست‌وجو')}>{q ? `«${p.query.trim()}»` : tr('دسته‌ی انتخابی')} <LiveIcon name="close" size={14} /></button>}
    </div>
    {noCompass && <label className="lv-heading">
      <span>{tr('جهت')}</span>
      <input type="range" min={0} max={359} value={manual} onChange={(e) => { const v = Number(e.target.value); setManual(v); heading.setSimulatedHeading(v); }} aria-label={tr('چرخاندن دستی جهت')} />
    </label>}
    </div>

    {/* Other businesses in view: small pills at their direction. */}
    {inView.filter((x) => x.businessId !== selectedId).slice(0, 3).map((x) => <button key={x.businessId} type="button" className={`lv-pin lane-${x.laneIndex}`}
      style={{ left: `${Math.min(75, Math.max(25, x.screenXPercent))}%` }} onClick={() => setPicked(x.businessId)} aria-label={tr('{0}، {1}', clean(x.name), formatDistance(x.distanceMeters))}>
      {clean(x.name)}<small>{formatDistance(x.distanceMeters)}</small>{x.activeOffer && <i className="lv-pin-dot" aria-label={tr('آفر فعال')} />}
    </button>)}

    {/* The chosen business. */}
    {selected && <div className="lv-marker-wrap" style={{ left: `${markerLeft}%` }}>
      <button type="button" className="lv-marker" onClick={() => p.onOpenBusiness(selected.id)} aria-label={tr('دیدن ویترین {0}', name)}>
        <span className="lv-marker-img">{thumb ? <CatalogImage media={thumb} load /> : <img src="/icons/placeholder-business.svg" alt="" />}</span>
        <span className="lv-marker-copy"><strong>{name}</strong>
          <small className={hours === 'open' ? 'open' : hours === 'closed' ? 'closed' : ''}>{hours === 'open' ? tr('باز است') : hours === 'closed' ? tr('بسته است') : tr('ساعت نامشخص')}{selectedInView ? ` · ${formatDistance(selectedInView.distanceMeters)}` : ''}</small></span>
        <LiveIcon name="chevron-left" size={18} />
      </button>
      {bizOffer && <span className="lv-offer"><LiveIcon name="offer" size={15} />{clean(bizOffer.name)}</span>}
      {selectedInView && reliable && <span className="lv-link" aria-hidden="true" />}
      {!selectedInView && <span className="lv-hint">{tr('دور از دید دوربین؛ گوشی را بچرخان')}</span>}
      {selectedInView && !reliable && <span className="lv-hint">{tr('موقعیت تقریبی')}</span>}
    </div>}

    {/* Radius (vertical) and pause. */}
    <div className="lv-side">
      <label className="lv-radius" title={tr('تا چه فاصله‌ای')}>
        <input type="range" min={30} max={500} step={10} value={radius} onChange={(e) => setRadius(clampRadius(Number(e.target.value)))} aria-label={tr('شعاع نمایش (متر)')} />
        <span>{tr('{0}م', faNum(radius))}</span>
      </label>
      {camera.state.kind === 'active' && <button type="button" className="lv-iconbtn" onClick={togglePause} aria-label={paused ? tr('ادامه‌ی تصویر زنده') : tr('ثابت کردن تصویر')}><LiveIcon name={paused ? 'play' : 'pause'} /></button>}
    </div>

    {/* Notices, never hiding a way out. */}
    {!selected && (p.locationPending || scene !== null || headingDeg === null) && <div className="lv-notice" role="status">
      {p.locationPending ? <><LiveIcon name="my-location" /><span>{tr('در حال گرفتن موقعیت گوشی…')}</span></>
        : headingDeg === null ? <><LiveIcon name="my-location" /><span>{noCompass ? tr('گوشی جهت را نمی‌دهد؛ با نوار «جهت» بالای صفحه بچرخان.') : tr('در حال گرفتن جهت…')}</span></>
        : <><LiveIcon name="search" /><span>{pool.length === 0 ? tr('با این فیلتر چیزی پیدا نشد.') : tr('در این جهت کسب‌وکاری نیست؛ گوشی را بچرخان یا شعاع را بیشتر کن.')}</span></>}
    </div>}

    <div className="lv-bottom">
      {selected && items.length > 0 && <>
        <div className="lv-track" ref={track} onScroll={onScroll} role="region" aria-roledescription={tr('اسلاید محصولات')} aria-label={tr('محصولات {0}', name)}>
          {items.map((it, i) => {
            const pr = itemPrice(it, offers);
            const until = pr.offer ? untilLabel(pr.offer.valid_until) : null;
            return <article key={it.catalog_item_id} className={`lv-card${i === index ? ' on' : ''}`} aria-label={`${clean(it.name)}${pr.final ? tr('، {0}', rial(pr.final)) : pr.price ? tr('، {0}', rial(pr.price)) : ''}`}>
              <div className="lv-card-img">
                {it.media[0] ? <CatalogImage media={it.media[0]} load={Math.abs(i - index) <= 1} /> : <img src="/icons/placeholder-product.svg" alt="" />}
                {pr.percent && <span className="lv-offer on-img"><LiveIcon name="offer" size={14} />{faNum(pr.percent)}{tr('٪ تخفیف')}</span>}
                {until && <span className="lv-until">{until}</span>}
                <RatingBadge summary={ratings.items[it.catalog_item_id]} className="on-card" />
              </div>
              <div className="lv-card-body">
                <button type="button" className={`lv-save${p.savedIds.includes(selected.id) ? ' on' : ''}`} onClick={() => p.onToggleSave(selected.id)} aria-pressed={p.savedIds.includes(selected.id)} aria-label={tr('ذخیره‌ی {0}', name)}><LiveIcon name="bookmark" size={20} /></button>
                <h3>{clean(it.name)}</h3>
                {pr.final ? <p className="lv-price"><del>{rial(pr.price!)}</del><strong>{rial(pr.final)}</strong></p>
                  : <p className="lv-price"><strong>{pr.price ? rial(pr.price) : tr('قیمت با پرسش')}</strong></p>}
              </div>
            </article>;
          })}
        </div>
        {items.length > 1 && <div className="lv-dots">
          <button type="button" className="lv-iconbtn small" onClick={() => goTo(Math.max(0, index - 1))} disabled={index === 0} aria-label={tr('محصول قبلی')}><LiveIcon name="chevron-right" size={18} /></button>
          <span aria-live="polite">{tr('{0} از {1}', faNum(index + 1), faNum(items.length))}</span>
          <button type="button" className="lv-iconbtn small" onClick={() => goTo(Math.min(items.length - 1, index + 1))} disabled={index >= items.length - 1} aria-label={tr('محصول بعدی')}><LiveIcon name="chevron-left" size={18} /></button>
        </div>}
      </>}

      {selected && items.length === 0 && <div className="lv-bizcard">
        <span className="lv-bizcard-img">{thumb ? <CatalogImage media={thumb} load /> : <img src="/icons/placeholder-business.svg" alt="" />}</span>
        <div><strong>{name}</strong><small><LiveIcon name="location" size={14} />{selectedInView ? formatDistance(selectedInView.distanceMeters) : tr('فاصله نامشخص')} {tr('· موقعیت تقریبی')}</small>
          {p.offersOnly && <small>{tr('این کسب‌وکار آفرِ مخصوصِ محصولی ندارد.')}</small>}</div>
      </div>}

      {selected && <div className="lv-actions">
        {CHAT_ENABLED && <button type="button" className="lv-primary" onClick={openChat}><LiveIcon name="chat" />{tr('گفتگو با')} {name}</button>}
        {items.length > 0
          ? <button type="button" className="lv-secondary" onClick={() => current && p.onOpenItem(selected.id, current)}>{tr('دیدن محصول')}</button>
          : <button type="button" className="lv-secondary" onClick={() => p.onOpenBusiness(selected.id)}><LiveIcon name="store" size={18} />{tr('دیدن ویترین')}</button>}
      </div>}
    </div>

    {selected && unreadHere > 0 && !chat && <button type="button" className="lv-chatbubble" onClick={openChat} aria-label={tr('{0} پیام خوانده‌نشده از {1}', faNum(unreadHere), name)}>
      {thumb ? <CatalogImage media={thumb} load /> : <img src="/icons/placeholder-business.svg" alt="" />}<b>{faNum(unreadHere)}</b>
    </button>}

    {drawer && <SearchDrawer records={p.records} catalogs={p.catalogByOrg} query={p.query} onQuery={p.onQuery} group={group} onGroup={setGroup}
      onClose={() => setDrawer(false)}
      onPick={(hit) => {
        setPicked(hit.businessId);
        const list = visibleItems(p.catalogByOrg.get(hit.businessId), activeOffers(p.records.find((r) => r.id === hit.businessId), p.now), p.offersOnly);
        const i = Math.max(0, list.findIndex((x) => x.catalog_item_id === hit.item.catalog_item_id));
        lastBiz.current = hit.businessId; setIndex(i); setDrawer(false);
        window.setTimeout(() => goTo(i), 50);
      }} />}
    {chat && <ChatSheet context={chat} onClose={() => { setChat(null); void refreshUnread(); }} onOpenItem={(item) => p.onOpenItem(chat.organizationId, item)} onRead={() => setUnread((m) => { const n = new Map(m); n.delete(chat.organizationId); return n; })} />}
  </div>;
}
