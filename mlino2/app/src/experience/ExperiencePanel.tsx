import { Icon, CategoryCoin } from '../design/Icon';
import type { LocalExperience, Collection } from './useLocalExperience';
import {
  businessCategory, businessCategoryGuessed, businessCategoryLabel, businessId, businessName, type RichUiRecord,
} from '../components/businessView';
import type { V2BusinessCategory } from '../directory/contract';

function coinCategory(record: RichUiRecord): V2BusinessCategory {
  const category = businessCategory(record);
  return category === 'uncategorized' ? 'retail_shop' : category as V2BusinessCategory;
}

interface Props {
  data: LocalExperience;
  records: readonly RichUiRecord[];
  storageFailed: boolean;
  onClose: () => void;
  onOpen: (id: string) => void;
  onChange: (next: LocalExperience) => void;
  onToggle: (key: Collection | 'hidden', id: string) => void;
  onDiagnostics: () => void;
  onSuggest: () => void;
  suggestionEmpty: boolean;
  radiusLabel: string;
  pointLabel: string;
  filtersApplied: boolean;
  onWiden?: () => void;
  onChangePoint: () => void;
  onUseLocation: () => void;
  locating: boolean;
}
export default function ExperiencePanel({data, records, storageFailed, onClose, onOpen, onChange, onToggle, onDiagnostics, onSuggest, suggestionEmpty, radiusLabel, pointLabel, filtersApplied, onWiden, onChangePoint, onUseLocation, locating}: Props) {
  const viewed = records.filter(r => data.viewed.includes(businessId(r)));
  const tasks = [
    {label: 'یک مکان را برای بعد نگه دار', done: records.some(r => data.saved.includes(businessId(r)) || data.later.includes(businessId(r)))},
    {label: 'جزئیات سه مکان را ببین', done: viewed.length >= 3},
    {label: 'دو دسته‌ی متفاوت را کشف کن', done: new Set(viewed.map(businessCategory)).size >= 2},
  ];
  return <section className="panel personal-panel" aria-label="فضای من">
    <header className="panel-head"><h3>فضای من</h3><button className="panel-close" onClick={onClose} aria-label="بستن فضای من"><Icon name="close"/></button></header>
    <div className="panel-body">
      <div className="personal-intro"><Icon name="compass"/><h2>شهرِ تو، انتخابِ تو</h2><p>مجموعه‌ها و پیشرفت کشف، روی همین مرورگر ذخیره می‌شوند. «مناسب من» فقط انتخاب شخصی توست؛ امتیاز عمومی نیست و ترتیب نتایج را تغییر نمی‌دهد.</p></div>
      {storageFailed && <p role="status" className="inline-note">ذخیره در مرورگر ممکن نیست؛ انتخاب‌ها فقط تا بستن این صفحه می‌مانند.</p>}
      <section className="nearby-discovery" aria-label="کشف با درخواست تو">
        <h3>یک کشف کوچک، به انتخاب تو</h3>
        <p className="muted">نزدیک‌ترین مکان دارای پیشنهاد فعال، تا {radiusLabel} از {pointLabel}.</p>
        {filtersApplied && <p className="muted">فیلتر دسته یا طبقه فعال است؛ پیشنهاد هم این فیلترها را رعایت می‌کند.</p>}
        <button className="suggestion-command" onClick={onSuggest}>یک پیشنهاد نزدیک پیدا کن</button>
        {suggestionEmpty && <div className="suggestion-empty"><p role="status">الان پیشنهاد فعالی در این محدوده و با این فیلترها نیست.</p><div className="suggestion-options">
          {onWiden && <button onClick={onWiden}>افزایش شعاع</button>}
          <button onClick={onChangePoint}>تغییر نقطه روی نقشه</button>
          <button disabled={locating} onClick={onUseLocation}>{locating ? 'در حال موقعیت‌یابی…' : 'استفاده از موقعیت من'}</button>
        </div></div>}
      </section>
      {(['saved','later','liked'] as const).map(key => <section key={key} className="collection-section"><h3>{key === 'saved' ? 'مکان‌های من' : key === 'later' ? 'بعداً ببینم' : 'مناسب من'}</h3>
        {records.filter(r => data[key].includes(businessId(r))).map(r => <div className="collection-row" key={businessId(r)}><button onClick={() => onOpen(businessId(r))}><CategoryCoin category={coinCategory(r)}/><span>{businessName(r)}<small>{businessCategoryLabel(r)}{businessCategoryGuessed(r) ? ' · حدسی' : ''}</small></span></button><button aria-label={`حذف ${businessName(r)} از مجموعه`} onClick={() => onToggle(key,businessId(r))}><Icon name="close"/></button></div>)}
        {!records.some(r => data[key].includes(businessId(r))) && <p className="muted">هنوز مکانی در این مجموعه نیست.</p>}
      </section>)}
      <section className="discovery-tasks"><h3>قدم‌های کوچکِ کشف</h3><p className="muted">بر اساس انتخاب‌های محلی و باز کردن جزئیات مکان‌ها؛ به معنی بازدید حضوری یا پاداش مالی نیست.</p><progress value={tasks.filter(t=>t.done).length} max={3} aria-label="پیشرفت کشف"/>{tasks.map(task=><div className="task-row" key={task.label}><Icon name={task.done ? 'check' : 'compass'}/><span>{task.label}</span><small>{task.done ? 'انجام شد' : 'در انتظار کشف'}</small></div>)}</section>
      <section className="local-settings"><h3>حس و حال برنامه</h3><button className="setting-row" onClick={()=>onChange({...data,theme:data.theme==='dark'?'light':'dark'})}><Icon name={data.theme==='dark'?'sun':'moon'}/><span>ظاهر پنل‌ها</span><strong>{data.theme==='dark'?'تیره':'روشن'}</strong></button>
      <label className="setting-row"><span>صدای کوتاه هنگام انتخاب</span><input type="checkbox" checked={data.sound} onChange={e=>onChange({...data,sound:e.target.checked})}/></label>
      <label className="setting-row"><span>بازخورد لمسی (در دستگاه سازگار)</span><input type="checkbox" checked={data.haptics} onChange={e=>onChange({...data,haptics:e.target.checked})}/></label></section>
      {records.some(r=>data.hidden.includes(businessId(r))) && <section><h3>از کشف کنار گذاشته‌شده‌ها</h3>{records.filter(r=>data.hidden.includes(businessId(r))).map(r=><button className="restore-row" key={businessId(r)} onClick={()=>onToggle('hidden',businessId(r))}>{businessName(r)} · بازگرداندن</button>)}</section>}
      <button className="diagnostics-link" onClick={onDiagnostics}>وضعیت فنی و داده‌ها</button>
    </div>
  </section>;
}
