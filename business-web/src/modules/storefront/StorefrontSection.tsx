import { usePack } from '../../industry/context';
import { useWorkspace } from '../../workspace';
import { useChatSession } from '../../chat/session';
import { StorefrontPage } from '../catalog/CatalogPages';
import OffersManager from '../offers/OffersManager';
import ChatModule from '../chat/ChatModule';
import type { PublishedState } from '../../published';
import { faNum } from '../../format';

// «ویترین مجازی»: everything a nearby customer sees and says — the storefront itself, radius offers (D-77) and the
// conversations with customers (D-73, auto-reply D-75). Chat stays its own module with its own storage; this is
// only where the panel shows it.

const TABS = [['', 'ویترین'], ['offers', 'آفر اطراف'], ['chat', 'گفتگو با مشتری']] as const;

export default function StorefrontSection({ rest, published }: { rest: string[]; published: PublishedState }) {
  const ws = useWorkspace();
  const s = useChatSession();
  const { pack } = usePack();
  // Sensitive trades keep customer chat off, like CRM (R8-a §3.10).
  const tabs = TABS.filter(([id]) => id !== 'chat' || !pack.sensitive);
  const tab = tabs.some(([id]) => id === rest[0]) ? rest[0] : '';
  const pending = s.summary?.pendingQuestions ?? 0;
  const unread = s.summary?.unreadMessages ?? 0;
  return <div className="stack">
    <nav className="segmented section-tabs" aria-label="بخش‌های ویترین مجازی">
      {tabs.map(([id, label]) => <button key={id} type="button" className={tab === id ? 'on' : ''} onClick={() => ws.navigate(id ? `/storefront/${id}` : '/storefront')}>
        {label}{id === 'chat' && unread + pending > 0 && <i className="tab-count">{faNum(unread + pending)}</i>}
      </button>)}
    </nav>
    {tab === 'offers' ? <OffersManager /> : tab === 'chat' ? <ChatModule tab={rest[1] ?? ''} /> : <StorefrontPage state={published} />}
  </div>;
}
