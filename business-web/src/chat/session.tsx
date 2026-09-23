import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, type AuthConfig, type ChatSummary, type Me, type Organization } from './api';

// Member login (Core identity, D-74) and the chat module's aggregate summary for the shell.
// Login here proves a person; what they may do is decided per request by membership and grant (D-57, D-66).

type ChatSession = Readonly<{
  ready: boolean;
  config: AuthConfig | null;
  me: Me['person'];
  organizations: readonly Organization[];
  orgId: string | null;
  org: Organization | null;
  summary: ChatSummary | null;
  setOrgId: (id: string) => void;
  refresh: () => Promise<void>;
  refreshSummary: () => Promise<void>;
  logout: (all?: boolean) => Promise<void>;
}>;

const Ctx = createContext<ChatSession | null>(null);
const ORG_KEY = 'mlino.panel.chatOrg';

export function ChatSessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [config, setConfig] = useState<AuthConfig | null>(null);
  const [me, setMe] = useState<Me['person']>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [orgId, setOrgIdState] = useState<string | null>(() => { try { return localStorage.getItem(ORG_KEY); } catch { return null; } });
  const [summary, setSummary] = useState<ChatSummary | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [cfg, who] = await Promise.all([api<AuthConfig>('GET', '/auth/config'), api<Me>('GET', '/auth/me')]);
      setConfig(cfg);
      setMe(who.person);
      const orgs = (who.organizations ?? []).filter((o) => o.published && o.canChat);
      setOrganizations(orgs);
      setOrgIdState((cur) => (cur && orgs.some((o) => o.organizationId === cur) ? cur : (orgs.find((o) => /نیلوفر/.test(o.name)) ?? orgs[0])?.organizationId ?? null));
    } catch {
      setMe(null);
    } finally {
      setReady(true);
    }
  }, []);

  const org = organizations.find((o) => o.organizationId === orgId) ?? null;

  const refreshSummary = useCallback(async () => {
    if (!me || !org) { setSummary(null); return; }
    try { setSummary(await api<ChatSummary>('GET', `/biz/${org.organizationId}/chat/summary`)); } catch { setSummary(null); }
  }, [me, org]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    void refreshSummary();
    if (!me || !org) return undefined;
    const t = window.setInterval(() => { if (document.visibilityState === 'visible') void refreshSummary(); }, 30_000);
    return () => window.clearInterval(t);
  }, [refreshSummary, me, org]);

  const setOrgId = (id: string) => { setOrgIdState(id); try { localStorage.setItem(ORG_KEY, id); } catch { /* per-viewer convenience only */ } };

  const logout = async (all = false) => {
    try { await api('POST', all ? '/auth/logout-all' : '/auth/logout'); } catch { /* the cookie is cleared server-side when reachable */ }
    setMe(null); setOrganizations([]); setSummary(null);
  };

  const value = useMemo(() => ({ ready, config, me, organizations, orgId, org, summary, setOrgId, refresh, refreshSummary, logout }), [ready, config, me, organizations, orgId, org, summary, refresh, refreshSummary]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useChatSession(): ChatSession {
  const v = useContext(Ctx);
  if (!v) throw new Error('ChatSessionProvider missing');
  return v;
}
