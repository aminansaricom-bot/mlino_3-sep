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
  composeArScene,
  type ArSceneItem,
  type ArViewResponse,
  buildPublicArView,
} from './ArOverlayService';
import { categoryLabel, floorLabel, formatDistance, formatPrice } from '../uiFormat';
import type { PublicUiRecord } from '../publicExport/uiAdapter';
import type { CatalogItem, CatalogRecord } from '../publicExport/catalog';
import CatalogArStack from '../publicExport/catalogArStack';
import ArGlassCard from './ArGlassCard';
import ArBubbles from './ArBubbles';
import RadiusDial, { clampRadius } from './RadiusDial';

type VitrineMode = 'cards' | 'bubbles';
const MODE_KEY = 'mlino.vitrine.mode';
function initialMode(): VitrineMode {
  try { return window.localStorage.getItem(MODE_KEY) === 'bubbles' ? 'bubbles' : 'cards'; } catch { return 'cards'; }
}

interface ArVitrineViewProps {
  /** نقطه‌ی جست‌وجوی فعلی اپ (مشترک با تب دستیار) */
  searchPoint: [number, number];
  searchPointLabel: string;
  /** دسته‌ی موردعلاقه‌ی کاربر از جست‌وجوی اخیر — فقط وزن انتخاب کارت اصلی */
  preferredCategory?: string | null;
  onSelectBusiness: (businessId: string) => void;
  /** وقتی تعریف شود، AR فقط از snapshot واقعی پذیرفته‌شده تغذیه می‌شود. */
  records?: readonly PublicUiRecord[];
  catalogByOrg?: ReadonlyMap<string, CatalogRecord>;
  now?: number;
  /** هنوز موقعیت زندهٔ گوشی نرسیده است — نتیجهٔ ویترین را گمراه‌کننده نشان نده */
  locationPending?: boolean;
  /** شعاع آغازین؛ در حالت نمایشی ۱۰۰ متر تا کل دستهٔ نمایشی دیده شود */
  initialRadius?: number;
  /** باز کردن صفحه‌ی محصول از پشته‌ی کاتالوگ روی دوربین */
  onOpenItem?: (organizationId: string, item: CatalogItem) => void;
}

export default function ArVitrineView({
  searchPoint,
  preferredCategory = null,
  onSelectBusiness,
  records,
  catalogByOrg,
  now,
  locationPending = false,
  initialRadius,
  onOpenItem,
}: ArVitrineViewProps) {
  const camera = useCameraStream();
  const heading = useDeviceHeading(camera.state.kind === 'active');

  // صفحه‌ی آغاز حذف شد: ویترین با باز شدن مستقیم دوربین را روشن می‌کند.
  const started = true;
  const [mode, setMode] = useState<VitrineMode>(initialMode);
  const chooseMode = (next: VitrineMode) => { setMode(next); try { window.localStorage.setItem(MODE_KEY, next); } catch { /* optional */ } };
  const canAskCompass = typeof (globalThis.DeviceOrientationEvent as unknown as { requestPermission?: unknown } | undefined)?.requestPermission === 'function';
  const [manualHeading, setManualHeading] = useState(0);
  const [buildingId, setBuildingId] = useState<string | null>(null);
  const [floorLevel, setFloorLevel] = useState<number | null>(null);
  const [view, setView] = useState<ArViewResponse | null>(null);
  /** شعاع نمایش AR — مستقل از شعاع جست‌وجوی نقشه، پیش‌فرض مصوب ۳۰ متر */
  const [arRadius, setArRadius] = useState<number>(clampRadius(initialRadius ?? AR_DEFAULT_RADIUS));

  useEffect(() => {
    heading.request();
    void camera.start();
    // فقط یک بار هنگام باز شدن ویترین
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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
    () => records ? [] : arOverlayService.multiFloorBuildingsAround(searchPoint[0], searchPoint[1], arRadius),
    [searchPoint, arRadius, records],
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
    const query = {
        latitude: searchPoint[0],
        longitude: searchPoint[1],
        radiusMeters: arRadius,
        headingDeg: heading.headingDeg,
        buildingId: buildingId ?? undefined,
        floorLevel: floorLevel ?? undefined,
      };
    setView(records ? buildPublicArView(records, query, now ?? 0) : arOverlayService.buildView(query));
  }, [started, heading.headingDeg, searchPoint, arRadius, buildingId, floorLevel, records, now]);

  const headingReliable = heading.source === 'compass';

  const scene = useMemo(
    () =>
      view === null ? null : composeArScene(view, arRadius, { preferredCategory, headingReliable }),
    [view, arRadius, preferredCategory, headingReliable],
  );

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

        {mode === 'bubbles' && view && <ArBubbles items={view.items} radiusMeters={arRadius} catalogByOrg={catalogByOrg} onSelect={onSelectBusiness} />}

        {/* حباب‌های فرعی — پیش از کارت اصلی رندر می‌شوند تا آن غالب بماند */}
        {mode === 'cards' && scene?.secondary.map((item) => (
          <ArBubble
            key={item.businessId}
            item={item}
            leftPercent={clampToStage(item.screenXPercent, stageWidth, 130)}
            onSelect={onSelectBusiness}
          />
        ))}

        {/* کارت اصلی — دقیقاً یکی */}
        {mode === 'cards' && scene?.primary && records && (
          <ArGlassCard
            item={scene.primary}
            record={records.find((record) => record.id === scene.primary!.businessId)}
            now={now ?? Date.now()}
            leftPercent={clampToStage(scene.primary.screenXPercent, stageWidth, 272)}
            glyph={categoryGlyph(scene.primary.category)}
            onSelect={onSelectBusiness}
          />
        )}
        {scene?.primary && !records && (
          <ArPrimaryCard
            item={scene.primary}
            leftPercent={clampToStage(scene.primary.screenXPercent, stageWidth, 220)}
            onSelect={onSelectBusiness}
          />
        )}

        {mode === 'cards' && scene?.primary && catalogByOrg && <CatalogArStack record={catalogByOrg.get(scene.primary.businessId)}
          onOpenItem={onOpenItem ? (item) => onOpenItem(scene.primary!.businessId, item) : undefined} />}

        {mode === 'cards' && scene && scene.overflowCount > 0 && (
          <div className="ar-overflow">
            {scene.overflowCount.toLocaleString('fa-IR')} مورد دیگر در همین جهت — کمی بچرخ یا شعاع
            را کم کن
          </div>
        )}

        {locationPending && (
          <div className="ar-empty">در حال گرفتن موقعیت گوشی… اگر اجازهٔ موقعیت خواسته شد، «اجازه» را بزن.</div>
        )}

        {!locationPending && scene === null && (
          <div className="ar-empty">
            {heading.source === 'none'
              ? 'گوشی جهت را نمی‌دهد؛ نوار پایین را بچرخان تا کسب‌وکارهای آن سمت را ببینی.'
              : 'در حال گرفتن جهت از قطب‌نما…'}
          </div>
        )}

        {!locationPending && scene && (mode === 'cards' ? scene.primary === null : (view?.items.length ?? 0) === 0) && (
          <div className="ar-empty">
            در این جهت کسب‌وکار مناسبی پیدا نشد — گوشی را بچرخان
            {scene.behindCount > 0 &&
              ` (${scene.behindCount.toLocaleString('fa-IR')} مورد بیرون از میدان دید است)`}
          </div>
        )}

        {/* انتخاب نما: کارت بزرگ یا حباب‌های سه‌بعدی */}
        <div className="ar-mode" role="group" aria-label="نوع نمایش ویترین">
          <button type="button" className={mode === 'cards' ? 'on' : ''} aria-pressed={mode === 'cards'} onClick={() => chooseMode('cards')}>کارت</button>
          <button type="button" className={mode === 'bubbles' ? 'on' : ''} aria-pressed={mode === 'bubbles'} onClick={() => chooseMode('bubbles')}>حباب</button>
        </div>

        <RadiusDial value={arRadius} onChange={setArRadius} />

        {/* نوار وضعیت صادقانه */}
        <div className="ar-status">
          {canAskCompass && heading.source === 'none' && (
            <button type="button" className="ar-badge action" onClick={() => heading.request()}>روشن کردن جهت‌یاب گوشی</button>
          )}
          {cameraErrorMessage(camera.state) && (
            <span className="ar-badge warn">{cameraErrorMessage(camera.state)}</span>
          )}
          {heading.source === 'notAbsolute' && (
            <span className="ar-badge warn">جهت را با نوار پایین تنظیم کن</span>
          )}
          {heading.source === 'none' && (
            <span className="ar-badge warn">جهت را با نوار پایین تنظیم کن</span>
          )}

          {(() => {
            const df = scene?.declaredFloor ?? null;
            const db = scene?.declaredBuildingId ?? null;
            const fl = df !== null && db !== null ? floorLabel(df, db) : null;
            return fl !== null ? <span className="ar-badge ok">طبقه‌ی انتخابی تو: {fl}</span> : null;
          })()}

        </div>
      </div>

      {/* کنترل‌ها */}
      <div className="ar-controls">
        {/* وقتی قطب‌نمای واقعی کار می‌کند، اسلایدر جهت دستی فقط شلوغی است؛ فقط در نبود قطب‌نما دیده می‌شود */}
        {heading.source !== 'compass' && <div className="sp-row">
          <span className="sp-label">جهت:</span>
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
        </div>}

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
          {categoryLabel(item.category)}{item.categoryGuessed ? ' · حدسی' : ''} · {formatDistance(item.distanceMeters)}
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
        {item.activeCapabilities?.slice(0, 2).map((capability) => (
          <span key={capability.capability_id} className="ar-primary-product">{capability.name}</span>
        ))}
        {item.activeCapabilities === undefined && item.activeProducts.slice(0, 2).map((p) => (
          <span key={p.product_id} className="ar-primary-product">
            {p.name}
            {p.price !== null ? ` · ${formatPrice(p.price, p.currency)}` : ''}
          </span>
        ))}
        {item.activeCapabilities === undefined && item.activeProducts.length === 0 && (
          <span className="ar-primary-product">محصول فعالی ثبت نشده</span>
        )}
        {item.activeCapabilities !== undefined && item.activeCapabilities.length === 0 && (
          <span className="ar-primary-product">خدمت منتشرشده‌ای ثبت نشده</span>
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
      <span className="ar-bubble-name">{item.name.replace('(آزمایشی)', '').trim()}</span>
      <span className="ar-bubble-dist">{formatDistance(item.distanceMeters)}</span>
      {item.activeOffer && <span className="ar-bubble-dot" aria-hidden="true" />}
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
