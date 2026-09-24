import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { PACKS, guessPack, type Pack, type PackId } from './packs';
import type { PublishedBusiness } from '../published';

// The chosen trade pack for the business on screen. Kept per business on this device until module storage exists
// (then it moves server-side with the business's other panel settings). Default: a guess from its published data.

type PackState = Readonly<{ pack: Pack; chosen: boolean; guess: PackId; choose: (id: PackId) => void }>;
const Ctx = createContext<PackState | null>(null);
const key = (orgId: string) => `mlino.panel.pack.${orgId}`;

export function PackProvider({ business, children }: { business: PublishedBusiness | null | undefined; children: ReactNode }) {
  const orgId = business?.organizationId ?? 'demo';
  const guess = useMemo(() => (business ? guessPack(business.name, business.capabilities.map((c) => c.name)) : 'general'), [business]);
  const read = (): PackId | null => { try { const v = localStorage.getItem(key(orgId)); return v && v in PACKS ? (v as PackId) : null; } catch { return null; } };
  const [chosen, setChosen] = useState<PackId | null>(read);
  useEffect(() => { setChosen(read()); }, [orgId]); // eslint-disable-line react-hooks/exhaustive-deps
  const choose = (id: PackId) => { try { localStorage.setItem(key(orgId), id); } catch { /* per-device convenience */ } setChosen(id); };
  const value = useMemo(() => ({ pack: PACKS[chosen ?? guess], chosen: chosen !== null, guess, choose }), [chosen, guess]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePack(): PackState {
  const v = useContext(Ctx);
  return v ?? { pack: PACKS.general, chosen: false, guess: 'general', choose: () => undefined };
}
