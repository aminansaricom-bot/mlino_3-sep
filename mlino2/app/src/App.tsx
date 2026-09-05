import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { directoryService } from './directory/BusinessDirectoryService';
import { loadMockSnapshotRaw } from './directory/loader';
import type { V2BusinessDirectoryRecord } from './directory/contract';
import { intentParser, extractRadiusMeters } from './matching/IntentParser';
import { matchingService } from './matching/container';
import type { MatchItem } from './matching/MatchingService';
import ArVitrineView from './ar/ArVitrineView';
import { categoryLabel, floorLabel, formatDistance, formatIso, formatPrice } from './uiFormat';

const TEHRAN_CENTER: [number, number] = [35.775, 51.425];

const markerIcon = L.divIcon({
  className: 'v2-marker',
  html: '<div style="width:14px;height:14px;border-radius:50%;background:#4f8cff;border:3px solid #fff;box-shadow:0 0 6px rgba(0,0,0,.5)"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const matchMarkerIcon = L.divIcon({
  className: 'v2-marker-match',
  html: '<div style="width:18px;height:18px;border-radius:50%;background:#ffb020;border:3px solid #fff;box-shadow:0 0 8px rgba(255,176,32,.8)"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function FlyToSelected({ target }: { target: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, 16, { duration: 0.8 });
  }, [target, map]);
  return null;
}

function SetPointOnDblClick({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    dblclick(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function isOfferActive(validUntil: string | null, now: number): boolean {
  if (validUntil === null) return true;
  const t = Date.parse(validUntil);
  return Number.isNaN(t) ? true : t >= now;
}

type Tab = 'list' | 'assistant' | 'ar';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  items?: MatchItem[];
  understood?: string;
}

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [records, setRecords] = useState<V2BusinessDirectoryRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [floorFilter, setFloorFilter] = useState<number | 'all'>('all');
  const [now] = useState(() => Date.now());
  const [tab, setTab] = useState<Tab>('list');

  const [searchPoint, setSearchPoint] = useState<[number, number]>(TEHRAN_CENTER);
  const [searchPointLabel, setSearchPointLabel] = useState<string>('مرکز تهران (پیش‌فرض)');
  const [radiusMeters, setRadiusMeters] = useState(5000);
  const [chat, setChat] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      text: 'سلام! دنبال چی هستی؟ مثلاً بنویس: «دنبال جرم‌گیری دندان می‌گردم» یا «کاپوچینو خوب نزدیک اینجا».',
    },
  ]);
  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadMockSnapshotRaw().then((raw) => {
      if (cancelled) return;
      directoryService.loadSnapshot(raw);
      setRecords(directoryService.getAll());
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat]);

  const buildings = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const r of records) {
      if (r.location.building_id === null || r.location.floor_level === null) continue;
      const floors = map.get(r.location.building_id) ?? [];
      if (!floors.includes(r.location.floor_level)) floors.push(r.location.floor_level);
      map.set(r.location.building_id, floors);
    }
    return map;
  }, [records]);

  const visibleRecords = useMemo(() => {
    if (floorFilter === 'all') return records;
    return records.filter(
      (r) => r.location.floor_level === floorFilter && r.location.building_id !== null,
    );
  }, [records, floorFilter]);

  const selected = useMemo(
    () => (selectedId === null ? null : directoryService.getById(selectedId)),
    [selectedId],
  );

  const flyTarget = useMemo<[number, number] | null>(
    () => (selected ? [selected.location.latitude, selected.location.longitude] : null),
    [selected],
  );

  /** آخرین نتیجه‌های دستیار — مارکرهای طلایی روی نقشه */
  const lastMatchIds = useMemo(() => {
    const last = [...chat].reverse().find((m) => m.role === 'assistant' && m.items);
    return new Set((last?.items ?? []).map((i) => i.record.business_id));
  }, [chat]);

  function send() {
    const text = input.trim();
    if (text.length === 0) return;
    setInput('');

    const intent = intentParser.parse(text);
    const radius = extractRadiusMeters(text) ?? radiusMeters;
    const res = matchingService.match(intent, {
      latitude: searchPoint[0],
      longitude: searchPoint[1],
      radiusMeters: radius,
    });

    const understoodParts: string[] = [];
    understoodParts.push(
      res.interpreted.category !== null
        ? `دسته: ${categoryLabel(res.interpreted.category)}`
        : 'دسته: نامطمئن (جست‌وجوی متنی)',
    );
    if (res.interpreted.keywords.length > 0) {
      understoodParts.push(`کلیدواژه‌ها: ${res.interpreted.keywords.join('، ')}`);
    }
    if (res.interpreted.modifiers.wantsOffer) understoodParts.push('دنبال تخفیف');
    understoodParts.push(`شعاع: ${formatDistance(radius)}`);

    const top = res.items.slice(0, 4);
    let reply: string;
    if (top.length === 0) {
      reply = 'چیزی در این شعاع پیدا نکردم. شعاع را بیشتر کن یا مکان را عوض کن.';
    } else {
      const names = top
        .map((i) => `${i.record.name} (${formatDistance(i.distanceMeters)})`)
        .join('، ');
      reply = `${top.length === 1 ? 'یک گزینه' : `${top.length.toLocaleString('fa-IR')} گزینه`} پیدا کردم: ${names}. نتیجه‌ها روی نقشه با نشان طلایی مشخص‌اند.`;
    }

    setChat((prev) => [
      ...prev,
      { role: 'user', text },
      { role: 'assistant', text: reply, items: top, understood: understoodParts.join(' · ') },
    ]);
  }

  function useMyLocation() {
    if (!('geolocation' in navigator)) {
      setSearchPointLabel('مرورگر از موقعیت‌یابی پشتیبانی نمی‌کند');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSearchPoint([pos.coords.latitude, pos.coords.longitude]);
        setSearchPointLabel('موقعیت من');
      },
      () => {
        setSearchPointLabel('دسترسی به موقعیت رد شد — روی نقشه دابل‌کلیک کن');
      },
      { timeout: 8000 },
    );
  }

  if (!loaded) {
    return <div className="empty">در حال بارگذاری دایرکتوری…</div>;
  }

  return (
    <div className="app-layout">
      <div className="map-side">
        <MapContainer center={TEHRAN_CENTER} zoom={13} style={{ height: '100%', width: '100%' }}>
          <SetPointOnDblClick
            onPick={(lat, lng) => {
              setSearchPoint([lat, lng]);
              setSearchPointLabel('نقطه‌ی انتخابی روی نقشه');
            }}
          />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {visibleRecords.map((r) => (
            <Marker
              key={r.business_id}
              position={[r.location.latitude, r.location.longitude]}
              icon={lastMatchIds.has(r.business_id) ? matchMarkerIcon : markerIcon}
              eventHandlers={{ click: () => setSelectedId(r.business_id) }}
            >
              <Popup>
                <strong>{r.name}</strong>
                <br />
                {categoryLabel(r.category)}
                {r.location.building_id !== null && r.location.floor_level !== null && (
                  <>
                    <br />
                    {floorLabel(r.location.floor_level, r.location.building_id)}
                  </>
                )}
              </Popup>
            </Marker>
          ))}
          <FlyToSelected target={flyTarget} />
        </MapContainer>
      </div>

      <aside className="side-panel">
        <header className="app-header">
          <h1>MLINO V2</h1>
          <span className="mock-badge" title="داده‌ی واقعی هنوز از V1 منتشر نشده است">
            داده‌ی آزمایشی
          </span>
        </header>
        <div className="sync-badge">
          آخرین به‌روزرسانی Snapshot: {formatIso(directoryService.lastSyncedAt ?? '')}
        </div>

        <div className="tabs">
          <button className={tab === 'list' ? 'active' : ''} onClick={() => setTab('list')}>
            کسب‌وکارها
          </button>
          <button className={tab === 'assistant' ? 'active' : ''} onClick={() => setTab('assistant')}>
            دستیار
          </button>
          <button className={tab === 'ar' ? 'active' : ''} onClick={() => setTab('ar')}>
            ویترین AR
          </button>
        </div>

        {tab === 'list' && (
          <>
            <div className="floor-filter">
              <span>فیلتر طبقه (مکان چندطبقه):</span>
              <button
                className={floorFilter === 'all' ? 'active' : ''}
                onClick={() => setFloorFilter('all')}
              >
                همه
              </button>
              {[...buildings.entries()].flatMap(([bId, floors]) =>
                floors
                  .sort((a, b) => a - b)
                  .map((f) => (
                    <button
                      key={`${bId}_${f}`}
                      className={floorFilter === f ? 'active' : ''}
                      onClick={() => setFloorFilter(f)}
                      title={`طبقه ${f} — ${bId}`}
                    >
                      {floorLabel(f, bId)}
                    </button>
                  )),
              )}
            </div>

            <div className="business-list">
              {visibleRecords.map((r) => (
                <button
                  key={r.business_id}
                  className={`business-item${selectedId === r.business_id ? ' selected' : ''}`}
                  onClick={() => setSelectedId(r.business_id)}
                >
                  <div className="b-name">{r.name}</div>
                  <div className="b-meta">
                    <span>{categoryLabel(r.category)}</span>
                    {floorLabel(r.location.floor_level, r.location.building_id) && (
                      <span>{floorLabel(r.location.floor_level, r.location.building_id)}</span>
                    )}
                    <span>{r.products.filter((p) => p.is_active).length} محصول فعال</span>
                  </div>
                </button>
              ))}
              {visibleRecords.length === 0 && <div className="empty">موردی یافت نشد</div>}
            </div>

            {selected && (
              <section className="detail" style={{ marginTop: 16 }}>
                <h2>{selected.name}</h2>
                <div className="category">{categoryLabel(selected.category)}</div>
                <div className="loc">
                  مختصات: {selected.location.latitude.toFixed(5)}،{' '}
                  {selected.location.longitude.toFixed(5)}
                  {selected.location.building_id !== null &&
                    selected.location.floor_level !== null && (
                      <span className="floor-tag">
                        {floorLabel(selected.location.floor_level, selected.location.building_id)}
                      </span>
                    )}
                </div>

                <div className="section-title">محصولات / خدمات</div>
                {selected.products.map((p) => (
                  <div
                    key={p.product_id}
                    className={`product-row${p.is_active ? '' : ' inactive'}`}
                    title={p.is_active ? p.description ?? '' : 'غیرفعال — نمایش‌داده‌نشده برای مشتری'}
                  >
                    <span>
                      {p.name}
                      {!p.is_active && ' (غیرفعال)'}
                    </span>
                    <span className="price">{formatPrice(p.price, p.currency)}</span>
                  </div>
                ))}
                {selected.products.length === 0 && <div className="empty">محصولی ثبت نشده</div>}

                <div className="section-title">آفرها</div>
                {selected.offers.length === 0 && <div className="empty">آفری ثبت نشده</div>}
                {selected.offers.map((o) => {
                  const active = isOfferActive(o.valid_until, now);
                  return (
                    <div
                      key={o.offer_id}
                      className="offer-card"
                      style={active ? undefined : { opacity: 0.45 }}
                    >
                      <div>
                        <span className="discount">
                          {o.discount_percent !== null ? `${o.discount_percent}٪ تخفیف — ` : ''}
                        </span>
                        {o.title}
                        {!active && ' (منقضی)'}
                      </div>
                      {o.description && <div style={{ color: 'var(--muted)' }}>{o.description}</div>}
                      <div style={{ color: 'var(--muted)', fontSize: 11 }}>
                        اعتبار: {formatIso(o.valid_from)}
                        {o.valid_until ? ` تا ${formatIso(o.valid_until)}` : ' — تا اطلاع ثانوی'}
                      </div>
                    </div>
                  );
                })}
              </section>
            )}
          </>
        )}

        {tab === 'assistant' && (
          <div className="assistant">
            <div className="search-point">
              <div className="section-title" style={{ marginTop: 0 }}>
                نقطه‌ی جست‌وجو
              </div>
              <div className="sp-row">
                <button onClick={useMyLocation}>📍 موقعیت من</button>
                <span className="sp-label">{searchPointLabel}</span>
              </div>
              <div className="sp-row">
                <span className="sp-label">شعاع:</span>
                {[
                  [1000, '۱ کیلومتر'],
                  [5000, '۵ کیلومتر'],
                  [10000, '۱۰ کیلومتر'],
                ].map(([m, label]) => (
                  <button
                    key={m as number}
                    className={radiusMeters === m ? 'active' : ''}
                    onClick={() => setRadiusMeters(m as number)}
                  >
                    {label as string}
                  </button>
                ))}
              </div>
              <div className="sp-hint">یا روی نقشه دابل‌کلیک کن</div>
            </div>

            <div className="chat">
              {chat.map((m, i) => (
                <div key={i} className={`msg ${m.role}`}>
                  <div className="bubble">
                    <div className="msg-text">{m.text}</div>
                    {m.understood && <div className="msg-understood">{m.understood}</div>}
                    {m.items && m.items.length > 0 && (
                      <div className="match-list">
                        {m.items.map((item) => (
                          <button
                            key={item.record.business_id}
                            className="match-card"
                            onClick={() => {
                              setSelectedId(item.record.business_id);
                              setTab('list');
                            }}
                          >
                            <div className="b-name">{item.record.name}</div>
                            <div className="b-meta">
                              <span>{formatDistance(item.distanceMeters)}</span>
                              <span>{categoryLabel(item.record.category)}</span>
                              {floorLabel(
                                item.record.location.floor_level,
                                item.record.location.building_id,
                              ) && (
                                <span>
                                  {floorLabel(
                                    item.record.location.floor_level,
                                    item.record.location.building_id,
                                  )}
                                </span>
                              )}
                            </div>
                            {item.matchedProducts.slice(0, 3).map((p) => (
                              <div key={p.product_id} className="product-row">
                                <span>{p.name}</span>
                                <span className="price">{formatPrice(p.price, p.currency)}</span>
                              </div>
                            ))}
                            {item.matchedOffer && (
                              <div className="offer-card">
                                <span className="discount">
                                  {item.matchedOffer.discount_percent !== null
                                    ? `${item.matchedOffer.discount_percent}٪ — `
                                    : ''}
                                  {item.matchedOffer.title}
                                </span>
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div className="chat-input">
              <input
                value={input}
                placeholder='مثلاً: «لیزر با تخفیف نزدیک اینجا»'
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') send();
                }}
              />
              <button onClick={send}>ارسال</button>
            </div>
          </div>
        )}
        {tab === 'ar' && (
          <ArVitrineView
            searchPoint={searchPoint}
            searchPointLabel={searchPointLabel}
            radiusMeters={radiusMeters}
            onSelectBusiness={(businessId) => {
              setSelectedId(businessId);
              setTab('list');
            }}
          />
        )}
      </aside>
    </div>
  );
}
