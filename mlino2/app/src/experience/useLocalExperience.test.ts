import { describe, expect, it } from 'vitest';
import { freshExperience, parseExperience } from './useLocalExperience';

describe('local MLINO experience state', () => {
  it('starts empty and never trusts malformed browser data', () => {
    expect(parseExperience('{bad json')).toEqual(freshExperience());
    expect(parseExperience(JSON.stringify({version: 9, saved: ['fake']}))).toEqual(freshExperience());
  });
  it('keeps only bounded, valid identifiers and removes duplicates', () => {
    const state = parseExperience(JSON.stringify({version: 1, saved: ['a', 'a', 4, 'b'], hidden: ['x'], theme: 'dark'}));
    expect(state.saved).toEqual(['a', 'b']);
    expect(state.hidden).toEqual(['x']);
    expect(state.theme).toBe('dark');
  });
  it('does not infer a visit or a business preference from empty state', () => {
    const state = parseExperience(JSON.stringify({version: 1}));
    expect(state.viewed).toEqual([]);
    expect(state.liked).toEqual([]);
    expect(state.sound).toBe(false);
  });
});
