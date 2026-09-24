import { describe, expect, it } from 'vitest';
import { offerBadge } from './PublicBusinessRow';
import { directionsUrl } from './PublicBusinessDetails';
import { chooseLocale } from '../i18n';

describe('PM review: list badge and directions', () => {
  it('shows the percentage when the offer names one, otherwise a short label', () => {
    expect(offerBadge('۳۰٪ تخفیف موهیتو')).toBe('۳۰٪');
    expect(offerBadge('20% off')).toBe('۲۰٪');
    expect(offerBadge('نان صبحگاهی')).toBe('آفر');
  });
  it('writes the badge in the chosen language', () => {
    chooseLocale('en');
    expect(offerBadge('۳۰٪ تخفیف موهیتو')).toBe('30%');
    expect(offerBadge('نان صبحگاهی')).toBe('Offer');
    chooseLocale('ar');
    expect(offerBadge('۳۰٪ تخفیف موهیتو')).toBe('٣٠٪');
    chooseLocale('fa');
  });
  it('directions go to a web map outside Android', () => {
    expect(directionsUrl(35.7, 51.4, 'x')).toContain('destination=35.7,51.4');
  });
});
