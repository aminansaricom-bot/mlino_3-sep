import { useEffect, useMemo, useRef, useState } from 'react';
import { PublicExportConsumer, FETCH_INTERVAL_MS } from './consumer';
import { trustBundleFromBuildJson } from './trustBundle';
import { FetchTransport } from './transport';
import { checkForBuildUpdate } from './versionCheck';
import { nearbyPublicUiRecords, toPublicUiRecords } from './uiAdapter';
import { keepOpen } from './businessHours';
import MapView, { type TileStatus } from '../components/MapView';
import PublicBusinessRow from '../components/PublicBusinessRow';
import ProductPage from './ProductPage';
import BottomSheet, { type SheetState } from '../components/BottomSheet';
import PublicBusinessDetails from '../components/PublicBusinessDetails';
import ExperiencePanel from '../experience/ExperiencePanel';
import { useLocalExperience } from '../experience/useLocalExperience';
import ArVitrineView from '../ar/ArVitrineView';
import { formatDistance } from '../uiFormat';
import { CatalogConsumer, CatalogFetchTransport, type CatalogItem } from './catalog';
import { displayName } from '../demo/demoSocial';
import { Icon } from '../design/Icon';
import { ASSISTANT_REMOTE, askAssistant, readConsent, writeConsent, type ConsentState } from '../assistant/assistantApi';
import type { AssistantAnswer } from '../assistant/assistantIntent';
import { rankRecords } from '../assistant/rankRecords';
import AssistantPanel, { AssistantConsent } from '../assistant/AssistantPanel';
import { speakPersian, useVoiceInput } from '../assistant/voice';
import { CHAT_ENABLED } from '../chat/chatApi';
import ChatPanel, { ChatInboxButton, type ChatTarget } from '../chat/ChatPanel';
import { hiddenForLackOfPosition, promoteMatches, toDataFrame, withNearbyOffers } from '../offers/nearbyOffers';
import NearbyAlerts, { alertsOn, refreshAlertLocation } from '../offers/NearbyAlerts';
import { demoBanner, nextDemoTarget, parseDemoAnchor, presentationRecords, reanchorDemoTarget, validPoint, visibleDemoRecords, type Point } from '../demo/demoRelocation';

const TEHRAN_CENTER: [number, number] = [35.775, 51.425];

function configuredConsumer(): PublicExportConsumer | null {
  const url = import.meta.env.VITE_PUBLIC_EXPORT_URL;
  const bundle = import.meta.env.VITE_PUBLIC_EXPORT_TRUST_BUNDLE;
  if (!url || !bundle) return null;
  try { return new PublicExportConsumer(new FetchTransport(url), trustBundleFromBuildJson(bundle)); }
  catch { return null; }
}

type Overlay = 'none' | 'detail' | 'experience' | 'vitrine' | 'chat';

/** D-78 in the assistant list: among results that match the words themselves, PRO/MAX first; the rest unchanged. */
function promoteDirect<T extends { direct: boolean; record: { promoted: boolean } }>(results: readonly T[]): T[] {
  const first = results.filter((r) => r.direct && r.record.promoted);
  return [...first, ...results.filter((r) => !first.includes(r))];
}

export default function RealPublicApp() {
  const demoBuildEnabled = import.meta.env.VITE_DEMO_RELOCATE === '1';
  const demoAnchor = useMemo(() => {
    if (!demoBuildEnabled) return null;
    try { return parseDemoAnchor(import.meta.env.VITE_DEMO_ANCHOR); } catch { return null; }
  }, [demoBuildEnabled]);
  const [demoEnabled, setDemoEnabled] = useState(demoBuildEnabled);
  const [demoTarget, setDemoTarget] = useState<Point | null>(null);
  const consumer = useMemo(configuredConsumer, []);
  const catalog = useMemo(() => {
    const bundle = import.meta.env.VITE_PUBLIC_EXPORT_TRUST_BUNDLE;
    if (!consumer || !bundle) return null;
    try { return new CatalogConsumer(new CatalogFetchTransport(), trustBundleFromBuildJson(bundle)); }
    catch { return null; }
  }, [consumer]);
  const [now, setNow] = useState(() => Date.now());
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<Overlay>('none');
  const [sheet, setSheet] = useState<SheetState>('peek');
  const [point, setPoint] = useState<[number, number]>(TEHRAN_CENTER);
  const [pointLabel, setPointLabel] = useState('مرکز تهران (پیش‌فرض)');
  const [myPoint, setMyPoint] = useState<[number, number] | null>(null);
  const [flyTo, setFlyTo] = useState<[number, number] | null>(null);
  const [nearbyOnly, setNearbyOnly] = useState(false);
  const [openOnly, setOpenOnly] = useState(false);
  const [offersOnly, setOffersOnly] = useState(false);
  const [category, setCategory] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [tileStatus, setTileStatus] = useState<TileStatus>('loading');
  const [tileRetryKey, setTileRetryKey] = useState(0);
  const [locating, setLocating] = useState(false);
  const [suggestionEmpty, setSuggestionEmpty] = useState(false);
  const [product, setProduct] = useState<{ item: CatalogItem; businessName: string } | null>(null);
  const [assistant, setAssistant] = useState<{ query: string; answer: AssistantAnswer | null; loading: boolean; voice: boolean } | null>(null);
  const [consent, setConsent] = useState<ConsentState>(readConsent);
  const [pendingAsk, setPendingAsk] = useState<{ query: string; voice: boolean } | null>(null);
  const experience = useLocalExperience();
  const [chatTarget, setChatTarget] = useState<ChatTarget | null>(null);
  const [chatRefresh, setChatRefresh] = useState(0);
  const openChat = (target: ChatTarget | null) => { setChatTarget(target); setOverlay('chat'); };

  useEffect(() => {
    const check = () => {
      try { void checkForBuildUpdate(import.meta.env.VITE_BUILD_ID, { fetcher: window.fetch.bind(window), storage: window.sessionStorage, reload: () => window.location.reload() }); }
      catch { /* Build polling never changes signed data acceptance. */ }
    };
    const timer = window.setInterval(check, FETCH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    console.info('[public-export] real signed-artifact mode');
    if (!consumer) return;
    let active = true;
    const refresh = async () => {
      try { await consumer.refresh(); if (active) setRefreshFailed(false); }
      catch { if (active) setRefreshFailed(true); }
      if (catalog) await catalog.refresh(consumer).catch(() => undefined);
      if (active) setNow(Date.now());
    };
    void refresh();
    const polling = window.setInterval(() => { void refresh(); }, FETCH_INTERVAL_MS);
    const clock = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => { active = false; window.clearInterval(polling); window.clearInterval(clock); };
  }, [consumer, catalog]);

  const accepted = useMemo(() => consumer?.read(now) ?? [], [consumer, now]);
  const catalogByOrg = useMemo(() => new Map((catalog && consumer ? catalog.read(consumer, now) : []).map((record) => [record.organization_id, record])), [catalog, consumer, now]);
  const baseRecords = useMemo(() => {
    const ui = toPublicUiRecords(accepted);
    if (!demoBuildEnabled) return ui;
    if (!demoEnabled || !demoAnchor) return visibleDemoRecords(ui, null);
    return presentationRecords(ui, true, demoAnchor, demoTarget);
  }, [accepted, demoBuildEnabled, demoEnabled, demoAnchor, demoTarget]);
  // D-77: radius-limited offers exist only for a viewer inside the radius, measured on this phone.
  const allRecords = useMemo(() => withNearbyOffers(baseRecords, myPoint), [baseRecords, myPoint]);
  const hiddenOffers = useMemo(() => hiddenForLackOfPosition(baseRecords, myPoint), [baseRecords, myPoint]);
  const alertPoint = useMemo(() => (myPoint ? toDataFrame(myPoint, demoBuildEnabled && demoEnabled ? demoAnchor : null, demoBuildEnabled && demoEnabled ? demoTarget : null) : null), [myPoint, demoBuildEnabled, demoEnabled, demoAnchor, demoTarget]);
  const categories = useMemo(() => [...new Map(allRecords.map((record) => [record.category.key, record.category])).values()], [allRecords]);
  const candidates = useMemo(() => {
    let records = allRecords.filter((record) => !experience.data.hidden.includes(record.id));
    if (openOnly) records = keepOpen(records, now);
    if (offersOnly) records = records.filter((record) => record.offers.length > 0);
    if (category) records = records.filter((record) => record.category.key === category);
    const normalized = query.trim().toLocaleLowerCase('fa-IR');
    // جست‌وجو اقلام منو را هم می‌بیند: «پیتزا» کافه یا رستورانی را پیدا می‌کند که پیتزا دارد.
    if (normalized) records = records.filter((record) => [record.name, record.description ?? '', ...record.capabilities.map((item) => `${item.name} ${item.short_description ?? ''}`), ...record.offers.map((item) => `${item.name} ${item.short_description ?? ''}`),
      ...(catalogByOrg.get(record.id)?.items.map((item) => item.name) ?? [])]
      .join(' ').toLocaleLowerCase('fa-IR').includes(normalized));
    return records;
  }, [allRecords, catalogByOrg, category, experience.data.hidden, now, openOnly, offersOnly, query]);
  const nearby = useMemo(() => nearbyPublicUiRecords(candidates, point[0], point[1], 5000), [candidates, point]);
  // D-78: while searching, matching PRO/MAX businesses come first (labelled «ویژه»); nothing is added to the matches.
  const searching = query.trim().length > 0;
  const shown = promoteMatches(nearbyOnly ? nearby.map((item) => item.record) : candidates, searching);
  const distanceById = useMemo(() => new Map(nearby.map((item) => [item.record.id, item.distanceMeters])), [nearby]);
  const selected = selectedId ? allRecords.find((item) => item.id === selectedId) ?? null : null;
  const valid = consumer?.hasValidSnapshot(now) ?? false;

  const useMyLocation = () => {
    setLocating(true);
    navigator.geolocation?.getCurrentPosition(
      ({ coords }) => { const next: Point = [coords.latitude, coords.longitude]; if (demoBuildEnabled && !validPoint(next)) { setLocating(false); return; }
        setPoint([next[0], next[1]]); setMyPoint([next[0], next[1]]); setFlyTo([next[0], next[1]]); setPointLabel('موقعیت من'); setNearbyOnly(true); setLocating(false);
        if (demoBuildEnabled && demoEnabled && demoAnchor) setDemoTarget((current) => nextDemoTarget(current, next)); },
      () => setLocating(false),
    );
  };
  // ویترین زنده باید از موقعیت واقعی گوشی کار کند، نه نقطهٔ پیش‌فرض تهران. در آزمون
  // روی گوشی، ویترین با «مرکز تهران (پیش‌فرض)» باز می‌شد و هیچ کسب‌وکاری در شعاعش نبود.
  // تا وقتی ویترین باز است موقعیت دنبال می‌شود؛ دستهٔ نمایشی فقط با نخستین موقعیت لنگر می‌گیرد.
  useEffect(() => {
    if (overlay !== 'vitrine' || !navigator.geolocation) return;
    const watch = navigator.geolocation.watchPosition(({ coords }) => {
      const next: Point = [coords.latitude, coords.longitude];
      if (!validPoint(next)) return;
      setPoint([next[0], next[1]]); setMyPoint([next[0], next[1]]); setPointLabel('موقعیت زندهٔ من');
      if (demoBuildEnabled && demoEnabled && demoAnchor) setDemoTarget((current) => nextDemoTarget(current, next));
    }, () => undefined, { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 });
    return () => navigator.geolocation.clearWatch(watch);
  }, [overlay, demoBuildEnabled, demoEnabled, demoAnchor]);
  const openDetail = (id: string) => { setSelectedId(id); experience.viewed(id); setOverlay('detail'); };
  // A tapped notification opens /?org=…&offer=…: show that business once its record is here.
  const [deepLink, setDeepLink] = useState(() => { try { return new URLSearchParams(window.location.search).get('org'); } catch { return null; } });
  useEffect(() => {
    if (!deepLink || !allRecords.some((r) => r.id === deepLink)) return;
    openDetail(deepLink); setDeepLink(null);
    try { window.history.replaceState(null, '', '/'); } catch { /* */ }
  }, [deepLink, allRecords]); // eslint-disable-line react-hooks/exhaustive-deps
  // While alerts are on, keep the (coarse) position fresh — at most every 10 minutes.
  const lastAlertSync = useRef(0);
  useEffect(() => {
    if (!alertPoint || !alertsOn() || Date.now() - lastAlertSync.current < 10 * 60_000) return;
    lastAlertSync.current = Date.now();
    void refreshAlertLocation(alertPoint);
  }, [alertPoint]);
  // دستیار: متن (یا گفتار تبدیل‌شده) فقط برای فهم منظور به دروازه می‌رود؛ انتخاب کسب‌وکار محلی است.
  const runAssistant = (text: string, voice: boolean, granted: ConsentState = consent) => {
    const q = text.trim();
    if (q.length < 2) return;
    if (ASSISTANT_REMOTE && granted === 'unknown') { setPendingAsk({ query: q, voice }); return; }
    setAssistant({ query: q, answer: null, loading: true, voice });
    void askAssistant(q, { consented: ASSISTANT_REMOTE && granted === 'granted' }).then((answer) => {
      setAssistant((current) => current && current.query === q ? { ...current, answer, loading: false } : current);
      if (voice) speakPersian(answer.answer);
    });
  };
  const decideConsent = (value: 'granted' | 'local') => {
    writeConsent(value); setConsent(value);
    const pending = pendingAsk; setPendingAsk(null);
    if (pending && pending.query) runAssistant(pending.query, pending.voice, value);
  };
  const voiceInput = useVoiceInput((text) => setQuery(text), (text) => { setQuery(text); runAssistant(text, true); });
  const assistantDistances = useMemo(() => new Map(nearbyPublicUiRecords(allRecords, point[0], point[1], 20000).map((item) => [item.record.id, item.distanceMeters])), [allRecords, point]);
  const assistantResults = useMemo(() => assistant?.answer
    ? promoteDirect(rankRecords({ records: allRecords, catalogByOrg, distances: assistantDistances, intent: assistant.answer.intent, now }))
    : [], [assistant, allRecords, catalogByOrg, assistantDistances, now]);
  const openProduct = (organizationId: string, item: CatalogItem) => {
    const owner = allRecords.find((record) => record.id === organizationId);
    setProduct({ item, businessName: owner ? displayName(owner.name) : '' });
  };

  return <div className={`app-shell${demoBuildEnabled && demoEnabled ? ' demo-on' : ''}`} dir="rtl">
    {demoBuildEnabled && demoEnabled && <div className="demo-banner" role="status"><span>{demoBanner(true)}</span>
      {demoAnchor && demoTarget && myPoint && <button onClick={() => setDemoTarget(reanchorDemoTarget(myPoint))}>آوردن به اینجا</button>}
      <button onClick={() => { setDemoEnabled(false); setDemoTarget(null); }} aria-label="خاموش کردن حالت نمایشی">خاموش</button></div>}
    {demoBuildEnabled && demoEnabled && demoAnchor && !demoTarget && <div className="demo-hint" role="status">برای دیدن کسب‌وکارهای نمایشی کنار خودت، دکمهٔ ◎ را بزن.</div>}
    <MapView records={shown} matchIds={new Set()} selectedId={selectedId} center={TEHRAN_CENTER} myPoint={myPoint}
      flyTarget={selected?.coordinates ? [selected.coordinates.latitude, selected.coordinates.longitude] : flyTo}
      tileRetryKey={tileRetryKey} onSelect={openDetail}
      onPickPoint={(lat, lng) => { setPoint([lat, lng]); setPointLabel('نقطهٔ انتخابی روی نقشه'); setNearbyOnly(true); }}
      onMapReady={() => undefined} onTileStatus={setTileStatus} />

    {!valid && <div className="app-banner warn" role="status">اطلاعات واقعی فعلاً در دسترس نیست. دادهٔ آزمایشی جای آن نمایش داده نمی‌شود.</div>}
    {valid && refreshFailed && <div className="app-banner warn" role="status">دریافت تازه انجام نشد؛ نسخهٔ معتبر پیشین فقط تا پایان اعتبارش نمایش داده می‌شود.</div>}
    {tileStatus === 'error' && <div className="map-state"><p>نقشه در دسترس نیست؛ فهرست دادهٔ امضاشده همچنان قابل استفاده است.</p><button onClick={() => setTileRetryKey((value) => value + 1)}>تلاش دوباره</button></div>}
    {demoBuildEnabled && !demoEnabled && <button className="demo-reenable" onClick={() => setDemoEnabled(true)}>روشن کردن حالت نمایشی</button>}

    <div className="top-bar"><div className="search-row"><form className="search-bar" role="search" onSubmit={(event) => { event.preventDefault(); runAssistant(query, false); }}>
      <span className="search-icon">🔍</span>
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="چی می‌خوای؟ مثلاً «یه نوشیدنی خنک»" aria-label="جست‌وجو یا پرسش از دستیار" enterKeyHint="search" />
      {voiceInput.supported && <button type="button" className={`search-mic${voiceInput.listening ? ' on' : ''}`} aria-pressed={voiceInput.listening}
        aria-label={voiceInput.listening ? 'توقف شنیدن' : 'پرسیدن با صدا'} onClick={() => {
          if (voiceInput.listening) { voiceInput.stop(); return; }
          // بدون سرویس بیرونی، رضایت فقط برای گفتار است؛ «نه» یعنی میکروفون تا موافقت بعدی خاموش می‌ماند.
          if (ASSISTANT_REMOTE ? consent === 'unknown' : consent !== 'granted') { setPendingAsk({ query: '', voice: true }); return; }
          voiceInput.start();
        }}><img className="search-mic-img" src="/icons/voice.png" alt="" aria-hidden="true" draggable={false} /></button>}
      <button type="submit" className="search-ask" aria-label="پرسیدن از دستیار" disabled={query.trim().length < 2}>✦</button>
    </form>{CHAT_ENABLED && <ChatInboxButton refreshKey={chatRefresh} onOpen={() => openChat(null)} />}<button className="profile-btn" onClick={() => setOverlay('experience')} aria-label="ذخیره‌های من"><Icon name="bookmark" /></button></div>
      <div className="chips" aria-label="فیلترهای واقعی">
        <button className={`chip${category === null ? ' active' : ''}`} onClick={() => setCategory(null)}>همه</button>
        {categories.filter((item) => item.key !== 'uncategorized').map((item) => <button key={item.key} className={`chip${category === item.key ? ' active' : ''}`} onClick={() => setCategory(item.key)}>{item.label}</button>)}
        <button className={`chip chip-offers${offersOnly ? ' active' : ''}`} onClick={() => setOffersOnly((value) => !value)} aria-pressed={offersOnly}>تخفیف‌ها{allRecords.some((r) => r.offers.length > 0) ? ` (${allRecords.filter((r) => r.offers.length > 0).length.toLocaleString('fa-IR')})` : ''}</button>
        <button className={`chip${openOnly ? ' active' : ''}`} onClick={() => setOpenOnly((value) => !value)}>الان باز است</button>
        <button className={`chip${nearbyOnly ? ' active' : ''}`} onClick={() => setNearbyOnly((value) => !value)}>نزدیک من</button>
      </div>
    </div>

    <div className="map-fabs"><button className={`fab-locate${locating ? ' busy' : ''}`} onClick={useMyLocation} aria-label="موقعیت من">◎</button></div>
    <div className="primary-actions"><button className="action-fab vitrine" onClick={() => setOverlay('vitrine')} aria-label="ویترین زنده" title="ویترین زنده"><img className="action-fab-img" src="/icons/vitrine.png" alt="" width={64} height={64} /></button></div>

    <BottomSheet state={sheet} onStateChange={setSheet} title={offersOnly ? 'تخفیف‌های اطراف' : 'اطراف شما'} subtitle={`${shown.length.toLocaleString('fa-IR')} مورد`}>
      {offersOnly && CHAT_ENABLED && <NearbyAlerts point={alertPoint} onNeedLocation={useMyLocation} />}
      {offersOnly && hiddenOffers > 0 && <p className="offers-hint" role="status">بعضی تخفیف‌ها فقط برای کسانی است که نزدیک کسب‌وکارند؛ برای دیدنشان دکمه‌ی ◎ را بزن.</p>}
      {shown.length === 0 ? <div className="empty">موردی مطابق فیلترهای فعلی نیست.</div> : shown.map((record) =>
        <PublicBusinessRow key={record.id} record={record} catalog={catalogByOrg.get(record.id)} now={now} distanceMeters={distanceById.get(record.id)}
          selected={record.id === selectedId} featured={searching && record.promoted} onOpen={() => openDetail(record.id)} />)}
    </BottomSheet>

    {overlay === 'detail' && selected && <PublicBusinessDetails record={selected} catalog={catalogByOrg.get(selected.id)} now={now} distanceMeters={distanceById.get(selected.id)} experience={experience.data}
      onClose={() => setOverlay('none')} onToggle={experience.toggle} onOpenItem={(item) => openProduct(selected.id, item)}
      onMessage={CHAT_ENABLED ? () => openChat({ organizationId: selected.id, name: selected.name }) : undefined} />}
    {overlay === 'chat' && <ChatPanel target={chatTarget} onClose={() => { setOverlay(chatTarget ? 'detail' : 'none'); setChatRefresh((n) => n + 1); }} />}
    {overlay === 'experience' && <ExperiencePanel data={experience.data} records={allRecords} storageFailed={experience.storageFailed} onClose={() => setOverlay('none')} onOpen={openDetail}
      onChange={experience.setData} onToggle={experience.toggle} onDiagnostics={() => setOverlay('none')}
      onSuggest={() => setSuggestionEmpty(!nearby.some((item) => item.record.offers.length > 0))} suggestionEmpty={suggestionEmpty}
      radiusLabel={formatDistance(5000)} pointLabel={pointLabel} filtersApplied={category !== null || openOnly}
      onChangePoint={() => setOverlay('none')} onUseLocation={useMyLocation} locating={locating} />}
    {overlay === 'vitrine' && <div className="panel dark"><div className="panel-head"><h3>ویترین زنده</h3><button className="panel-close" onClick={() => setOverlay('none')}>✕</button></div><div className="panel-body">
       <ArVitrineView records={allRecords} catalogByOrg={catalogByOrg} now={now} searchPoint={point} searchPointLabel={pointLabel} preferredCategory={category} onSelectBusiness={openDetail}
         locationPending={myPoint === null} initialRadius={demoBuildEnabled && demoEnabled ? 100 : undefined} onOpenItem={openProduct} />
    </div></div>}
    {voiceInput.error && <div className="app-banner warn" role="status">{voiceInput.error}</div>}
    {assistant && <AssistantPanel query={assistant.query} answer={assistant.answer} results={assistantResults} loading={assistant.loading}
      onOpen={(id) => openDetail(id)} onClose={() => setAssistant(null)} />}
    {pendingAsk && <AssistantConsent remote={ASSISTANT_REMOTE} onAccept={() => { const voice = pendingAsk.voice && !pendingAsk.query; decideConsent('granted'); if (voice) voiceInput.start(); }}
      onLocal={() => { const voice = ASSISTANT_REMOTE && pendingAsk.voice && !pendingAsk.query; decideConsent('local'); if (voice) voiceInput.start(); }} />}
    {product && <ProductPage item={product.item} businessName={product.businessName} onClose={() => setProduct(null)} />}
  </div>;
}
