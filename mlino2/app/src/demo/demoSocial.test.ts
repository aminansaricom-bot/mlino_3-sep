import { describe, expect, it } from 'vitest';
import { demoBusinessRating, demoProductReviews, displayName, formatRating, stableHash } from './demoSocial';
import { DEMO_REVIEW_TEXTS } from './demoReviewTexts';
import { offerUntil } from '../components/PublicBusinessDetails';

describe('sample ratings and reviews (demo builds only)', () => {
  it('is fully off outside demo builds, and only for test records inside them', () => {
    expect(demoBusinessRating('test-demo-07', false)).toBeNull();
    expect(demoBusinessRating('org-real', true)).toBeNull();
    expect(demoProductReviews('لاته (آزمایشی)', false)).toEqual({ reviews: [], rating: null });
  });

  it('business rating is stable per id and inside 3.8..4.9 with 40..480 votes', () => {
    for (const id of ['test-demo-01', 'test-demo-07', 'test-demo-13', 'test-vanak-02']) {
      const a = demoBusinessRating(id, true)!;
      expect(demoBusinessRating(id, true)).toEqual(a);
      expect(a.average).toBeGreaterThanOrEqual(3.8);
      expect(a.average).toBeLessThanOrEqual(4.9);
      expect(a.count).toBeGreaterThanOrEqual(40);
      expect(a.count).toBeLessThanOrEqual(480);
    }
  });

  it('product reviews come from the owner texts by display name, with 3..5 stars', () => {
    const { reviews, rating } = demoProductReviews('چلوکباب کوبیده (آزمایشی)', true);
    expect(reviews).toHaveLength(3);
    expect(reviews[0].author).toBe('کاربر نمونه ۱');
    expect(reviews.every((review) => review.stars >= 3 && review.stars <= 5)).toBe(true);
    expect(rating!.count).toBe(3);
    expect(demoProductReviews('محصول ناشناخته', true)).toEqual({ reviews: [], rating: null });
  });

  it('every one of the 30 products has exactly three sample reviews', () => {
    expect(Object.keys(DEMO_REVIEW_TEXTS)).toHaveLength(30);
    expect(Object.values(DEMO_REVIEW_TEXTS).every((list) => list.length === 3)).toBe(true);
  });

  it('helpers: display name, Persian rating, stable hash, offer end date', () => {
    expect(displayName('کافه نیلوفر (آزمایشی)')).toBe('کافه نیلوفر');
    expect(formatRating(4.6)).toBe((4.6).toLocaleString('fa-IR', { minimumFractionDigits: 1 }));
    expect(stableHash('a')).toBe(stableHash('a'));
    expect(stableHash('a')).not.toBe(stableHash('b'));
    expect(offerUntil(null)).toBe('بدون تاریخ پایان');
    expect(offerUntil('2026-12-31T20:30:00Z').startsWith('تا ')).toBe(true);
  });
});
