import { describe, expect, it } from 'vitest';
import { EMPTY_MEMORY, GAP_MS, QUIET_MS, outcome, pickTip, reengaged, shown, type Tip } from './coach';

const tip = (id: string): Tip => ({ id, text: id, fromData: false });
const tips = [tip('a'), tip('b'), tip('c')];

describe('gentle coaching', () => {
  it('offers one unseen tip at a time, with a quiet gap between tips', () => {
    let m = EMPTY_MEMORY;
    const t0 = 1_000_000_000;
    const first = pickTip(tips, m, t0)!;
    expect(first.id).toBe('a');
    m = shown(m, first, t0);
    expect(pickTip(tips, m, t0 + 10_000)).toBeNull();
    expect(pickTip(tips, m, t0 + GAP_MS)!.id).toBe('b');
  });

  it('two ignored tips in a row silence it for a day; using a tip or opening the assistant brings it back', () => {
    const t0 = 2_000_000_000;
    let m = shown(EMPTY_MEMORY, tip('a'), t0);
    m = outcome(m, 'ignored', t0 + 14_000);
    expect(m.quietUntil).toBe(0);
    m = shown(m, tip('b'), t0 + GAP_MS);
    m = outcome(m, 'closed', t0 + GAP_MS + 1000);
    expect(pickTip(tips, m, t0 + 2 * GAP_MS)).toBeNull();
    expect(m.quietUntil).toBe(t0 + GAP_MS + 1000 + QUIET_MS);
    expect(pickTip(tips, reengaged(m), t0 + 3 * GAP_MS)!.id).toBe('c');
    expect(outcome(m, 'used', t0).ignoredStreak).toBe(0);
  });

  it('never repeats a tip it has already shown', () => {
    let m = EMPTY_MEMORY;
    for (const [i, t] of tips.entries()) m = shown(m, t, i * GAP_MS);
    expect(pickTip(tips, m, 10 * GAP_MS)).toBeNull();
  });
});
