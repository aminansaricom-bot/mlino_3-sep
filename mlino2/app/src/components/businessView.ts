import type { V2BusinessDirectoryRecord } from '../directory/contract';
import type { PublicUiRecord } from '../publicExport/uiAdapter';
import { categoryLabel } from '../uiFormat';

export type RichUiRecord = V2BusinessDirectoryRecord | PublicUiRecord;

export function isPublicUiRecord(record: RichUiRecord): record is PublicUiRecord {
  return 'id' in record;
}

export const businessId = (record: RichUiRecord): string => isPublicUiRecord(record) ? record.id : record.business_id;
export const businessName = (record: RichUiRecord): string => record.name;
export const businessCategory = (record: RichUiRecord): string => isPublicUiRecord(record) ? record.category.key : record.category;
export const businessCategoryLabel = (record: RichUiRecord): string => isPublicUiRecord(record) ? record.category.label : categoryLabel(record.category);
export const businessCategoryGuessed = (record: RichUiRecord): boolean => isPublicUiRecord(record) && record.category.guessed;
export const businessCoordinates = (record: RichUiRecord): { latitude: number; longitude: number } | null =>
  isPublicUiRecord(record) ? record.coordinates : record.location;
export const businessOffers = (record: RichUiRecord) => record.offers;
export const businessCapabilityCount = (record: RichUiRecord): number | null => isPublicUiRecord(record) ? record.capabilities.length : null;
export const businessActiveProductCount = (record: RichUiRecord): number | null =>
  isPublicUiRecord(record) ? null : record.products.filter((product) => product.is_active).length;
