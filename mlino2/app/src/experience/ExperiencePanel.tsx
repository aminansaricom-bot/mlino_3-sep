import { Icon, CategoryCoin } from '../design/Icon';
import type { LocalExperience, Collection } from './useLocalExperience';
import {
  businessCategory, businessCategoryGuessed, businessCategoryLabel, businessId, businessName, type RichUiRecord,
} from '../components/businessView';
import type { V2BusinessCategory } from '../directory/contract';
import { tr } from '../i18n';
import { LanguagePicker } from '../i18n/LanguageUi';

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
    {label: tr('یک مکان را برای بعد نگه دار'), done: records.some(r => data.saved.includes(businessId(r)) || data.later.includes(businessId(r)))},
    {label: tr('جزئیات سه مکان را ببین'), done: viewed.length >= 3},
    {label: tr('دو دسته‌ی متفاوت را کشف کن'), done: new Set(viewed.map(businessCategory)).size >= 2},
  ];
  return <section className="panel personal-panel" aria-label={tr('فضای من')}>
    <header className="panel-head"><h3>{tr('فضای من')}</h3><button className="panel-close" onClick={onClose} aria-label={tr('بستن فضای من')}><Icon name="close"/></button></header>
    <div className="panel-body">
      <div className="personal-intro"><Icon name="compass"/><h2>{tr('شهرِ تو، انتخابِ تو')}</h2><p>{tr('مجموعه‌ها و پیشرفت کشف، روی همین مرورگر ذخیره می‌شوند. «مناسب من» فقط انتخاب شخصی توست؛ امتیاز عمومی نیست و ترتیب نتایج را تغییر نمی‌دهد.')}</p></div>
      {storageFailed && <p role="status" className="inline-note">{tr('ذخیره در مرورگر ممکن نیست؛ انتخاب‌ها فقط تا بستن این صفحه می‌مانند.')}</p>}
      <section className="collection-section lang-section"><h3>{tr('زبان برنامه')}</h3><LanguagePicker /><small className="muted">{tr('اگر زبانی انتخاب نکنی، ملینو آن را از زبان گوشی و موقعیتت انتخاب می‌کند.')}</small></section>
      <section className="nearby-discovery" aria-label={tr('کشف با درخواست تو')}>
        <h3>{tr('یک کشف کوچک، به انتخاب تو')}</h3>
        <p className="muted">{tr('نزدیک‌ترین مکان دارای پیشنهاد فعال، تا {0} از {1}.', radiusLabel, pointLabel)}</p>
        {filtersApplied && <p className="muted">{tr('فیلتر دسته یا طبقه فعال است؛ پیشنهاد هم این فیلترها را رعایت می‌کند.')}</p>}
        <button className="suggestion-command" onClick={onSuggest}>{tr('یک پیشنهاد نزدیک پیدا کن')}</button>
        {suggestionEmpty && <div className="suggestion-empty"><p role="status">{tr('الان پیشنهاد فعالی در این محدوده و با این فیلترها نیست.')}</p><div className="suggestion-options">
          {onWiden && <button onClick={onWiden}>{tr('افزایش شعاع')}</button>}
          <button onClick={onChangePoint}>{tr('تغییر نقطه روی نقشه')}</button>
          <button disabled={locating} onClick={onUseLocation}>{locating ? tr('در حال موقعیت‌یابی…') : tr('استفاده از موقعیت من')}</button>
        </div></div>}
      </section>
      {(['saved','later','liked'] as const).map(key => <section key={key} className="collection-section"><h3>{key === 'saved' ? tr('مکان‌های من') : key === 'later' ? tr('بعداً ببینم') : tr('مناسب من')}</h3>
        {records.filter(r => data[key].includes(businessId(r))).map(r => <div className="collection-row" key={businessId(r)}><button onClick={() => onOpen(businessId(r))}><CategoryCoin category={coinCategory(r)}/><span>{businessName(r)}<small>{businessCategoryLabel(r)}{businessCategoryGuessed(r) ? tr(' · حدسی') : ''}</small></span></button><button aria-label={tr('حذف {0} از مجموعه', businessName(r))} onClick={() => onToggle(key,businessId(r))}><Icon name="close"/></button></div>)}
        {!records.some(r => data[key].includes(businessId(r))) && <p className="muted">{tr('هنوز مکانی در این مجموعه نیست.')}</p>}
      </section>)}
      <section className="discovery-tasks"><h3>{tr('قدم‌های کوچکِ کشف')}</h3><p className="muted">{tr('بر اساس انتخاب‌های محلی و باز کردن جزئیات مکان‌ها؛ به معنی بازدید حضوری یا پاداش مالی نیست.')}</p><progress value={tasks.filter(t=>t.done).length} max={3} aria-label={tr('پیشرفت کشف')}/>{tasks.map(task=><div className="task-row" key={task.label}><Icon name={task.done ? 'check' : 'compass'}/><span>{task.label}</span><small>{task.done ? tr('انجام شد') : tr('در انتظار کشف')}</small></div>)}</section>
      <section className="local-settings"><h3>{tr('حس و حال برنامه')}</h3><button className="setting-row" onClick={()=>onChange({...data,theme:data.theme==='dark'?'light':'dark'})}><Icon name={data.theme==='dark'?'sun':'moon'}/><span>{tr('ظاهر پنل‌ها')}</span><strong>{data.theme==='dark'?tr('تیره'):tr('روشن')}</strong></button>
      <label className="setting-row"><span>{tr('صدای کوتاه هنگام انتخاب')}</span><input type="checkbox" checked={data.sound} onChange={e=>onChange({...data,sound:e.target.checked})}/></label>
      <label className="setting-row"><span>{tr('بازخورد لمسی (در دستگاه سازگار)')}</span><input type="checkbox" checked={data.haptics} onChange={e=>onChange({...data,haptics:e.target.checked})}/></label></section>
      {records.some(r=>data.hidden.includes(businessId(r))) && <section><h3>{tr('از کشف کنار گذاشته‌شده‌ها')}</h3>{records.filter(r=>data.hidden.includes(businessId(r))).map(r=><button className="restore-row" key={businessId(r)} onClick={()=>onToggle('hidden',businessId(r))}>{tr('{0} · بازگرداندن', businessName(r))}</button>)}</section>}
      <button className="diagnostics-link" onClick={onDiagnostics}>{tr('وضعیت فنی و داده‌ها')}</button>
    </div>
  </section>;
}
