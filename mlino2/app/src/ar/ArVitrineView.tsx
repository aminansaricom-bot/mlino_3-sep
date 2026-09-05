// ArVitrineView.tsx — UI ویترین مجازی (فاز ۳)
// قرارداد سند 01 بخش ۳: طبقه فقط با انتخاب صریح کاربر (هرگز از GPS/حسگر حدس زده نمی‌شود).
// صداقت: شکست دوربین/قطب‌نما پنهان نمی‌شود؛ حالت شبیه‌سازی همیشه برچسب دارد.

import { useEffect, useMemo, useState } from 'react';
import { arOverlayService } from './container';
import { cameraErrorMessage, useCameraStream, useDeviceHeading } from './browserSensors';
import type { ArViewResponse } from './ArOverlayService';
import { categoryLabel, floorLabel, formatDistance, formatPrice } from '../uiFormat';

function categoryLabelLocal(cat: string): string {
  return categoryLabel(cat);
}

interface ArVitrineViewProps {
  /** نقطه‌ی جست‌وجوی فعلی اپ (مشترک با تب دستیار) */
  searchPoint: [number, number];
  searchPointLabel: string;
  radiusMeters: number;
  onSelectBusiness: (businessId: string) => void;
}

export default function ArVitrineView({
  searchPoint,
  searchPointLabel,
  radiusMeters,
  onSelectBusiness,
}: ArVitrineViewProps) {
  const camera = useCameraStream();
  const heading = useDeviceHeading(camera.state.kind === 'active');

  const [started, setStarted] = useState(false);
  const [manualHeading, setManualHeading] = useState(0);
  const [buildingId, setBuildingId] = useState<string | null>(null);
  const [floorLevel, setFloorLevel] = useState<number | null>(null);
  const [view, setView] = useState<ArViewResponse | null>(null);

  // ساختمان‌های چندطبقه‌ی اطراف — برای پرسش صریح طبقه
  const nearbyBuildings = useMemo(
    () => arOverlayService.multiFloorBuildingsAround(searchPoint[0], searchPoint[1], radiusMeters),
    [searchPoint, radiusMeters],
  );

  // اگر نقطه‌ی جست‌وجو عوض شود، انتخاب ساختمان/طبقه اعتبارش را از دست می‌دهد
  useEffect(() => {
    setBuildingId(null);
    setFloorLevel(null);
  }, [searchPoint]);

  // بازسازی صحنه با هر تغییر جهت/مکان/طبقه
  useEffect(() => {
    if (!started || heading.headingDeg === null) {
      setView(null);
      return;
    }
    setView(
      arOverlayService.buildView({
        latitude: searchPoint[0],
        longitude: searchPoint[1],
        radiusMeters,
        headingDeg: heading.headingDeg,
        buildingId: buildingId ?? undefined,
        floorLevel: floorLevel ?? undefined,
      }),
    );
  }, [started, heading.headingDeg, searchPoint, radiusMeters, buildingId, floorLevel]);

  if (!started) {
    return (
      <div className="ar-start">
        <div className="section-title">ویترین مجازی (AR)</div>
        <p className="ar-note">
          دوربین را روشن کن و گوشی را به‌سمت مغازه‌ها بگیر؛ ویترین کسب‌وکارهای عضو MLINO روی
          تصویر واقعی نمایش داده می‌شود. نقطه‌ی فعلی: {searchPointLabel} — شعاع{' '}
          {formatDistance(radiusMeters)}.
        </p>
        {nearbyBuildings.length > 0 && (
          <p className="ar-note">
            مکان‌های چندطبقه‌ی نزدیک شناسایی شدند — هنگام ورود، طبقه از تو پرسیده می‌شود (طبقه
            هرگز از GPS حدس زده نمی‌شود).
          </p>
        )}
        <button
          className="ar-start-btn"
          onClick={() => {
            setStarted(true);
            heading.request();
            void camera.start();
          }}
        >
          شروع ویترین AR
        </button>
      </div>
    );
  }

  const simulatedCamera = camera.state.kind !== 'active';

  return (
    <div className="ar-root">
      <div className="ar-stage">
        {/* تصویر واقعی دوربین — یا پس‌زمینه‌ی شبیه‌سازی */}
        <video
          ref={camera.videoRef}
          className="ar-video"
          playsInline
          muted
          autoPlay
          style={{ display: camera.state.kind === 'active' ? 'block' : 'none' }}
        />
        {simulatedCamera && <div className="ar-video ar-video-sim" aria-hidden />}

        {/* ویترین‌های Overlay */}
        {view?.items.map((item) => (
          <button
            key={item.businessId}
            className={`ar-vitrine ar-scale-${item.placement.scaleBucket}`}
            style={{ left: `${item.placement.screenXPercent}%` }}
            onClick={() => onSelectBusiness(item.businessId)}
          >
            <span className="ar-vitrine-name">{item.name}</span>
            <span className="ar-vitrine-meta">
              {categoryLabelLocal(item.category)} · {formatDistance(item.distanceMeters)}
              {item.placement.scaleBucket === 'near' ? '' : ''}
            </span>
            {item.activeOffer && (
              <span className="ar-vitrine-offer">
                {item.activeOffer.discount_percent !== null
                  ? `${item.activeOffer.discount_percent}٪ — `
                  : ''}
                {item.activeOffer.title}
              </span>
            )}
            <span className="ar-vitrine-products">
              {item.activeProducts.slice(0, 2).map((p) => (
                <span key={p.product_id} className="ar-vitrine-product">
                  {p.name}
                  {p.price !== null ? ` · ${formatPrice(p.price, p.currency)}` : ''}
                </span>
              ))}
              {item.activeProducts.length === 0 && (
                <span className="ar-vitrine-product">محصول فعالی ثبت نشده</span>
              )}
            </span>
          </button>
        ))}

        {view && view.items.length === 0 && (
          <div className="ar-empty">
            ویترینی در میدان دید نیست — گوشی را بچرخان
            {view.behindCount > 0 && ` (${view.behindCount.toLocaleString('fa-IR')} مورد پشت سرت است)`}
          </div>
        )}

        {/* نوار وضعیت صادقانه */}
        <div className="ar-status">
          {cameraErrorMessage(camera.state) && (
            <span className="ar-badge warn">{cameraErrorMessage(camera.state)}</span>
          )}
          {heading.source === 'notAbsolute' && (
            <span className="ar-badge warn">
              قطب‌نمای دستگاه مرجع شمال ندارد (رویداد غیر-absolute) — جهت دستی زیر را بچرخان
            </span>
          )}
          {heading.source === 'none' && (
            <span className="ar-badge warn">قطب‌نما در دسترس نیست — اسلایدر زیر را بچرخان</span>
          )}
          {heading.source === 'compass' && <span className="ar-badge ok">قطب‌نمای واقعی (absolute) فعال</span>}
          {heading.source === 'manual' && <span className="ar-badge warn">جهت دستی (شبیه‌سازی)</span>}
          {(() => {
            const df = view?.declaredFloor ?? null;
            const db = view?.declaredBuildingId ?? null;
            const fl = df !== null && db !== null ? floorLabel(df, db) : null;
            return fl !== null ? <span className="ar-badge ok">طبقه‌ی انتخابی تو: {fl}</span> : null;
          })()}
          <span className="ar-badge">نقطه: {searchPointLabel}</span>
        </div>
      </div>

      {/* کنترل‌ها */}
      <div className="ar-controls">
        <div className="sp-row">
          <span className="sp-label">
            {heading.source === 'compass' ? 'جهت دستی (اگر قطب‌نما نادرست است):' : 'شبیه‌سازی چرخش گوشی:'}
          </span>
          <input
            type="range"
            min={0}
            max={359}
            value={manualHeading}
            onChange={(e) => {
              const v = Number(e.target.value);
              setManualHeading(v);
              heading.setSimulatedHeading(v);
            }}
          />
          <span className="sp-label">{manualHeading}°</span>
        </div>

        {nearbyBuildings.length > 0 && (
          <div className="sp-row ar-floor-row">
            <span className="sp-label">مکان چندطبقه — طبقه‌ی تو کدام است؟</span>
            {nearbyBuildings.flatMap((b) =>
              b.floors.map((f) => (
                <button
                  key={`${b.buildingId}_${f}`}
                  className={floorLevel === f && buildingId === b.buildingId ? 'active' : ''}
                  onClick={() => {
                    setBuildingId(b.buildingId);
                    setFloorLevel(f);
                  }}
                >
                  {floorLabel(f, b.buildingId)}
                </button>
              )),
            )}
            {(buildingId !== null || floorLevel !== null) && (
              <button
                onClick={() => {
                  setBuildingId(null);
                  setFloorLevel(null);
                }}
              >
                خارج از ساختمان
              </button>
            )}
          </div>
        )}

        <div className="sp-row">
          <button
            onClick={() => {
              camera.stop();
              setStarted(false);
            }}
          >
            پایان AR
          </button>
        </div>
      </div>
    </div>
  );
}
