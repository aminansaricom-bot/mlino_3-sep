import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { V2BusinessDirectoryRecord } from '../directory/contract';

/**
 * لایه‌ی نقشه — تمام‌صفحه، با مارکرهای دسته‌بندی‌شده و وضعیت‌های بارگذاری/خطا.
 *
 * فقط ارائه است: هیچ تصمیم داده‌ای اینجا گرفته نمی‌شود. رکوردهایی که می‌گیرد،
 * همان‌هایی‌اند که App طبق منطق موجود (فیلتر طبقه) حساب کرده.
 */

const CATEGORY_GLYPH: Record<string, string> = {
  dental_clinic: '🦷',
  beauty_clinic: '💠',
  cafe: '☕',
  restaurant: '🍽',
  retail_shop: '🛍',
};

function pinIcon(category: string, isMatch: boolean, isSelected: boolean): L.DivIcon {
  const state = isMatch ? ' is-match' : isSelected ? ' is-selected' : '';
  return L.divIcon({
    className: `pin-wrap${state}`,
    html: `<div class="pin cat-${category}"><span>${CATEGORY_GLYPH[category] ?? '📍'}</span></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

const meIcon = L.divIcon({
  className: 'me-wrap',
  html: '<div class="me-dot"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function FlyTo({ target }: { target: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, 16, { duration: 0.8 });
  }, [target, map]);
  return null;
}

function DoubleClickPicker({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    dblclick(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/**
 * کنترل‌های سفارشی بیرون از MapContainer به نمونه‌ی نقشه نیاز دارند.
 *
 * `invalidateSize` اینجا اجباری است، نه احتیاط: Leaflet اندازه‌ی ظرف را یک‌بار
 * موقع ساخت می‌خواند. چون نقشه در چیدمان جدید داخل یک ظرف مطلق و تمام‌صفحه است
 * که ارتفاعش بعد از اولین Paint نهایی می‌شود، آن اندازه کهنه می‌ماند و Leaflet
 * فقط برای همان مستطیل کوچک اولیه Tile می‌گیرد — بقیه‌ی صفحه خاکستری می‌ماند.
 * (همین باگ در اسکرین‌شات تست دیده شد.) با هر تغییر اندازه هم دوباره لازم است.
 */
function MapHandle({ onReady }: { onReady: (map: L.Map) => void }) {
  const map = useMap();
  useEffect(() => {
    onReady(map);

    const refresh = () => map.invalidateSize();
    // بعد از نهایی‌شدن چیدمان اولیه
    const raf = requestAnimationFrame(refresh);
    const settle = setTimeout(refresh, 250);

    const ro = new ResizeObserver(refresh);
    ro.observe(map.getContainer());
    window.addEventListener('orientationchange', refresh);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(settle);
      ro.disconnect();
      window.removeEventListener('orientationchange', refresh);
    };
  }, [map, onReady]);
  return null;
}

/**
 * وضعیت Tileها. Leaflet برای هر Tile رویداد می‌دهد؛ ما فقط سه حالت را
 * تفکیک می‌کنیم: در حال بارگذاری، آماده، و خطا (شبکه/فیلتر/آفلاین).
 * بدون این، نقشه در حالت خطا فقط خاکستری می‌ماند و کاربر دلیلش را نمی‌داند.
 */
export type TileStatus = 'loading' | 'ready' | 'error';

interface MapViewProps {
  records: V2BusinessDirectoryRecord[];
  matchIds: Set<string>;
  selectedId: string | null;
  center: [number, number];
  myPoint: [number, number] | null;
  flyTarget: [number, number] | null;
  /** تغییرش TileLayer را از نو می‌سازد — مسیر «تلاش دوباره» بعد از خطای شبکه */
  tileRetryKey: number;
  onSelect: (id: string) => void;
  onPickPoint: (lat: number, lng: number) => void;
  onMapReady: (map: L.Map) => void;
  onTileStatus: (s: TileStatus) => void;
}

export default function MapView({
  records,
  matchIds,
  selectedId,
  center,
  myPoint,
  flyTarget,
  tileRetryKey,
  onSelect,
  onPickPoint,
  onMapReady,
  onTileStatus,
}: MapViewProps) {
  return (
    <div className="map-layer">
      <MapContainer center={center} zoom={13} zoomControl={false} style={{ height: '100%', width: '100%' }}>
        <MapHandle onReady={onMapReady} />
        <DoubleClickPicker onPick={onPickPoint} />
        <TileLayer
          key={tileRetryKey}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          eventHandlers={{
            loading: () => onTileStatus('loading'),
            load: () => onTileStatus('ready'),
            tileerror: () => onTileStatus('error'),
          }}
        />

        {records.map((r) => (
          <Marker
            key={r.business_id}
            position={[r.location.latitude, r.location.longitude]}
            icon={pinIcon(r.category, matchIds.has(r.business_id), selectedId === r.business_id)}
            eventHandlers={{ click: () => onSelect(r.business_id) }}
          />
        ))}

        {myPoint && <Marker position={myPoint} icon={meIcon} />}

        <FlyTo target={flyTarget} />
      </MapContainer>
    </div>
  );
}
