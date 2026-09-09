import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { directoryService } from './directory/BusinessDirectoryService';
import { loadMockSnapshotRaw } from './directory/loader';
import type { V2BusinessCategory, V2BusinessDirectoryRecord } from './directory/contract';
import { extractRadiusMeters } from './matching/IntentParser';
import { matchingService } from './matching/container';
import { buildIntentResolver } from './matching/llm/factory';
import type { MatchItem } from './matching/MatchingService';
import ArVitrineView from './ar/ArVitrineView';
import { haversineDistanceMeters } from './directory/geo';
import MapView, { type TileStatus } from './components/MapView';
import BottomSheet, { type SheetState } from './components/BottomSheet';
import BusinessCard from './components/BusinessCard';
import SettingsPanel from './components/SettingsPanel';
import { categoryLabel, floorFilterLabel, floorLabel, formatDistance, formatIso, formatPrice } from './uiFormat';
import { Icon, CategoryCoin } from './design/Icon';
import ExperiencePanel from './experience/ExperiencePanel';
import { feedback, useLocalExperience } from './experience/useLocalExperience';
import { isOfferActiveAt, offerStatus } from './offers';
import { pickSuggestion, type SuggestionResult } from './experience/pickSuggestion';
import ShareBusinessAction from './experience/ShareBusinessAction';

const TEHRAN_CENTER: [number, number] = [35.775, 51.425];

/**
 * دلیل انتخاب یک نتیجه — فقط از شواهدی که خودِ `MatchingService` برگردانده
 * ساخته می‌شود: محصول منطبق، آفر منطبق، و فاصله. هیچ چیزی اینجا تولید یا حدس
 * زده نمی‌شود؛ اگر شاهدی نبود، جمله‌ی مبهم هم ساخته نمی‌شود.
 */
function matchReason(item: MatchItem, interpretedCategory: string | null, now: number): string {
  const parts: string[] = [];
  if (interpretedCategory !== null && item.record.category === interpretedCategory) {
    parts.push(`دسته‌ی مطابق: ${categoryLabel(interpretedCategory)}`);
  }
  if (item.matchedProducts.length > 0) {
    parts.push(`محصول منطبق: ${item.matchedProducts.map((p) => p.name).join('، ')}`);
  }
  if (item.matchedOffer !== null && item.record.offers.some(o => o.offer_id === item.matchedOffer?.offer_id && isOfferActiveAt(o.valid_from, o.valid_until, now))) {
    parts.push(
      item.matchedOffer.discount_percent !== null
        ? `پیشنهاد فعال ${item.matchedOffer.discount_percent.toLocaleString('fa-IR')}٪`
        : 'پیشنهاد فعال',
    );
  }
  parts.push(`فاصله ${formatDistance(item.distanceMeters)}`);
  return parts.join(' · ');
}

const CATEGORY_GLYPH: Record<string, string> = {
  dental_clinic: '🦷',
  beauty_clinic: '💠',
  cafe: '☕',
  restaurant: '🍽',
  retail_shop: '🛍',
};

const FILTER_CATEGORIES: V2BusinessCategory[] = [
  'restaurant',
  'cafe',
  'beauty_clinic',
  'dental_clinic',
  'retail_shop',
];

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  items?: MatchItem[];
  understood?: string;
  /** دسته‌ای که موتور فهم نیت تشخیص داد — برای نمایش دلیل هر نتیجه */
  interpretedCategory?: V2BusinessCategory | null;
}

type Overlay = 'none' | 'assistant' | 'vitrine' | 'settings' | 'detail' | 'experience';

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [records, setRecords] = useState<V2BusinessDirectoryRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [floorFilter, setFloorFilter] = useState<number | 'all'>('all');
  const [categoryChip, setCategoryChip] = useState<V2BusinessCategory | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  // Refresh at offer boundaries, rather than polling or freezing at app startup.
  useEffect(() => {
    const current = Date.now();
    const boundaries = records.flatMap(r => r.offers.flatMap(o => [Date.parse(o.valid_from), o.valid_until === null ? NaN : Date.parse(o.valid_until) + 1]));
    const next = Math.min(...boundaries.filter(t => Number.isFinite(t) && t > now));
    const timer = Number.isFinite(next) ? window.setTimeout(() => setNow(Date.now()), Math.min(2147483647, Math.max(0, next - current))) : undefined;
    const refresh = () => { if (!document.hidden) setNow(Date.now()); };
    document.addEventListener('visibilitychange', refresh);
    return () => { window.clearTimeout(timer); document.removeEventListener('visibilitychange', refresh); };
  }, [records, now]);
  const experience = useLocalExperience();

  const [overlay, setOverlay] = useState<Overlay>('none');
  const [sheet, setSheet] = useState<SheetState>('peek');

  const [searchPoint, setSearchPoint] = useState<[number, number]>(TEHRAN_CENTER);
  const [searchPointLabel, setSearchPointLabel] = useState<string>('مرکز تهران (پیش‌فرض)');
  const [myPoint, setMyPoint] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [radiusMeters, setRadiusMeters] = useState(5000);
  const [suggestionResult, setSuggestionResult] = useState<SuggestionResult | null>(null);
  const [pointHint, setPointHint] = useState(false);
  const filtersApplied = categoryChip !== null || floorFilter !== 'all';
  useEffect(() => { setSuggestionResult(null); }, [radiusMeters, searchPoint, categoryChip, floorFilter, experience.data.hidden]);

  const [tileStatus, setTileStatus] = useState<TileStatus>('loading');
  /** دقت واقعی GPS بر حسب متر — وقتی بد است پنهانش نمی‌کنیم */
  const [accuracyMeters, setAccuracyMeters] = useState<number | null>(null);
  const [locError, setLocError] = useState<string | null>(null);
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );

  // وضعیت آفلاین — اپ با داده‌ی محلی کار می‌کند ولی نقشه نه؛ این را می‌گوییم
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  const availableFloors = useMemo(() => {
    const floors = new Set<number>();
    for (const record of records) {
      if (record.location.building_id !== null && record.location.floor_level !== null) {
        floors.add(record.location.floor_level);
      }
    }
    return [...floors].sort((a, b) => a - b);
  }, [records]);
  const [tileRetryKey, setTileRetryKey] = useState(0);
  const mapRef = useRef<L.Map | null>(null);

  const [chat, setChat] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      text: 'سلام! دنبال چی می‌گردی؟ مثلاً بنویس: «دنبال جرم‌گیری دندان می‌گردم» یا «کاپوچینو خوب نزدیک اینجا».',
    },
  ]);
  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const [sendBusy, setSendBusy] = useState(false);
  /**
   * آخرین جست‌وجو نتیجه‌ای نداشت.
   *
   * بدون این، Sheet بی‌صدا به حالت «اطراف شما» برمی‌گشت و ۱۰ کسب‌وکار نامرتبط
   * نشان می‌داد — درست بعد از جست‌وجویی که چیزی پیدا نکرده بود. حتی با برچسب
   * درست، آن انتقال دقیقاً همان سردرگمی‌ای را می‌سازد که تصمیم مالک محصول
   * («هرگز کارت بی‌ربط») می‌خواست از بین ببرد. این در تست زنده دیده شد.
   */
  const [searchWasEmpty, setSearchWasEmpty] = useState(false);

  // مسیریابی نیت از env (کلید فقط env؛ بدون کلید → قاعده‌محور Edge-first)
  const { resolver: intentResolver, info: resolverInfo } = useMemo(() => {
    const { resolver, buildInfo } = buildIntentResolver(import.meta.env.V2_PLAN_ID ?? null);
    const info =
      buildInfo.reason === 'plan' && buildInfo.engine !== 'rule-based'
        ? `LLM فعال (${buildInfo.engine}${buildInfo.model ? ` · ${buildInfo.model}` : ''} · پلن آزمایشی ${buildInfo.planId})`
        : buildInfo.reason === 'no-key'
          ? 'پلن LLM تعیین شده ولی کلید API در env نیست — قاعده‌محور روی دستگاه'
          : buildInfo.reason === 'unknown-plan'
            ? 'پلن اعلامی شناخته نشد — پلن پایه (قاعده‌محور)'
            : 'قاعده‌محور روی دستگاه (Edge-first)';
    return { resolver, info };
  }, []);

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
    if (overlay === 'assistant') chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat, overlay]);

  /** فیلتر طبقه (رفتار موجود، دست‌نخورده) + فیلتر چیپ دسته (فقط نمایشی) */
  const visibleRecords = useMemo(() => {
    let out = records;
    if (floorFilter !== 'all') {
      out = out.filter(
        (r) => r.location.floor_level === floorFilter && r.location.building_id !== null,
      );
    }
    if (categoryChip !== null) {
      out = out.filter((r) => r.category === categoryChip);
    }
    return out.filter((r) => !experience.data.hidden.includes(r.business_id));
  }, [records, floorFilter, categoryChip, experience.data.hidden]);

  const selected = useMemo(
    () => (selectedId === null ? null : directoryService.getById(selectedId)),
    [selectedId],
  );

  const flyTarget = useMemo<[number, number] | null>(
    () => (selected ? [selected.location.latitude, selected.location.longitude] : null),
    [selected],
  );

  /** آخرین نتیجه‌های دستیار — روی نقشه با هاله‌ی طلایی */
  const lastAssistant = useMemo(
    () => [...chat].reverse().find((m) => m.role === 'assistant' && m.items),
    [chat],
  );
  const lastMatch = useMemo(() => lastAssistant?.items ?? [], [lastAssistant]);
  const lastCategory = lastAssistant?.interpretedCategory ?? null;

  const lastMatchIds = useMemo(
    () => new Set(lastMatch.map((i) => i.record.business_id)),
    [lastMatch],
  );

  /** فهرست Bottom Sheet: اگر جست‌وجویی شده، نتیجه‌ها؛ وگرنه همه‌ی اطراف */
  const sheetItems = useMemo(() => {
    if (lastMatch.length > 0) {
      return lastMatch.map((m) => ({
        record: m.record,
        distanceMeters: m.distanceMeters as number | undefined,
        hasOffer: Boolean(m.matchedOffer),
        reason: matchReason(m, lastCategory, now) as string | undefined,
      }));
    }
    return visibleRecords.map((r) => ({
      record: r,
      distanceMeters: undefined as number | undefined,
      hasOffer: r.offers.some(o => isOfferActiveAt(o.valid_from, o.valid_until, now)),
      // مرور اطراف جست‌وجو نیست — دلیلی هم برای نمایش وجود ندارد
      reason: undefined as string | undefined,
    }));
  }, [lastMatch, visibleRecords, lastCategory, now]);

  const openDetail = useCallback((id: string) => {
    setSelectedId(id);
    experience.viewed(id);
    setOverlay('detail');
  }, [experience]);

  function findSuggestion(radius = radiusMeters) {
    const current = Date.now();
    setNow(current);
    const result = pickSuggestion(visibleRecords, searchPoint, radius, current, filtersApplied);
    setSuggestionResult(result);
    if ('businessId' in result) openDetail(result.businessId);
  }

  function runSearch(text: string) {
    const q = text.trim();
    if (q.length === 0 || sendBusy) return;
    setInput('');
    setSendBusy(true);

    void (async () => {
      try {
        // Edge-first: resolver از factory — قاعده‌محور پیش‌فرض؛ LLM فقط طبق config/کلید
        const resolution = await intentResolver.resolve(q);

        const radius = extractRadiusMeters(q) ?? radiusMeters;
        const res = matchingService.match(resolution, {
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
        // الزام ۲ دستور LLM: مسیر نتیجه همیشه مشخص باشد
        understoodParts.push(
          resolution.source === 'llm'
            ? `موتور: LLM (${resolution.engineModel})`
            : resolution.fellBackToRule
              ? `موتور: قاعده‌محور (fallback از LLM)`
              : 'موتور: قاعده‌محور روی دستگاه',
        );

        const top = res.items.slice(0, 4);
        let reply: string;
        if (top.length === 0) {
          // تصمیم مالک: هرگز کارت بی‌ربط — صادقانه «چیزی پیدا نشد» + راهنمای جایگزین
          reply =
            'چیزی پیدا نشد. می‌توانی شعاع را بیشتر کنی، مکان را عوض کنی، یا نیازت را با کلمات دیگری بنویسی (مثلاً «کافه»، «جرم‌گیری دندان»، «پیتزا»).';
        } else {
          const names = top
            .map((i) => `${i.record.name} (${formatDistance(i.distanceMeters)})`)
            .join('، ');
          reply = `${top.length === 1 ? 'یک گزینه' : `${top.length.toLocaleString('fa-IR')} گزینه`} پیدا کردم: ${names}. نتیجه‌ها روی نقشه با نشان طلایی مشخص‌اند.`;
        }

        setChat((prev) => [
          ...prev,
          { role: 'user', text: q },
          {
            role: 'assistant',
            text: reply,
            items: top,
            understood: understoodParts.join(' · '),
            interpretedCategory: res.interpreted.category,
          },
        ]);
        setSearchWasEmpty(top.length === 0);
        setSheet('half');
      } finally {
        setSendBusy(false);
      }
    })();
  }

  /**
   * موقعیت‌یابی با پیام صادقانه به‌ازای هر علت شکست. مرورگر سه علت متفاوت
   * برمی‌گرداند و «دسترسی رد شد» برای هر سه، دروغ است: کاربری که GPS‌اش خاموش
   * است باید GPS را روشن کند، نه دنبال تنظیمات مجوز بگردد.
   */
  function useMyLocation() {
    if (!('geolocation' in navigator)) {
      setLocError('مرورگر این دستگاه اصلاً از موقعیت‌یابی پشتیبانی نمی‌کند — روی نقشه دابل‌کلیک کن.');
      setSearchPointLabel('موقعیت‌یابی پشتیبانی نمی‌شود');
      return;
    }
    setLocating(true);
    setLocError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setSearchPoint(p);
        setMyPoint(p);
        setAccuracyMeters(
          Number.isFinite(pos.coords.accuracy) ? Math.round(pos.coords.accuracy) : null,
        );
        setSearchPointLabel('موقعیت من');
        mapRef.current?.flyTo(p, 15, { duration: 0.8 });
        setLocating(false);
      },
      (err) => {
        setAccuracyMeters(null);
        setLocError(
          err.code === err.PERMISSION_DENIED
            ? 'دسترسی به موقعیت رد شد. برای استفاده از AR و «اطراف من» باید از تنظیمات مرورگر اجازه بدهی — یا فعلاً روی نقشه دابل‌کلیک کن.'
            : err.code === err.POSITION_UNAVAILABLE
              ? 'موقعیت در دسترس نیست — احتمالاً GPS خاموش است یا سیگنال نمی‌رسد. GPS را روشن کن یا روی نقشه دابل‌کلیک کن.'
              : 'موقعیت‌یابی طول کشید و به نتیجه نرسید. دوباره تلاش کن یا روی نقشه دابل‌کلیک کن.',
        );
        setSearchPointLabel('موقعیت نامشخص');
        setLocating(false);
      },
      { timeout: 8000, enableHighAccuracy: true },
    );
  }

  if (!loaded) {
    return (
      <div className="boot">
        <div>
          <div className="spinner" />
          در حال آماده‌سازی…
        </div>
      </div>
    );
  }

  const sheetTitle = searchWasEmpty
    ? 'نتیجه‌ای پیدا نشد'
    : lastMatch.length > 0
      ? 'نتیجه‌های جست‌وجو'
      : categoryChip
        ? categoryLabel(categoryChip)
        : 'اطراف شما';
  const sheetSub = searchWasEmpty ? '' : `${sheetItems.length.toLocaleString('fa-IR')} مورد`;

  return (
    <div className="app-shell">
      <MapView
        records={visibleRecords}
        matchIds={lastMatchIds}
        selectedId={selectedId}
        center={TEHRAN_CENTER}
        myPoint={myPoint}
        flyTarget={flyTarget}
        tileRetryKey={tileRetryKey}
        onSelect={openDetail}
        onPickPoint={(lat, lng) => {
          setSearchPoint([lat, lng]);
          setSearchPointLabel('نقطه‌ی انتخابی روی نقشه');
          setPointHint(false);
        }}
        onMapReady={(m) => {
          mapRef.current = m;
        }}
        onTileStatus={setTileStatus}
      />

      {tileStatus === 'error' && (
        <div className="map-state" role="alert">
          <h4>نقشه بارگذاری نشد</h4>
          <p>
            کاشی‌های نقشه از سرور دریافت نشدند. اتصال اینترنت را بررسی کن — جست‌وجو
            و فهرست کسب‌وکارها بدون نقشه هم کار می‌کنند.
          </p>
          <button onClick={() => setTileRetryKey((k) => k + 1)}>تلاش دوباره</button>
        </div>
      )}

      {pointHint && <div className="app-banner" role="status">برای تغییر نقطهٔ جست‌وجو، روی نقشه دوبار بزن؛ سپس از «فضای من» دوباره پیشنهاد بخواه.<button className="banner-x" onClick={() => setPointHint(false)} aria-label="بستن راهنمای نقطه">✕</button></div>}

      {!online && (
        <div className="app-banner warn" role="status">
          آفلاین هستی — نقشه به‌روز نمی‌شود. جست‌وجو و فهرست کسب‌وکارها از داده‌ی محلی کار می‌کنند.
        </div>
      )}

      {locError !== null && (
        <div className="app-banner warn" role="alert">
          {locError}
          <button className="banner-x" onClick={() => setLocError(null)} aria-label="بستن">
            ✕
          </button>
        </div>
      )}

      {accuracyMeters !== null && accuracyMeters > 50 && (
        <div className="app-banner" role="status">
          دقت موقعیت حدود {accuracyMeters.toLocaleString('fa-IR')} متر است — برای ویترین AR کم است.
          کمی در فضای باز بایست تا GPS دقیق‌تر شود.
        </div>
      )}

      <div className="top-bar">
        <div className="search-row">
          <div className="search-bar">
            <span className="search-icon" aria-hidden="true">
              🔍
            </span>
            <input
              value={input}
              placeholder="دنبال چی می‌گردی؟"
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') runSearch(input);
              }}
              aria-label="جست‌وجوی نیاز"
            />
            <button
              className="mic-icon"
              disabled
              title="جست‌وجوی صوتی — هنوز فعال نیست"
              aria-label="جست‌وجوی صوتی (به‌زودی)"
            >
              🎙
            </button>
          </div>
          <button
            className="icon-btn"
            onClick={() => setOverlay('settings')}
            aria-label="تنظیمات و وضعیت"
            title="تنظیمات و وضعیت"
          >
            <Icon name="settings" />
          </button>
          <button className="profile-btn" onClick={() => setOverlay('experience')} aria-label="فضای من" title="فضای من">
            <Icon name="bookmark" />
          </button>
        </div>

        <div className="map-filter-row">
          <button className="filter-toggle" onClick={() => setFiltersOpen((open) => !open)}>
            ⚲ فیلترها{categoryChip !== null || floorFilter !== 'all' ? ' · فعال' : ''}
          </button>
          {(categoryChip !== null || floorFilter !== 'all') && (
            <button
              className="active-filter-pill"
              onClick={() => {
                setCategoryChip(null);
                setFloorFilter('all');
                setSearchWasEmpty(false);
              }}
            >
              پاک‌کردن فیلتر
            </button>
          )}
        </div>
        {filtersOpen && (
          <div className="chips" aria-label="فیلترهای نقشه">
            {FILTER_CATEGORIES.map((category) => (
              <button
                key={category}
                className={`chip${categoryChip === category ? ' active' : ''}`}
                onClick={() => {
                  setCategoryChip(categoryChip === category ? null : category);
                  setSearchWasEmpty(false);
                }}
              >
                <span aria-hidden="true">{CATEGORY_GLYPH[category]}</span> {categoryLabel(category)}
              </button>
            ))}
            {availableFloors.length > 0 && (
              <>
                <button
                  className={`chip${floorFilter === 'all' ? ' active' : ''}`}
                  onClick={() => setFloorFilter('all')}
                >
                  همه‌ی طبقات
                </button>
                {availableFloors.map((floor) => (
                  <button
                    key={floor}
                    className={`chip${floorFilter === floor ? ' active' : ''}`}
                    onClick={() => setFloorFilter(floor)}
                  >
                    {floorFilterLabel(floor)}
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      <span className="mock-badge badge-float" title="داده‌ی واقعی هنوز منتشر نشده است">
        نسخه آزمایشی
      </span>

      <div className="map-fabs">
        <div className="zoom-stack">
          <button onClick={() => mapRef.current?.zoomIn()} aria-label="بزرگ‌نمایی">
            ＋
          </button>
          <button onClick={() => mapRef.current?.zoomOut()} aria-label="کوچک‌نمایی">
            −
          </button>
        </div>
        <button
          className={`fab-locate${locating ? ' busy' : ''}`}
          onClick={useMyLocation}
          aria-label="موقعیت من"
        >
          ◎
        </button>
      </div>

      <div className="primary-actions">
        <button className="action-fab assistant" onClick={() => setOverlay('assistant')}>
          <span className="action-fab-icon" aria-hidden="true">✦</span>
          <span className="action-fab-label">دستیار هوشمند</span>
        </button>
        <button className="action-fab vitrine" onClick={() => setOverlay('vitrine')}>
          <span className="action-fab-icon" aria-hidden="true">◉</span>
          <span className="action-fab-label">ویترین زنده</span>
        </button>
      </div>

      <BottomSheet state={sheet} onStateChange={setSheet} title={sheetTitle} subtitle={sheetSub}>
        {searchWasEmpty ? (
          /* تصمیم مالک محصول: بعد از جست‌وجوی بی‌نتیجه، هیچ کارتی نشان داده
             نمی‌شود — نه حتی «اطراف شما». مرور اطراف یک انتخاب صریح کاربر است. */
          <div className="empty">
            <span className="big">🔍</span>
            چیزی مطابق درخواست شما پیدا نشد.
            <br />
            می‌توانی نیازت را با کلمات دیگری بنویسی، یا همه‌ی مکان‌های اطراف را ببینی.
            <div style={{ marginTop: 14 }}>
              <button className="chip active" onClick={() => setSearchWasEmpty(false)}>
                نمایش همه‌ی مکان‌های اطراف
              </button>
            </div>
          </div>
        ) : sheetItems.length === 0 ? (
          <div className="empty">
            <span className="big">🗺</span>
            موردی در این فیلتر نیست.
            <br />
            فیلتر دسته یا طبقه را بردار تا همه‌ی مکان‌های اطراف را ببینی.
          </div>
        ) : (
          sheetItems.map((it) => (
            <BusinessCard
              key={it.record.business_id}
              record={it.record}
              distanceMeters={it.distanceMeters}
              hasOffer={it.hasOffer}
              now={now}
              reason={it.reason}
              selected={selectedId === it.record.business_id}
              onOpen={() => openDetail(it.record.business_id)}
              onRoute={() => {
                setSelectedId(it.record.business_id);
                mapRef.current?.flyTo(
                  [it.record.location.latitude, it.record.location.longitude],
                  17,
                  { duration: 0.8 },
                );
                setSheet('peek');
              }}
            />
          ))
        )}
      </BottomSheet>

      {overlay === 'settings' && (
        <SettingsPanel
          resolverInfo={resolverInfo}
          lastSyncedAt={directoryService.lastSyncedAt}
          recordCount={records.length}
          tileStatus={tileStatus}
          onClose={() => setOverlay('none')}
        />
      )}

      {overlay === 'detail' && selected && (
        <div className="panel">
          <div className="panel-head">
            <h3>جزئیات کسب‌وکار</h3>
            <button className="panel-close" onClick={() => setOverlay('none')} aria-label="بستن">
              ✕
            </button>
          </div>
          <div className="panel-body">
            <div className="detail-head">
              <CategoryCoin category={selected.category} offer={selected.offers.some(o => isOfferActiveAt(o.valid_from, o.valid_until, now))} />
              <div>
                <h2 className="detail-title">{selected.name}</h2>
                <div className="biz-meta">
                  <span>{categoryLabel(selected.category)}</span>
                  <i className="dot" />
                  <span>
                    {formatDistance(
                      haversineDistanceMeters(
                        searchPoint[0],
                        searchPoint[1],
                        selected.location.latitude,
                        selected.location.longitude,
                      ),
                    )}{' '}
                    از {searchPointLabel}
                  </span>
                  {floorLabel(selected.location.floor_level, selected.location.building_id) && (
                    <>
                      <i className="dot" />
                      <span>
                        {floorLabel(selected.location.floor_level, selected.location.building_id)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="detail-actions">
              <button className={experience.data.saved.includes(selected.business_id) ? 'active' : ''} onClick={() => { experience.toggle('saved', selected.business_id); feedback(experience.data); }}>
                <Icon name="bookmark" /> {experience.data.saved.includes(selected.business_id) ? 'ذخیره شد' : 'ذخیره'}
              </button>
              <button className={experience.data.later.includes(selected.business_id) ? 'active' : ''} onClick={() => { experience.toggle('later', selected.business_id); feedback(experience.data); }}>
                <Icon name="clock" /> بعداً ببینم
              </button>
              <button aria-pressed={experience.data.liked.includes(selected.business_id)} className={experience.data.liked.includes(selected.business_id) ? 'active' : ''} onClick={() => { experience.toggle('liked', selected.business_id); feedback(experience.data); }}>
                <Icon name="heart" /> مناسب من
              </button>
              <button onClick={() => { experience.toggle('hidden', selected.business_id); setOverlay('none'); }}>
                <Icon name="hide" /> کمتر نشان بده
              </button>
              <ShareBusinessAction key={selected.business_id} record={selected} />
            </div>

            <div className="section-title">محصولات / خدمات</div>
            {selected.products.map((p) => (
              <div
                key={p.product_id}
                className={`product-row${p.is_active ? '' : ' inactive'}`}
                title={p.is_active ? p.description ?? '' : 'غیرفعال — نمایش‌داده‌نشده برای مشتری'}
              >
                <span className="product-name">
                  {p.image_url !== null && (
                    <img className="product-thumb" src={p.image_url} alt="" loading="lazy" />
                  )}
                  {p.name}
                  {!p.is_active && ' (غیرفعال)'}
                </span>
                <span className="price">{formatPrice(p.price, p.currency)}</span>
              </div>
            ))}
            {selected.products.length === 0 && <div className="empty">محصولی ثبت نشده</div>}

            <div className="section-title">پیشنهادها</div>
            {selected.offers.length === 0 && <div className="empty">پیشنهادی ثبت نشده</div>}
            {selected.offers.map((o) => {
              const status = offerStatus(o.valid_from, o.valid_until, now);
              return (
                <div
                  key={o.offer_id}
                  className="offer-card"
                  data-offer-status={status}
                >
                  <div>
                    <span className="discount">
                      {o.discount_percent !== null ? `${o.discount_percent}٪ تخفیف — ` : ''}
                    </span>
                    {o.title}
                    {status === 'upcoming' && ' (هنوز شروع نشده)'}
                    {status === 'expired' && ' (منقضی)'}
                    {status === 'invalid' && ' (تاریخ اعتبار نامعتبر)'}
                  </div>
                  {o.description && <div>{o.description}</div>}
                  <div style={{ fontSize: 11, opacity: 0.8 }}>
                    اعتبار: {formatIso(o.valid_from)}
                    {o.valid_until ? ` تا ${formatIso(o.valid_until)}` : ' — تا اطلاع ثانوی'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {overlay === 'assistant' && (
        <div className="panel">
          <div className="panel-head">
            <h3>دستیار هوشمند</h3>
            <button className="panel-close" onClick={() => setOverlay('none')} aria-label="بستن">
              ✕
            </button>
          </div>

          <div className="panel-body">
            <div className="sp-row">
              <button onClick={useMyLocation}>📍 موقعیت من</button>
              <span className="sp-label">{searchPointLabel}</span>
            </div>
            <div className="sp-row">
              <span className="sp-label">شعاع:</span>
              {(
                [
                  [1000, '۱ کیلومتر'],
                  [5000, '۵ کیلومتر'],
                  [10000, '۱۰ کیلومتر'],
                ] as [number, string][]
              ).map(([m, label]) => (
                <button
                  key={m}
                  className={radiusMeters === m ? 'active' : ''}
                  onClick={() => setRadiusMeters(m)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="sp-hint">یا روی نقشه دابل‌کلیک کن تا نقطه‌ی جست‌وجو عوض شود</div>

            <div className="chat" style={{ marginTop: 14 }}>
              {chat.map((m, i) => (
                <div key={i} className={`msg ${m.role}`}>
                  <div className="bubble">
                    <div className="msg-text">{m.text}</div>
                    {m.understood && <div className="msg-understood">{m.understood}</div>}
                    {m.items && m.items.length > 0 && (
                      <div className="match-list">
                        {m.items.map((item) => (
                          <BusinessCard
                            key={item.record.business_id}
                            record={item.record}
                            distanceMeters={item.distanceMeters}
                            hasOffer={Boolean(item.matchedOffer)}
                            now={now}
                            reason={matchReason(item, m.interpretedCategory ?? null, now)}
                            onOpen={() => openDetail(item.record.business_id)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          </div>

          <div className="chat-input">
            <input
              value={input}
              placeholder='مثلاً: «لیزر با تخفیف نزدیک اینجا»'
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') runSearch(input);
              }}
            />
            <button onClick={() => runSearch(input)} disabled={sendBusy}>
              {sendBusy ? '…' : 'ارسال'}
            </button>
          </div>
        </div>
      )}

      {overlay === 'experience' && (
        <ExperiencePanel
          data={experience.data}
          records={records}
          storageFailed={experience.storageFailed}
          onClose={() => setOverlay('none')}
          onOpen={openDetail}
          onChange={experience.setData}
          onToggle={experience.toggle}
          onDiagnostics={() => setOverlay('settings')}
          onSuggest={() => findSuggestion()}
          suggestionEmpty={suggestionResult !== null && 'reason' in suggestionResult}
          radiusLabel={formatDistance(radiusMeters)}
          pointLabel={searchPointLabel}
          filtersApplied={filtersApplied}
          onWiden={radiusMeters < 10000 ? () => { setRadiusMeters(radiusMeters < 5000 ? 5000 : 10000); } : undefined}
          onChangePoint={() => { setOverlay('none'); setPointHint(true); }}
          onUseLocation={() => { setSuggestionResult(null); useMyLocation(); }}
          locating={locating}
        />
      )}

      {overlay === 'vitrine' && (
        <div className="panel dark">
          <div className="panel-head">
            <h3>ویترین زنده</h3>
            <button className="panel-close" onClick={() => setOverlay('none')} aria-label="بستن">
              ✕
            </button>
          </div>
          <div className="panel-body">
            <ArVitrineView
              searchPoint={searchPoint}
              searchPointLabel={searchPointLabel}
              preferredCategory={categoryChip}
              onSelectBusiness={(businessId) => openDetail(businessId)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
