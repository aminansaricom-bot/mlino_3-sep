// validate.ts — اعتبارسنجی Snapshot فایل Export
// هدف: هر داده‌ای که وارد Cache V2 می‌شود (فعلاً Mock، بعداً واقعی از V1)
// باید دقیقاً شکل قرارداد را داشته باشد — داده‌ی خراب هرگز وارد Cache نمی‌شود.

import type {
  V2BusinessDirectoryExport,
  V2BusinessDirectoryRecord,
} from './contract';

export class DirectoryValidationError extends Error {
  constructor(message: string) {
    super(`[directory] invalid export snapshot: ${message}`);
    this.name = 'DirectoryValidationError';
  }
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function requireString(obj: Record<string, unknown>, key: string): string {
  const v = obj[key];
  if (typeof v !== 'string' || v.length === 0) {
    throw new DirectoryValidationError(`${key} must be a non-empty string`);
  }
  return v;
}

function requireNumber(obj: Record<string, unknown>, key: string): number {
  const v = obj[key];
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw new DirectoryValidationError(`${key} must be a finite number`);
  }
  return v;
}

function validateLocation(loc: unknown): void {
  if (!isPlainObject(loc)) throw new DirectoryValidationError('location must be an object');
  requireNumber(loc, 'latitude');
  requireNumber(loc, 'longitude');
  const floor = loc['floor_level'];
  if (floor !== null && typeof floor !== 'number') {
    throw new DirectoryValidationError('location.floor_level must be number | null');
  }
  const building = loc['building_id'];
  if (building !== null && typeof building !== 'string') {
    throw new DirectoryValidationError('location.building_id must be string | null');
  }
}

function validateProducts(products: unknown): void {
  if (!Array.isArray(products)) throw new DirectoryValidationError('products must be an array');
  for (const p of products) {
    if (!isPlainObject(p)) throw new DirectoryValidationError('each product must be an object');
    requireString(p, 'product_id');
    requireString(p, 'name');
    for (const nullable of ['description', 'price', 'currency', 'image_url'] as const) {
      const v = p[nullable];
      if (v !== null && typeof v !== (nullable === 'price' ? 'number' : 'string')) {
        throw new DirectoryValidationError(`product.${nullable} has wrong type`);
      }
    }
    if (typeof p['is_active'] !== 'boolean') {
      throw new DirectoryValidationError('product.is_active must be boolean');
    }
  }
}

function validateOffers(offers: unknown): void {
  if (!Array.isArray(offers)) throw new DirectoryValidationError('offers must be an array');
  for (const o of offers) {
    if (!isPlainObject(o)) throw new DirectoryValidationError('each offer must be an object');
    requireString(o, 'offer_id');
    requireString(o, 'title');
    if (typeof o['description'] !== 'string' && o['description'] !== null) {
      throw new DirectoryValidationError('offer.description must be string | null');
    }
    const discount = o['discount_percent'];
    if (discount !== null && (typeof discount !== 'number' || !Number.isFinite(discount))) {
      throw new DirectoryValidationError('offer.discount_percent must be number | null');
    }
    requireString(o, 'valid_from');
    if (o['valid_until'] !== null && typeof o['valid_until'] !== 'string') {
      throw new DirectoryValidationError('offer.valid_until must be string | null');
    }
  }
}

function validateRecord(rec: unknown): V2BusinessDirectoryRecord {
  if (!isPlainObject(rec)) throw new DirectoryValidationError('record must be an object');
  requireString(rec, 'business_id');
  requireString(rec, 'organization_id');
  requireString(rec, 'name');
  requireString(rec, 'category');
  validateLocation(rec['location']);
  validateProducts(rec['products']);
  validateOffers(rec['offers']);
  requireString(rec, 'last_synced_at');
  return rec as unknown as V2BusinessDirectoryRecord;
}

/** Snapshot را validate و تایپ‌دار برمی‌گرداند؛ در صورت خرابی خطا می‌دهد. */
export function validateExportSnapshot(raw: unknown): V2BusinessDirectoryExport {
  if (!isPlainObject(raw)) throw new DirectoryValidationError('snapshot must be an object');
  if (raw['contract_version'] !== 'draft-1') {
    throw new DirectoryValidationError('contract_version must be "draft-1"');
  }
  const generatedAt = requireString(raw, 'generated_at');
  if (!Array.isArray(raw['records'])) {
    throw new DirectoryValidationError('records must be an array');
  }
  const records = raw['records'].map(validateRecord);
  const ids = new Set<string>();
  for (const r of records) {
    if (ids.has(r.business_id)) {
      throw new DirectoryValidationError(`duplicate business_id: ${r.business_id}`);
    }
    ids.add(r.business_id);
  }
  return { contract_version: 'draft-1', generated_at: generatedAt, records };
}
