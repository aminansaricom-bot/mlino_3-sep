import { describe, expect, it } from 'vitest';
import { IDLE_MS, MAX_TIPS_PER_VISIT, greeting, mayTip, nextTip, resultLine } from './buddyScript';

describe('Melino in the search page', () => {
  it('offers only tips whose action exists here, each once per session', () => {
    const all = new Set(['photo', 'voice', 'live', 'offers', 'saved'] as const);
    expect(nextTip(all, [])?.id).toBe('photo');
    expect(nextTip(new Set(['live'] as const), [])?.id).toBe('live'); // no photo search on this server → no photo tip
    expect(nextTip(new Set(['live'] as const), ['live'])?.id).toBe('chat'); // a tip without an action is always possible
    expect(nextTip(all, ['photo', 'live', 'voice', 'offers', 'chat', 'saved'])).toBeNull();
  });

  it('stays quiet while the person is busy, after closing, and after three tips', () => {
    const calm = { idleFor: IDLE_MS, bubbleOpen: false, quiet: false, tipsThisVisit: 0, typing: false };
    expect(mayTip(calm)).toBe(true);
    expect(mayTip({ ...calm, idleFor: IDLE_MS - 1 })).toBe(false);
    expect(mayTip({ ...calm, bubbleOpen: true })).toBe(false);
    expect(mayTip({ ...calm, quiet: true })).toBe(false);
    expect(mayTip({ ...calm, typing: true })).toBe(false);
    expect(mayTip({ ...calm, tipsThisVisit: MAX_TIPS_PER_VISIT })).toBe(false);
  });

  it('greets fully once, then briefly; says what was found', () => {
    expect(greeting(1)).toContain('من ملینو هستم');
    expect(greeting(2)).not.toContain('من ملینو هستم');
    expect(greeting(3)).not.toBe(greeting(2));
    expect(resultLine(' قهوه ', { businesses: 0, products: 0 })).toContain('چیزی پیدا نکردم');
    expect(resultLine('قهوه', { businesses: 3, products: 16 })).toContain('«قهوه»');
  });
});
