import { PACKS, PACK_IDS } from '../industry/packs';
import { usePack } from '../industry/context';
import { useChatSession } from '../chat/session';

// Business settings in the panel shell. The trade pack only changes how the panel speaks and which optional tools
// it shows (D-63: trade vocabulary stays out of Core).

export default function SettingsPage() {
  const { pack, chosen, guess, choose } = usePack();
  const s = useChatSession();
  return <div className="stack">
    <header className="page-head"><h1>تنظیمات کسب‌وکار</h1></header>
    <section className="card">
      <header className="card-head"><h3>نوع کسب‌وکار</h3><small className="muted">{s.org ? s.org.name.replace(/\s*\(آزمایشی\)/, '') : 'کسب‌وکار نمایشی'}</small></header>
      <p className="policy-note">ملینو برای همه‌ی کسب‌وکارها یکی است؛ این انتخاب فقط واژه‌ها و ابزارهای اختیاری پنل را عوض می‌کند — مثلاً «منو» یا «محصولات» یا «خدمات»، و اینکه بخش «دستور مصرف» انبار نشان داده شود یا نه. {chosen ? '' : `پیشنهاد ما از روی اطلاعات منتشرشده: «${PACKS[guess].label}».`}</p>
      <div className="pack-grid" role="radiogroup" aria-label="نوع کسب‌وکار">
        {PACK_IDS.map((id) => {
          const p = PACKS[id];
          return <button key={id} type="button" role="radio" aria-checked={pack.id === id} className={`pack-card${pack.id === id ? ' on' : ''}`} onClick={() => choose(id)}>
            <strong>{p.label}</strong><small>{p.hint}</small>
          </button>;
        })}
      </div>
      {pack.sensitive && <p className="note">در حوزه‌ی سلامت، CRM و گفتگو با مشتری خاموش می‌مانند تا اطلاعات حساس کسی نگه داشته نشود (R8-a).</p>}
    </section>
  </div>;
}
