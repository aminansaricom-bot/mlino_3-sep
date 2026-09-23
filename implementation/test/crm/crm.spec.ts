import { Crm, CrmError, POLICY_VERSION, addMonths, crmSummary, expiredConsents, expiringConsents, followUpList } from '../../crm';

const consent = (grantedAt: string, months = 12, purposes: ('membership' | 'marketing')[] = ['membership', 'marketing']) =>
  ({ purposes, source: 'in_store_form' as const, policyVersion: POLICY_VERSION, grantedAt, expiresAt: addMonths(grantedAt, months), recordedBy: 'مالک کافه' });
const code = (fn: () => unknown) => { try { fn(); return 'ok'; } catch (e) { return e instanceof CrmError ? e.code : String(e); } };

function crm() {
  const c = new Crm({ businessCategory: 'cafe' });
  c.register({ id: 'c1', displayName: 'سارا', phone: '09120000001', createdAt: '2026-07-01', tags: ['لاته‌دوست'], consent: consent('2026-07-01') });
  c.register({ id: 'c2', displayName: 'علی', createdAt: '2026-08-15', consent: consent('2026-08-15', 12, ['membership']) });
  return c;
}

describe('CRM under consent level A', () => {
  it('keeps no one without a membership consent, and consent must expire within 24 months', () => {
    const c = crm();
    expect(code(() => c.register({ id: 'x', displayName: 'بی‌رضایت', createdAt: '2026-09-01', consent: undefined as never }))).toBe('CONSENT_REQUIRED');
    expect(code(() => c.register({ id: 'x', displayName: 'فقط بازاریابی', createdAt: '2026-09-01', consent: consent('2026-09-01', 12, ['marketing']) }))).toBe('CONSENT_REQUIRED');
    expect(code(() => c.register({ id: 'x', displayName: 'بی‌انقضا', createdAt: '2026-09-01', consent: consent('2026-09-01', 36) }))).toBe('CONSENT_INVALID');
    expect(code(() => c.register({ id: 'x', displayName: 'تلفن بد', phone: '12345', createdAt: '2026-09-01', consent: consent('2026-09-01') }))).toBe('INPUT_INVALID');
  });

  it('writes visits only while consent is active; marketing needs its own opt-in', () => {
    const c = crm();
    expect(c.recordVisit({ customerId: 'c1', date: '2026-09-20', amount: 1_200_000 }).customerId).toBe('c1');
    expect(code(() => c.recordVisit({ customerId: 'c1', date: '2027-07-02' }))).toBe('CONSENT_INACTIVE');
    expect(c.marketingAllowed('c1', '2026-09-23')).toBe(true);
    expect(c.marketingAllowed('c2', '2026-09-23')).toBe(false);
    c.withdraw({ customerId: 'c1', purpose: 'marketing', date: '2026-09-23' });
    expect(c.marketingAllowed('c1', '2026-09-23')).toBe(false);
    expect(c.consentActive('c1', '2026-09-23')).toBe(true);
  });

  it('withdrawing membership or an erase request deletes the person for real', () => {
    const c = crm();
    c.recordVisit({ customerId: 'c1', date: '2026-09-20' });
    c.view('c1', 'مالک کافه', '2026-09-23T10:00:00Z');
    expect(c.withdraw({ customerId: 'c1', purpose: 'membership', date: '2026-09-23' })).toBeNull();
    expect(c.listCustomers().map((x) => x.id)).toEqual(['c2']);
    expect(c.allVisits()).toHaveLength(0);
    expect(c.accessLog()).toHaveLength(0);
    const log = c.erasureLog();
    expect(log).toHaveLength(1);
    expect(JSON.stringify(log)).not.toContain('سارا');
    expect(JSON.stringify(log)).not.toContain('c1');
    expect(log[0]).toMatchObject({ reason: 'withdrawn', date: '2026-09-23' });
  });

  it('logs every read of a person; lists never carry phone or note', () => {
    const c = crm();
    c.update({ customerId: 'c1', date: '2026-09-23', note: 'ترجیح: شیر گیاهی' });
    expect(c.view('c1', 'مالک کافه', '2026-09-23T10:00:00Z').note).toBe('ترجیح: شیر گیاهی');
    expect(c.accessLog()).toEqual([{ customerId: 'c1', by: 'مالک کافه', at: '2026-09-23T10:00:00Z', purpose: 'view' }]);
    expect(JSON.stringify(c.listCustomers())).not.toMatch(/0912|شیر گیاهی/);
    expect(c.readLogged('c1', 'مالک کافه', new Date('2026-09-23T10:05:00Z')).phone).toBe('09120000001');
    expect(code(() => c.readLogged('c1', 'مالک کافه', new Date('2026-09-23T10:30:00Z')))).toBe('CONSENT_REQUIRED');
    expect(code(() => c.readLogged('c2', 'مالک کافه', new Date('2026-09-23T10:05:00Z')))).toBe('CONSENT_REQUIRED');
  });

  it('is off for sensitive business categories', () => {
    const clinic = new Crm({ businessCategory: 'dental_clinic' });
    expect(clinic.enabled).toBe(false);
    expect(code(() => clinic.register({ id: 'p', displayName: 'بیمار', createdAt: '2026-09-01', consent: consent('2026-09-01') }))).toBe('SENSITIVE_CATEGORY');
  });

  it('aggregate insights, expiring and expired consents, follow-up inside consent', () => {
    const c = crm();
    c.register({ id: 'c3', displayName: 'مینا', createdAt: '2025-10-01', consent: consent('2025-10-01', 12) }); // expires 2026-10-01
    c.register({ id: 'c4', displayName: 'رضا', createdAt: '2025-09-01', consent: consent('2025-09-01', 12) }); // expired 2026-09-01
    c.recordVisit({ customerId: 'c2', date: '2026-09-10' });
    c.recordVisit({ customerId: 'c3', date: '2026-09-22' });
    const s = crmSummary(c, '2026-09-23', '2026-09-23');
    expect(s).toMatchObject({ members: 3, closed: 1, marketingOptIn: 2, inactive30: 1 });
    expect(expiringConsents(c, '2026-09-23').map((x) => x.id)).toEqual(['c3']);
    expect(expiredConsents(c, '2026-09-23').map((x) => x.id)).toEqual(['c4']);
    expect(followUpList(c, '2026-09-23').map((x) => x.id)).toEqual(['c1']);
    c.renew({ customerId: 'c4', consent: consent('2026-09-23', 12, ['membership']) });
    expect(c.consentActive('c4', '2026-09-23')).toBe(true);
  });
});
