import { useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { directoryService } from './directory/BusinessDirectoryService';
import { loadMockSnapshotRaw } from './directory/loader';
import type { V2BusinessDirectoryRecord } from './directory/contract';
import { useEffect } from 'react';

const TEHRAN_CENTER: [number, number] = [35.775, 51.425];

const markerIcon = L.divIcon({
  className: 'v2-marker',
  html: '<div style="width:14px;height:14px;border-radius:50%;background:#4f8cff;border:3px solid #fff;box-shadow:0 0 6px rgba(0,0,0,.5)"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

function categoryLabel(cat: string): string {
  const map: Record<string, string> = {
    dental_clinic: 'دندان‌پزشکی',
    beauty_clinic: 'زیبایی',
    cafe: 'کافه',
    restaurant: 'رستوران',
    retail_shop: 'فروشگاه',
  };
  return map[cat] ?? cat;
}

function floorLabel(floor: number | null, buildingId: string | null): string | null {
  if (floor === null || buildingId === null) return null;
  if (floor === 0) return 'همکف';
  if (floor < 0) return `طبقه ${Math.abs(floor)}-`;
  return `طبقه ${floor}`;
}

function formatPrice(price: number | null, currency: string | null): string {
  if (price === null) return 'بدون قیمت';
  const num = price.toLocaleString('fa-IR');
  return currency === 'IRR' ? `${num} ریال` : num;
}

function formatIso(iso: string): string {
  try {
    return new Date(iso).toLocaleString('fa-IR');
  } catch {
    return iso;
  }
}

function FlyToSelected({ target }: { target: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, 16, { duration: 0.8 });
  }, [target, map]);
  return null;
}

function isOfferActive(validUntil: string | null, now: number): boolean {
  if (validUntil === null) return true;
  const t = Date.parse(validUntil);
  return Number.isNaN(t) ? true : t >= now;
}

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [records, setRecords] = useState<V2BusinessDirectoryRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [floorFilter, setFloorFilter] = useState<number | 'all'>('all');
  const [now] = useState(() => Date.now());

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

  if (!loaded) {
    return <div className="empty">در حال بارگذاری دایرکتوری…</div>;
  }

  return (
    <div className="app-layout">
      <div className="map-side">
        <MapContainer center={TEHRAN_CENTER} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {visibleRecords.map((r) => (
            <Marker
              key={r.business_id}
              position={[r.location.latitude, r.location.longitude]}
              icon={markerIcon}
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
          <h1>MLINO V2 — نقشه‌ی کسب‌وکارها</h1>
          <span className="mock-badge" title="داده‌ی واقعی هنوز از V1 منتشر نشده است">
            داده‌ی آزمایشی
          </span>
        </header>
        <div className="sync-badge">
          آخرین به‌روزرسانی Snapshot: {formatIso(directoryService.lastSyncedAt ?? '')}
        </div>

        {[...buildings.entries()].length > 0 && (
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
        )}

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
                <div key={o.offer_id} className="offer-card" style={active ? undefined : { opacity: 0.45 }}>
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
      </aside>
    </div>
  );
}
