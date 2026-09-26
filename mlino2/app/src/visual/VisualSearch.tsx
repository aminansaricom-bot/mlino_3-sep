import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { tr, num } from '../i18n';
import LiveIcon from '../live/icons';
import { clean, rial } from '../live/liveData';
import { onBackButton } from '../native/bridge';
import type { CatalogItem, CatalogRecord } from '../publicExport/catalog';
import type { PublicUiRecord } from '../publicExport/uiAdapter';
import { FULL, PhotoError, clampCrop, cropToJpeg, photoFromFile, type CropRect, type Photo } from './prepareImage';
import { createLatest } from './latest';
import { VisualApiError, searchByPhoto, visualErrorText, type VisualErrorCode, type VisualResult } from './visualApi';
import './visual.css';

/**
 * «جست‌وجو با عکس» (D-91): choose or take a photo → preview and optional crop → «پیدا کردن مشابه‌ها» → similar
 * products of MLINO's published catalog. Every result is joined with the phone's own verified catalog (the product
 * page, save and ask use the existing flows). The photo is never sent to a business; the phone's position never
 * leaves the phone (distance is computed here, only when the position is known).
 */

type Step = 'pick' | 'crop' | 'searching' | 'results' | 'error';
interface Row { result: VisualResult; item: CatalogItem; record: PublicUiRecord | undefined; distance: number | null }

const PAGE = 12;
const haversine = (a: readonly [number, number], b: { latitude: number; longitude: number }) => {
  const R = 6_371_000; const r = (d: number) => (d * Math.PI) / 180;
  const dLat = r(b.latitude - a[0]); const dLng = r(b.longitude - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a[0])) * Math.cos(r(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
};
const distanceText = (m: number) => (m < 1000 ? tr('{0} متر', num(Math.round(m / 10) * 10)) : tr('{0} کیلومتر', num(Math.round(m / 100) / 10, { maximumFractionDigits: 1 })));

export default function VisualSearch(p: {
  /** A photo already taken (a live-storefront frame): starts at the crop step. */
  initial?: Photo | null;
  records: readonly PublicUiRecord[];
  catalogByOrg: ReadonlyMap<string, CatalogRecord>;
  myPoint: readonly [number, number] | null;
  /** The businesses the current filters keep (category, open, nearby) — null when no filter is on. */
  filterOrgs: readonly string[] | null;
  savedItems: readonly string[];
  onToggleSave: (organizationId: string, itemId: string) => void;
  onOpenProduct: (organizationId: string, item: CatalogItem) => void;
  onAsk?: (organizationId: string, name: string) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>(p.initial ? 'crop' : 'pick');
  const [photo, setPhoto] = useState<Photo | null>(p.initial ?? null);
  const [crop, setCrop] = useState<CropRect>(FULL);
  const [sent, setSent] = useState<string | null>(null); // object URL of the cropped photo (the results' thumbnail)
  const [answer, setAnswer] = useState<{ results: VisualResult[]; total: number; scope: 'all' | 'subset' } | null>(null);
  const [error, setError] = useState<VisualErrorCode | null>(null);
  const [useFilters, setUseFilters] = useState(!!p.filterOrgs);
  const latest = useRef(createLatest()).current;
  const abort = useRef<AbortController | null>(null);
  const blob = useRef<Blob | null>(null);
  const camInput = useRef<HTMLInputElement | null>(null);
  const galleryInput = useRef<HTMLInputElement | null>(null);

  // Clean up: the photo, its thumbnail and any request in flight.
  useEffect(() => () => { abort.current?.abort(); photo?.close(); }, [photo]);
  useEffect(() => () => { if (sent) URL.revokeObjectURL(sent); }, [sent]);

  const reset = () => { abort.current?.abort(); latest.cancel(); setAnswer(null); setError(null); setCrop(FULL); setStep('pick'); setPhoto(null); };
  useEffect(() => onBackButton(() => {
    if (step === 'searching') { abort.current?.abort(); latest.cancel(); setStep('crop'); return true; }
    if (step === 'crop' || step === 'results' || step === 'error') { if (step === 'crop' && !p.initial) { reset(); return true; } if (step !== 'crop') { setStep('crop'); return true; } }
    p.onClose(); return true;
  }), [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try { const ph = await photoFromFile(file); setPhoto(ph); setCrop(FULL); setStep('crop'); }
    catch (e) { setError(e instanceof PhotoError ? e.code : 'PHOTO_UNREADABLE'); setStep('error'); }
  };

  const run = async (offset = 0) => {
    if (!photo) return;
    const id = latest.next(); // a later request always wins; an older answer is dropped
    abort.current?.abort();
    const ctl = new AbortController(); abort.current = ctl;
    setError(null);
    if (offset === 0) setStep('searching');
    try {
      if (offset === 0) {
        blob.current = await cropToJpeg(photo, crop);
        if (sent) URL.revokeObjectURL(sent);
        setSent(URL.createObjectURL(blob.current));
      }
      const out = await searchByPhoto(blob.current!, { organizationIds: useFilters && p.filterOrgs ? p.filterOrgs : undefined, limit: PAGE, offset }, ctl.signal);
      if (!latest.isCurrent(id)) return;
      setAnswer((prev) => (offset && prev ? { ...out, results: [...prev.results, ...out.results] } : out));
      setStep('results');
    } catch (e) {
      if (!latest.isCurrent(id) || (e as Error)?.name === 'AbortError') return;
      setError(e instanceof VisualApiError ? e.code : e instanceof PhotoError ? e.code : 'UNKNOWN');
      setStep('error');
    }
  };

  // Results joined with the phone's own verified catalog; anything the phone cannot verify is not shown.
  const rows: Row[] = useMemo(() => (answer?.results ?? []).flatMap((result) => {
    const item = p.catalogByOrg.get(result.organizationId)?.items.find((x) => x.catalog_item_id === result.catalogItemId);
    if (!item) return [];
    const record = p.records.find((r) => r.id === result.organizationId);
    const distance = p.myPoint && record?.coordinates ? haversine(p.myPoint, record.coordinates) : null;
    return [{ result, item, record, distance }];
  }), [answer, p.catalogByOrg, p.records, p.myPoint]);

  return <div className="vs-root" role="dialog" aria-modal="true" aria-label={tr('جست‌وجو با عکس')}>
    <header className="vs-head">
      <button type="button" className="vs-icon" onClick={() => (step === 'results' || step === 'error' ? setStep(photo ? 'crop' : 'pick') : step === 'crop' && !p.initial ? reset() : p.onClose())} aria-label={tr('برگشت')}><LiveIcon name="chevron-right" /></button>
      <h1>{step === 'results' ? tr('محصولات مشابه') : tr('جست‌وجو با عکس')}</h1>
      <button type="button" className="vs-icon" onClick={p.onClose} aria-label={tr('بستن')}><LiveIcon name="close" /></button>
    </header>

    <input ref={camInput} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { void choose(e.target.files?.[0]); e.target.value = ''; }} />
    <input ref={galleryInput} type="file" accept="image/jpeg,image/png,image/webp,image/*" hidden onChange={(e) => { void choose(e.target.files?.[0]); e.target.value = ''; }} />

    {step === 'pick' && <div className="vs-body vs-pick">
      <span className="vs-hero" aria-hidden="true"><LiveIcon name="photo-search" size={44} /></span>
      <p className="vs-lead">{tr('از محصولی که دنبالش هستی عکس بگیر یا یک عکس انتخاب کن؛ محصولات مشابه در کسب‌وکارهای ملینو پیدا می‌شوند.')}</p>
      <button type="button" className="vs-btn primary" onClick={() => camInput.current?.click()}><LiveIcon name="camera" size={20} />{tr('گرفتن عکس')}</button>
      <button type="button" className="vs-btn" onClick={() => galleryInput.current?.click()}><LiveIcon name="image" size={20} />{tr('انتخاب از گالری')}</button>
    </div>}

    {step === 'crop' && photo && <div className="vs-body">
      <Cropper photo={photo} crop={crop} onCrop={setCrop} />
      <p className="vs-note">{tr('برای پیدا کردن محصولات مشابه، عکس روی سرور ملینو پردازش می‌شود.')}</p>
      {p.filterOrgs && <label className="vs-check"><input type="checkbox" checked={useFilters} onChange={(e) => setUseFilters(e.target.checked)} />{tr('فقط در کسب‌وکارهایی که فیلتر کرده‌ام')}</label>}
      <button type="button" className="vs-btn primary" onClick={() => void run(0)}><LiveIcon name="search" size={20} />{tr('پیدا کردن مشابه‌ها')}</button>
      <button type="button" className="vs-btn" onClick={() => { if (p.initial) p.onClose(); else galleryInput.current?.click(); }}>{tr('عکس دیگر')}</button>
    </div>}

    {step === 'searching' && <div className="vs-body vs-center" role="status" aria-live="polite">
      <span className="vs-spinner" aria-hidden="true" />
      <p>{tr('در حال پیدا کردن محصولات مشابه…')}</p>
      <button type="button" className="vs-btn" onClick={() => { abort.current?.abort(); latest.cancel(); setStep('crop'); }}>{tr('لغو')}</button>
    </div>}

    {step === 'error' && <div className="vs-body vs-center" role="alert">
      <span className="vs-hero warn" aria-hidden="true"><LiveIcon name="warning" size={36} /></span>
      <p>{error ? visualErrorText(error) : ''}</p>
      {photo && <button type="button" className="vs-btn primary" onClick={() => void run(0)}>{tr('تلاش دوباره')}</button>}
      <button type="button" className="vs-btn" onClick={reset}>{tr('تغییر عکس')}</button>
    </div>}

    {step === 'results' && answer && <div className="vs-body vs-results">
      <div className="vs-query">
        {sent && <img src={sent} alt={tr('عکس جست‌وجوی تو')} />}
        <div><strong>{tr('محصولات مشابه')}</strong>
          <small>{answer.scope === 'subset' ? tr('در میان کسب‌وکارهایی که فیلتر کرده‌ای') : tr('در کاتالوگ کسب‌وکارهای ملینو')}</small></div>
        <button type="button" className="vs-btn small" onClick={reset}>{tr('تغییر عکس')}</button>
      </div>
      {rows.length === 0 ? <div className="vs-empty" role="status">
        <p>{tr('مورد مشابه مناسبی پیدا نشد.')}</p>
        <small>{tr('بخش دیگری از عکس را برش بده یا از زاویه‌ی دیگری عکس بگیر.')}</small>
      </div> : <ul className="vs-list">{rows.map(({ result, item, record, distance }) => {
        const saved = p.savedItems.includes(`${result.organizationId}/${result.catalogItemId}`);
        const price = !item.on_request && item.price_amount !== null ? rial(Math.round(Number(item.price_amount))) : tr('قیمت با پرسش');
        return <li key={`${result.organizationId}/${result.catalogItemId}`} className="vs-row">
          <button type="button" className="vs-open" onClick={() => p.onOpenProduct(result.organizationId, item)}>
            <img src={`/public-export/${result.matchedImagePath}`} alt="" loading="lazy" />
            <span className="vs-info">
              <b>{clean(item.name)}</b>
              <small>{clean(record?.name ?? result.businessName)}{distance !== null ? ` · ${distanceText(distance)}` : ''}</small>
              <span className="vs-price">{price}</span>
              <span className="vs-tags"><span className="vs-kind">{tr('از نظر ظاهر مشابه')}</span>{result.organizationId.startsWith('test-demo-') && <span className="vs-demo">{tr('نمونه')}</span>}</span>
            </span>
          </button>
          <span className="vs-actions">
            <button type="button" className={`vs-icon${saved ? ' on' : ''}`} aria-pressed={saved} onClick={() => p.onToggleSave(result.organizationId, result.catalogItemId)} aria-label={saved ? tr('برداشتن از ذخیره‌ها') : tr('ذخیره')}><LiveIcon name={saved ? 'heart' : 'bookmark'} /></button>
            {p.onAsk && <button type="button" className="vs-icon" onClick={() => p.onAsk!(result.organizationId, clean(record?.name ?? result.businessName))} aria-label={tr('پرسیدن از کسب‌وکار')}><LiveIcon name="chat" /></button>}
          </span>
        </li>;
      })}</ul>}
      {answer.results.length < answer.total && <button type="button" className="vs-btn" onClick={() => void run(answer.results.length)}>{tr('بیشتر')}</button>}
    </div>}
  </div>;
}

/** Preview with a crop box: drag it or its corner, or use the buttons (no dragging needed). */
function Cropper({ photo, crop, onCrop }: { photo: Photo; crop: CropRect; onCrop: (c: CropRect) => void }) {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const box = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ mode: 'move' | 'size'; x: number; y: number; start: CropRect } | null>(null);
  useEffect(() => {
    const c = canvas.current; if (!c) return;
    const scale = Math.min(1, 900 / Math.max(photo.width, photo.height));
    c.width = Math.round(photo.width * scale); c.height = Math.round(photo.height * scale);
    photo.draw(c.getContext('2d')!, 0, 0, photo.width, photo.height, c.width, c.height);
  }, [photo]);
  const down = (mode: 'move' | 'size') => (e: ReactPointerEvent) => { e.stopPropagation(); (e.target as Element).setPointerCapture(e.pointerId); drag.current = { mode, x: e.clientX, y: e.clientY, start: crop }; };
  const move = (e: ReactPointerEvent) => {
    const d = drag.current; const r = box.current?.getBoundingClientRect(); if (!d || !r) return;
    const dx = (e.clientX - d.x) / r.width; const dy = (e.clientY - d.y) / r.height;
    onCrop(clampCrop(d.mode === 'move' ? { ...d.start, x: d.start.x + dx, y: d.start.y + dy } : { ...d.start, w: d.start.w + dx, h: d.start.h + dy }));
  };
  const nudge = (dx: number, dy: number) => onCrop(clampCrop({ ...crop, x: crop.x + dx, y: crop.y + dy }));
  const zoom = (f: number) => { const w = crop.w * f; const h = crop.h * f; onCrop(clampCrop({ w, h, x: crop.x + (crop.w - w) / 2, y: crop.y + (crop.h - h) / 2 })); };
  return <div className="vs-crop">
    <div className="vs-stage" ref={box} onPointerMove={move} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
      <canvas ref={canvas} aria-label={tr('پیش‌نمایش عکس')} role="img" />
      <div className="vs-box" style={{ left: `${crop.x * 100}%`, top: `${crop.y * 100}%`, width: `${crop.w * 100}%`, height: `${crop.h * 100}%` }} onPointerDown={down('move')}>
        <span className="vs-handle" onPointerDown={down('size')} aria-hidden="true" />
      </div>
    </div>
    <div className="vs-crop-tools" role="group" aria-label={tr('برش عکس')}>
      <button type="button" className="vs-icon" onClick={() => zoom(0.85)} aria-label={tr('کادر کوچک‌تر')}>−</button>
      <button type="button" className="vs-icon" onClick={() => zoom(1 / 0.85)} aria-label={tr('کادر بزرگ‌تر')}>+</button>
      <button type="button" className="vs-icon" onClick={() => nudge(0, -0.05)} aria-label={tr('کادر بالاتر')}>↑</button>
      <button type="button" className="vs-icon" onClick={() => nudge(0, 0.05)} aria-label={tr('کادر پایین‌تر')}>↓</button>
      <button type="button" className="vs-icon" onClick={() => nudge(0.05, 0)} aria-label={tr('کادر به راست')}>→</button>
      <button type="button" className="vs-icon" onClick={() => nudge(-0.05, 0)} aria-label={tr('کادر به چپ')}>←</button>
      <button type="button" className="vs-btn small" onClick={() => onCrop(FULL)}><LiveIcon name="crop" size={18} />{tr('کل عکس')}</button>
    </div>
  </div>;
}
