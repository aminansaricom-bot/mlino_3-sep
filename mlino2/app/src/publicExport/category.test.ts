import { describe, expect, it } from 'vitest';
import { deriveDisplayCategory, normalizeCategoryText } from './category';
import { publicRecord } from './u2Fixtures';

function classified(capabilityKey: string, capabilityName = capabilityKey, businessName = 'نمونه') {
  const record = publicRecord({ name: businessName, description: null });
  return deriveDisplayCategory({ ...record, capabilities: [{ ...record.capabilities[0], capability_key: capabilityKey, name: capabilityName }] });
}

describe('U2 deterministic display category', () => {
  it.each([
    ['dental', 'dental_clinic'], ['beauty', 'beauty_clinic'], ['coffee', 'cafe'],
    ['restaurant', 'restaurant'], ['retail', 'retail_shop'],
  ])('u2-category maps exact table token %s', (token, expected) => expect(classified(token).key).toBe(expected));

  it('u2-category chooses the most distinct matching tokens', () => {
    expect(classified('coffee cafe retail').key).toBe('cafe');
  });

  it('u2-category uses fixed table order for a tie', () => {
    expect(classified('dental coffee').key).toBe('dental_clinic');
  });

  it('u2-category uses capabilities before business-name fallback', () => {
    expect(classified('coffee', 'قهوه', 'فروشگاه محصول').key).toBe('cafe');
  });

  it('u2-category falls back to uncategorized and visibly guessed metadata', () => {
    expect(classified('unmatched').key).toBe('uncategorized');
    expect(classified('unmatched')).toEqual({ key: 'uncategorized', label: 'بدون دسته', guessed: true });
  });

  it('u2-category normalizes Arabic letters, diacritics, underscores and case', () => {
    expect(normalizeCategoryText('BEAUTY_SKIN')).toBe('beauty skin');
    expect(classified('BEAUTY_SKIN').key).toBe('beauty_clinic');
    expect(classified('كافه').key).toBe('cafe');
    expect(classified('قَهْوِه').key).toBe('cafe');
  });
});
