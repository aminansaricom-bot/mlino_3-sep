// BusinessDirectoryService.ts — تنها سرویسی که «منبع» داده‌ی دایرکتوری را می‌شناسد.
// طبق سند 01 بخش ۲: بقیه‌ی سرویس‌ها/UI فقط از طریق همین سرویس داده می‌گیرند.
// منبع فعلی: فایل Export Mock (گزینه‌ی ۲ قرارداد). بعداً همین Interface به Polling
// API فقط‌خواندنی V1 (گزینه‌ی ۱) وصل می‌شود — بدون تغییر مصرف‌کنندگان.

import type {
  V2BusinessCategory,
  V2BusinessDirectoryExport,
  V2BusinessDirectoryRecord,
} from './contract';
import { validateExportSnapshot } from './validate';
import { haversineDistanceMeters } from './geo';

export interface NearQuery {
  latitude: number;
  longitude: number;
  /** شعاع جست‌وجو به متر */
  radiusMeters: number;
  /** فیلتر اختیاری طبقه — فقط در مکان‌های چندطبقه (بخش ۳ سند 01) */
  floorLevel?: number;
  /** فیلتر اختیاری ساختمان — با floor_level ترکیب می‌شود */
  buildingId?: string;
  category?: V2BusinessCategory;
}

export interface NearResult {
  record: V2BusinessDirectoryRecord;
  distanceMeters: number;
}

export class BusinessDirectoryService {
  private snapshot: V2BusinessDirectoryExport | null = null;
  private byId = new Map<string, V2BusinessDirectoryRecord>();

  /**
   * وارد کردن یک Snapshot (Mock یا آینده: از V1).
   * داده‌ی خراب/ناقص اینجا رد می‌شود و هرگز وارد Cache نمی‌شود.
   */
  loadSnapshot(raw: unknown): void {
    const valid = validateExportSnapshot(raw);
    this.snapshot = valid;
    this.byId = new Map(valid.records.map((r) => [r.business_id, r]));
  }

  get isLoaded(): boolean {
    return this.snapshot !== null;
  }

  get lastSyncedAt(): string | null {
    return this.snapshot?.generated_at ?? null;
  }

  getAll(): V2BusinessDirectoryRecord[] {
    return this.snapshot ? [...this.snapshot.records] : [];
  }

  getById(businessId: string): V2BusinessDirectoryRecord | null {
    return this.byId.get(businessId) ?? null;
  }

  /**
   * جست‌وجوی جغرافیایی اطراف یک نقطه. فیلتر طبقه/ساختمان فقط وقتی
   * کاربر آن را اعلام کرده اعمال می‌شود — هرگز از GPS حدس زده نمی‌شود.
   */
  findNear(query: NearQuery): NearResult[] {
    const results: NearResult[] = [];
    for (const record of this.getAll()) {
      const { latitude, longitude, floor_level, building_id } = record.location;
      if (query.category && record.category !== query.category) continue;
      if (query.buildingId !== undefined && building_id !== query.buildingId) continue;
      if (query.floorLevel !== undefined && floor_level !== query.floorLevel) continue;
      const distanceMeters = haversineDistanceMeters(
        query.latitude,
        query.longitude,
        latitude,
        longitude,
      );
      if (distanceMeters <= query.radiusMeters) {
        results.push({ record, distanceMeters });
      }
    }
    return results.sort((a, b) => a.distanceMeters - b.distanceMeters);
  }
}

/** نمونه‌ی سراسری — یک Cache خواندنی در سطح اپ */
export const directoryService = new BusinessDirectoryService();
