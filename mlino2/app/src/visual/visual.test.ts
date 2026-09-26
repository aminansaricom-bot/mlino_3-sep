import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLatest } from './latest';
import { clampCrop, FULL } from './prepareImage';
import { VisualApiError, searchByPhoto } from './visualApi';

describe('search with a photo (D-91), on the phone', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sends only the photo bytes and business ids — never a position — to MLINO\'s own /api', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => { calls.push({ url, init }); return new Response(JSON.stringify({ results: [], total: 0, scope: 'subset', indexed: 3 }), { status: 200 }); }));
    const photo = new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: 'image/jpeg' });
    await searchByPhoto(photo, { organizationIds: ['test-demo-01', 'test-demo-02'], limit: 12, offset: 0 });
    const { url, init } = calls[0];
    expect(url.startsWith('/api/visual/search?')).toBe(true);
    expect(url).toContain('orgs=test-demo-01%2Ctest-demo-02');
    expect(url).not.toMatch(/lat|lng|lon|position|coord/i);
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['content-type']).toBe('image/jpeg');
    expect((init.headers as Record<string, string>)['x-mlino-csrf']).toBe('1');
    expect(init.body).toBe(photo);
  });

  it('turns every failure into a clear code (never a made-up result)', async () => {
    const photo = new Blob([new Uint8Array([1])], { type: 'image/jpeg' });
    const answer = (status: number, body: unknown) => vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status })));
    for (const [status, body, code] of [[413, { error: 'IMAGE_TOO_LARGE' }, 'IMAGE_TOO_LARGE'], [503, { error: 'MODEL_UNAVAILABLE' }, 'MODEL_UNAVAILABLE'],
      [429, { error: 'RATE_LIMITED' }, 'RATE_LIMITED'], [504, { error: 'TIMEOUT' }, 'TIMEOUT'], [404, { error: 'NOT_FOUND' }, 'NOT_FOUND'], [500, {}, 'UNKNOWN']] as const) {
      answer(status, body);
      await expect(searchByPhoto(photo, {})).rejects.toMatchObject({ code });
    }
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    await expect(searchByPhoto(photo, {})).rejects.toBeInstanceOf(VisualApiError);
    await expect(searchByPhoto(photo, {})).rejects.toMatchObject({ code: 'OFFLINE' });
    vi.stubGlobal('fetch', vi.fn(async () => { throw Object.assign(new Error('aborted'), { name: 'AbortError' }); }));
    await expect(searchByPhoto(photo, {})).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('an older, slower answer never replaces the results of a newer photo', async () => {
    const latest = createLatest();
    const shown: string[] = [];
    const search = async (name: string, ms: number) => {
      const ticket = latest.next();
      await new Promise((r) => setTimeout(r, ms));
      if (latest.isCurrent(ticket)) shown.push(name);
    };
    await Promise.all([search('old photo', 40), search('new photo', 5)]);
    expect(shown).toEqual(['new photo']);
    const t = latest.next(); latest.cancel();
    expect(latest.isCurrent(t)).toBe(false); // «لغو» or a new photo drops what was in flight
  });

  it('the crop stays inside the photo and never below 10 %', () => {
    expect(clampCrop({ x: -0.2, y: 0.95, w: 0.5, h: 0.5 })).toEqual({ x: 0, y: 0.5, w: 0.5, h: 0.5 });
    expect(clampCrop({ x: 0.5, y: 0.5, w: 0.01, h: 2 })).toEqual({ x: 0.5, y: 0, w: 0.1, h: 1 });
    expect(clampCrop(FULL)).toEqual(FULL);
  });
});
