import {
  AccountingError, assertIsoDate, divideHalfUp, formatJalali, fromJalali, isJalaliLeap, jalaliMonthLength,
  jalaliMonthRange, jalaliSeasonRange, toJalali, vatInGross, vatOnNet,
} from '../../accounting';

describe('Jalali calendar', () => {
  it.each([
    ['2024-03-20', '1403/01/01'],
    ['2025-03-20', '1403/12/30'],
    ['2025-03-21', '1404/01/01'],
    ['2026-03-20', '1404/12/29'],
    ['2026-03-21', '1405/01/01'],
    ['2026-09-22', '1405/06/31'],
    ['2026-09-23', '1405/07/01'],
    ['2021-03-20', '1399/12/30'],
    ['2021-03-21', '1400/01/01'],
  ])('%s is %s', (iso, jalali) => {
    expect(formatJalali(iso)).toBe(jalali);
    const [jy, jm, jd] = jalali.split('/').map(Number);
    expect(fromJalali(jy, jm, jd)).toBe(iso);
  });

  it('round-trips every day of several years', () => {
    let day = Date.parse('2019-01-01T00:00:00Z');
    const end = Date.parse('2031-12-31T00:00:00Z');
    let previous = toJalali('2018-12-31');
    for (; day <= end; day += 86_400_000) {
      const iso = new Date(day).toISOString().slice(0, 10);
      const j = toJalali(iso);
      expect(fromJalali(j.jy, j.jm, j.jd)).toBe(iso);
      // consecutive days advance by exactly one Jalali day
      const nextOfPrevious = previous.jd < jalaliMonthLength(previous.jy, previous.jm)
        ? { jy: previous.jy, jm: previous.jm, jd: previous.jd + 1 }
        : previous.jm < 12 ? { jy: previous.jy, jm: previous.jm + 1, jd: 1 } : { jy: previous.jy + 1, jm: 1, jd: 1 };
      expect(j).toEqual(nextOfPrevious);
      previous = j;
    }
  });

  it('knows leap years and month lengths', () => {
    expect(isJalaliLeap(1399)).toBe(true);
    expect(isJalaliLeap(1403)).toBe(true);
    expect(isJalaliLeap(1404)).toBe(false);
    expect(jalaliMonthLength(1404, 12)).toBe(29);
    expect(jalaliMonthLength(1403, 12)).toBe(30);
    expect(jalaliMonthLength(1405, 6)).toBe(31);
    expect(jalaliMonthLength(1405, 7)).toBe(30);
  });

  it('builds month and season ranges', () => {
    expect(jalaliMonthRange(1405, 7)).toEqual({ from: '2026-09-23', to: '2026-10-22', label: 'مهر 1405' });
    expect(jalaliSeasonRange(1405, 1)).toEqual({ from: '2026-03-21', to: '2026-06-21', label: 'بهار 1405' });
    expect(jalaliSeasonRange(1404, 4).to).toBe('2026-03-20');
  });

  it('rejects impossible dates', () => {
    expect(() => assertIsoDate('2026-02-30')).toThrow(AccountingError);
    expect(() => assertIsoDate('2026-9-1')).toThrow(AccountingError);
    expect(() => fromJalali(1404, 12, 30)).toThrow(AccountingError);
  });
});

describe('money', () => {
  it('rounds half up once', () => {
    expect(divideHalfUp(15, 10)).toBe(2);
    expect(divideHalfUp(14, 10)).toBe(1);
    expect(divideHalfUp(25, 10)).toBe(3);
  });
  it('VAT on net and inside gross agree', () => {
    expect(vatOnNet(1_000_000, 1000)).toBe(100_000);
    expect(vatInGross(1_100_000, 1000)).toBe(100_000);
    expect(vatInGross(1_000_000, 1000)).toBe(90_909);
    expect(vatOnNet(123_457, 1000)).toBe(12_346);
  });
});
