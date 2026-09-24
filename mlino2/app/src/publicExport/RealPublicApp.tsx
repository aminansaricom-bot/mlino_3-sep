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
import LiveVitrine from '../live/LiveVitrine';
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
import { NEARBY_LABEL, RUNNER, callNative, inApp, onBackButton, onNative } from '../native/bridge';
import Welcome, { shouldWelcome } from '../onboarding/Welcome';
import { demoBanner, nextDemoTarget, parseDemoAnchor, presentationRecords, reanchorDemoTarget, validPoint, visibleDemoRecords, type Point } from '../demo/demoRelocation';
import { tr, numberLocale, msg, dir, noteLocation } from '../i18n';

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
  const [pointLabel, setPointLabel] = useState(msg('مرکز تهران (پیش‌فرض)'));
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
  // Why there is no position: the user said no, the device could not tell, or (demo) the phone is outside the demo area.
  const [locError, setLocError] = useState<null | 'denied' | 'unavailable' | 'outside'>(null);
  const [welcome, setWelcome] = useState(shouldWelcome);
  const [suggestionEmpty, setSuggestionEmpty] = useState(false);
  const [product, setProduct] = useState<{ item: CatalogItem; businessName: string; organizationId: string } | null>(null);
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
  const demoFrame = useMemo(() => (demoBuildEnabled && demoEnabled && demoAnchor && demoTarget ? { anchor: demoAnchor, target: demoTarget } : null), [demoBuildEnabled, demoEnabled, demoAnchor, demoTarget]);
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
    if (!navigator.geolocation) { setLocError('unavailable'); return; }
    setLocating(true);
    // A quick network position first (a second or two), then GPS refines it; waiting for GPS alone took ~20 s.
    const refine = () => navigator.geolocation.getCurrentPosition(({ coords }) => {
      const next: Point = [coords.latitude, coords.longitude]; noteLocation(next[0], next[1]);
      if (demoBuildEnabled && !validPoint(next)) return;
      setMyPoint([next[0], next[1]]); setPoint([next[0], next[1]]);
    }, () => undefined, { enableHighAccuracy: true, timeout: 30_000, maximumAge: 0 });
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { refine(); const next: Point = [coords.latitude, coords.longitude]; noteLocation(next[0], next[1]); if (demoBuildEnabled && !validPoint(next)) { setLocating(false); setLocError('outside'); return; }
        setPoint([next[0], next[1]]); setMyPoint([next[0], next[1]]); setFlyTo([next[0], next[1]]); setPointLabel('موقعیت من'); setNearbyOnly(true); setLocating(false); setLocError(null);
        if (demoBuildEnabled && demoEnabled && demoAnchor) setDemoTarget((current) => nextDemoTarget(current, next)); },
      (error) => { setLocating(false); setLocError(error?.code === 1 ? 'denied' : 'unavailable'); },
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 5 * 60_000 },
    );
  };
  // Without a position the demo businesses can still be shown where they really are (the demo area).
  const showSampleArea = () => {
    if (!demoAnchor) return;
    setDemoTarget(demoAnchor); setPoint([demoAnchor[0], demoAnchor[1]]); setFlyTo([demoAnchor[0], demoAnchor[1]]);
    setPointLabel('محدوده‌ی نمونه'); setNearbyOnly(false); setSheet('half');
  };
  // Already allowed on an earlier visit: locate straight away instead of showing an empty city.
  useEffect(() => {
    let alive = true;
    navigator.permissions?.query({ name: 'geolocation' as PermissionName }).then((p) => {
      if (!alive) return;
      if (p.state === 'granted') useMyLocation(); else if (p.state === 'denied') setLocError('denied');
    }).catch(() => undefined);
    return () => { alive = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const filtersOn = category !== null || openOnly || offersOnly || query.trim().length > 0;
  // Android back button: close the top-most layer; nothing open means the app may go to the background.
  const backRef = useRef<() => boolean>(() => false);
  backRef.current = () => {
    if (product) { setProduct(null); return true; }
    if (pendingAsk) { setPendingAsk(null); return true; }
    if (assistant) { setAssistant(null); return true; }
    if (overlay === 'chat') { setOverlay(chatTarget ? 'detail' : 'none'); setChatRefresh((n) => n + 1); return true; }
    if (overlay !== 'none') { setOverlay('none'); return true; }
    if (sheet === 'full') { setSheet('half'); return true; }
    if (sheet === 'half') { setSheet('peek'); return true; }
    return false;
  };
  useEffect(() => onBackButton(() => backRef.current()), []);
  const clearFilters = () => { setCategory(null); setOpenOnly(false); setOffersOnly(false); setQuery(''); };
  // ویترین زنده باید از موقعیت واقعی گوشی کار کند، نه نقطهٔ پیش‌فرض تهران. در آزمون
  // روی گوشی، ویترین با «مرکز تهران (پیش‌فرض)» باز می‌شد و هیچ کسب‌وکاری در شعاعش نبود.
  // تا وقتی ویترین باز است موقعیت دنبال می‌شود؛ دستهٔ نمایشی فقط با نخستین موقعیت لنگر می‌گیرد.
  useEffect(() => {
    if (overlay !== 'vitrine' || !navigator.geolocation) return;
    const watch = navigator.geolocation.watchPosition(({ coords }) => {
      const next: Point = [coords.latitude, coords.longitude]; noteLocation(next[0], next[1]);
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
  // In the Android app, a tapped nearby-offer notification opens that business (the runner keeps id → link).
  useEffect(() => {
    if (!inApp()) return undefined;
    return onNative(RUNNER, 'backgroundRunnerNotificationReceived', (event) => {
      const id = (event as { notificationId?: number }).notificationId;
      void callNative<{ url?: string }>(RUNNER, 'dispatchEvent', { label: NEARBY_LABEL, event: 'tapTarget', details: { id } })
        .then((r) => { try { const org = new URL(r?.url ?? '/', window.location.origin).searchParams.get('org'); if (org) setDeepLink(org); } catch { /* */ } })
        .catch(() => undefined);
    });
  }, []);
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
    setProduct({ item, businessName: owner ? displayName(owner.name) : '', organizationId });
  };

  return <div className={`app-shell${demoBuildEnabled && demoEnabled ? ' demo-on' : ''}`} dir={dir()}>
    {demoBuildEnabled && demoEnabled && <div className="demo-banner" role="status"><span>{tr(demoBanner(true) ?? '')}</span>
      {demoAnchor && demoTarget && myPoint && <button onClick={() => setDemoTarget(reanchorDemoTarget(myPoint))} title={tr('کسب‌وکارهای نمونه دوباره دور موقعیت فعلی‌ات چیده شوند')}>{tr('کنار من بچین')}</button>}
      <button onClick={() => { setDemoEnabled(false); setDemoTarget(null); }} aria-label={tr('بستن نسخه‌ی نمایشی')}>{tr('بستن نمونه‌ها')}</button></div>}
    <MapView records={shown} matchIds={new Set()} selectedId={selectedId} center={TEHRAN_CENTER} myPoint={myPoint}
      flyTarget={selected?.coordinates ? [selected.coordinates.latitude, selected.coordinates.longitude] : flyTo}
      tileRetryKey={tileRetryKey} onSelect={openDetail}
      onPickPoint={(lat, lng) => { setPoint([lat, lng]); setPointLabel('نقطهٔ انتخابی روی نقشه'); setNearbyOnly(true); }}
      onMapReady={() => undefined} onTileStatus={setTileStatus} />

    {!valid && <div className="app-banner warn" role="status">{tr('اطلاعات واقعی فعلاً در دسترس نیست. دادهٔ آزمایشی جای آن نمایش داده نمی‌شود.')}</div>}
    {valid && refreshFailed && <div className="app-banner warn" role="status">{tr('دریافت تازه انجام نشد؛ نسخهٔ معتبر پیشین فقط تا پایان اعتبارش نمایش داده می‌شود.')}</div>}
    {tileStatus === 'error' && <div className="map-state"><p>{tr('نقشه در دسترس نیست؛ فهرست دادهٔ امضاشده همچنان قابل استفاده است.')}</p><button onClick={() => setTileRetryKey((value) => value + 1)}>{tr('تلاش دوباره')}</button></div>}
    {demoBuildEnabled && !demoEnabled && <button className="demo-reenable" onClick={() => setDemoEnabled(true)}>{tr('روشن کردن حالت نمایشی')}</button>}

    <div className="top-bar"><div className="search-row"><form className="search-bar" role="search" onSubmit={(event) => { event.preventDefault(); runAssistant(query, false); }}>
      <span className="search-icon">🔍</span>
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={tr('چی می‌خوای؟')} aria-label={tr('جست‌وجو یا پرسش از دستیار')} enterKeyHint="search" />
      {voiceInput.supported && <button type="button" className={`search-mic${voiceInput.listening ? ' on' : ''}`} aria-pressed={voiceInput.listening}
        aria-label={voiceInput.listening ? tr('توقف شنیدن') : tr('پرسیدن با صدا')} onClick={() => {
          if (voiceInput.listening) { voiceInput.stop(); return; }
          // بدون سرویس بیرونی، رضایت فقط برای گفتار است؛ «نه» یعنی میکروفون تا موافقت بعدی خاموش می‌ماند.
          if (ASSISTANT_REMOTE ? consent === 'unknown' : consent !== 'granted') { setPendingAsk({ query: '', voice: true }); return; }
          voiceInput.start();
        }}><img className="search-mic-img" src="/icons/voice.png" alt="" aria-hidden="true" draggable={false} /></button>}
      <button type="submit" className="search-ask" aria-label={tr('پرسیدن از دستیار')} disabled={query.trim().length < 2}>✦</button>
    </form>{CHAT_ENABLED && <ChatInboxButton refreshKey={chatRefresh} onOpen={() => openChat(null)} />}<button className="profile-btn" onClick={() => setOverlay('experience')} aria-label={tr('ذخیره‌های من')}><Icon name="bookmark" /></button></div>
      <div className="chips" aria-label={tr('فیلترهای واقعی')}>
        <button className={`chip${category === null ? ' active' : ''}`} onClick={() => setCategory(null)}>{tr('همه')}</button>
        {categories.filter((item) => item.key !== 'uncategorized').map((item) => <button key={item.key} className={`chip${category === item.key ? ' active' : ''}`} onClick={() => setCategory(item.key)}>{tr(item.label)}</button>)}
        <button className={`chip chip-offers${offersOnly ? ' active' : ''}`} onClick={() => setOffersOnly((value) => !value)} aria-pressed={offersOnly}>{tr('تخفیف‌ها{0}', allRecords.some((r) => r.offers.length > 0) ? ` (${allRecords.filter((r) => r.offers.length > 0).length.toLocaleString(numberLocale())})` : '')}</button>
        <button className={`chip${openOnly ? ' active' : ''}`} onClick={() => setOpenOnly((value) => !value)}>{tr('الان باز است')}</button>
        <button className={`chip${nearbyOnly ? ' active' : ''}`} onClick={() => setNearbyOnly((value) => !value)}>{tr('نزدیک من')}</button>
      </div>
    </div>

    <div className="map-fabs"><button className={`fab-locate${locating ? ' busy' : ''}`} onClick={useMyLocation} aria-label={tr('موقعیت من')}>◎</button></div>
    <div className="primary-actions"><button className="action-fab vitrine" onClick={() => setOverlay('vitrine')} aria-label={tr('ویترین زنده')} title={tr('ویترین زنده')}><img className="action-fab-img" src="/icons/vitrine.png" alt="" width={64} height={64} /></button></div>

    <BottomSheet state={sheet} onStateChange={setSheet} title={offersOnly ? tr('تخفیف‌های اطراف') : tr('اطراف شما')} subtitle={demoBuildEnabled && demoEnabled && demoAnchor && !demoTarget ? tr('موقعیتت را بده') : tr('{0} مورد', shown.length.toLocaleString(numberLocale()))}>
      {offersOnly && CHAT_ENABLED && <NearbyAlerts point={alertPoint} demoFrame={demoFrame} demoBuild={demoBuildEnabled && demoEnabled} onNeedLocation={useMyLocation} />}
      {offersOnly && hiddenOffers > 0 && <p className="offers-hint" role="status">{tr('بعضی تخفیف‌ها فقط برای کسانی است که نزدیک کسب‌وکارند؛ برای دیدنشان دکمه‌ی ◎ را بزن.')}</p>}
      {demoBuildEnabled && demoEnabled && demoAnchor && !demoTarget && <div className="start-card" role="status">
        <strong>{locError === 'denied' ? tr('اجازه‌ی موقعیت بسته است') : locError === 'outside' ? tr('این نسخه فقط در تهران نمونه نشان می‌دهد') : locError === 'unavailable' ? tr('موقعیتت پیدا نشد') : tr('کسب‌وکارهای اطرافت را ببین')}</strong>
        <p>{locError === 'denied' ? tr('می‌توانی از تنظیمات مرورگر، موقعیت را برای این سایت روشن کنی؛ یا فعلاً کسب‌وکارهای نمونه را در محدوده‌ی خودشان ببین.')
          : locError === 'outside' ? tr('کسب‌وکارهای نمونه را در محدوده‌ی خودشان ببین.')
          : locError === 'unavailable' ? tr('گوشی موقعیت را نداد. دوباره امتحان کن یا نمونه‌ها را در محدوده‌ی خودشان ببین.')
          : tr('با موقعیتت، فاصله و تخفیف‌های نزدیک را نشان می‌دهیم. موقعیت فقط روی همین گوشی حساب می‌شود.')}</p>
        <div className="start-card-actions">
          {locError !== 'denied' && locError !== 'outside' && <button className="primary" onClick={useMyLocation} disabled={locating}>{locating ? tr('در حال پیدا کردن…') : tr('◎ استفاده از موقعیت من')}</button>}
          <button onClick={showSampleArea}>{tr('دیدن محدوده‌ی نمونه')}</button>
        </div>
      </div>}
      {!(demoBuildEnabled && demoEnabled && demoAnchor && !demoTarget) && locError === 'denied' && !myPoint && <p className="offers-hint" role="status">{tr('اجازه‌ی موقعیت بسته است؛ فاصله‌ها از نقطه‌ی انتخابی روی نقشه حساب می‌شود.')}</p>}
      {shown.length === 0 && !(demoBuildEnabled && demoEnabled && demoAnchor && !demoTarget) ? <div className="empty">{filtersOn
        ? <>{tr('با این جست‌وجو یا فیلترها چیزی پیدا نشد.')}<br /><button className="link-btn" onClick={clearFilters}>{tr('پاک کردن فیلترها')}</button></>
        : tr('هنوز کسب‌وکاری در این اطراف روی ملینو نیست.')}</div> : shown.map((record) =>
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
      radiusLabel={formatDistance(5000)} pointLabel={tr(pointLabel)} filtersApplied={category !== null || openOnly}
      onChangePoint={() => setOverlay('none')} onUseLocation={useMyLocation} locating={locating} />}
    {overlay === 'vitrine' && <LiveVitrine records={allRecords} catalogByOrg={catalogByOrg} now={now} searchPoint={point}
      locationPending={myPoint === null && locError === null} initialRadius={demoBuildEnabled && demoEnabled ? 100 : undefined}
      offersOnly={offersOnly} onOffersOnly={setOffersOnly} query={query} onQuery={setQuery}
      savedIds={experience.data.saved} onToggleSave={(id) => experience.toggle('saved', id)}
      onOpenItem={openProduct} onOpenBusiness={openDetail} onClose={() => setOverlay('none')} demo={demoBuildEnabled && demoEnabled} />}
    {voiceInput.error && <div className="app-banner warn" role="status">{voiceInput.error}</div>}
    {assistant && <AssistantPanel query={assistant.query} answer={assistant.answer} results={assistantResults} loading={assistant.loading}
      onOpen={(id) => openDetail(id)} onClose={() => setAssistant(null)} />}
    {pendingAsk && <AssistantConsent remote={ASSISTANT_REMOTE} onAccept={() => { const voice = pendingAsk.voice && !pendingAsk.query; decideConsent('granted'); if (voice) voiceInput.start(); }}
      onLocal={() => { const voice = ASSISTANT_REMOTE && pendingAsk.voice && !pendingAsk.query; decideConsent('local'); if (voice) voiceInput.start(); }} />}
    {welcome && <Welcome onClose={() => setWelcome(false)} onLocate={() => { setSheet('half'); useMyLocation(); }} />}
    {product && <ProductPage item={product.item} businessName={product.businessName} organizationId={product.organizationId} onClose={() => setProduct(null)} />}
  </div>;
}
