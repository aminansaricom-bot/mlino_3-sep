// BusinessDirectoryService.test.ts — تست‌های یکپارچه‌ی دایرکتوری
// داده‌ی Mock واقعی پروژه (نه fixture ساختگی تست) را از فایل می‌خواند تا
// مسیر واقعی «فایل Export → validate → Cache → Query» تست شود.

import { describe, it, expect, beforeAll } from 'vitest';
import { BusinessDirectoryService } from './BusinessDirectoryService';
import { loadMockSnapshotRaw } from './loader';
import { DirectoryValidationError } from './validate';
import { haversineDistanceMeters } from './geo';

let service: BusinessDirectoryService;

beforeAll(async () => {
  service = new BusinessDirectoryService();
  service.loadSnapshot(await loadMockSnapshotRaw());
});

describe('BusinessDirectoryService — مسیر واقعی فایل Export', () => {
  it('Snapshot Mock از فایل واقعی، بدون خطا وارد Cache می‌شود', () => {
    expect(service.isLoaded).toBe(true);
    expect(service.getAll().length).toBe(10);
  });

  it('هر رکورد شکل کامل قرارداد draft-1 را دارد', () => {
    for (const rec of service.getAll()) {
      expect(rec.business_id).toBeTruthy();
      expect(rec.organization_id).toBeTruthy();
      expect(rec.name).toBeTruthy();
      expect(rec.location).toHaveProperty('latitude');
      expect(rec.location).toHaveProperty('longitude');
      expect(rec.location).toHaveProperty('floor_level');
      expect(rec.location).toHaveProperty('building_id');
      expect(Array.isArray(rec.products)).toBe(true);
      expect(Array.isArray(rec.offers)).toBe(true);
      expect(rec.last_synced_at).toBeTruthy();
    }
  });

  it('ساختمان چندطبقه با کسب‌وکارها در طبقات مختلف ثبت شده', () => {
    const bldg = service
      .getAll()
      .filter((r) => r.location.building_id === 'bldg_mock_pasazh_vanak');
    expect(bldg.length).toBe(4);
    const floors = bldg.map((r) => r.location.floor_level).sort();
    expect(floors).toEqual([-1, 0, 1, 2]);
  });

  it('getById رکورد درست را برمی‌گرداند', () => {
    const rec = service.getById('biz_mock_dental_01');
    expect(rec?.name).toContain('لبخند پارس');
    expect(service.getById('nope')).toBeNull();
  });

  it('findNear با GPS خام، همه‌ی کسب‌وکارهای نزدیک را برمی‌گرداند (بدون فیلتر طبقه)', () => {
    // نقطه‌ای نزدیک پاساژ ونک
    const results = service.findNear({
      latitude: 35.7603,
      longitude: 51.41,
      radiusMeters: 600,
    });
    // چهار شعبه‌ی داخل پاساژ + رستوران پاستا لند (~۵۰۰م) در شعاع ۶۰۰ متری
    expect(results.length).toBe(5);
    const dists = results.map((r) => r.distanceMeters);
    expect(dists).toEqual([...dists].sort((a, b) => a - b));
  });

  it('فیلتر طبقه (الزام سند 01 بخش ۳): فقط مغازه‌های همان طبقه', () => {
    const floor1 = service.findNear({
      latitude: 35.7603,
      longitude: 51.41,
      radiusMeters: 600,
      buildingId: 'bldg_mock_pasazh_vanak',
      floorLevel: 1,
    });
    expect(floor1.length).toBe(1);
    expect(floor1[0].record.business_id).toBe('biz_mock_beauty_02');
  });

  it('فیلتر category در جست‌وجوی جغرافیایی اعمال می‌شود', () => {
    const dental = service.findNear({
      latitude: 35.7603,
      longitude: 51.41,
      radiusMeters: 5000,
      category: 'dental_clinic',
    });
    expect(dental.length).toBeGreaterThan(0);
    for (const r of dental) {
      expect(r.record.category).toBe('dental_clinic');
    }
  });
});

describe('validateExportSnapshot — رد داده‌ی خراب', () => {
  const baseRecord = {
    business_id: 'b1',
    organization_id: 'o1',
    name: 'x',
    category: 'cafe',
    location: { latitude: 35.7, longitude: 51.4, floor_level: null, building_id: null },
    products: [],
    offers: [],
    last_synced_at: '2026-09-04T00:00:00.000Z',
  };

  it('contract_version اشتباه رد می‌شود', () => {
    expect(() =>
      new BusinessDirectoryService().loadSnapshot({
        contract_version: 'v999',
        generated_at: '2026-09-04T00:00:00.000Z',
        records: [],
      }),
    ).toThrow(DirectoryValidationError);
  });

  it('رکورد فاقد business_id رد می‌شود', () => {
    const svc = new BusinessDirectoryService();
    expect(() =>
      svc.loadSnapshot({
        contract_version: 'draft-1',
        generated_at: '2026-09-04T00:00:00.000Z',
        records: [{ ...baseRecord, business_id: undefined }],
      }),
    ).toThrow(DirectoryValidationError);
  });

  it('business_id تکراری رد می‌شود', () => {
    const svc = new BusinessDirectoryService();
    expect(() =>
      svc.loadSnapshot({
        contract_version: 'draft-1',
        generated_at: '2026-09-04T00:00:00.000Z',
        records: [baseRecord, baseRecord],
      }),
    ).toThrow(DirectoryValidationError);
  });

  it('category خارج از whitelist قرارداد رد می‌شود (یافته‌ی بازبینی فاز ۱)', () => {
    const svc = new BusinessDirectoryService();
    expect(() =>
      svc.loadSnapshot({
        contract_version: 'draft-1',
        generated_at: '2026-09-04T00:00:00.000Z',
        records: [{ ...baseRecord, category: 'space_station' }],
      }),
    ).toThrow(DirectoryValidationError);
  });

  it('location بدون latitude رد می‌شود', () => {
    const svc = new BusinessDirectoryService();
    expect(() =>
      svc.loadSnapshot({
        contract_version: 'draft-1',
        generated_at: '2026-09-04T00:00:00.000Z',
        records: [
          { ...baseRecord, location: { longitude: 51.4, floor_level: null, building_id: null } },
        ],
      }),
    ).toThrow(DirectoryValidationError);
  });

  it('product با is_active غیربولی رد می‌شود', () => {
    const svc = new BusinessDirectoryService();
    expect(() =>
      svc.loadSnapshot({
        contract_version: 'draft-1',
        generated_at: '2026-09-04T00:00:00.000Z',
        records: [
          {
            ...baseRecord,
            products: [
              {
                product_id: 'p1',
                name: 'n',
                description: null,
                price: null,
                currency: null,
                image_url: null,
                is_active: 'yes',
              },
            ],
          },
        ],
      }),
    ).toThrow(DirectoryValidationError);
  });
});

describe('haversineDistanceMeters', () => {
  it('فاصله‌ی صفر برای نقطه‌ی یکسان', () => {
    expect(haversineDistanceMeters(35.7, 51.4, 35.7, 51.4)).toBe(0);
  });

  it('فاصله‌ی حدوداً واقعی بین دو نقطه‌ی شناخته‌شده', () => {
    // ونک تا تجریش تقریباً ~۵ کیلومتر
    const d = haversineDistanceMeters(35.7597, 51.4102, 35.7997, 51.4344);
    expect(d).toBeGreaterThan(4500);
    expect(d).toBeLessThan(5500);
  });
});
