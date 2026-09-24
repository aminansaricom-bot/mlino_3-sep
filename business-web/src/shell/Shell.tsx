import { useEffect, useState, type MouseEvent, type ReactNode } from 'react';
import { useWorkspace, DEMO_MEMBER } from '../workspace';
import { useChatSession } from '../chat/session';
import { PackProvider } from '../industry/context';
import SettingsPage from './SettingsPage';
import MembersPage from './MembersPage';
import { ADMIN_KEYS } from '../chat/permissions';
import { usePublished } from '../published';
import { MODULES, type ModuleId } from '../modules/registry';
import { jDateLong } from '../format';
import Home from './Home';
import AccountingModule from '../modules/accounting/AccountingApp';
import InventoryModule from '../modules/inventory/InventoryModule';
import { ProductsPage } from '../modules/catalog/CatalogPages';
import ProductEditor from '../modules/catalog/ProductEditor';
import LockedModule from './LockedModule';
import CrmModule from '../modules/crm/CrmModule';
import Assistant from '../assistant/Assistant';
import StorefrontSection from '../modules/storefront/StorefrontSection';
import PlanPage from '../modules/plan/PlanPage';
import BottomBar from './BottomBar';
import MenuIcon, { MODULE_ICON, type MenuIconName } from './MenuIcon';
import { RUNNER, inApp, onNative } from '../native/bridge';

export function Link({ to, className, children, onNavigate }: { to: string; className?: string; children: ReactNode; onNavigate?: () => void }) {
  const { navigate } = useWorkspace();
  return <a href={to} className={className} onClick={(e: MouseEvent) => { if (e.metaKey || e.ctrlKey) return; e.preventDefault(); navigate(to); onNavigate?.(); }}>{children}</a>;
}

type Place = ModuleId | 'home' | 'settings' | 'members';

function currentModule(path: string): Place {
  // Old addresses from before «ویترین مجازی» held offers and chat.
  const legacy: Record<string, ModuleId> = { offers: 'storefront', chat: 'storefront' };
  const first = path.split('/')[1] ?? '';
  if (legacy[first]) return legacy[first];
  if (first === 'settings' || first === 'members') return first;
  return (MODULES.find((m) => m.route === `/${first}`)?.id ?? 'home') as Place;
}

function NavList({ active, onNavigate }: { active: Place; onNavigate?: () => void }) {
  const s = useChatSession();
  const item = (to: string, on: boolean, icon: MenuIconName, label: string, extra?: ReactNode) =>
    <Link key={to} to={to} className={`nav-item${on ? ' on' : ''}`} onNavigate={onNavigate}><span className="nav-ico"><MenuIcon name={icon} /></span><span className="nav-label">{label}</span>{extra}</Link>;
  return <nav className="side-nav" aria-label="بخش‌های پنل">
    {item('/', active === 'home', 'today', 'امروز')}
    <p className="nav-group">بخش‌ها</p>
    {MODULES.filter((m) => m.nav !== false).map((m) => item(m.route, active === m.id, MODULE_ICON[m.id] ?? 'storefront', m.title,
      (m.status === 'design' || m.status === 'blocked') ? <small className="nav-soon">به‌زودی</small> : undefined))}
    <p className="nav-group">کسب‌وکار</p>
    {item('/settings', active === 'settings', 'settings', 'تنظیمات و نوع کسب‌وکار')}
    {ADMIN_KEYS.some((k) => s.can(k)) && item('/members', active === 'members', 'members', 'اعضا و دسترسی‌ها')}
    <div className="nav-foot">
      <a className="nav-item" href="https://explore.mlino.site/"><span className="nav-ico"><MenuIcon name="customer-view" /></span><span className="nav-label">دیدن نسخه‌ی مشتری</span></a>
      <a className="nav-item" href="https://app.mlino.site/"><span className="nav-ico"><MenuIcon name="start" /></span><span className="nav-label">صفحه‌ی شروع ملینو</span></a>
      {s.me && <button type="button" className="nav-item nav-logout" onClick={() => { onNavigate?.(); void s.logout(); }}><span className="nav-ico"><MenuIcon name="logout" /></span><span className="nav-label">خروج از حساب</span></button>}
    </div>
  </nav>;
}

export default function Shell() {
  const ws = useWorkspace();
  const session = useChatSession();
  // The business on screen is the one the member belongs to (D-57), never picked by its name; the demo falls back to
  // a fictional published business until someone logs in.
  const published = usePublished(session.org?.organizationId ?? null);
  const [drawer, setDrawer] = useState(false);
  const active = currentModule(ws.path);
  // In the business app, a tapped «new messages» notification opens the conversations.
  useEffect(() => (inApp() ? onNative(RUNNER, 'backgroundRunnerNotificationReceived', () => ws.navigate('/storefront/chat')) : undefined), []); // eslint-disable-line react-hooks/exhaustive-deps
  const sub = ws.path.split('/')[2] ?? '';
  const pub = published.status === 'ready' ? published.business : published.status === 'loading' ? undefined : null;

  let page: ReactNode;
  switch (active) {
    case 'accounting': page = <AccountingModule tab={sub} />; break;
    case 'inventory': page = <InventoryModule tab={sub} />; break;
    case 'products': page = session.me && session.org && session.can('catalog_item.manage') ? <ProductEditor /> : <ProductsPage state={published} />; break;
    case 'storefront': page = <StorefrontSection rest={ws.path.split('/').slice(2).filter(Boolean)} published={published} />; break;
    case 'plan': page = <PlanPage />; break;
    case 'crm': page = <CrmModule tab={sub} />; break;
    case 'content': page = <LockedModule id={active} />; break;
    case 'settings': page = <SettingsPage />; break;
    case 'members': page = <MembersPage />; break;
    default: page = <Home published={pub} />;
  }

  const businessName = (session.org?.name ?? pub?.name ?? ws.book.settings.businessName).replace(/\s*\(آزمایشی\)/, '');

  return <PackProvider business={pub}><div className="shell">
    <header className="top">
      <button type="button" className="icon-btn menu-btn" onClick={() => setDrawer(true)} aria-label="فهرست ماژول‌ها">☰</button>
      <Link to="/" className="brand"><img src="/logo.png" alt="" width="34" height="34" /></Link>
      <div className="title"><strong>{businessName}</strong><small>{session.me ? `عضو …${session.me.phoneHint.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])}` : DEMO_MEMBER.name} — {jDateLong(ws.today)}</small></div>
      <span className="demo-tag">نمایشی</span>
    </header>

    <aside className="sidebar"><NavList active={active} /></aside>
    {drawer && <div className="drawer-backdrop" onClick={() => setDrawer(false)}>
      <div className="drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="ماژول‌ها">
        <div className="drawer-head"><strong>ملینو · کسب‌وکار</strong><button type="button" className="icon-btn" onClick={() => setDrawer(false)} aria-label="بستن">✕</button></div>
        <NavList active={active} onNavigate={() => setDrawer(false)} />
      </div>
    </div>}

    <main className="main">
      <p className="demo-banner">نسخه‌ی نمایشی: حسابداری، انبار و مشتریان، دفترهای نمونه‌ی یک کافه‌اند و ثبت‌های تو فقط روی همین مرورگر می‌ماند. محصولات، ویترین و آفرها مال خود کسب‌وکارند. <button type="button" className="link" onClick={() => { if (window.confirm('همه‌ی ثبت‌های تو پاک و داده‌های نمونه از نو ساخته شود؟')) ws.resetDemo(); }}>شروع دوباره</button></p>
      {page}
    </main>

    <BottomBar active={active} onMore={() => setDrawer(true)} />

    <Assistant published={pub} />
    {ws.toast && <div className="toast" role="status">{ws.toast}</div>}
  </div></PackProvider>;
}
