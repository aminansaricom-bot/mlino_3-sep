import { describe, expect, it } from 'vitest';
import { foundationReducer, initialFoundation, foundationExperience } from './foundation';
import type { FoundationState, FoundationEvent } from './foundation';

const sources = import.meta.glob<string>(['./*.ts', '!./*.test.ts', '../discovery/*.tsx'], { query: '?raw', import: 'default', eager: true });

describe('مرز وابستگی و حافظه Intent', () => {
  it('Core و نمای دستیار هیچ مسیر داده کسب‌وکار، V1 یا ذخیره‌سازی ندارند', () => {
    expect(Object.keys(sources).length).toBeGreaterThanOrEqual(6);
    for (const source of Object.values(sources)) {
      expect(source).not.toMatch(/\b(localStorage|sessionStorage|indexedDB|fetch|XMLHttpRequest|WebSocket|sendBeacon)\b/);
      expect(source).not.toMatch(/\b(console\.(log|info|debug)|location\.(search|hash)|history\.(pushState|replaceState))\b/);
      const imports = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(match => match[1]);
      for (const path of imports) expect(path === 'react' || path.startsWith('./') || path.startsWith('../core/')).toBe(true);
      expect(source).not.toMatch(/import\s*\(/);
    }
  });
  it('کاهش‌دهنده روی state منجمد کار می‌کند و تأیید را به نسل نشست مقید می‌کند', () => {
    const env = { now: 100, foreground: true, permitted: true };
    let state: FoundationState = initialFoundation();
    const events: FoundationEvent[] = [
      { ...env, command: 'start' }, { ...env, command: 'accept' },
      { ...env, command: 'intent', token: { generation: 1, revision: 0 }, action: { kind: 'edit', text: 'نیاز خصوصی' } },
      ...(['interpret', 'request_confirmation', 'confirm'] as const).map(kind => ({ ...env, command: 'intent' as const, token: { generation: 1, revision: 1 }, action: { kind } })),
      { ...env, command: 'withdraw' },
      { ...env, command: 'intent', token: { generation: 1, revision: 1 }, action: { kind: 'confirm' } },
    ];
    for (const event of events) {
      Object.freeze(state);
      if (state.intent) Object.freeze(state.intent);
      if (state.session) Object.freeze(state.session);
      state = foundationReducer(state, event);
      expect(foundationExperience(state).canMatch).toBe(false);
    }
    expect(state.intent).toBeNull();
    expect(JSON.stringify(state)).not.toContain('نیاز خصوصی');
  });
});
