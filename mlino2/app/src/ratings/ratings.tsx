import { useCallback, useEffect, useState } from 'react';
import { ChatApiError, chatApi, chatErrorText, faDigits, type ChatConfig } from '../chat/chatApi';
import { Login } from '../chat/ChatPanel';

// Product ratings (D-84): averages and counts come from the server, one rating per signed-in person per product.
// Nothing is estimated on the phone; with no ratings the badge is simply not shown.

export type RatingSummary = Readonly<{ avg: number; count: number; mine: number | null }>;
type Board = Readonly<{ enabled: boolean; items: Readonly<Record<string, RatingSummary>> }>;

const cache = new Map<string, Board>();
const listeners = new Map<string, Set<(b: Board) => void>>();
const inflight = new Map<string, Promise<Board>>();

function publish(orgId: string, board: Board) {
  cache.set(orgId, board);
  listeners.get(orgId)?.forEach((fn) => fn(board));
}

export function loadRatings(orgId: string, force = false): Promise<Board> {
  if (!force && cache.has(orgId)) return Promise.resolve(cache.get(orgId)!);
  const running = inflight.get(orgId);
  if (running && !force) return running;
  const p = chatApi<Board>('GET', `/ratings?organizationId=${encodeURIComponent(orgId)}`)
    .then((b) => { publish(orgId, b); return b; })
    .catch(() => cache.get(orgId) ?? { enabled: false, items: {} })
    .finally(() => inflight.delete(orgId));
  inflight.set(orgId, p);
  return p;
}

/** Ratings of one business's products, shared by every screen that shows them. */
export function useRatings(orgId: string | null | undefined) {
  const [board, setBoard] = useState<Board | null>(() => (orgId ? cache.get(orgId) ?? null : null));
  useEffect(() => {
    if (!orgId) { setBoard(null); return undefined; }
    const set = listeners.get(orgId) ?? new Set();
    set.add(setBoard); listeners.set(orgId, set);
    setBoard(cache.get(orgId) ?? null);
    void loadRatings(orgId);
    return () => { set.delete(setBoard); };
  }, [orgId]);
  const rate = useCallback(async (itemId: string, stars: number | null) => {
    if (!orgId) return;
    const r = await chatApi<{ item: RatingSummary }>('POST', stars === null ? '/ratings/remove' : '/ratings', { organizationId: orgId, catalogItemId: itemId, stars });
    const prev = cache.get(orgId) ?? { enabled: true, items: {} };
    publish(orgId, { enabled: prev.enabled, items: { ...prev.items, [itemId]: r.item } });
  }, [orgId]);
  return { enabled: board?.enabled ?? false, items: board?.items ?? {}, rate };
}

const avgText = (n: number) => n.toLocaleString('fa-IR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** «★ ۴٫۳ (۱۲)» on a product image; nothing when nobody has rated it. */
export function RatingBadge({ summary, className = '' }: { summary?: RatingSummary; className?: string }) {
  if (!summary || summary.count === 0) return null;
  return <span className={`rating-badge ${className}`} aria-label={`امتیاز ${avgText(summary.avg)} از ۵، ${faDigits(String(summary.count))} رأی`}>
    <b aria-hidden="true">★</b>{avgText(summary.avg)}<small>({faDigits(String(summary.count))})</small>
  </span>;
}

/** Five tappable stars for the person's own rating; tapping the same star again removes it. */
export function RateProduct({ orgId, itemId }: { orgId: string; itemId: string }) {
  const { enabled, items, rate } = useRatings(orgId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needLogin, setNeedLogin] = useState(false);
  const [config, setConfig] = useState<ChatConfig | null>(null);
  useEffect(() => { if (needLogin && !config) void chatApi<ChatConfig>('GET', '/auth/config').then(setConfig).catch(() => undefined); }, [needLogin, config]);
  if (!enabled) return null;
  const summary = items[itemId];
  const mine = summary?.mine ?? null;
  const choose = async (stars: number) => {
    setBusy(true); setError(null);
    try { await rate(itemId, mine === stars ? null : stars); setNeedLogin(false); }
    catch (e) {
      if (e instanceof ChatApiError && e.status === 401) setNeedLogin(true); else setError(chatErrorText(e));
    } finally { setBusy(false); }
  };
  return <div className="rate-product">
    <div className="rate-head">
      <strong>امتیاز تو به این محصول</strong>
      {summary && summary.count > 0 && <span className="rate-summary"><bdi>{avgText(summary.avg)}</bdi> از ۵، <bdi>{faDigits(String(summary.count))}</bdi> رأی</span>}
    </div>
    <div className="rate-stars" role="radiogroup" aria-label="امتیاز از ۱ تا ۵">
      {[1, 2, 3, 4, 5].map((s) => <button key={s} type="button" role="radio" aria-checked={mine === s} disabled={busy}
        className={mine !== null && s <= mine ? 'on' : ''} onClick={() => void choose(s)} aria-label={`${faDigits(String(s))} ستاره`}>★</button>)}
    </div>
    {mine !== null && <small className="rate-note">امتیازت ثبت شد؛ برای برداشتن، همان ستاره را دوباره بزن.</small>}
    {needLogin && <div className="rate-login"><small className="rate-note">برای امتیاز دادن اول با شماره‌ی موبایل وارد شو؛ هر نفر فقط یک امتیاز به هر محصول می‌دهد.</small>
      <Login config={config} onDone={() => { setNeedLogin(false); void loadRatings(orgId, true); }} /></div>}
    {error && <small className="rate-error" role="alert">{error}</small>}
  </div>;
}
