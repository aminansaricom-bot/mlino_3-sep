import { useEffect, useState } from 'react';
import { CategoryCoin } from '../design/Icon';
import type { LocalExperience, Collection } from './useLocalExperience';
import {
  businessCategory, businessCategoryGuessed, businessCategoryLabel, businessId, businessName, type RichUiRecord,
} from '../components/businessView';
import type { V2BusinessCategory } from '../directory/contract';
import { LOCALES, locale, tr, digits, useLocale } from '../i18n';
import { LanguagePicker } from '../i18n/LanguageUi';
import { CHAT_ENABLED, chatApi, type ChatConfig, type ChatPerson } from '../chat/chatApi';
import { Login } from '../chat/ChatPanel';
import { onBackButton } from '../native/bridge';
import LiveIcon, { type LiveIconName } from '../live/icons';
import SpaceIcon, { type SpaceIconName } from './MySpaceIcons';

function coinCategory(record: RichUiRecord): V2BusinessCategory {
  const category = businessCategory(record);
  return category === 'uncategorized' ? 'retail_shop' : category as V2BusinessCategory;
}

type View = 'menu' | 'language' | Collection | 'discover' | 'steps' | 'feedback' | 'hidden' | 'login';

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
  /** Signing in or out changes the chat badge and anything personal. */
  onAccountChange?: () => void;
}

/** One line of the menu: icon, label, a short value, and a chevron when it opens a submenu. */
function Row({ icon, space, label, value, onClick, danger = false, opens = true }: { icon?: LiveIconName; space?: SpaceIconName; label: string; value?: string; onClick: () => void; danger?: boolean; opens?: boolean }) {
  return <button type="button" className={`pm-row${danger ? ' danger' : ''}`} onClick={onClick}>
    <span className="pm-ico" aria-hidden="true">{space ? <SpaceIcon name={space} /> : icon && <LiveIcon name={icon} size={22} />}</span>
    <span className="pm-label">{label}</span>
    {value && <span className="pm-value">{value}</span>}
    {opens && <span className="pm-chev" aria-hidden="true"><LiveIcon name="chevron-left" size={18} /></span>}
  </button>;
}

/**
 * «فضای من» (profile): a short menu, each item with its own icon; details open as submenus with a back arrow.
 * Account: who is signed in (only the last digits of the number) and «خروج از حساب».
 */
export default function ExperiencePanel({data, records, storageFailed, onClose, onOpen, onChange, onToggle, onDiagnostics, onSuggest, suggestionEmpty, radiusLabel, pointLabel, filtersApplied, onWiden, onChangePoint, onUseLocation, locating, onAccountChange}: Props) {
  useLocale();
  const [view, setView] = useState<View>('menu');
  const [person, setPerson] = useState<ChatPerson | undefined>(undefined);
  const [config, setConfig] = useState<ChatConfig | null>(null);
  const [leaving, setLeaving] = useState(false);
  const loadMe = () => chatApi<{ person: ChatPerson }>('GET', '/auth/me').then((r) => setPerson(r.person)).catch(() => setPerson(null));
  useEffect(() => { if (CHAT_ENABLED) void loadMe(); else setPerson(null); }, []);
  useEffect(() => { if (view === 'login' && !config) void chatApi<ChatConfig>('GET', '/auth/config').then(setConfig).catch(() => undefined); }, [view, config]);
  // Android back: from a submenu back to the menu; from the menu the app closes the panel.
  useEffect(() => onBackButton(() => { if (view !== 'menu') { setView('menu'); return true; } return false; }), [view]);

  const logout = async () => {
    setLeaving(true);
    try { await chatApi('POST', '/auth/logout'); } catch { /* the server drops the session cookie either way */ }
    setPerson(null); setLeaving(false); onAccountChange?.();
  };

  const inList = (key: Collection | 'hidden') => records.filter(r => data[key].includes(businessId(r)));
  const viewed = records.filter(r => data.viewed.includes(businessId(r)));
  const tasks = [
    {label: tr('یک مکان را برای بعد نگه دار'), done: records.some(r => data.saved.includes(businessId(r)) || data.later.includes(businessId(r)))},
    {label: tr('جزئیات سه مکان را ببین'), done: viewed.length >= 3},
    {label: tr('دو دسته‌ی متفاوت را کشف کن'), done: new Set(viewed.map(businessCategory)).size >= 2},
  ];
  const doneCount = tasks.filter(t => t.done).length;
  const count = (n: number) => digits(String(n));
  const languageName = LOCALES.find((l) => l.id === locale())?.name ?? '';
  const collectionTitle: Record<Collection, string> = { saved: tr('مکان‌های من'), later: tr('بعداً ببینم'), liked: tr('مناسب من') };
  const collectionIcon: Record<Collection, SpaceIconName> = { saved: 'my-places', later: 'watch-later', liked: 'for-me' };
  const titles: Record<View, string> = {
    menu: tr('فضای من'), language: tr('زبان برنامه'), saved: collectionTitle.saved, later: collectionTitle.later, liked: collectionTitle.liked,
    discover: tr('یک کشف کوچک، به انتخاب تو'), steps: tr('قدم‌های کوچکِ کشف'), feedback: tr('صدا و لرزش'), hidden: tr('از کشف کنار گذاشته‌شده‌ها'), login: tr('ورود با شماره‌ی موبایل'),
  };

  return <section className="panel personal-panel" aria-label={titles[view]}>
    <header className="panel-head">
      {view !== 'menu' && <button className="panel-close" onClick={() => setView('menu')} aria-label={tr('بازگشت')}><LiveIcon name="chevron-right" size={20} /></button>}
      <h3>{titles[view]}</h3>
      <button className="panel-close" onClick={onClose} aria-label={tr('بستن فضای من')}><LiveIcon name="close" size={20} /></button>
    </header>
    <div className="panel-body pm-body">
      {storageFailed && <p role="status" className="inline-note">{tr('ذخیره در مرورگر ممکن نیست؛ انتخاب‌ها فقط تا بستن این صفحه می‌مانند.')}</p>}

      {view === 'menu' && <>
        {CHAT_ENABLED && <div className="pm-account">
          <span className="pm-avatar" aria-hidden="true"><SpaceIcon name="account" /></span>
          <div className="pm-account-copy">
            <strong>{tr('حساب کاربری')}</strong>
            <small>{person === undefined ? tr('در حال بررسی…') : person ? `${tr('واردشده با …')}${digits(person.phoneHint)}${person.test ? tr(' (آزمایشی)') : ''}` : tr('هنوز وارد نشده‌ای.')}</small>
          </div>
          {person === null && <button type="button" className="pm-account-btn" onClick={() => setView('login')}>{tr('ورود')}</button>}
        </div>}

        <div className="pm-group">
          <Row space="language" label={tr('زبان برنامه')} value={languageName} onClick={() => setView('language')} />
          <Row space="appearance" label={tr('ظاهر پنل‌ها')} value={data.theme === 'dark' ? tr('تیره') : tr('روشن')} opens={false}
            onClick={() => onChange({...data, theme: data.theme === 'dark' ? 'light' : 'dark'})} />
          <Row space="sound-vibration" label={tr('صدا و لرزش')} value={data.sound || data.haptics ? tr('روشن') : tr('خاموش')} onClick={() => setView('feedback')} />
        </div>

        <div className="pm-group">
          {(['saved', 'later', 'liked'] as const).map(key => <Row key={key} space={collectionIcon[key]} label={collectionTitle[key]} value={count(inList(key).length)} onClick={() => setView(key)} />)}
          {inList('hidden').length > 0 && <Row icon="eye-off" label={tr('از کشف کنار گذاشته‌شده‌ها')} value={count(inList('hidden').length)} onClick={() => setView('hidden')} />}
        </div>

        <div className="pm-group">
          <Row space="small-discovery" label={tr('یک کشف کوچک، به انتخاب تو')} onClick={() => setView('discover')} />
          <Row space="discovery-steps" label={tr('قدم‌های کوچکِ کشف')} value={tr('{0} از {1}', count(doneCount), count(tasks.length))} onClick={() => setView('steps')} />
          <Row icon="info" label={tr('وضعیت فنی و داده‌ها')} opens={false} onClick={onDiagnostics} />
        </div>

        {CHAT_ENABLED && person && <div className="pm-group">
          <Row icon="logout" label={leaving ? tr('در حال خروج…') : tr('خروج از حساب')} danger opens={false} onClick={() => { if (!leaving) void logout(); }} />
        </div>}
      </>}

      {view === 'language' && <div className="pm-sub">
        <LanguagePicker />
        <p className="muted">{tr('اگر زبانی انتخاب نکنی، ملینو آن را از زبان گوشی و موقعیتت انتخاب می‌کند.')}</p>
      </div>}

      {(view === 'saved' || view === 'later' || view === 'liked' || view === 'hidden') && <div className="pm-sub">
        {inList(view).map(r => <div className="collection-row" key={businessId(r)}>
          <button onClick={() => onOpen(businessId(r))}><CategoryCoin category={coinCategory(r)}/><span>{businessName(r)}<small>{businessCategoryLabel(r)}{businessCategoryGuessed(r) ? tr(' · حدسی') : ''}</small></span></button>
          {view === 'hidden'
            ? <button onClick={() => onToggle('hidden', businessId(r))}>{tr('بازگرداندن')}</button>
            : <button aria-label={tr('حذف {0} از مجموعه', businessName(r))} onClick={() => onToggle(view, businessId(r))}><LiveIcon name="close" size={18} /></button>}
        </div>)}
        {inList(view).length === 0 && <p className="muted">{tr('هنوز مکانی در این مجموعه نیست.')}</p>}
        {view !== 'hidden' && <p className="muted">{tr('مجموعه‌ها و پیشرفت کشف، روی همین مرورگر ذخیره می‌شوند. «مناسب من» فقط انتخاب شخصی توست؛ امتیاز عمومی نیست و ترتیب نتایج را تغییر نمی‌دهد.')}</p>}
      </div>}

      {view === 'discover' && <div className="pm-sub nearby-discovery">
        <p className="muted">{tr('نزدیک‌ترین مکان دارای پیشنهاد فعال، تا {0} از {1}.', radiusLabel, pointLabel)}</p>
        {filtersApplied && <p className="muted">{tr('فیلتر دسته یا طبقه فعال است؛ پیشنهاد هم این فیلترها را رعایت می‌کند.')}</p>}
        <button className="suggestion-command" onClick={onSuggest}>{tr('یک پیشنهاد نزدیک پیدا کن')}</button>
        {suggestionEmpty && <div className="suggestion-empty"><p role="status">{tr('الان پیشنهاد فعالی در این محدوده و با این فیلترها نیست.')}</p><div className="suggestion-options">
          {onWiden && <button onClick={onWiden}>{tr('افزایش شعاع')}</button>}
          <button onClick={onChangePoint}>{tr('تغییر نقطه روی نقشه')}</button>
          <button disabled={locating} onClick={onUseLocation}>{locating ? tr('در حال موقعیت‌یابی…') : tr('استفاده از موقعیت من')}</button>
        </div></div>}
      </div>}

      {view === 'steps' && <div className="pm-sub discovery-tasks">
        <p className="muted">{tr('بر اساس انتخاب‌های محلی و باز کردن جزئیات مکان‌ها؛ به معنی بازدید حضوری یا پاداش مالی نیست.')}</p>
        <progress value={doneCount} max={3} aria-label={tr('پیشرفت کشف')}/>
        {tasks.map(task => <div className="task-row" key={task.label}><LiveIcon name={task.done ? 'check' : 'compass'} size={20} /><span>{task.label}</span><small>{task.done ? tr('انجام شد') : tr('در انتظار کشف')}</small></div>)}
      </div>}

      {view === 'feedback' && <div className="pm-sub local-settings">
        <label className="setting-row"><span>{tr('صدای کوتاه هنگام انتخاب')}</span><input type="checkbox" checked={data.sound} onChange={e => onChange({...data, sound: e.target.checked})}/></label>
        <label className="setting-row"><span>{tr('بازخورد لمسی (در دستگاه سازگار)')}</span><input type="checkbox" checked={data.haptics} onChange={e => onChange({...data, haptics: e.target.checked})}/></label>
      </div>}

      {view === 'login' && <div className="pm-sub">
        <Login config={config} onDone={() => { void loadMe(); onAccountChange?.(); setView('menu'); }} />
      </div>}
    </div>
  </section>;
}
