import { expect, it } from 'vitest';
import { ArOverlayService } from './ArOverlayService';
import { BusinessDirectoryService } from '../directory/BusinessDirectoryService';
import { loadMockSnapshotRaw } from '../directory/loader';
import type { V2BusinessDirectoryExport } from '../directory/contract';

it('AR uses the shared start and end boundaries through the real directory', async () => {
  const raw=structuredClone(await loadMockSnapshotRaw()) as V2BusinessDirectoryExport;
  const target=raw.records.find(r=>r.offers.length>0)!;
  target.offers=[{...target.offers[0],valid_from:'2026-09-10T00:00:00Z',valid_until:'2026-09-11T00:00:00Z'}];
  const directory=new BusinessDirectoryService(); directory.loadSnapshot(raw);
  const ar=new ArOverlayService(directory);
  const query={latitude:target.location.latitude,longitude:target.location.longitude,radiusMeters:100,headingDeg:0,fovDeg:360};
  const offerAt=(time:string)=>ar.buildView(query,Date.parse(time)).items.find(r=>r.businessId===target.business_id)?.activeOffer;
  expect(offerAt('2026-09-09T00:00:00Z')).toBeNull();
  expect(offerAt('2026-09-10T00:00:00Z')?.offer_id).toBe(target.offers[0].offer_id);
  expect(offerAt('2026-09-11T00:00:00Z')?.offer_id).toBe(target.offers[0].offer_id);
  expect(offerAt('2026-09-11T00:00:00.001Z')).toBeNull();
});
