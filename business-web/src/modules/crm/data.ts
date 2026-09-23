// CRM demo store: an op log replayed into the engine, like the other modules — with one difference
// required by R8-a §3.7: erasing a person REMOVES every op that carried them from the log; only an
// opaque erasure line is appended. Deletion is real, not a flag, even in the browser demo.

import { Crm, POLICY_VERSION, addMonths, type Consent, type Customer, type Erasure, type Purpose } from '../../crmEngine';
import type { BookData, Op } from '../../book';
import { addDays } from '../../format';

export type CrmOp =
  | Readonly<{ k: 'register'; input: Omit<Customer, 'consent' | 'tags'> & { tags?: readonly string[]; consent: Consent } }>
  | Readonly<{ k: 'visit'; input: { customerId: string; date: string; amount?: number; source?: 'manual' | 'invoice'; ref?: string } }>
  | Readonly<{ k: 'update'; input: { customerId: string; date: string; tags?: readonly string[]; note?: string | null; phone?: string | null } }>
  | Readonly<{ k: 'renew'; input: { customerId: string; consent: Consent } }>
  | Readonly<{ k: 'withdraw-marketing'; input: { customerId: string; date: string } }>
  | Readonly<{ k: 'view'; input: { customerId: string; by: string; at: string } }>
  | Readonly<{ k: 'erasure'; entry: Erasure }>;

export type CrmData = Readonly<{ version: 1; businessCategory: string; ops: readonly CrmOp[] }>;

export const CRM_BUSINESS_CATEGORY = 'cafe';

export function opCustomer(op: CrmOp): string | null {
  switch (op.k) {
    case 'register': return op.input.id;
    case 'erasure': return null;
    default: return op.input.customerId;
  }
}

export function runCrmOp(crm: Crm, op: CrmOp): void {
  switch (op.k) {
    case 'register': crm.register(op.input); return;
    case 'visit': crm.recordVisit(op.input); return;
    case 'update': crm.update(op.input); return;
    case 'renew': crm.renew(op.input); return;
    case 'withdraw-marketing': crm.withdraw({ customerId: op.input.customerId, purpose: 'marketing', date: op.input.date }); return;
    case 'view': crm.view(op.input.customerId, op.input.by, op.input.at); return;
    case 'erasure': crm.restoreErasure(op.entry); return;
  }
}

export function replayCrm(data: CrmData): Crm {
  const crm = new Crm({ businessCategory: data.businessCategory });
  for (const op of data.ops) runCrmOp(crm, op);
  return crm;
}

/** Real deletion in the store: drop every op about the person, append the opaque log line. */
export function eraseFromStore(data: CrmData, crm: Crm, customerId: string, date: string, reason: Erasure['reason']): CrmData {
  const kept = data.ops.filter((op) => opCustomer(op) !== customerId);
  return { ...data, ops: [...kept, { k: 'erasure', entry: { ref: crm.erasureRef(customerId), date, reason } }] };
}

const KEY = 'mlino.crm.demo.v1';
export function loadCrm(): CrmData | null {
  try { const raw = localStorage.getItem(KEY); if (!raw) return null; const d = JSON.parse(raw) as CrmData; return d?.version === 1 && Array.isArray(d.ops) ? d : null; } catch { return null; }
}
export function saveCrm(data: CrmData): void { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* keeps working */ } }
export function clearCrm(): void { try { localStorage.removeItem(KEY); } catch { /* ignore */ } }

/** An invoice to an accounting customer linked to an active member records a visit (declared flow: accounting → CRM). */
export function visitFromAccountingOp(op: Op, crm: Crm, total: number): CrmOp[] {
  if (op.k !== 'invoice' || !op.input.customerId) return [];
  const member = crm.customerByPartyId(op.input.customerId);
  if (!member || !crm.consentActive(member.id, op.input.date)) return [];
  return [{ k: 'visit', input: { customerId: member.id, date: op.input.date, amount: total, source: 'invoice', ref: op.input.id } }];
}

export function consentFor(grantedAt: string, months: number, purposes: Purpose[], source: Consent['source'], recordedBy: string): Consent {
  return { purposes, source, policyVersion: POLICY_VERSION, grantedAt, expiresAt: addMonths(grantedAt, months), recordedBy };
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Fictional members who signed the café's in-store form. Names are invented. */
const PEOPLE: readonly [string, string[], boolean][] = [
  ['سارا م.', ['لاته‌دوست', 'صبحگاهی'], true], ['علی ر.', ['اسپرسو'], false], ['مینا ک.', ['کیک'], true], ['رضا ت.', ['دانشجو'], true],
  ['نگار ف.', ['لاته‌دوست'], true], ['حامد س.', ['صبحگاهی'], false], ['پریسا ج.', ['موهیتو', 'عصرگاهی'], true], ['کاوه ب.', ['اسپرسو', 'صبحگاهی'], true],
  ['لیلا ن.', ['کیک'], false], ['امید ق.', ['دانشجو'], true], ['نسرین د.', ['عصرگاهی'], true], ['بهرام ح.', [], false],
];

export function generateCrmSample(book: BookData, today: string): CrmData {
  const rnd = mulberry32(21);
  const crm = new Crm({ businessCategory: CRM_BUSINESS_CATEGORY });
  const ops: CrmOp[] = [];
  const push = (op: CrmOp) => { runCrmOp(crm, op); ops.push(op); };
  const start = book.ops.find((o) => o.k === 'opening')?.input.date ?? addDays(today, -90);
  PEOPLE.forEach(([name, tags, marketing], i) => {
    // One old member whose consent has run out, one that runs out within two weeks, the rest fresh.
    const joined = i === 11 ? addDays(today, -380) : i === 8 ? addDays(today, -358) : addDays(start, Math.floor(rnd() * 70));
    push({ k: 'register', input: { id: `m-${i + 1}`, displayName: name, tags, createdAt: joined, consent: consentFor(joined, 12, marketing ? ['membership', 'marketing'] : ['membership'], i % 3 === 0 ? 'qr_form' : 'in_store_form', 'مالک کافه') } });
  });
  // The accounting customer who ordered a party, signed up that day with consent.
  const eventInvoice = book.ops.find((o) => o.k === 'invoice' && o.input.customerId === 'event');
  if (eventInvoice && eventInvoice.k === 'invoice') {
    push({ k: 'register', input: { id: 'm-event', displayName: 'خانم احمدی', tags: ['مراسم'], accountingPartyId: 'event', createdAt: eventInvoice.input.date, consent: consentFor(eventInvoice.input.date, 12, ['membership', 'marketing'], 'in_store_form', 'مالک کافه') } });
  }
  // Visits over the period, while each consent is active.
  for (let d = start; d <= today; d = addDays(d, 1)) {
    for (let i = 0; i < PEOPLE.length; i += 1) {
      const id = `m-${i + 1}`;
      const regular = i < 6 ? 0.22 : i < 10 ? 0.08 : 0.03;
      if (rnd() < regular && crm.consentActive(id, d) && d >= (crm.listCustomers().find((c) => c.id === id)?.createdAt ?? d)) {
        push({ k: 'visit', input: { customerId: id, date: d, amount: Math.round((600_000 + rnd() * 2_400_000) / 50_000) * 50_000 } });
      }
    }
  }
  return { version: 1, businessCategory: CRM_BUSINESS_CATEGORY, ops };
}
