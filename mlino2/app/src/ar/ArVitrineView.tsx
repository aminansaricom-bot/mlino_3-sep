// ArVitrineView.tsx — UI ویترین مجازی (فاز ۳، بازطراحی‌شده پس از تست میدانی)
// قرارداد سند 01 بخش ۳: طبقه فقط با انتخاب صریح کاربر (هرگز از GPS/حسگر حدس زده نمی‌شود).
// صداقت: شکست دوربین/قطب‌نما پنهان نمی‌شود؛ حالت شبیه‌سازی همیشه برچسب دارد.
//
// چه چیزی در این پاس عوض شد و چرا: ویدئوی تست میدانی مالک محصول دو مشکل واقعی
// را نشان داد — کارت‌های AR روی هم می‌افتادند و ناخوانا بودند، و کسب‌وکاری با
// فاصله‌ی ۲٫۶ کیلومتر روی دوربین ظاهر می‌شد. حالا صحنه از `composeArScene`
// می‌آید (یک کارت اصلی + حداکثر ۵ حباب، بدون هم‌پوشانی، اندازه بر پایه‌ی فاصله)
// و شعاع نمایش AR انتخاب صریح کاربر است با پیش‌فرض ۳۰ متر.

import { useEffect, useMemo, useRef, useState } from 'react';
import { arOverlayService } from './container';
import { cameraErrorMessage, useCameraStream, useDeviceHeading } from './browserSensors';
import {
  AR_DEFAULT_RADIUS,
  AR_RADIUS_OPTIONS,
  composeArScene,
  type ArSceneItem,
  type ArViewResponse,
} from './ArOverlayService';
import { categoryLabel, floorLabel, formatDistance, formatPrice } from '../uiFormat';

interface ArVitrineViewProps {
  /** نقطه‌ی جست‌وجوی فعلی اپ (مشترک با تب دستیار) */
  searchPoint: [number, number];
  searchPointLabel: string;
  /** دسته‌ی موردعلاقه‌ی کاربر از جست‌وجوی اخیر — فقط وزن انتخاب کارت اصلی */
  preferredCategory?: string | null;
  onSelectBusiness: (businessId: string) => void;
}

export default function ArVitrineView({
  searchPoint,
  searchPointLabel,
  preferredCategory = null,
  onSelectBusiness,
}: ArVitrineViewProps) {
  const camera = useCameraStream();
  const heading = useDeviceHeading(camera.state.kind === 'active');

  const [started, setStarted] = useState(false);
  const [manualHeading, setManualHeading] = useState(0);
  const [buildingId, setBuildingId] = useState<string | null>(null);
  const [floorLevel, setFloorLevel] = useState<number | null>(null);
  const [view, setView] = useState<ArViewResponse | null>(null);
  /** شعاع نمایش AR — مستقل از شعاع جست‌وجوی نقشه، پیش‌فرض مصوب ۳۰ متر */
  const [arRadius, setArRadius] = useState<number>(AR_DEFAULT_RADIUS);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [stageWidth, setStageWidth] = useState(0);

  /**
   * عرض واقعی صحنه لازم است چون `screenXPercent` می‌تواند نزدیک لبه باشد و
   * کارتِ عرض‌ثابت از صفحه بیرون بزند — در تست زنده دیده شد (۸۵٪ روی صفحه‌ی
   * ۳۷۵ پیکسلی یعنی نیمی از کارت بیرون از قاب).
   */
  useEffect(() => {
    const el = stageRef.current;
    if (el === null) return;
    const measure = () => setStageWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [started]);

  // ساختمان‌های چندطبقه‌ی اطراف — برای پرسش صریح طبقه
  const nearbyBuildings = useMemo(
    () => arOverlayService.multiFloorBuildingsAround(searchPoint[0], searchPoint[1], arRadius),
    [searchPoint, arRadius],
  );

  // اگر نقطه‌ی جست‌وجو عوض شود، انتخاب ساختمان/طبقه اعتبارش را از دست می‌دهد
  useEffect(() => {
    setBuildingId(null);
    setFloorLevel(null);
  }, [searchPoint]);

  // بازسازی صحنه با هر تغییر جهت/مکان/طبقه/شعاع
  useEffect(() => {
    if (!started || heading.headingDeg === null) {
      setView(null);
      return;
    }
    setView(
      arOverlayService.buildView({
        latitude: searchPoint[0],
        longitude: searchPoint[1],
        radiusMeters: arRadius,
        headingDeg: heading.headingDeg,
        buildingId: buildingId ?? undefined,
        floorLevel: floorLevel ?? undefined,
      }),
    );
  }, [started, heading.headingDeg, searchPoint, arRadius, buildingId, floorLevel]);

  const headingReliable = heading.source === 'compass';

  const scene = useMemo(
    () =>
      view === null ? null : composeArScene(view, arRadius, { preferredCategory, headingReliable }),
    [view, arRadius, preferredCategory, headingReliable],
  );

  if (!started) {
    return (
      <div className="ar-start">
        <div className="section-title">ویترین مجازی (AR)</div>
        <p className="ar-note">
          دوربین را روشن کن و گوشی را به‌سمت مغازه‌ها بگیر؛ ویترین کسب‌وکارهای عضو MLINO روی
          تصویر واقعی نمایش داده می‌شود. نقطه‌ی فعلی: {searchPointLabel} — شعاع نمایش{' '}
          {formatDistance(arRadius)}.
        </p>
        <RadiusPicker value={arRadius} onChange={setArRadius} />
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
      <div className="ar-stage" ref={stageRef}>
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

        {/* حباب‌های فرعی — پیش از کارت اصلی رندر می‌شوند تا آن غالب بماند */}
        {scene?.secondary.map((item) => (
          <ArBubble
            key={item.businessId}
            item={item}
            leftPercent={clampToStage(item.screenXPercent, stageWidth, 130)}
            onSelect={onSelectBusiness}
          />
        ))}

        {/* کارت اصلی — دقیقاً یکی */}
        {scene?.primary && (
          <ArPrimaryCard
            item={scene.primary}
            leftPercent={clampToStage(scene.primary.screenXPercent, stageWidth, 220)}
            onSelect={onSelectBusiness}
          />
        )}

        {scene && scene.overflowCount > 0 && (
          <div className="ar-overflow">
            {scene.overflowCount.toLocaleString('fa-IR')} مورد دیگر در همین جهت — کمی بچرخ یا شعاع
            را کم کن
          </div>
        )}

        {scene === null && (
          <div className="ar-empty">
            {heading.source === 'none'
              ? 'قطب‌نمای این دستگاه در دسترس نیست — با اسلایدر پایین جهت را دستی بچرخان تا ویترین ساخته شود.'
              : 'در حال گرفتن جهت از قطب‌نما…'}
          </div>
        )}

        {scene && scene.primary === null && (
          <div className="ar-empty">
            در این جهت کسب‌وکار مناسبی پیدا نشد — گوشی را بچرخان
            {scene.behindCount > 0 &&
              ` (${scene.behindCount.toLocaleString('fa-IR')} مورد بیرون از میدان دید است)`}
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
          {heading.source === 'compass' && (
            <span className="ar-badge ok">قطب‌نمای واقعی (absolute) فعال</span>
          )}
          {heading.source === 'manual' && <span className="ar-badge warn">جهت دستی (شبیه‌سازی)</span>}
          {(() => {
            const df = scene?.declaredFloor ?? null;
            const db = scene?.declaredBuildingId ?? null;
            const fl = df !== null && db !== null ? floorLabel(df, db) : null;
            return fl !== null ? <span className="ar-badge ok">طبقه‌ی انتخابی تو: {fl}</span> : null;
          })()}
          <span className="ar-badge">شعاع {formatDistance(arRadius)}</span>
          <span className="ar-badge">نقطه: {searchPointLabel}</span>
        </div>
      </div>

      {/* کنترل‌ها */}
      <div className="ar-controls">
        <div className="sp-row">
          <span className="sp-label">شعاع نمایش:</span>
          <RadiusPicker value={arRadius} onChange={setArRadius} />
        </div>

        <div className="sp-row">
          <span className="sp-label">
            {heading.source === 'compass'
              ? 'جهت دستی (اگر قطب‌نما نادرست است):'
              : 'شبیه‌سازی چرخش گوشی:'}
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

/**
 * موقعیت افقی را در محدوده‌ای نگه می‌دارد که کارت کامل داخل قاب بماند. جهت
 * واقعی از خود تصویر دوربین خوانده می‌شود، پس این محدودسازی چیزی را جعل نمی‌کند
 * — فقط جلوی بریده‌شدن کارت روی لبه را می‌گیرد.
 */
function clampToStage(xPercent: number, stageWidth: number, elementWidth: number): number {
  if (stageWidth <= 0) return xPercent;
  const halfPercent = ((elementWidth / 2 + 8) / stageWidth) * 100;
  if (halfPercent >= 50) return 50;
  return Math.min(100 - halfPercent, Math.max(halfPercent, xPercent));
}

/** انتخاب شعاع نمایش — چهار مقدار مصوب، بدون مقدار دلخواه */
function RadiusPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="ar-radius" role="group" aria-label="شعاع نمایش ویترین">
      {AR_RADIUS_OPTIONS.map((r) => (
        <button
          key={r}
          className={value === r ? 'active' : ''}
          onClick={() => onChange(r)}
          aria-pressed={value === r}
        >
          {formatDistance(r)}
        </button>
      ))}
    </div>
  );
}

/**
 * کارت اصلی. موقعیت افقی با ترنزیشن حرکت می‌کند تا با چرخش گوشی نپرد —
 * همان چیزی که در ویدئوی تست میدانی آزاردهنده بود.
 */
function ArPrimaryCard({
  item,
  leftPercent,
  onSelect,
}: {
  item: ArSceneItem;
  leftPercent: number;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      className={`ar-primary${item.activeOffer ? ' has-offer' : ''}`}
      style={{ left: `${leftPercent}%` }}
      onClick={() => onSelect(item.businessId)}
    >
      <span className={`ar-coin ar-coin-${item.category}`} aria-hidden="true">
        {categoryGlyph(item.category)}
      </span>
      {item.activeOffer && (
        <span className="ar-offer-pulse" aria-label="پیشنهاد فعال">
          <i>٪</i><i>✦</i><i>٪</i>
        </span>
      )}
      <span className="ar-primary-copy">
        <span className="ar-primary-name">{item.name}</span>
        <span className="ar-primary-meta">
          {categoryLabel(item.category)} · {formatDistance(item.distanceMeters)}
        </span>
      </span>
      {item.activeOffer && (
        <span className="ar-primary-offer">
          {item.activeOffer.discount_percent !== null
            ? `${item.activeOffer.discount_percent}٪ — `
            : ''}
          {item.activeOffer.title}
        </span>
      )}
      <span className="ar-primary-products">
        {item.activeProducts.slice(0, 2).map((p) => (
          <span key={p.product_id} className="ar-primary-product">
            {p.name}
            {p.price !== null ? ` · ${formatPrice(p.price, p.currency)}` : ''}
          </span>
        ))}
        {item.activeProducts.length === 0 && (
          <span className="ar-primary-product">محصول فعالی ثبت نشده</span>
        )}
      </span>
      <span className="ar-primary-cta">جزئیات</span>
    </button>
  );
}

/** حباب فرعی — کوچک، فقط نام و فاصله؛ اندازه‌اش از فاصله می‌آید */
function ArBubble({
  item,
  leftPercent,
  onSelect,
}: {
  item: ArSceneItem;
  leftPercent: number;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      className={`ar-bubble ar-lane-${item.laneIndex}`}
      style={{
        left: `${leftPercent}%`,
        transform: `translateX(-50%) scale(${item.sizeScale})`,
      }}
      onClick={() => onSelect(item.businessId)}
      title={`${item.name} — ${formatDistance(item.distanceMeters)}`}
    >
      <span className={`ar-bubble-coin ar-coin-${item.category}`} aria-hidden="true">
        {categoryGlyph(item.category)}
      </span>
      <span className="ar-bubble-name">{item.name}</span>
      <span className="ar-bubble-dist">{formatDistance(item.distanceMeters)}</span>
      {item.activeOffer && <span className="ar-bubble-dot" aria-label="پیشنهاد فعال" />}
    </button>
  );
}

function categoryGlyph(category: string): string {
  const glyphs: Record<string, string> = {
    dental_clinic: '✚',
    beauty_clinic: '✦',
    cafe: '☕',
    restaurant: '⌁',
    retail_shop: '◇',
  };
  return glyphs[category] ?? '•';
}
