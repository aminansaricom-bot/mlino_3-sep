import { describe, expect, it } from 'vitest';
import { buildMessages, normalizeLang, createDailyBudget, createLimiter, extractJson, normalizeQuery, parseKeyFile, resolveIntent, validateIntent } from './assistantCore.mjs';

const good = { action: 'discover', keywords: ['آیس‌کافی', 'موهیتو'], category: 'cafe', open_now: false, radius_meters: 1000, sort: 'relevance', answer: 'دنبال نوشیدنی خنک می‌گردم.' };
const okResponse = (content) => new Response(JSON.stringify({ choices: [{ message: { content } }], usage: { prompt_tokens: 10, completion_tokens: 5 } }), { status: 200, headers: { 'content-type': 'application/json' } });

describe('gateway: strict intent contract (fail-closed)', () => {
  it('accepts exactly the approved shape', () => { expect(validateIntent(good)).toEqual(good); });
  it.each([
    ['extra key (business id)', { ...good, business_id: 'x' }],
    ['unknown category', { ...good, category: 'pizza_shop' }],
    ['radius below range', { ...good, radius_meters: 100 }],
    ['radius above range', { ...good, radius_meters: 50000 }],
    ['non-integer radius', { ...good, radius_meters: 1000.5 }],
    ['unknown sort', { ...good, sort: 'cheapest' }],
    ['answer too long', { ...good, answer: 'ا'.repeat(281) }],
    ['keyword too long', { ...good, keywords: ['ب'.repeat(65)] }],
    ['too many keywords', { ...good, keywords: Array.from({ length: 25 }, (_, i) => `k${i}`) }],
    ['string open_now', { ...good, open_now: 'true' }],
    ['array', [good]],
  ])('rejects %s', (_label, value) => { expect(validateIntent(value)).toBeNull(); });
  it('extracts JSON from a fenced model reply', () => { expect(extractJson('```json\n' + JSON.stringify(good) + '\n```')).toEqual(good); });
  it('normalizes the query and caps it at 500 characters', () => {
    expect(normalizeQuery('  یه\u0000 چیز   خنک ')).toBe('یه چیز خنک');
    expect(normalizeQuery('')).toBeNull();
    expect(normalizeQuery('ا'.repeat(501))).toBeNull();
    expect(normalizeQuery(42)).toBeNull();
  });
  it('sends only the query text to the model, never location or business data', () => {
    const messages = buildMessages('قهوه نزدیک');
    expect(messages).toHaveLength(2);
    expect(messages[1]).toEqual({ role: 'user', content: 'قهوه نزدیک' });
  });
  it('asks for the answer in the person\'s language and Persian keywords for any language', () => {
    const [system, user] = buildMessages('coffee nearby', 'de');
    expect(system.content).toMatch(/Answer language: German\.$/);
    expect(system.content).toMatch(/keywords: always Persian/);
    expect(user).toEqual({ role: 'user', content: 'coffee nearby' });
    expect(buildMessages('x').at(0).content).toMatch(/Answer language: Persian/);
  });
  it('accepts only the app languages', () => {
    expect(normalizeLang('tr')).toBe('tr');
    expect(normalizeLang('fr')).toBe('fa');
    expect(normalizeLang(undefined)).toBe('fa');
    expect(normalizeLang('__proto__')).toBe('fa');
  });
  it('reads only cc_ keys from the key file', () => {
    expect(parseKeyFile('note\ncc_abcdefghijklmnopqrstuvwxyz0123\n\ncc_ZYXWVUTSRQPONMLKJIHGFEDCBA9876 extra')).toHaveLength(2);
    expect(parseKeyFile('no keys here')).toEqual([]);
  });
});

describe('gateway: limits', () => {
  it('10/min with a burst of 5 and at most 2 concurrent per client', () => {
    let t = 0;
    const limiter = createLimiter({ now: () => t });
    expect(limiter.acquire('a')).toBe('ok'); expect(limiter.acquire('a')).toBe('ok');
    expect(limiter.acquire('a')).toBe('busy');
    limiter.release('a'); limiter.release('a');
    for (let i = 0; i < 3; i += 1) { expect(limiter.acquire('a')).toBe('ok'); limiter.release('a'); }
    expect(limiter.acquire('a')).toBe('rate');
    t += 6000; // one token back after 6 s at 10/min
    expect(limiter.acquire('a')).toBe('ok');
    expect(limiter.acquire('b')).toBe('ok');
  });
  it('daily budget stops upstream calls and resets the next day', () => {
    let t = Date.parse('2026-09-23T10:00:00Z');
    const budget = createDailyBudget(2, () => t);
    expect(budget.take()).toBe(true); expect(budget.take()).toBe(true); expect(budget.take()).toBe(false);
    t += 24 * 3600 * 1000;
    expect(budget.take()).toBe(true);
  });
});

describe('gateway: upstream calls', () => {
  const base = { keys: ['cc_first_key_000000000000', 'cc_second_key_00000000000'], baseUrl: 'https://example.invalid/v1', models: ['m1', 'm2'], timeoutMs: 1000 };
  it('retries once with the fallback model and key on 502, then succeeds', async () => {
    const calls = [];
    const fetchImpl = async (url, init) => { calls.push(JSON.parse(init.body).model + '|' + init.headers.Authorization.slice(-4)); return calls.length === 1 ? new Response('<html>', { status: 502 }) : okResponse(JSON.stringify(good)); };
    const result = await resolveIntent('خنک', { ...base, fetchImpl });
    expect(result.ok).toBe(true);
    expect(result.model).toBe('m2');
    expect(calls).toEqual(['m1|0000', 'm2|0000']);
  });
  it('does not retry a 4xx and returns only an error code', async () => {
    let n = 0;
    const result = await resolveIntent('خنک', { ...base, fetchImpl: async () => { n += 1; return new Response('{"error":"bad"}', { status: 401 }); } });
    expect(result).toEqual(expect.objectContaining({ ok: false, error: 'upstream_401' }));
    expect(n).toBe(1);
  });
  it('invalid model output falls back once, then fails closed', async () => {
    const result = await resolveIntent('خنک', { ...base, fetchImpl: async () => okResponse('{"action":"discover","business":"Fake Cafe"}') });
    expect(result).toEqual({ ok: false, error: 'invalid_model_output' });
  });
  it('a timeout is reported as upstream_timeout', async () => {
    const fetchImpl = async (_url, init) => new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))));
    const result = await resolveIntent('خنک', { ...base, timeoutMs: 10, fetchImpl });
    expect(result).toEqual({ ok: false, error: 'upstream_timeout' });
  });
});
