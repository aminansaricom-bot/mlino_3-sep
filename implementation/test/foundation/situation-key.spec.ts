import { computeSituationKey } from '../../foundation/event-admission/situation-key';

describe('R5 — computeSituationKey (pure function)', () => {
  it('produces the same key for the same producer + dimensions', () => {
    const a = computeSituationKey('value-engine:capacity', ['org-1', 'resource-A', '2026-08-20']);
    const b = computeSituationKey('value-engine:capacity', ['org-1', 'resource-A', '2026-08-20']);
    expect(a).toBe(b);
  });

  it('produces a different key when any single dimension changes', () => {
    const base = computeSituationKey('value-engine:capacity', ['org-1', 'resource-A', '2026-08-20']);
    expect(computeSituationKey('value-engine:capacity', ['org-2', 'resource-A', '2026-08-20'])).not.toBe(base);
    expect(computeSituationKey('value-engine:capacity', ['org-1', 'resource-B', '2026-08-20'])).not.toBe(base);
    expect(computeSituationKey('value-engine:capacity', ['org-1', 'resource-A', '2026-08-21'])).not.toBe(base);
  });

  it('produces a different key for cross-tenant identical situations (organization is always a dimension)', () => {
    const orgA = computeSituationKey('value-engine:cancellation', ['org-A', 'appt-1']);
    const orgB = computeSituationKey('value-engine:cancellation', ['org-B', 'appt-1']);
    expect(orgA).not.toBe(orgB);
  });

  it('produces a different key across producers even with identical dimensions (no cross-family collision)', () => {
    const a = computeSituationKey('value-engine:capacity', ['org-1', 'x']);
    const b = computeSituationKey('value-engine:cancellation', ['org-1', 'x']);
    expect(a).not.toBe(b);
  });
});
