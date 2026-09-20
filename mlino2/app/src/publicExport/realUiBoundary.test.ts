import { describe, expect, it } from 'vitest';
import { mapRecords } from './mapping';
import { publicRecord } from './u2Fixtures';
import { toPublicUiRecord } from './uiAdapter';
import { buildPublicArView } from '../ar/ArOverlayService';
import realPublicAppSource from './RealPublicApp.tsx?raw';

describe('U2 real-mode hard boundaries', () => {
  it('u2-boundary RealPublicApp has no mock, draft loader, validator or BusinessDirectoryService import', () => {
    for (const forbidden of ['directory/loader', 'mock-directory', 'directory/validate', 'BusinessDirectoryService', 'draft-1']) {
      expect(realPublicAppSource, forbidden).not.toContain(forbidden);
    }
  });

  it('u2-boundary rejects a draft-1 payload at the real public-record mapper', () => {
    expect(() => mapRecords({ contract_version: 'draft-1', generated_at: '2026-09-20T00:00:00.000Z', records: [] })).toThrow('PUBLIC_EXPORT_RECORDS');
  });

  it('u2-map-ar keeps a coordinate-free record in UI while excluding it from AR', () => {
    const record = toPublicUiRecord(publicRecord({ location: { latitude: null, longitude: null, address_text: 'نشانی' } }));
    expect([record].map((item) => item.id)).toEqual(['org-u2']);
    expect(buildPublicArView([record], { latitude: 35.775, longitude: 51.425, radiusMeters: 1000, headingDeg: 0 }, Date.parse('2026-09-20T12:00:00.000Z')).items).toEqual([]);
  });
});
