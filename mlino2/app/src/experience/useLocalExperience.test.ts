import { describe, expect, it } from 'vitest';
import { freshExperience, parseExperience, toggleExperience } from './useLocalExperience';

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


describe('personal collection exclusions', () => {
  it('repairs conflicting persisted choices without discarding viewing history', () => {
    const state = parseExperience(JSON.stringify({version: 1, saved: ['a', 'b'], later: ['a'], liked: ['a', 'c'], hidden: ['a'], viewed: ['a']}));
    expect(state.saved).toEqual(['b']);
    expect(state.later).toEqual([]);
    expect(state.liked).toEqual(['c']);
    expect(state.viewed).toEqual(['a']);
  });
  it('hiding removes all personal selections while preserving other records and history', () => {
    const before = {...freshExperience(), saved: ['a', 'b'], later: ['a'], liked: ['a', 'c'], viewed: ['a']};
    const after = toggleExperience(before, 'hidden', 'a');
    expect(after.hidden).toEqual(['a']);
    expect(after.saved).toEqual(['b']);
    expect(after.later).toEqual([]);
    expect(after.liked).toEqual(['c']);
    expect(after.viewed).toEqual(['a']);
    expect(before.saved).toEqual(['a', 'b']);
  });
  it.each(['saved', 'later', 'liked'] as const)('selecting %s restores a hidden place', key => {
    const after = toggleExperience({...freshExperience(), hidden: ['a', 'b']}, key, 'a');
    expect(after[key]).toEqual(['a']);
    expect(after.hidden).toEqual(['b']);
  });
  it('unliking preserves saved places and does not hide them', () => {
    const after = toggleExperience({...freshExperience(), saved: ['a'], liked: ['a']}, 'liked', 'a');
    expect(after.liked).toEqual([]);
    expect(after.saved).toEqual(['a']);
    expect(after.hidden).toEqual([]);
  });
  it('restoring does not silently recreate previous preferences', () => {
    const restored = toggleExperience(toggleExperience({...freshExperience(), liked: ['a']}, 'hidden', 'a'), 'hidden', 'a');
    expect(restored.hidden).toEqual([]);
    expect(restored.liked).toEqual([]);
  });
});

describe('saved products', () => {
  it('keeps saved products across a reload and drops junk', () => {
    const state = parseExperience(JSON.stringify({version: 1, savedItems: ['org-1/item-1', 'org-1/item-1', 7, 'org-2/item-9']}));
    expect(state.savedItems).toEqual(['org-1/item-1', 'org-2/item-9']);
    expect(parseExperience(null).savedItems).toEqual([]);
  });
});
