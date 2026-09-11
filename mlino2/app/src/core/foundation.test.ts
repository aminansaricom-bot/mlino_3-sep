import { describe, expect, it } from 'vitest';
import { allowsFoundation, foundationExperience, foundationReducer, initialFoundation, IDLE_LIMIT_MS, SESSION_LIMIT_MS } from './foundation';
import type { FoundationCommand, FoundationState } from './foundation';
import { bindFoundationEnvironment } from './foundationEnvironment';

function step(state: FoundationState, command: FoundationCommand, now = 100, foreground = true, permitted = true) {
  return foundationReducer(state, { command, now, foreground, permitted });
}
function active() { return step(step(initialFoundation(), 'start', 0), 'accept', 1); }

describe('Core foundation authority', () => {
  it('has no intent or business authority before or after consent', () => {
    for (const state of [initialFoundation(), step(initialFoundation(), 'start'), active(), step(active(), 'pause'), step(active(), 'done')]) {
      expect(state.intent).toBeNull();
      expect(foundationExperience(state)).toMatchObject({ canInterpret: false, canMatch: false, canOpenBusiness: false });
    }
  });
  it.each(['accept', 'resume', 'activity'] as const)('rejects %s before explicit entry', command => {
    expect(step(initialFoundation(), command)).toEqual(initialFoundation());
  });
  it('requires scoped consent after entry and before active state', () => {
    const pending = step(initialFoundation(), 'start');
    expect(pending.phase).toBe('consent');
    expect(pending.consent).toBe(false);
    expect(step(pending, 'resume')).toEqual(pending);
    expect(step(pending, 'accept').phase).toBe('active');
  });
  it('does not re-enter an existing session or extend its start time', () => {
    const state = active();
    expect(step(state, 'start', 500)).toEqual(state);
  });
  it('enforces permission before accepting consent', () => {
    expect(step(step(initialFoundation(), 'start'), 'accept', 101, true, false)).toMatchObject({ phase: 'closed', consent: false, session: null, endedBy: 'permission' });
  });
  it('does not accept entry/consent/resume while hidden', () => {
    expect(step(initialFoundation(), 'start', 0, false).phase).toBe('idle');
    const pending = step(initialFoundation(), 'start');
    expect(step(pending, 'accept', 101, false).consent).toBe(false);
    const paused = step(active(), 'hidden', 101, false);
    expect(step(paused, 'resume', 102, false).phase).toBe('paused');
  });
  it.each(['decline', 'withdraw', 'done', 'dismiss', 'navigate'] as const)('%s clears session/consent and rejects late commands', command => {
    const before = command === 'decline' ? step(initialFoundation(), 'start') : active();
    const closed = step(before, command);
    expect(closed).toMatchObject({ phase: 'closed', session: null, consent: false, intent: null });
    for (const late of ['accept', 'resume', 'activity', 'visible', 'check'] as const) expect(step(closed, late)).toEqual(closed);
    expect(step(closed, 'start').phase).toBe('consent');
    expect(step(closed, 'start').consent).toBe(false);
  });
  it('permission withdrawal closes an active session even on a timer event', () => {
    expect(step(active(), 'check', 100, true, false)).toMatchObject({ phase: 'closed', session: null, endedBy: 'permission' });
  });
  it('fails closed for invalid and backwards time', () => {
    expect(step(active(), 'check', NaN).endedBy).toBe('expired');
    expect(step(active(), 'check', 0).endedBy).toBe('expired');
  });
  it.each(['localhost', '127.0.0.1', '[::1]', '::1'])('permits the local shell at %s', hostname => {
    expect(allowsFoundation(hostname, false)).toBe(true);
  });
  it('does not turn production host or role text into local permission', () => {
    expect(allowsFoundation('example.com', false)).toBe(false);
    expect(allowsFoundation('admin', false)).toBe(false);
    expect(allowsFoundation('192.168.1.10', true)).toBe(true);
  });
});

describe('Core session lifecycle', () => {
  it('hidden pauses once and visibility never resumes or renews activity', () => {
    const before = active();
    const paused = step(before, 'hidden', 100, false);
    expect(paused.phase).toBe('paused');
    expect(paused.generation).toBeGreaterThan(before.generation);
    expect(step(paused, 'hidden', 110, false)).toEqual(paused);
    expect(step(paused, 'visible', 120)).toEqual(paused);
    expect(step(paused, 'check', 130)).toEqual(paused);
  });
  it('explicit Resume rechecks authority and preserves absolute start time', () => {
    const paused = step(active(), 'pause', 100);
    const resumed = step(paused, 'resume', 200);
    expect(resumed).toMatchObject({ phase: 'active', session: { startedAt: 0, lastActivityAt: 200 } });
    expect(resumed.generation).toBeGreaterThan(paused.generation);
  });
  it('expires exactly at inactivity deadline, including hidden time', () => {
    const paused = step(active(), 'hidden', 2, false);
    expect(step(paused, 'check', IDLE_LIMIT_MS, false).phase).toBe('paused');
    expect(step(paused, 'resume', IDLE_LIMIT_MS + 1).endedBy).toBe('expired');
  });
  it('user activity cannot extend the absolute deadline', () => {
    let state = active();
    for (let now = 1_000_000; now < SESSION_LIMIT_MS; now += 1_000_000) state = step(state, 'activity', now);
    expect(state.phase).toBe('active');
    expect(step(state, 'activity', SESSION_LIMIT_MS).endedBy).toBe('expired');
  });
  it('ordinary check/visibility cannot reset inactivity while active', () => {
    const before = active();
    expect(step(before, 'check', 1000)).toEqual(before);
    expect(step(before, 'visible', 1100)).toEqual(before);
    expect(step(before, 'check', IDLE_LIMIT_MS + 1).phase).toBe('closed');
  });
  it('expiry is checked before any deliberate action can renew authority', () => {
    for (const command of ['start', 'accept', 'resume', 'activity'] as const) {
      expect(step(active(), command, IDLE_LIMIT_MS + 1).endedBy).toBe('expired');
    }
  });
});

describe('lifecycle adapter integration', () => {
  it('drives the reducer, disposes on navigation, and removes subscriptions idempotently', () => {
    let state = active();
    const documentTarget = new EventTarget();
    const windowTarget = new EventTarget();
    const doc = {
      visibilityState: 'visible' as DocumentVisibilityState,
      addEventListener: documentTarget.addEventListener.bind(documentTarget),
      removeEventListener: documentTarget.removeEventListener.bind(documentTarget),
    };
    let tick = () => {};
    let cleared = 0;
    let calls = 0;
    const dispose = bindFoundationEnvironment({
      document: doc, window: windowTarget,
      every: callback => { tick = callback; return () => { cleared++; }; },
    }, command => {
      calls++;
      state = step(state, command, 100, doc.visibilityState === 'visible');
    });
    doc.visibilityState = 'hidden';
    documentTarget.dispatchEvent(new Event('visibilitychange'));
    expect(state.phase).toBe('paused');
    doc.visibilityState = 'visible';
    documentTarget.dispatchEvent(new Event('visibilitychange'));
    tick();
    expect(state.phase).toBe('paused');
    state = step(state, 'resume', 100);
    windowTarget.dispatchEvent(new Event('pagehide'));
    expect(state).toMatchObject({ phase: 'closed', session: null, endedBy: 'navigation' });
    documentTarget.dispatchEvent(new Event('visibilitychange'));
    expect(state.phase).toBe('closed');
    dispose();
    dispose();
    const previousCalls = calls;
    documentTarget.dispatchEvent(new Event('visibilitychange'));
    windowTarget.dispatchEvent(new Event('pagehide'));
    expect(calls).toBe(previousCalls);
    expect(cleared).toBe(1);
  });
});
