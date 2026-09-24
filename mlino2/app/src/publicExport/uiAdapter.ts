import { haversineDistanceMeters } from '../directory/geo';
import type { PublicCapability, PublicOffer, PublicRecord } from './mapping';
import { deriveDisplayCategory, type DerivedCategory } from './category';

export type PublicUiRecord = Readonly<{
  id: string;
  name: string;
  description: string | null;
  category: DerivedCategory;
  coordinates: Readonly<{ latitude: number; longitude: number }> | null;
  addressText: string | null;
  contactInformation: Readonly<{ public_phone?: string; public_email?: string; public_address?: string }> | null;
  links: Readonly<{ website?: string; public_social?: readonly string[] }> | null;
  businessHours: unknown | null;
  capabilities: readonly PublicCapability[];
  offers: readonly PublicOffer[];
  stale: boolean;
  /** D-78: paid placement; shown with the label «ویژه», never as a fact about the business. */
  promoted: boolean;
  publication: Readonly<{ publishedAt: string; publicationId: string; sourceRevision: number }>;
}>;

export function toPublicUiRecord(record: PublicRecord): PublicUiRecord {
  const location = record.business.location;
  return {
    id: record.business.organization_id,
    name: record.business.name,
    description: record.business.description,
    category: deriveDisplayCategory(record),
    coordinates: location?.latitude !== null && location?.longitude !== null && location
      ? { latitude: location.latitude, longitude: location.longitude }
      : null,
    addressText: location?.address_text ?? null,
    contactInformation: record.business.contact_information,
    links: record.business.links,
    businessHours: record.business.business_hours,
    capabilities: record.capabilities,
    offers: record.offers,
    stale: record.stale,
    promoted: record.promoted === true,
    publication: {
      publishedAt: record.business.published_at,
      publicationId: record.business.publication_id,
      sourceRevision: record.business.source_revision,
    },
  };
}

export function toPublicUiRecords(records: readonly PublicRecord[]): PublicUiRecord[] {
  return records.map(toPublicUiRecord);
}

export function recordsWithCoordinates(records: readonly PublicUiRecord[]): PublicUiRecord[] {
  return records.filter((record) => record.coordinates !== null);
}

export function nearbyPublicUiRecords(
  records: readonly PublicUiRecord[], latitude: number, longitude: number, radiusMeters: number,
): Array<{ record: PublicUiRecord; distanceMeters: number }> {
  return records.flatMap((record) => {
    if (!record.coordinates) return [];
    const distanceMeters = haversineDistanceMeters(latitude, longitude, record.coordinates.latitude, record.coordinates.longitude);
    return distanceMeters <= radiusMeters ? [{ record, distanceMeters }] : [];
  }).sort((a, b) => a.distanceMeters - b.distanceMeters || a.record.id.localeCompare(b.record.id));
}
