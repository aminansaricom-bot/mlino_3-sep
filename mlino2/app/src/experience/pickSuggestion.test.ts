import { describe, expect, it, beforeAll } from 'vitest';
import { pickSuggestion } from './pickSuggestion';
import { BusinessDirectoryService } from '../directory/BusinessDirectoryService';
import { loadMockSnapshotRaw } from '../directory/loader';
import type { V2BusinessDirectoryRecord } from '../directory/contract';

const now = Date.parse('2026-09-09T12:00:00Z');
let records: V2BusinessDirectoryRecord[];
beforeAll(async () => { const directory = new BusinessDirectoryService(); directory.loadSnapshot(await loadMockSnapshotRaw()); records = directory.getAll(); });
function candidate(id: string, latitude = 35.775): V2BusinessDirectoryRecord {
  return {...records[0], business_id: id, location: {...records[0].location, latitude, longitude: 51.425}, offers: [{offer_id:'test-only',title:'test offer',description:null,discount_percent:null,valid_from:'2026-09-01T00:00:00Z',valid_until:null}]};
}
describe('explicit nearby offer discovery', () => {
  it('selects the nearest active offer deterministically without mutating input', () => {
    const list = [candidate('far', 35.78), candidate('near')];
    expect(pickSuggestion(list, [35.775,51.425], 1000, now)).toEqual({businessId:'near'});
    expect(pickSuggestion(list, [35.775,51.425], 1000, now)).toEqual({businessId:'near'});
    expect(list.map(r=>r.business_id)).toEqual(['far','near']);
  });
  it('breaks equal distances by stable identifier independent of input order', () => {
    for (const list of [[candidate('b'),candidate('a')],[candidate('a'),candidate('b')]]) {
      expect(pickSuggestion(list,[35.775,51.425],1000,now)).toEqual({businessId:'a'});
    }
  });
  it('never substitutes a place with no offer', () => {
    expect(pickSuggestion([{...candidate('a'),offers:[]}],[35.775,51.425],1000,now)).toEqual({reason:'no-active-offer'});
  });
  it.each(['2026-10-01T00:00:00Z', 'bad'])('rejects a future or invalid start %s', start => {
    const row=candidate('a'); row.offers[0].valid_from=start;
    expect(pickSuggestion([row],[35.775,51.425],1000,now)).toEqual({reason:'no-active-offer'});
  });
  it('rejects an expired offer', () => {
    const row=candidate('a'); row.offers[0].valid_until='2026-09-08T00:00:00Z';
    expect(pickSuggestion([row],[35.775,51.425],1000,now)).toEqual({reason:'no-active-offer'});
  });
  it('rejects a place outside the radius and allows it after widening', () => {
    const list=[candidate('far',35.78)];
    expect(pickSuggestion(list,[35.775,51.425],100,now)).toEqual({reason:'out-of-radius'});
    expect(pickSuggestion(list,[35.775,51.425],1000,now)).toEqual({businessId:'far'});
  });
  it('honours an empty filtered candidate list without fetching other records', () => {
    expect(pickSuggestion([],[35.775,51.425],10000,now,true)).toEqual({reason:'filtered'});
  });
  it('uses only directory candidates remaining after category, floor and hidden filters', () => {
    const visible=records.filter(r=>r.category==='beauty_clinic' && r.location.floor_level===1 && r.location.building_id!==null && r.business_id!=='biz_mock_beauty_01');
    const result=pickSuggestion(visible,[35.775,51.425],10000,now,true);
    expect('businessId' in result).toBe(true);
    if ('businessId' in result) expect(visible.some(r=>r.business_id===result.businessId)).toBe(true);
    expect(pickSuggestion(visible.filter(r=>'businessId' in result && r.business_id!==result.businessId),[35.775,51.425],10000,now,true)).toEqual({reason:'filtered'});
  });
});
