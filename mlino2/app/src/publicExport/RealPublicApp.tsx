import { useEffect, useMemo, useState } from 'react';
import { PublicExportConsumer, FETCH_INTERVAL_MS } from './consumer';
import { trustBundleFromBuildJson } from './trustBundle';
import { FetchTransport } from './transport';
import { checkForBuildUpdate } from './versionCheck';
import { nearbyPublicUiRecords, toPublicUiRecords } from './uiAdapter';
import { keepOpen, openNow } from './businessHours';
import MapView, { type TileStatus } from '../components/MapView';
import BusinessCard from '../components/BusinessCard';
import BottomSheet, { type SheetState } from '../components/BottomSheet';
import PublicBusinessDetails from '../components/PublicBusinessDetails';
import ExperiencePanel from '../experience/ExperiencePanel';
import { useLocalExperience } from '../experience/useLocalExperience';
import ArVitrineView from '../ar/ArVitrineView';
import { formatDistance } from '../uiFormat';
import { CatalogConsumer, CatalogFetchTransport } from './catalog';

const TEHRAN_CENTER: [number, number] = [35.775, 51.425];

function configuredConsumer(): PublicExportConsumer | null {
  const url = import.meta.env.VITE_PUBLIC_EXPORT_URL;
  const bundle = import.meta.env.VITE_PUBLIC_EXPORT_TRUST_BUNDLE;
  if (!url || !bundle) return null;
  try { return new PublicExportConsumer(new FetchTransport(url), trustBundleFromBuildJson(bundle)); }
  catch { return null; }
}

type Overlay = 'none' | 'detail' | 'experience' | 'vitrine';

export default function RealPublicApp() {
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
  const [nearbyOnly, setNearbyOnly] = useState(false);
  const [openOnly, setOpenOnly] = useState(false);
  const [category, setCategory] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [tileStatus, setTileStatus] = useState<TileStatus>('loading');
  const [tileRetryKey, setTileRetryKey] = useState(0);
  const [locating, setLocating] = useState(false);
  const [suggestionEmpty, setSuggestionEmpty] = useState(false);
  const experience = useLocalExperience();

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
  const catalogRecords = catalog && consumer ? catalog.read(consumer, now) : [];
  const catalogByOrg = new Map(catalogRecords.map((record) => [record.organization_id, record]));
  const allRecords = useMemo(() => toPublicUiRecords(accepted), [accepted]);
  const categories = useMemo(() => [...new Map(allRecords.map((record) => [record.category.key, record.category])).values()], [allRecords]);
  const candidates = useMemo(() => {
    let records = allRecords.filter((record) => !experience.data.hidden.includes(record.id));
    if (openOnly) records = keepOpen(records, now);
    if (category) records = records.filter((record) => record.category.key === category);
    const normalized = query.trim().toLocaleLowerCase('fa-IR');
    if (normalized) records = records.filter((record) => [record.name, record.description ?? '', ...record.capabilities.map((item) => `${item.name} ${item.short_description ?? ''}`), ...record.offers.map((item) => `${item.name} ${item.short_description ?? ''}`)]
      .join(' ').toLocaleLowerCase('fa-IR').includes(normalized));
    return records;
  }, [allRecords, category, experience.data.hidden, now, openOnly, query]);
  const nearby = useMemo(() => nearbyPublicUiRecords(candidates, point[0], point[1], 5000), [candidates, point]);
  const shown = nearbyOnly ? nearby.map((item) => item.record) : candidates;
  const distanceById = useMemo(() => new Map(nearby.map((item) => [item.record.id, item.distanceMeters])), [nearby]);
  const selected = selectedId ? allRecords.find((item) => item.id === selectedId) ?? null : null;
  const valid = consumer?.hasValidSnapshot(now) ?? false;

  const useMyLocation = () => {
    setLocating(true);
    navigator.geolocation?.getCurrentPosition(
      ({ coords }) => { const next: [number, number] = [coords.latitude, coords.longitude]; setPoint(next); setMyPoint(next); setPointLabel('موقعیت من'); setNearbyOnly(true); setLocating(false); },
      () => setLocating(false),
    );
  };
  const openDetail = (id: string) => { setSelectedId(id); experience.viewed(id); setOverlay('detail'); };

  return <div className="app-shell" dir="rtl">
    <MapView records={shown} matchIds={new Set()} selectedId={selectedId} center={TEHRAN_CENTER} myPoint={myPoint}
      flyTarget={selected?.coordinates ? [selected.coordinates.latitude, selected.coordinates.longitude] : null}
      tileRetryKey={tileRetryKey} onSelect={openDetail}
      onPickPoint={(lat, lng) => { setPoint([lat, lng]); setPointLabel('نقطهٔ انتخابی روی نقشه'); setNearbyOnly(true); }}
      onMapReady={() => undefined} onTileStatus={setTileStatus} />

    {!valid && <div className="app-banner warn" role="status">اطلاعات واقعی فعلاً در دسترس نیست. دادهٔ آزمایشی جای آن نمایش داده نمی‌شود.</div>}
    {valid && refreshFailed && <div className="app-banner warn" role="status">دریافت تازه انجام نشد؛ نسخهٔ معتبر پیشین فقط تا پایان اعتبارش نمایش داده می‌شود.</div>}
    {tileStatus === 'error' && <div className="map-state"><p>نقشه در دسترس نیست؛ فهرست دادهٔ امضاشده همچنان قابل استفاده است.</p><button onClick={() => setTileRetryKey((value) => value + 1)}>تلاش دوباره</button></div>}

    <div className="top-bar"><div className="search-row"><div className="search-bar"><span className="search-icon">🔍</span>
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="نام، خدمت یا پیشنهاد" aria-label="جست‌وجوی اطلاعات واقعی" />
    </div><button className="profile-btn" onClick={() => setOverlay('experience')}>فضای من</button></div>
      <div className="chips" aria-label="فیلترهای واقعی">
        <button className={`chip${category === null ? ' active' : ''}`} onClick={() => setCategory(null)}>همه</button>
        {categories.map((item) => <button key={item.key} className={`chip${category === item.key ? ' active' : ''}`} onClick={() => setCategory(item.key)}>{item.label} · حدسی</button>)}
        <button className={`chip${openOnly ? ' active' : ''}`} onClick={() => setOpenOnly((value) => !value)}>الان باز است</button>
        <button className={`chip${nearbyOnly ? ' active' : ''}`} onClick={() => setNearbyOnly((value) => !value)}>نزدیک من</button>
      </div>
    </div>

    <div className="map-fabs"><button className={`fab-locate${locating ? ' busy' : ''}`} onClick={useMyLocation} aria-label="موقعیت من">◎</button></div>
    <div className="primary-actions"><button className="action-fab assistant" disabled title="دستیار آنلاین در U4 اضافه می‌شود"><span className="action-fab-icon">✦</span><span className="action-fab-label">دستیار در مرحلهٔ بعد</span></button>
      <button className="action-fab vitrine" onClick={() => setOverlay('vitrine')}><span className="action-fab-icon">◉</span><span className="action-fab-label">ویترین زنده</span></button></div>

    <BottomSheet state={sheet} onStateChange={setSheet} title="کسب‌وکارهای واقعی" subtitle={`${shown.length.toLocaleString('fa-IR')} مورد`}>
      {shown.length === 0 ? <div className="empty">موردی مطابق فیلترهای فعلی نیست.</div> : shown.map((record) =>
        <BusinessCard key={record.id} record={record} now={now} distanceMeters={distanceById.get(record.id)} selected={record.id === selectedId}
          reason={openNow(record, now) === 'unknown' ? 'وضعیت ساعات نامشخص است' : undefined} onOpen={() => openDetail(record.id)}
          onRoute={record.coordinates ? () => { setSelectedId(record.id); setPoint([record.coordinates!.latitude, record.coordinates!.longitude]); } : undefined} />)}
    </BottomSheet>

    {overlay === 'detail' && selected && <PublicBusinessDetails record={selected} catalog={catalogByOrg.get(selected.id)} now={now} experience={experience.data} onClose={() => setOverlay('none')} onToggle={experience.toggle} />}
    {overlay === 'experience' && <ExperiencePanel data={experience.data} records={allRecords} storageFailed={experience.storageFailed} onClose={() => setOverlay('none')} onOpen={openDetail}
      onChange={experience.setData} onToggle={experience.toggle} onDiagnostics={() => setOverlay('none')}
      onSuggest={() => setSuggestionEmpty(!nearby.some((item) => item.record.offers.length > 0))} suggestionEmpty={suggestionEmpty}
      radiusLabel={formatDistance(5000)} pointLabel={pointLabel} filtersApplied={category !== null || openOnly}
      onChangePoint={() => setOverlay('none')} onUseLocation={useMyLocation} locating={locating} />}
    {overlay === 'vitrine' && <div className="panel dark"><div className="panel-head"><h3>ویترین زنده</h3><button className="panel-close" onClick={() => setOverlay('none')}>✕</button></div><div className="panel-body">
       <ArVitrineView records={allRecords} catalogByOrg={catalogByOrg} now={now} searchPoint={point} searchPointLabel={pointLabel} preferredCategory={category} onSelectBusiness={openDetail} />
    </div></div>}
  </div>;
}
