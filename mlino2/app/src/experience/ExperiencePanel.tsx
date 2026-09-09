import type { V2BusinessDirectoryRecord } from '../directory/contract';
import { categoryLabel } from '../uiFormat';
import { Icon, CategoryCoin } from '../design/Icon';
import type { LocalExperience, Collection } from './useLocalExperience';

interface Props {
  data: LocalExperience;
  records: V2BusinessDirectoryRecord[];
  storageFailed: boolean;
  onClose: () => void;
  onOpen: (id: string) => void;
  onChange: (next: LocalExperience) => void;
  onToggle: (key: Collection | 'hidden', id: string) => void;
  onDiagnostics: () => void;
}
export default function ExperiencePanel({data, records, storageFailed, onClose, onOpen, onChange, onToggle, onDiagnostics}: Props) {
  const viewed = records.filter(r => data.viewed.includes(r.business_id));
  const tasks = [
    {label: 'یک مکان را برای بعد نگه دار', done: records.some(r => data.saved.includes(r.business_id) || data.later.includes(r.business_id))},
    {label: 'جزئیات سه مکان را ببین', done: viewed.length >= 3},
    {label: 'دو دسته‌ی متفاوت را کشف کن', done: new Set(viewed.map(r => r.category)).size >= 2},
  ];
  return <section className="panel personal-panel" aria-label="فضای من">
    <header className="panel-head"><h3>فضای من</h3><button className="panel-close" onClick={onClose} aria-label="بستن فضای من"><Icon name="close"/></button></header>
    <div className="panel-body">
      <div className="personal-intro"><Icon name="compass"/><h2>شهرِ تو، انتخابِ تو</h2><p>مجموعه‌ها و پیشرفت کشف، روی همین مرورگر ذخیره می‌شوند. «مناسب من» فقط انتخاب شخصی توست؛ امتیاز عمومی نیست و ترتیب نتایج را تغییر نمی‌دهد.</p></div>
      {storageFailed && <p role="status" className="inline-note">ذخیره در مرورگر ممکن نیست؛ انتخاب‌ها فقط تا بستن این صفحه می‌مانند.</p>}
      {(['saved','later','liked'] as const).map(key => <section key={key} className="collection-section"><h3>{key === 'saved' ? 'مکان‌های من' : key === 'later' ? 'بعداً ببینم' : 'مناسب من'}</h3>
        {records.filter(r => data[key].includes(r.business_id)).map(r => <div className="collection-row" key={r.business_id}><button onClick={() => onOpen(r.business_id)}><CategoryCoin category={r.category}/><span>{r.name}<small>{categoryLabel(r.category)}</small></span></button><button aria-label={`حذف ${r.name} از مجموعه`} onClick={() => onToggle(key,r.business_id)}><Icon name="close"/></button></div>)}
        {!records.some(r => data[key].includes(r.business_id)) && <p className="muted">هنوز مکانی در این مجموعه نیست.</p>}
      </section>)}
      <section className="discovery-tasks"><h3>قدم‌های کوچکِ کشف</h3><p className="muted">بر اساس انتخاب‌های محلی و باز کردن جزئیات مکان‌ها؛ به معنی بازدید حضوری یا پاداش مالی نیست.</p><progress value={tasks.filter(t=>t.done).length} max={3} aria-label="پیشرفت کشف"/>{tasks.map(task=><div className="task-row" key={task.label}><Icon name={task.done ? 'check' : 'compass'}/><span>{task.label}</span><small>{task.done ? 'انجام شد' : 'در انتظار کشف'}</small></div>)}</section>
      <section className="local-settings"><h3>حس و حال برنامه</h3><button className="setting-row" onClick={()=>onChange({...data,theme:data.theme==='dark'?'light':'dark'})}><Icon name={data.theme==='dark'?'sun':'moon'}/><span>ظاهر پنل‌ها</span><strong>{data.theme==='dark'?'تیره':'روشن'}</strong></button>
      <label className="setting-row"><span>صدای کوتاه هنگام انتخاب</span><input type="checkbox" checked={data.sound} onChange={e=>onChange({...data,sound:e.target.checked})}/></label>
      <label className="setting-row"><span>بازخورد لمسی (در دستگاه سازگار)</span><input type="checkbox" checked={data.haptics} onChange={e=>onChange({...data,haptics:e.target.checked})}/></label></section>
      {records.some(r=>data.hidden.includes(r.business_id)) && <section><h3>از کشف کنار گذاشته‌شده‌ها</h3>{records.filter(r=>data.hidden.includes(r.business_id)).map(r=><button className="restore-row" key={r.business_id} onClick={()=>onToggle('hidden',r.business_id)}>{r.name} · بازگرداندن</button>)}</section>}
      <button className="diagnostics-link" onClick={onDiagnostics}>وضعیت فنی و داده‌ها</button>
    </div>
  </section>;
}
