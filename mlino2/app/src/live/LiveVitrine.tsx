import { photoFromVideo, type Photo } from '../visual/prepareImage';
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useCameraStream, useDeviceHeading } from '../ar/browserSensors';
import { AR_DEFAULT_RADIUS, buildPublicArView, composeArScene, type ArSceneItem } from '../ar/ArOverlayService';
import { RADIUS_MAX, RADIUS_MIN, RADIUS_STEP, clampRadius } from '../ar/RadiusDial';
import type { PublicUiRecord } from '../publicExport/uiAdapter';
import type { CatalogItem, CatalogRecord } from '../publicExport/catalog';
import { CatalogImage } from '../publicExport/catalogCards';
import { openNow } from '../publicExport/businessHours';
import { chatApi, type ChatPerson, type CustomerThread } from '../chat/chatApi';
import { CHAT_ENABLED } from '../chat/chatApi';
import { onBackButton } from '../native/bridge';
import { formatDistance } from '../uiFormat';
import LiveIcon from './icons';
import { localIntent, normalizeFa } from '../assistant/assistantIntent';
import ChatSheet, { type ChatContext } from './ChatSheet';
import {
  CATEGORY_GROUPS, activeOffers, assignLanes, businessThumb, businessWideOffers, chatSuggestions, clean, faNum, groupOf, itemPrice,
  matchProducts, offerTag, rial, untilLabel, visibleItems, type CategoryGroup, type NearbyHit,
} from './liveData';
import { RatingBadge, useRatings } from '../ratings/ratings';
import './live.css';
import { tr, dir } from '../i18n';

/**
 * «ویترین زنده» (owner's redesign brief, 2026-09-26): compact controls on top, the camera free in the middle, and one
 * panel below (explore → products). A business is chosen only by the person (a marker, a search result, the next
 * card of the results) — turning the phone or a new GPS fix never changes it. Positions on the picture are
 * approximate (direction and GPS only), so there is no line to a building. Nothing leaves the phone from the camera,
 * except the one photo the person sends with «جست‌وجو با این عکس».
 */

type Props = {
  records: readonly PublicUiRecord[];
  catalogByOrg: ReadonlyMap<string, CatalogRecord>;
  now: number;
  searchPoint: [number, number];
  /** The phone's own position is known (distances are shown only then). */
  positionKnown: boolean;
  locationPending: boolean;
  /** «ادامه بدون دوربین»: the storefront without the camera picture (no permission is asked). */
  withCamera?: boolean;
  initialRadius?: number;
  offersOnly: boolean;
  onOffersOnly: (v: boolean) => void;
  query: string;
  onQuery: (q: string) => void;
  onPhotoSearch?: (photo: Photo | null) => void;
  savedItems: readonly string[];
  onToggleSaveItem: (organizationId: string, itemId: string) => void;
  onOpenItem: (organizationId: string, item: CatalogItem) => void;
  onOpenBusiness: (organizationId: string) => void;
  onClose: () => void;
  demo?: boolean;
};

const GUIDE_KEY = 'mlino.vitrine.guide.v1';
const guideDone = () => { try { return localStorage.getItem(GUIDE_KEY) === '1'; } catch { return true; } };
const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

function bearing(from: readonly [number, number], to: { latitude: number; longitude: number }): number {
  const r = (d: number) => (d * Math.PI) / 180;
  const lat1 = r(from[0]); const lat2 = r(to.latitude); const dl = r(to.longitude - from[1]);
  return (Math.atan2(Math.sin(dl) * Math.cos(lat2), Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dl)) * 180 / Math.PI + 360) % 360;
}
function metres(from: readonly [number, number], to: { latitude: number; longitude: number }): number {
  const r = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(r(to.latitude - from[0]) / 2) ** 2 + Math.cos(r(from[0])) * Math.cos(r(to.latitude)) * Math.sin(r(to.longitude - from[1]) / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export default function LiveVitrine(p: Props) {
  const withCamera = p.withCamera !== false;
  const camera = useCameraStream();
  const heading = useDeviceHeading(!withCamera || camera.state.kind === 'active');
  const video = camera.videoRef;
  const [radius, setRadius] = useState(clampRadius(p.initialRadius ?? AR_DEFAULT_RADIUS));
  const [group, setGroup] = useState<CategoryGroup>('all');
  const [popover, setPopover] = useState<'none' | 'categories' | 'radius'>('none');
  // The chosen business: set only by the person, never by the sensors.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panel, setPanel] = useState<'discover' | 'products'>('discover');
  const [browse, setBrowse] = useState<'business' | 'search'>('business');
  const [index, setIndex] = useState(0);
  const [showGuide, setShowGuide] = useState(() => !guideDone());
  const [text, setText] = useState(p.query);
  const searchInput = useRef<HTMLInputElement | null>(null);
  const catButton = useRef<HTMLButtonElement | null>(null);
  const radiusButton = useRef<HTMLButtonElement | null>(null);
  const track = useRef<HTMLDivElement | null>(null);
  const drag = useRef<number | null>(null);
  useEffect(() => { const t = window.setTimeout(() => { if (text !== p.query) p.onQuery(text); }, 250); return () => window.clearTimeout(t); }, [text]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (p.query !== text && document.activeElement !== searchInput.current) setText(p.query); }, [p.query]); // eslint-disable-line react-hooks/exhaustive-deps
  const [chat, setChat] = useState<ChatContext | null>(null);
  const [unread, setUnread] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    heading.request();
    if (withCamera) void camera.start();
    return () => camera.stop();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── what is shown: category, «فقط آفرها», and the words typed (with the local understanding of them) ──
  const q = p.query.trim();
  const wanted = useMemo(() => {
    if (!q) return null;
    const intent = localIntent(q).intent;
    return { words: [...new Set([q, ...intent.keywords])], category: intent.category };
  }, [q]);
  const byFilters = useMemo(() => p.records.filter((r) => {
    if (group !== 'all' && groupOf(r.category.key) !== group) return false;
    if (p.offersOnly && activeOffers(r, p.now).length === 0) return false;
    return true;
  }), [p.records, group, p.offersOnly, p.now]);
  const hits: NearbyHit[] = useMemo(() => {
    if (!wanted) return [];
    const near = p.positionKnown ? byFilters.filter((r) => r.coordinates && metres(p.searchPoint, r.coordinates) <= Math.max(radius, 1000)) : byFilters;
    return matchProducts(near, p.catalogByOrg, wanted.words);
  }, [wanted, byFilters, p.catalogByOrg, p.positionKnown, p.searchPoint, radius]);
  const pool = useMemo(() => {
    if (!wanted) return byFilters;
    const withHits = new Set(hits.map((h) => h.businessId));
    return byFilters.filter((r) => withHits.has(r.id) || (wanted.category !== null && r.category.key === wanted.category)
      || normalizeFa(`${r.name} ${r.description ?? ''}`).includes(normalizeFa(q)));
  }, [byFilters, hits, wanted, q]);

  // ── direction: a real compass, the phone's relative turns (Brave), or none ──
  const nearestBearing = useMemo(() => {
    let best: { d: number; b: number } | null = null;
    for (const r of pool) { if (!r.coordinates) continue; const d = metres(p.searchPoint, r.coordinates); if (!best || d < best.d) best = { d, b: bearing(p.searchPoint, r.coordinates) }; }
    return best ? Math.round(best.b) : null;
  }, [pool, p.searchPoint]);
  const relative = heading.source === 'notAbsolute' && heading.relativeDeg !== null;
  const offset = useRef<number | null>(null);
  if (relative && offset.current === null && nearestBearing !== null) offset.current = nearestBearing - heading.relativeDeg!;
  const recenter = () => { if (relative && nearestBearing !== null) offset.current = nearestBearing - heading.relativeDeg!; };
  useEffect(() => {
    if (heading.source === 'compass' || heading.source === 'notAbsolute') return undefined;
    const t = window.setTimeout(() => heading.setSimulatedHeading(nearestBearing ?? 0), heading.headingDeg === null ? 1200 : 0);
    return () => window.clearTimeout(t);
  }, [heading.source, nearestBearing]); // eslint-disable-line react-hooks/exhaustive-deps
  const headingDeg = relative && offset.current !== null ? Math.round((((offset.current + heading.relativeDeg!) % 360) + 360) % 360) : heading.headingDeg;
  const exact = heading.source === 'compass';
  const reliable = exact || relative;
  const scene = useMemo(() => {
    if (headingDeg === null) return null;
    const view = buildPublicArView(pool, { latitude: p.searchPoint[0], longitude: p.searchPoint[1], radiusMeters: radius, headingDeg }, p.now);
    return composeArScene(view, radius, { headingReliable: reliable });
  }, [pool, p.searchPoint, radius, headingDeg, reliable, p.now]);
  // The nearest businesses as a list, so choosing never depends on the camera or the compass.
  const nearest = useMemo(() => pool.filter((r) => r.coordinates)
    .map((r) => ({ record: r, d: metres(p.searchPoint, r.coordinates!) })).sort((a, b) => a.d - b.d).slice(0, 10), [pool, p.searchPoint]);
  const inView: ArSceneItem[] = useMemo(() => (scene ? [scene.primary, ...scene.secondary].filter((x): x is ArSceneItem => x !== null) : []), [scene]);

  // ── the chosen business and its products ──
  const selected = selectedId ? p.records.find((r) => r.id === selectedId) : undefined;
  const selectedFits = !!selected && pool.some((r) => r.id === selected.id);
  const selectedInView = inView.find((x) => x.businessId === selectedId);
  const offers = useMemo(() => activeOffers(selected, p.now), [selected, p.now]);
  const catalog = selectedId ? p.catalogByOrg.get(selectedId) : undefined;
  const bizOffers = useMemo(() => businessWideOffers(selected, catalog, p.now), [selected, catalog, p.now]);
  const items = useMemo(() => visibleItems(catalog, offers, p.offersOnly), [catalog, offers, p.offersOnly]);
  const cards: Array<{ businessId: string; item: CatalogItem }> = browse === 'search' && hits.length ? hits : items.map((item) => ({ businessId: selectedId ?? '', item }));
  const active = cards[Math.min(index, Math.max(0, cards.length - 1))];
  const ratings = useRatings(selectedId);
  const name = selected ? clean(selected.name) : '';
  const thumb = businessThumb(catalog);
  const hours = selected ? openNow(selected, p.now) : 'unknown';
  const distanceOf = (r: PublicUiRecord | undefined) => (p.positionKnown && r?.coordinates ? metres(p.searchPoint, r.coordinates) : null);
  const selectedDistance = distanceOf(selected);
  const unreadHere = selectedId ? unread.get(selectedId) ?? 0 : 0;

  const choose = (id: string, open = true) => {
    if (id !== selectedId) { setSelectedId(id); setIndex(0); track.current?.scrollTo({ left: 0 }); }
    setBrowse('business');
    if (open) setPanel('products');
  };
  const clearSelection = () => { setSelectedId(null); setPanel('discover'); setIndex(0); };
  const openResults = () => {
    if (!hits.length) return;
    setBrowse('search'); setIndex(0); track.current?.scrollTo({ left: 0 });
    setSelectedId(hits[0].businessId); setPanel('products');
  };
  // In the results, the card the person moves to decides the business (never the phone's movement).
  const showCard = (i: number) => {
    const next = Math.max(0, Math.min(cards.length - 1, i));
    setIndex(next);
    if (browse === 'search' && cards[next] && cards[next].businessId !== selectedId) setSelectedId(cards[next].businessId);
  };
  const goTo = (i: number) => {
    const el = track.current?.children[i] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', inline: 'center', block: 'nearest' });
    showCard(i);
  };
  const onScroll = () => {
    const el = track.current; if (!el) return;
    const mid = el.getBoundingClientRect().left + el.clientWidth / 2;
    let best = 0; let dist = Infinity;
    [...el.children].forEach((c, i) => { const r = (c as HTMLElement).getBoundingClientRect(); const d = Math.abs(r.left + r.width / 2 - mid); if (d < dist) { dist = d; best = i; } });
    if (best !== index) showCard(best);
  };

  // ── chat: the chosen business, about the product on screen; nothing is sent without the person ──
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
  const openChat = () => {
    if (!selected) return;
    const item = active && active.businessId === selected.id ? active.item : undefined;
    const hasOffer = !!item && itemPrice(item, offers).offer !== null;
    setChat({ organizationId: selected.id, name: selected.name, thumb, item, suggestions: chatSuggestions({ hasItem: !!item, categoryKey: selected.category.key, hasOffer }) });
  };

  // ── back / Escape: chat → a popover → the products panel → leave ──
  const closePopover = () => { const from = popover; setPopover('none'); (from === 'categories' ? catButton : radiusButton).current?.focus(); };
  const back = () => {
    if (chat) { setChat(null); return; }
    if (popover !== 'none') { closePopover(); return; }
    if (panel === 'products') { setPanel('discover'); return; }
    p.onClose();
  };
  const backRef = useRef(back); backRef.current = back;
  useEffect(() => onBackButton(() => { backRef.current(); return true; }), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') backRef.current(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const onHandleDown = (e: ReactPointerEvent) => { drag.current = e.clientY; (e.target as Element).setPointerCapture?.(e.pointerId); };
  const onHandleUp = (e: ReactPointerEvent) => {
    const start = drag.current; drag.current = null; if (start === null) return;
    const dy = e.clientY - start;
    if (dy > 40) setPanel('discover'); else if (dy < -40 && selected) setPanel('products');
  };

  // ── markers: the businesses in view (approximate places), without overlaps; the chosen one first ──
  const markers = useMemo(() => assignLanes(inView.map((x) => ({ businessId: x.businessId, x: Math.min(82, Math.max(18, x.screenXPercent)), item: x })), selectedId, 34), [inView, selectedId]);
  const offscreen = (() => {
    if (!selected || selectedInView || !reliable || headingDeg === null || !selected.coordinates) return null;
    const rel = ((bearing(p.searchPoint, selected.coordinates) - headingDeg + 540) % 360) - 180;
    return rel > 0 ? 'right' : 'left';
  })();

  const cameraOff = withCamera && (camera.state.kind === 'denied' || camera.state.kind === 'unavailable');
  const noDirection = headingDeg === null;
  const guideVisible = showGuide && withCamera && camera.state.kind === 'active' && !noDirection && !chat;
  const endGuide = () => { setShowGuide(false); try { localStorage.setItem(GUIDE_KEY, '1'); } catch { /* per-device convenience */ } };
  const groupLabel = CATEGORY_GROUPS.find((g) => g.id === group)?.label ?? '';
  const status: { text: string; action?: { label: string; run: () => void } } | null =
    p.locationPending ? { text: tr('در حال گرفتن موقعیت گوشی…') }
      : !p.positionKnown ? { text: tr('موقعیت در دسترس نیست؛ فاصله‌ها نشان داده نمی‌شوند.'), action: { label: tr('دیدن روی نقشه'), run: p.onClose } }
        : noDirection ? { text: tr('جهت در دسترس نیست؛ از فهرست پایین انتخاب کن.') }
          : !exact ? { text: tr('کسب‌وکارهای نزدیک؛ جهت تقریبی است'), action: relative ? { label: tr('تنظیم جهت'), run: recenter } : undefined }
            : null;

  return <div className={`lv-root lv2${withCamera ? '' : ' no-camera'}`} dir={dir()}>
    {withCamera && <video ref={video} className="lv-video" playsInline muted autoPlay style={{ display: camera.state.kind === 'active' ? 'block' : 'none' }} />}
    {(!withCamera || camera.state.kind !== 'active') && <div className="lv-video lv-video-sim" aria-hidden="true" />}

    {/* A. compact controls */}
    <header className="lv2-top">
      <div className="lv2-row">
        <button type="button" className="lv2-icon" onClick={p.onClose} aria-label={tr('بازگشت به نقشه')}><LiveIcon name="chevron-right" /></button>
        <form className="lv2-search" role="search" onSubmit={(e) => { e.preventDefault(); p.onQuery(text); searchInput.current?.blur(); if (hits.length) openResults(); }}>
          <LiveIcon name="search" size={18} />
          <input ref={searchInput} value={text} onChange={(e) => setText(e.target.value)} placeholder={tr('جست‌وجوی محصول')} aria-label={tr('جست‌وجوی محصول')} enterKeyHint="search" />
        </form>
        <button ref={catButton} type="button" className={`lv2-icon${group !== 'all' ? ' on' : ''}`} aria-expanded={popover === 'categories'} aria-haspopup="dialog"
          onClick={() => setPopover(popover === 'categories' ? 'none' : 'categories')} aria-label={tr('دسته‌بندی')}><LiveIcon name="grid" /></button>
        {p.onPhotoSearch && <button type="button" className="lv2-icon" onClick={() => {
          const v = camera.videoRef.current;
          if (camera.state.kind === 'active' && v) photoFromVideo(v).then((ph) => p.onPhotoSearch!(ph), () => p.onPhotoSearch!(null));
          else p.onPhotoSearch!(null);
        }} aria-label={tr('جست‌وجو با این عکس')}><LiveIcon name="photo-search" /></button>}
      </div>
      <div className="lv2-row chips">
        <button type="button" className={`lv2-chip${p.offersOnly ? ' on' : ''}`} aria-pressed={p.offersOnly} onClick={() => p.onOffersOnly(!p.offersOnly)}><LiveIcon name="offer" size={16} />{tr('فقط آفرها')}</button>
        <button ref={radiusButton} type="button" className="lv2-chip" aria-expanded={popover === 'radius'} aria-haspopup="dialog" onClick={() => setPopover(popover === 'radius' ? 'none' : 'radius')}>{tr('شعاع: {0} متر', faNum(radius))}</button>
        {group !== 'all' && <button type="button" className="lv2-chip on" onClick={() => setGroup('all')} aria-label={tr('برداشتن دسته‌ی {0}', tr(groupLabel))}>{tr(groupLabel)}<LiveIcon name="close" size={14} /></button>}
        {q && <button type="button" className="lv2-chip on" onClick={() => { setText(''); p.onQuery(''); setBrowse('business'); }} aria-label={tr('برداشتن جست‌وجوی «{0}»', q)}>«{q}»<LiveIcon name="close" size={14} /></button>}
        {p.demo && <span className="lv2-chip static">{tr('نمونه‌ها ساختگی‌اند')}</span>}
      </div>
      {(status || cameraOff) && <div className="lv2-status" role="status">
        <span>{cameraOff ? tr('دوربین در دسترس نیست؛ ویترین بدون تصویر دوربین است.') : status!.text}</span>
        {!cameraOff && status?.action && <button type="button" onClick={status.action.run}>{status.action.label}</button>}
      </div>}
    </header>

    {/* one popover at a time */}
    {popover !== 'none' && <div className="lv2-scrim" onClick={closePopover} aria-hidden="true" />}
    {popover === 'categories' && <div className="lv2-pop" role="dialog" aria-label={tr('دسته‌بندی')}>
      <div className="lv2-cats">{CATEGORY_GROUPS.map((c, i) => <button key={c.id} autoFocus={i === 0} type="button" className={group === c.id ? 'on' : ''} aria-pressed={group === c.id}
        onClick={() => { setGroup(c.id); closePopover(); }}><LiveIcon name={c.icon} size={18} /><span>{tr(c.label)}</span></button>)}</div>
    </div>}
    {popover === 'radius' && <div className="lv2-pop" role="dialog" aria-label={tr('شعاع نمایش')}>
      <label className="lv2-radius"><span>{tr('کسب‌وکارهای تا {0} متر', faNum(radius))}</span>
        <input autoFocus type="range" min={RADIUS_MIN} max={RADIUS_MAX} step={RADIUS_STEP} value={radius} onChange={(e) => setRadius(clampRadius(Number(e.target.value)))}
          aria-valuetext={tr('{0} متر', faNum(radius))} /></label>
      <button type="button" className="lv2-btn" onClick={closePopover}>{tr('تأیید')}</button>
    </div>}

    {/* B. the camera, with small markers at approximate places */}
    {markers.map(({ businessId, x, lane, item }) => {
      const r = p.records.find((z) => z.id === businessId);
      const tag = offerTag(r, p.catalogByOrg.get(businessId), p.now);
      const isSel = businessId === selectedId;
      return <button key={businessId} type="button" className={`lv2-pin${isSel ? ' sel' : ''}${tag ? ' offer' : ''}`} style={{ left: `${x}%`, ['--lane' as string]: lane }}
        aria-pressed={isSel} onClick={() => choose(businessId)}
        aria-label={[clean(item.name), p.positionKnown ? formatDistance(item.distanceMeters) : '', tag ? (tag.percent ? tr('{0}٪ تخفیف', faNum(tag.percent)) : tr('آفر')) : '', r?.promoted ? tr('ویژه') : ''].filter(Boolean).join('، ')}>
        <span className="lv2-pin-name">{clean(item.name)}</span>
        {tag?.percent && <span className="lv2-pin-offer">{tr('{0}٪', faNum(tag.percent))}</span>}
        {r?.promoted && <span className="lv2-pin-paid">{tr('ویژه')}</span>}
      </button>;
    })}
    {offscreen && <button type="button" className={`lv2-edge ${offscreen}`} onClick={() => setPanel('products')} aria-label={tr('{0} خارج از دید است', name)}>
      <LiveIcon name={offscreen === 'right' ? 'chevron-right' : 'chevron-left'} size={18} /><span>{name}</span></button>}

    {guideVisible && <div className="lv2-guide" role="dialog" aria-label={tr('راهنمای ویترین زنده')}>
      <ol><li>{tr('گوشی را آرام به اطراف بگیر.')}</li><li>{tr('یک کسب‌وکار را انتخاب کن.')}</li><li>{tr('محصولاتش را ورق بزن.')}</li></ol>
      <div><button type="button" className="lv2-btn ghost" onClick={endGuide}>{tr('رد کردن')}</button><button type="button" className="lv2-btn" onClick={endGuide}>{tr('فهمیدم')}</button></div>
    </div>}

    {/* C. one panel: explore ↔ products */}
    <section className={`lv2-panel ${panel}`} aria-label={selected ? tr('کسب‌وکار انتخاب‌شده') : tr('کسب‌وکارهای اطراف')}>
      <div className="lv2-handle" onPointerDown={onHandleDown} onPointerUp={onHandleUp} aria-hidden="true"><i /></div>

      {!selected && <div className="lv2-empty">
        {p.records.length === 0 ? <p>{tr('هنوز کسب‌وکاری برای نمایش نیست.')}</p>
          : q && hits.length > 0 ? <button type="button" className="lv2-results" onClick={openResults}><LiveIcon name="search" size={18} />{tr('{0} محصول برای «{1}» در اطراف', faNum(hits.length), q)}<LiveIcon name="chevron-left" size={18} /></button>
            : q ? <p>{tr('برای «{0}» محصولی در اطراف پیدا نشد.', q)}</p>
              : pool.length === 0 ? <p>{tr('با این فیلترها کسب‌وکاری نیست.')}</p>
                : <>
                  <p>{inView.length ? tr('یک کسب‌وکار را انتخاب کن') : tr('نزدیک‌ترین کسب‌وکارها')}</p>
                  <div className="lv2-near">{nearest.map(({ record: r, d }) => {
                    const tag = offerTag(r, p.catalogByOrg.get(r.id), p.now);
                    return <button key={r.id} type="button" onClick={() => choose(r.id)}>
                      <b>{clean(r.name)}</b>
                      <small>{p.positionKnown ? formatDistance(d) : tr(r.category.label)}{tag ? ` · ${tag.percent ? tr('{0}٪', faNum(tag.percent)) : tr('آفر')}` : ''}</small>
                    </button>;
                  })}</div>
                </>}
      </div>}

      {selected && <>
        <div className="lv2-biz">
          <span className="lv2-biz-img">{thumb ? <CatalogImage media={thumb} load /> : <LiveIcon name="store" size={22} />}</span>
          <div className="lv2-biz-copy">
            <strong>{name}{selected.promoted && <span className="lv2-paid">{tr('ویژه')}</span>}</strong>
            <small>
              {hours === 'open' && <span className="open">{tr('باز است')}</span>}
              {hours === 'closed' && <span className="closed">{tr('بسته است')}</span>}
              {selectedDistance !== null && <span>{formatDistance(selectedDistance)}</span>}
              <span>{tr('موقعیت تقریبی')}</span>
            </small>
          </div>
          <button type="button" className="lv2-icon plain" onClick={() => setPanel(panel === 'products' ? 'discover' : 'products')} aria-expanded={panel === 'products'}
            aria-label={panel === 'products' ? tr('جمع کردن پنل') : tr('دیدن محصولات')}><LiveIcon name={panel === 'products' ? 'chevron-down' : 'chevron-left'} /></button>
          <button type="button" className="lv2-icon plain" onClick={clearSelection} aria-label={tr('برداشتن انتخاب')}><LiveIcon name="close" size={18} /></button>
        </div>
        {!selectedFits && <p className="lv2-note">{tr('این کسب‌وکار با فیلترهای فعلی جور نیست.')}</p>}

        {panel === 'discover' && <button type="button" className="lv2-open" onClick={() => setPanel('products')}>
          {items.length ? tr('دیدن محصولات ({0})', faNum(items.length)) : tr('دیدن جزئیات')}</button>}

        {panel === 'products' && <div className="lv2-body">
          {bizOffers.slice(0, 2).map((o) => <div key={o.offer_id} className="lv2-bizoffer"><LiveIcon name="offer" size={16} />
            <span><b>{tr('آفر کسب‌وکار:')} {clean(o.name)}</b>{o.short_description && <small>{o.short_description}</small>}{untilLabel(o.valid_until) && <small>{untilLabel(o.valid_until)}</small>}</span></div>)}
          {hits.length > 0 && <div className="lv2-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={browse === 'business'} onClick={() => { setBrowse('business'); setIndex(0); track.current?.scrollTo({ left: 0 }); }}>{tr('محصولات این کسب‌وکار')}</button>
            <button type="button" role="tab" aria-selected={browse === 'search'} onClick={openResults}>{tr('نتایج جست‌وجو در اطراف ({0})', faNum(hits.length))}</button>
          </div>}

          {cards.length === 0 ? <p className="lv2-note">{p.offersOnly ? tr('این کسب‌وکار آفرِ مخصوص محصول ندارد.') : tr('این کسب‌وکار هنوز محصولی منتشر نکرده است.')}</p>
            : <div className="lv2-track" ref={track} onScroll={onScroll} role="region" aria-roledescription={tr('اسلاید محصولات')} aria-label={browse === 'search' ? tr('نتایج جست‌وجو در اطراف') : tr('محصولات {0}', name)}>
              {cards.map((c, i) => {
                const rec = p.records.find((r) => r.id === c.businessId);
                const pr = itemPrice(c.item, activeOffers(rec, p.now));
                const until = pr.offer ? untilLabel(pr.offer.valid_until) : null;
                const saved = p.savedItems.includes(`${c.businessId}/${c.item.catalog_item_id}`);
                const d = browse === 'search' ? distanceOf(rec) : null;
                return <article key={`${c.businessId}/${c.item.catalog_item_id}`} className={`lv2-card${i === index ? ' on' : ''}`} aria-current={i === index}>
                  <span className="lv2-card-img">{c.item.media[0] ? <CatalogImage media={c.item.media[0]} load={Math.abs(i - index) <= 1} /> : <LiveIcon name="image" size={26} />}</span>
                  <span className="lv2-card-copy">
                    <b>{clean(c.item.name)}</b>
                    {browse === 'search' && <small>{clean(rec?.name ?? '')}{d !== null ? ` · ${formatDistance(d)}` : ''}</small>}
                    {pr.final ? <span className="lv2-price"><del>{rial(pr.price!)}</del> <strong>{rial(pr.final)}</strong></span>
                      : <span className="lv2-price"><strong>{pr.price !== null ? rial(pr.price) : tr('قیمت با پرسش')}</strong></span>}
                    {pr.offer && <span className="lv2-offer">{pr.percent ? tr('{0}٪ تخفیف', faNum(pr.percent)) : clean(pr.offer.name)}{until ? ` · ${until}` : ''}</span>}
                    {browse === 'business' && <RatingBadge summary={ratings.items[c.item.catalog_item_id]} />}
                  </span>
                  <button type="button" className={`lv2-save${saved ? ' on' : ''}`} aria-pressed={saved} onClick={() => p.onToggleSaveItem(c.businessId, c.item.catalog_item_id)}
                    aria-label={saved ? tr('برداشتن {0} از ذخیره‌ها', clean(c.item.name)) : tr('ذخیره‌ی {0}', clean(c.item.name))}><LiveIcon name="bookmark" size={20} /></button>
                </article>;
              })}
            </div>}
          {cards.length > 1 && <div className="lv2-count">
            <button type="button" className="lv2-icon small" onClick={() => goTo(index - 1)} disabled={index === 0} aria-label={tr('محصول قبلی')}><LiveIcon name="chevron-right" size={18} /></button>
            <span aria-live="polite">{tr('{0} از {1}', faNum(index + 1), faNum(cards.length))}</span>
            <button type="button" className="lv2-icon small" onClick={() => goTo(index + 1)} disabled={index >= cards.length - 1} aria-label={tr('محصول بعدی')}><LiveIcon name="chevron-left" size={18} /></button>
          </div>}
        </div>}

        <div className="lv2-actions">
          {CHAT_ENABLED && <button type="button" className="lv2-chat" onClick={openChat}><LiveIcon name="chat" />{tr('گفتگو')}{unreadHere > 0 && <span className="lv2-badge" aria-label={tr('{0} پیام خوانده‌نشده', faNum(unreadHere))}>{faNum(unreadHere)}</span>}</button>}
          {active && active.businessId === selected.id
            ? <button type="button" className="lv2-see" onClick={() => p.onOpenItem(active.businessId, active.item)}>{tr('دیدن محصول')}</button>
            : <button type="button" className="lv2-see" onClick={() => p.onOpenBusiness(selected.id)}>{tr('دیدن ویترین')}</button>}
        </div>
      </>}
    </section>

    {chat && <ChatSheet context={chat} onClose={() => { setChat(null); void refreshUnread(); }} onOpenItem={(item) => p.onOpenItem(chat.organizationId, item)} onRead={() => setUnread((m) => { const n = new Map(m); n.delete(chat.organizationId); return n; })} />}
  </div>;
}
