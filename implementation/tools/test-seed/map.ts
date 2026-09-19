import { validBusinessHours } from '../../public-export/builder';
import { TestSeedError, VanakBusinessInput } from './types';

const DAY_NUMBER: Record<string, number> = { دوشنبه: 1, 'سه‌شنبه': 2, چهارشنبه: 3, پنجشنبه: 4, جمعه: 5, شنبه: 6, یکشنبه: 7 };
export const TEST_DATA_MARKER = ' — داده‌ی آزمایشی (منبع: بلد)';

export function mapBusinessHours(hours: VanakBusinessInput['hours']): unknown | null {
  if (hours === null) return null;
  const weekly = Object.entries(hours)
    .filter(([, intervals]) => intervals.length > 0)
    .map(([day, intervals]) => ({ day: DAY_NUMBER[day], intervals: intervals.map(([open, close]) => ({ open, close })) }))
    .sort((a, b) => a.day - b.day);
  const result = { schema_version: 'mlino.business-hours.v1', timezone: 'Asia/Tehran', weekly };
  if (!validBusinessHours(result)) throw new TestSeedError('TEST_SEED_HOURS_MAPPING');
  return result;
}

export function mapVanakBusiness(row: VanakBusinessInput) {
  const contactInformation: Record<string, string> = {};
  if (row.public_phone) contactInformation.public_phone = row.public_phone;
  const links: { website?: string; public_social?: string[] } = {};
  if (row.website) links.website = row.website;
  if (row.instagram) links.public_social = [row.instagram];
  return {
    organizationId: `test-${row.test_id}`,
    displayName: row.name,
    identifierType: 'TEST_SEED_ID',
    identifierValue: row.test_id,
    profile: {
      name: row.name,
      description: `${row.description}${TEST_DATA_MARKER}`,
      latitude: row.latitude,
      longitude: row.longitude,
      addressText: row.address_text,
      contactInformation,
      links,
      businessHours: mapBusinessHours(row.hours),
    },
    capabilities: row.services.map((name, index) => ({ capabilityKey: `svc-${index + 1}`, name, shortDescription: null, categoryKey: 'test-seed', audience: 'CUSTOMER_FACING' as const })),
  };
}
