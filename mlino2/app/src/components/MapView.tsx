import { useEffect, useRef } from 'react';
import L from '@neshan-maps-platform/leaflet';
import '@neshan-maps-platform/leaflet/dist/leaflet.css';
import type { V2BusinessDirectoryRecord } from '../directory/contract';

/**
 * لایه‌ی نقشه — روی SDK نشان.
 *
 * چرا نشان: سبک پیش‌فرض OSM برای یک اپ مصرف‌کننده‌ی فارسی مناسب نبود — جاده‌های
 * اشباع، و مهم‌تر، پلاک شماره‌ی راه که داخل خودِ تصویر کاشی پخته شده و با هیچ
 * فیلتری پاک نمی‌شود. سرویس‌های تمیز جهانی (CARTO و…) یا کلید تجاری می‌خواهند
 * یا برای تهران برچسب فارسی ندارند. نشان هر دو را دارد و داخل ایران سریع است.
 *
 * چرا این «مهاجرت کتابخانه» نیست: SDK نشان خودش روی همان Leaflet 1.9.4 ساخته
 * شده. تنها چیزی که عوض شد، استفاده‌ی امری به‌جای react-leaflet در همین فایل
 * است — چون `L.Map` نشان کلید را به‌عنوان option می‌گیرد و `key` در React یک
 * prop رزرو‌شده است و هرگز به سازنده نمی‌رسد. react-leaflet فقط در همین یک
 * فایل استفاده می‌شد.
 *
 * کلید: فقط از env. کلید `web.` نشان محدود به دامنه است، پس حضورش در باندل
 * مرورگر طبق طراحی خودِ نشان بی‌خطر است — برخلاف کلید `service.` که هرگز نباید
 * سمت کلاینت بیاید (با آن می‌شود مسیریابی و جست‌وجو صدا زد و سهمیه را سوزاند).
 */

const CATEGORY_GLYPH: Record<string, string> = {
  dental_clinic: '🦷',
  beauty_clinic: '💠',
  cafe: '☕',
  restaurant: '🍽',
  retail_shop: '🛍',
};

const NESHAN_KEY = import.meta.env.V2_NESHAN_MAP_KEY as string | undefined;
/** استایل نشان: dreamy روشن و خلوت است — نزدیک‌ترین به چیزی که مالک محصول خواست */
const NESHAN_MAPTYPE = (import.meta.env.V2_NESHAN_MAPTYPE as string | undefined) ?? 'dreamy';

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

export type TileStatus = 'loading' | 'ready' | 'error';

interface MapViewProps {
  records: V2BusinessDirectoryRecord[];
  matchIds: Set<string>;
  selectedId: string | null;
  center: [number, number];
  myPoint: [number, number] | null;
  flyTarget: [number, number] | null;
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
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const meMarkerRef = useRef<L.Marker | null>(null);
  /** آخرین مقدارهای callback، تا ساخت نقشه به تغییر آن‌ها وابسته نشود */
  const cbRef = useRef({ onSelect, onPickPoint, onMapReady, onTileStatus });
  cbRef.current = { onSelect, onPickPoint, onMapReady, onTileStatus };

  // ساخت نقشه — دقیقاً یک‌بار
  useEffect(() => {
    const host = hostRef.current;
    if (host === null || mapRef.current !== null) return;

    if (NESHAN_KEY === undefined || NESHAN_KEY.length === 0) {
      // بدون کلید چیزی جعل نمی‌کنیم — وضعیت خطا به بالادست گزارش می‌شود
      cbRef.current.onTileStatus('error');
      return;
    }

    const map = new L.Map(host, {
      key: NESHAN_KEY,
      maptype: NESHAN_MAPTYPE,
      center,
      zoom: 13,
      zoomControl: false,
      poi: false,
      traffic: false,
    } as L.MapOptions);

    mapRef.current = map;
    cbRef.current.onMapReady(map);
    cbRef.current.onTileStatus('ready');

    map.on('dblclick', (e: L.LeafletMouseEvent) => {
      cbRef.current.onPickPoint(e.latlng.lat, e.latlng.lng);
    });

    /**
     * Leaflet اندازه‌ی ظرف را یک‌بار موقع ساخت می‌خواند. در چیدمان تمام‌صفحه‌ی
     * ما ارتفاع بعد از اولین Paint نهایی می‌شود، پس آن اندازه کهنه می‌ماند و
     * نقشه فقط برای یک مستطیل کوچک کاشی می‌گیرد — این باگ واقعاً دیده شد.
     */
    const refresh = () => map.invalidateSize();
    const raf = requestAnimationFrame(refresh);
    const settle = setTimeout(refresh, 250);
    const ro = new ResizeObserver(refresh);
    ro.observe(host);
    window.addEventListener('orientationchange', refresh);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(settle);
      ro.disconnect();
      window.removeEventListener('orientationchange', refresh);
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
      meMarkerRef.current = null;
    };
    // عمداً فقط یک‌بار: مرکز اولیه و کلید بعد از ساخت تغییر نمی‌کنند
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tileRetryKey]);

  // همگام‌سازی مارکرهای کسب‌وکار
  useEffect(() => {
    const map = mapRef.current;
    if (map === null) return;

    const wanted = new Set(records.map((r) => r.business_id));

    for (const [id, marker] of markersRef.current) {
      if (!wanted.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    }

    for (const r of records) {
      const icon = pinIcon(r.category, matchIds.has(r.business_id), selectedId === r.business_id);
      const existing = markersRef.current.get(r.business_id);
      if (existing) {
        existing.setIcon(icon);
        existing.setLatLng([r.location.latitude, r.location.longitude]);
      } else {
        const m = L.marker([r.location.latitude, r.location.longitude], { icon })
          .addTo(map)
          .on('click', () => cbRef.current.onSelect(r.business_id));
        markersRef.current.set(r.business_id, m);
      }
    }
  }, [records, matchIds, selectedId]);

  // نقطه‌ی «من»
  useEffect(() => {
    const map = mapRef.current;
    if (map === null) return;
    if (myPoint === null) {
      meMarkerRef.current?.remove();
      meMarkerRef.current = null;
      return;
    }
    if (meMarkerRef.current) meMarkerRef.current.setLatLng(myPoint);
    else meMarkerRef.current = L.marker(myPoint, { icon: meIcon }).addTo(map);
  }, [myPoint]);

  // پرواز به مورد انتخاب‌شده
  useEffect(() => {
    if (flyTarget !== null) mapRef.current?.flyTo(flyTarget, 16, { duration: 0.8 });
  }, [flyTarget]);

  return <div className="map-layer" ref={hostRef} />;
}
