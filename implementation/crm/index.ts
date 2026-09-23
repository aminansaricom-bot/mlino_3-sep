// MLINO CRM module (C1) under consent policy R8-a level A (owner decision D-72, 2026-09-23).
// Module, not Core (ADR-0011); storage separate from Core (D-71). Pure: no database, no network.
//
// What level A allows here, and nothing more:
//  • only customers the business itself signs up, each with a recorded consent (who recorded it,
//    how, which purposes, which policy version) — never data taken from platforms (levels B/C);
//  • every personal record has an explicit expiry (R8-a §3.3); past it, the record is closed and
//    must be renewed with fresh consent or erased;
//  • visits/notes are written only while consent is active; marketing use needs its own opt-in;
//  • withdrawing membership consent or an erase request deletes the person for real (§3.7) —
//    the erasure log keeps only an opaque id, a date and a reason code, never the person;
//  • every read of an individual profile is logged (§3.5);
//  • insights are aggregate; businesses in sensitive categories (health…) cannot enable CRM (§3.10).

export type Purpose = 'membership' | 'marketing';
export type ConsentSource = 'in_store_form' | 'qr_form' | 'phone_recorded';

export type Consent = Readonly<{
  purposes: readonly Purpose[];
  source: ConsentSource;
  policyVersion: string;
  grantedAt: string;
  expiresAt: string;
  recordedBy: string;
}>;

export type Customer = Readonly<{
  id: string;
  displayName: string;
  phone?: string;
  birthMonth?: number;
  tags: readonly string[];
  note?: string;
  /** Optional link to the accounting customer (module → module, declared one-way). */
  accountingPartyId?: string;
  consent: Consent;
  createdAt: string;
}>;

export type Visit = Readonly<{ id: string; customerId: string; date: string; amount?: number; source: 'manual' | 'invoice'; ref?: string }>;
export type Erasure = Readonly<{ ref: string; date: string; reason: 'withdrawn' | 'request' | 'expired' }>;
export type AccessEntry = Readonly<{ customerId: string; by: string; at: string; purpose: 'view' | 'edit' | 'export' }>;

export type CrmErrorCode = 'CONSENT_REQUIRED' | 'CONSENT_INACTIVE' | 'CONSENT_INVALID' | 'CUSTOMER_UNKNOWN' | 'CUSTOMER_EXISTS' | 'INPUT_INVALID' | 'SENSITIVE_CATEGORY' | 'DATE_INVALID';

export class CrmError extends Error {
  constructor(readonly code: CrmErrorCode, message: string) { super(`${code}: ${message}`); this.name = 'CrmError'; }
}

export const POLICY_VERSION = 'R8-a/A-2026-09-23';
/** Longest a single consent may run before it must be renewed. */
export const MAX_CONSENT_MONTHS = 24;
/** Business categories where CRM stays off (R8-a §3.10). */
export const SENSITIVE_CATEGORIES = ['health', 'clinic', 'dental', 'medical', 'pharmacy', 'beauty_medical', 'psychology'] as const;

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const ID = /^[A-Za-z0-9_-]{1,64}$/;
const PHONE = /^09\d{9}$/;

function date(v: unknown, field = 'date'): string {
  if (typeof v !== 'string' || !ISO.test(v) || Number.isNaN(Date.parse(`${v}T00:00:00Z`))) throw new CrmError('DATE_INVALID', field);
  return v;
}
export function addMonths(iso: string, months: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}
function text(v: unknown, field: string, max: number, optional = false): string | undefined {
  if (v === undefined || v === null || v === '') { if (optional) return undefined; throw new CrmError('INPUT_INVALID', `${field} required`); }
  if (typeof v !== 'string' || v.trim().length === 0 || v.length > max) throw new CrmError('INPUT_INVALID', `${field} must be 1..${max} characters`);
  return v.trim();
}

/** Opaque, non-reversible reference for the erasure log (the log must not keep the person). */
function opaque(id: string, salt: string): string {
  let h = 2166136261;
  for (const ch of `${salt}:${id}`) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return `erased-${(h >>> 0).toString(36)}`;
}

export type CrmOptions = Readonly<{ businessCategory?: string | null; newId?: () => string; salt?: string }>;

export class Crm {
  private readonly customers = new Map<string, Customer>();
  private readonly visits: Visit[] = [];
  private readonly erasures: Erasure[] = [];
  private readonly access: AccessEntry[] = [];
  private readonly newId: () => string;
  private readonly salt: string;
  readonly enabled: boolean;

  constructor(options: CrmOptions = {}) {
    const cat = (options.businessCategory ?? '').toLowerCase();
    this.enabled = !SENSITIVE_CATEGORIES.some((s) => cat.includes(s));
    let n = 0;
    this.newId = options.newId ?? (() => `V${(n += 1)}`);
    this.salt = options.salt ?? 'mlino-demo';
  }

  private guard(): void { if (!this.enabled) throw new CrmError('SENSITIVE_CATEGORY', 'CRM is off for sensitive business categories (R8-a §3.10)'); }

  /** A customer exists only together with a valid membership consent. */
  register(input: Readonly<Omit<Customer, 'consent' | 'tags'> & { tags?: readonly string[]; consent: Consent }>): Customer {
    this.guard();
    if (typeof input.id !== 'string' || !ID.test(input.id)) throw new CrmError('INPUT_INVALID', 'id');
    if (this.customers.has(input.id)) throw new CrmError('CUSTOMER_EXISTS', input.id);
    const consent = this.validConsent(input.consent);
    const phone = text(input.phone, 'phone', 11, true);
    if (phone && !PHONE.test(phone)) throw new CrmError('INPUT_INVALID', 'phone must look like 09xxxxxxxxx');
    if (input.birthMonth !== undefined && (!Number.isInteger(input.birthMonth) || input.birthMonth < 1 || input.birthMonth > 12)) throw new CrmError('INPUT_INVALID', 'birthMonth');
    const customer: Customer = {
      id: input.id,
      displayName: text(input.displayName, 'displayName', 60)!,
      ...(phone ? { phone } : {}),
      ...(input.birthMonth ? { birthMonth: input.birthMonth } : {}),
      tags: this.cleanTags(input.tags ?? []),
      ...(input.note ? { note: text(input.note, 'note', 200) } : {}),
      ...(input.accountingPartyId ? { accountingPartyId: input.accountingPartyId } : {}),
      consent,
      createdAt: date(input.createdAt, 'createdAt'),
    };
    this.customers.set(customer.id, customer);
    return customer;
  }

  private validConsent(c: Consent | undefined): Consent {
    if (!c) throw new CrmError('CONSENT_REQUIRED', 'no consent recorded');
    if (!c.purposes?.includes('membership')) throw new CrmError('CONSENT_REQUIRED', 'membership consent is required to keep a profile');
    if (!c.purposes.every((p) => p === 'membership' || p === 'marketing')) throw new CrmError('CONSENT_INVALID', 'purposes');
    if (!['in_store_form', 'qr_form', 'phone_recorded'].includes(c.source)) throw new CrmError('CONSENT_INVALID', 'source');
    const granted = date(c.grantedAt, 'grantedAt');
    const expires = date(c.expiresAt, 'expiresAt');
    if (expires <= granted || expires > addMonths(granted, MAX_CONSENT_MONTHS)) throw new CrmError('CONSENT_INVALID', `expiry must be after grant and within ${MAX_CONSENT_MONTHS} months`);
    return { purposes: [...new Set(c.purposes)], source: c.source, policyVersion: text(c.policyVersion, 'policyVersion', 40)!, grantedAt: granted, expiresAt: expires, recordedBy: text(c.recordedBy, 'recordedBy', 60)! };
  }

  private cleanTags(tags: readonly string[]): string[] {
    if (tags.length > 8) throw new CrmError('INPUT_INVALID', 'at most 8 tags');
    return [...new Set(tags.map((t) => text(t, 'tag', 24)!))];
  }

  private active(id: string, on: string): Customer {
    const c = this.customers.get(id);
    if (!c) throw new CrmError('CUSTOMER_UNKNOWN', id);
    if (on > c.consent.expiresAt || on < c.consent.grantedAt) throw new CrmError('CONSENT_INACTIVE', `consent of ${id} is not active on ${on}`);
    return c;
  }

  consentActive(id: string, on: string): boolean {
    const c = this.customers.get(id);
    return !!c && on >= c.consent.grantedAt && on <= c.consent.expiresAt;
  }
  marketingAllowed(id: string, on: string): boolean {
    return this.consentActive(id, on) && this.customers.get(id)!.consent.purposes.includes('marketing');
  }

  recordVisit(input: Readonly<{ customerId: string; date: string; amount?: number; source?: Visit['source']; ref?: string }>): Visit {
    this.guard();
    const on = date(input.date);
    this.active(input.customerId, on);
    if (input.amount !== undefined && (!Number.isSafeInteger(input.amount) || input.amount < 0)) throw new CrmError('INPUT_INVALID', 'amount');
    const visit: Visit = { id: this.newId(), customerId: input.customerId, date: on, ...(input.amount !== undefined ? { amount: input.amount } : {}), source: input.source ?? 'manual', ...(input.ref ? { ref: input.ref } : {}) };
    this.visits.push(visit);
    return visit;
  }

  update(input: Readonly<{ customerId: string; date: string; tags?: readonly string[]; note?: string | null; phone?: string | null }>): Customer {
    this.guard();
    const c = this.active(input.customerId, date(input.date));
    let phone = c.phone;
    if (input.phone !== undefined) {
      phone = input.phone ? text(input.phone, 'phone', 11) : undefined;
      if (phone && !PHONE.test(phone)) throw new CrmError('INPUT_INVALID', 'phone');
    }
    const note = input.note === undefined ? c.note : input.note ? text(input.note, 'note', 200) : undefined;
    const { phone: _p, note: _n, ...rest } = c;
    const next: Customer = { ...rest, ...(phone ? { phone } : {}), ...(note ? { note } : {}), tags: input.tags ? this.cleanTags(input.tags) : c.tags };
    this.customers.set(c.id, next);
    return next;
  }

  /** Fresh consent for another period; purposes may change (e.g. marketing added or dropped). */
  renew(input: Readonly<{ customerId: string; consent: Consent }>): Customer {
    this.guard();
    const c = this.customers.get(input.customerId);
    if (!c) throw new CrmError('CUSTOMER_UNKNOWN', input.customerId);
    const next = { ...c, consent: this.validConsent(input.consent) };
    this.customers.set(c.id, next);
    return next;
  }

  /** Marketing can be withdrawn on its own; withdrawing membership erases the person. */
  withdraw(input: Readonly<{ customerId: string; purpose: Purpose; date: string }>): Customer | null {
    const c = this.customers.get(input.customerId);
    if (!c) throw new CrmError('CUSTOMER_UNKNOWN', input.customerId);
    if (input.purpose === 'membership') { this.erase({ customerId: c.id, date: input.date, reason: 'withdrawn' }); return null; }
    const next = { ...c, consent: { ...c.consent, purposes: c.consent.purposes.filter((p) => p !== 'marketing') } };
    this.customers.set(c.id, next);
    return next;
  }

  /** Real deletion: profile, visits and access entries go; the log keeps an opaque reference only. */
  erase(input: Readonly<{ customerId: string; date: string; reason: Erasure['reason'] }>): Erasure {
    if (!this.customers.has(input.customerId)) throw new CrmError('CUSTOMER_UNKNOWN', input.customerId);
    this.customers.delete(input.customerId);
    for (let i = this.visits.length - 1; i >= 0; i -= 1) if (this.visits[i].customerId === input.customerId) this.visits.splice(i, 1);
    for (let i = this.access.length - 1; i >= 0; i -= 1) if (this.access[i].customerId === input.customerId) this.access.splice(i, 1);
    const entry: Erasure = { ref: opaque(input.customerId, this.salt), date: date(input.date), reason: input.reason };
    this.erasures.push(entry);
    return entry;
  }

  /**
   * Restores an erasure-log line when a store is replayed after a real deletion (the person's own
   * history is gone from the store, so only the opaque log line remains to replay).
   */
  restoreErasure(entry: Erasure): void {
    if (!/^erased-[a-z0-9]+$/.test(entry.ref)) throw new CrmError('INPUT_INVALID', 'erasure ref');
    this.erasures.push({ ref: entry.ref, date: date(entry.date), reason: entry.reason });
  }

  /** The opaque reference an erasure of this id will carry (lets a store drop the id before logging). */
  erasureRef(customerId: string): string { return opaque(customerId, this.salt); }

  /** Reading one person is logged. Lists and aggregates below do not expose notes or phones. */
  view(customerId: string, by: string, at: string): Customer {
    this.guard();
    const c = this.customers.get(customerId);
    if (!c) throw new CrmError('CUSTOMER_UNKNOWN', customerId);
    this.access.push({ customerId, by, at, purpose: 'view' });
    return c;
  }

  /**
   * The full profile, but only if this reader already has a logged view of this person in the last
   * ten minutes — so a screen that re-renders never reads a person without an access entry.
   */
  readLogged(customerId: string, by: string, now: Date): Customer {
    const c = this.customers.get(customerId);
    if (!c) throw new CrmError('CUSTOMER_UNKNOWN', customerId);
    const last = [...this.access].reverse().find((a) => a.customerId === customerId && a.by === by);
    if (!last || now.getTime() - Date.parse(last.at) > 10 * 60_000) throw new CrmError('CONSENT_REQUIRED', 'open the profile (a logged view) before reading it');
    return c;
  }

  listCustomers(): readonly Omit<Customer, 'phone' | 'note'>[] {
    return [...this.customers.values()].map(({ phone: _p, note: _n, ...rest }) => rest);
  }
  visitsOf(customerId: string): readonly Visit[] { return this.visits.filter((v) => v.customerId === customerId); }
  allVisits(): readonly Visit[] { return this.visits; }
  erasureLog(): readonly Erasure[] { return this.erasures; }
  accessLog(): readonly AccessEntry[] { return this.access; }
  customerByPartyId(partyId: string): Customer | undefined { return [...this.customers.values()].find((c) => c.accountingPartyId === partyId); }
}

// ---------- aggregate insights (level A) ----------

const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

export function crmSummary(crm: Crm, today: string, monthFrom: string) {
  const all = crm.listCustomers();
  const active = all.filter((c) => crm.consentActive(c.id, today));
  const lastVisit = new Map<string, string>();
  for (const v of crm.allVisits()) if ((lastVisit.get(v.customerId) ?? '') < v.date) lastVisit.set(v.customerId, v.date);
  const visitsThisMonth = crm.allVisits().filter((v) => v.date >= monthFrom && v.date <= today);
  const returning = new Set(visitsThisMonth.map((v) => v.customerId)).size;
  const tags = new Map<string, number>();
  for (const c of active) for (const t of c.tags) tags.set(t, (tags.get(t) ?? 0) + 1);
  return {
    members: active.length,
    closed: all.length - active.length,
    newThisMonth: active.filter((c) => c.createdAt >= monthFrom).length,
    marketingOptIn: active.filter((c) => c.consent.purposes.includes('marketing')).length,
    visitsThisMonth: visitsThisMonth.length,
    returningThisMonth: returning,
    inactive30: active.filter((c) => daysBetween(lastVisit.get(c.id) ?? c.createdAt, today) >= 30).length,
    byTag: [...tags.entries()].sort((a, b) => b[1] - a[1]),
  };
}

/** Consents running out soon (renew with fresh consent, or erase). */
export function expiringConsents(crm: Crm, today: string, withinDays = 14) {
  return crm.listCustomers().filter((c) => c.consent.expiresAt >= today && daysBetween(today, c.consent.expiresAt) <= withinDays);
}

/** Past expiry: closed; the only allowed actions are renewal with new consent or erasure. */
export function expiredConsents(crm: Crm, today: string) {
  return crm.listCustomers().filter((c) => c.consent.expiresAt < today);
}

/** Members who opted into marketing and have not come for `days`: a follow-up list inside consent. */
export function followUpList(crm: Crm, today: string, days = 30) {
  const last = new Map<string, string>();
  for (const v of crm.allVisits()) if ((last.get(v.customerId) ?? '') < v.date) last.set(v.customerId, v.date);
  return crm.listCustomers()
    .filter((c) => crm.marketingAllowed(c.id, today))
    .map((c) => ({ ...c, lastVisit: last.get(c.id) ?? null, daysAway: daysBetween(last.get(c.id) ?? c.createdAt, today) }))
    .filter((c) => c.daysAway >= days)
    .sort((a, b) => b.daysAway - a.daysAway);
}
