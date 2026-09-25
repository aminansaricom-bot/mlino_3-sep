import { describe, expect, it } from 'vitest';
import { localIntent, normalizeFa, validateGatewayResponse } from './assistantIntent';
import { rankRecords } from './rankRecords';
import { askAssistant } from './assistantApi';
import { recognitionCtor, voiceErrorMessage } from './voice';
import { publicRecord } from '../publicExport/u2Fixtures';
import { toPublicUiRecord } from '../publicExport/uiAdapter';
import type { CatalogItem, CatalogRecord } from '../publicExport/catalog';

const gateway = { intent: { action: 'discover', keywords: ['موهیتو', 'نوشیدنی سرد'], category: 'cafe', open_now: false, radius_meters: 1000, sort: 'relevance' }, answer: 'دنبال نوشیدنی خنک می‌گردم.', route: { task: 'intent', model: 'gemini-3.7-flash' } };

describe('assistant response contract (client side re-check)', () => {
  it('accepts the gateway shape', () => {
    const answer = validateGatewayResponse(gateway)!;
    expect(answer.source).toBe('ai');
    expect(answer.model).toBe('gemini-3.7-flash');
    expect(answer.intent.keywords).toEqual(['موهیتو', 'نوشیدنی سرد']);
  });
  it.each([
    ['business data smuggled in', { ...gateway, businesses: [{ id: 'x' }] }],
    ['extra intent key', { ...gateway, intent: { ...gateway.intent, organization_id: 'x' } }],
    ['bad category', { ...gateway, intent: { ...gateway.intent, category: 'bar' } }],
    ['long answer', { ...gateway, answer: 'ا'.repeat(281) }],
    ['missing answer', { intent: gateway.intent }],
  ])('rejects %s', (_label, value) => { expect(validateGatewayResponse(value)).toBeNull(); });
});

describe('local understanding (no network)', () => {
  it('cold and sweet -> cafe drinks and desserts', () => {
    const { intent, source } = localIntent('یه چیز خنک و شیرین می‌خوام');
    expect(source).toBe('local');
    expect(intent.category).toBe('cafe');
    expect(intent.keywords).toEqual(expect.arrayContaining(['آیس‌کافی', 'موهیتو', 'چیزکیک']));
  });
  it('near -> nearest, discount -> offer, open now', () => {
    expect(localIntent('پیتزا نزدیک من').intent.sort).toBe('nearest');
    expect(localIntent('قهوه تخفیف دار').intent.sort).toBe('offer');
    expect(localIntent('کباب الان باز').intent.open_now).toBe(true);
    expect(localIntent('کباب الان باز').intent.category).toBe('restaurant');
  });
  it('normalizes Arabic letters and zero-width joiners', () => {
    expect(normalizeFa('كافي‌شاپ')).toBe(normalizeFa('کافیشاپ'));
  });
});

function item(name: string, price: string): CatalogItem {
  return { catalog_item_id: name, item_key: name, name: `${name} (آزمایشی)`, short_description: null, price_amount: price, price_currency: 'IRR', on_request: false,
    grouping_label: null, display_order: 0, available_from: null, available_until: null, offer_version_links: [], media: [], published_at: '2026-09-20T10:00:00.000Z', publication_id: `p-${name}`, source_revision: 1 };
}

describe('local ranking over signed data only', () => {
  const cafe = toPublicUiRecord({ ...publicRecord({ organization_id: 'test-demo-01', name: 'کافه نمایشی' }) });
  const kebab = toPublicUiRecord({ ...publicRecord({ organization_id: 'test-demo-13', name: 'کبابی' }), capabilities: [], offers: [] });
  const catalog = new Map<string, CatalogRecord>([
    ['test-demo-01', { organization_id: 'test-demo-01', business_snapshot_id: 's', business_publication_id: 'p', items: [item('موهیتو', '145000'), item('لاته', '120000')] }],
    ['test-demo-13', { organization_id: 'test-demo-13', business_snapshot_id: 's', business_publication_id: 'p', items: [item('چلوکباب کوبیده', '450000')] }],
  ]);
  const now = Date.parse('2026-09-21T10:00:00.000Z');

  it('finds the business whose menu matches and explains it with the real item', () => {
    const results = rankRecords({ records: [kebab, cafe], catalogByOrg: catalog, distances: new Map([['test-demo-01', 20], ['test-demo-13', 80]]), intent: validateGatewayResponse(gateway)!.intent, now });
    expect(results.map((r) => r.record.id)).toEqual(['test-demo-01']);
    expect(results[0].items.map((i) => i.name)).toEqual(['موهیتو (آزمایشی)']);
  });
  it('nearest sorts by distance among relevant results', () => {
    const intent = { ...localIntent('غذا').intent, keywords: ['کباب', 'لاته'], category: null, sort: 'nearest' as const };
    const results = rankRecords({ records: [kebab, cafe], catalogByOrg: catalog, distances: new Map([['test-demo-01', 90], ['test-demo-13', 10]]), intent, now });
    expect(results.map((r) => r.record.id)).toEqual(['test-demo-13', 'test-demo-01']);
  });
  it('direct menu matches outrank category-only matches even when sorting by distance', () => {
    const burger = toPublicUiRecord({ ...publicRecord({ organization_id: 'test-demo-14', name: 'برگری' }), capabilities: [], offers: [] });
    const withBurger = new Map(catalog); withBurger.set('test-demo-14', { organization_id: 'test-demo-14', business_snapshot_id: 's', business_publication_id: 'p', items: [item('برگر', '300000')] });
    const intent = { ...localIntent('کباب نزدیک من').intent, category: kebab.category.key as 'restaurant' };
    const results = rankRecords({ records: [burger, kebab], catalogByOrg: withBurger, distances: new Map([['test-demo-14', 5], ['test-demo-13', 80]]), intent: { ...intent, keywords: ['کباب'], sort: 'nearest' }, now });
    expect(results[0].record.id).toBe('test-demo-13');
  });
  it('never returns anything the signed data does not contain', () => {
    const intent = { ...localIntent('سوشی').intent, keywords: ['سوشی'], category: null };
    expect(rankRecords({ records: [kebab, cafe], catalogByOrg: catalog, distances: new Map(), intent, now })).toEqual([]);
  });
});

describe('assistant client', () => {
  const browserFetch = (status: number, body: unknown) => function (this: unknown) {
    if (this !== undefined && this !== globalThis) return Promise.reject(new TypeError('Illegal invocation'));
    return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }));
  } as unknown as typeof fetch;
  it('without consent never calls the network', async () => {
    let called = false;
    const answer = await askAssistant('قهوه', { consented: false, fetcher: (() => { called = true; return Promise.reject(); }) as unknown as typeof fetch });
    expect(called).toBe(false);
    expect(answer.source).toBe('local');
  });
  it('uses the gateway answer when valid', async () => {
    expect((await askAssistant('خنک', { consented: true, fetcher: browserFetch(200, gateway) })).source).toBe('ai');
  });
  it('falls back to local on 502, invalid body or network error', async () => {
    expect((await askAssistant('خنک', { consented: true, fetcher: browserFetch(502, { error: 'upstream_502' }) })).source).toBe('local');
    expect((await askAssistant('خنک', { consented: true, fetcher: browserFetch(200, { hello: 1 }) })).source).toBe('local');
    expect((await askAssistant('خنک', { consented: true, fetcher: (() => Promise.reject(new Error('offline'))) as unknown as typeof fetch })).source).toBe('local');
  });
  it('voice helpers: feature detection and Persian error messages', () => {
    expect(recognitionCtor({})).toBeNull();
    function Fake() { /* stub */ }
    expect(recognitionCtor({ webkitSpeechRecognition: Fake })).toBe(Fake);
    expect(voiceErrorMessage('not-allowed')).toContain('میکروفون');
  });
});

describe('local understanding in six languages', () => {
  it.each([
    ['coffee near me'], ['Ich suche einen Kaffee'], ['kahve istiyorum'], ['أريد قهوة'], ['un café por favor'], ['قهوه می‌خوام'],
  ])('«%s» looks for coffee', (query) => {
    const { intent } = localIntent(query);
    expect(intent.category).toBe('cafe');
    expect(intent.keywords).toContain('قهوه');
  });
  it('turns other ideas into the Persian words businesses publish', () => {
    expect(localIntent('pizzas for dinner').intent.keywords).toContain('پیتزا');
    expect(localIntent('Frühstück bitte').intent.keywords).toContain('کروسان');
    expect(localIntent('kebap yemek').intent.category).toBe('restaurant');
    expect(localIntent('بيتزا').intent.keywords).toContain('پیتزا');
    expect(localIntent('farmacia').intent.keywords).toContain('داروخانه');
  });
  it('reads deals, nearness and open-now in any of the languages', () => {
    expect(localIntent('descuento en tarta').intent.sort).toBe('offer');
    expect(localIntent('Rabatt auf Kuchen').intent.sort).toBe('offer');
    expect(localIntent('yakın bir kafe').intent.sort).toBe('nearest');
    expect(localIntent('café abierto').intent.open_now).toBe(true);
    expect(localIntent('walking distance bakery').intent.radius_meters).toBe(300);
  });
  it('does not see words inside other words', () => {
    expect(localIntent('rice').intent.category).toBeNull();
    expect(localIntent('customer service').intent.category).toBeNull();
    expect(localIntent('pantalones').intent.keywords).not.toContain('نان');
  });
  it('drops filler words', () => {
    expect(localIntent('I want a coffee please').intent.keywords).not.toContain('please');
  });
});
