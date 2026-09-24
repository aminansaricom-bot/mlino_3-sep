import { describe, expect, it } from 'vitest';
import { PACKS, PACK_IDS, guessPack } from './packs';

describe('trade packs', () => {
  it('guesses from what the business published, health first', () => {
    expect(guessPack('کافه نیلوفر', [])).toBe('food');
    expect(guessPack('کلینیک دندان‌پزشکی و کافه', [])).toBe('health');
    expect(guessPack('فروشگاه کتاب', [])).toBe('retail');
    expect(guessPack('سالن زیبایی', [])).toBe('services');
    expect(guessPack('نمونه', ['ارسال رایگان'])).toBe('general');
  });

  it('only food uses recipes and only health is sensitive', () => {
    expect(PACK_IDS.filter((id) => PACKS[id].recipes)).toEqual(['food']);
    expect(PACK_IDS.filter((id) => PACKS[id].sensitive)).toEqual(['health']);
  });

  it('non-food packs never speak of a menu or a café', () => {
    for (const id of PACK_IDS.filter((p) => p !== 'food')) {
      expect(JSON.stringify(PACKS[id])).not.toMatch(/منو|کافه/);
    }
  });
});
