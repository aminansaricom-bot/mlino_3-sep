import { afterEach, describe, expect, it, vi } from 'vitest';
import { CatalogFetchTransport } from './catalog';

// Browsers reject fetch called with a receiver other than window/globalThis ("Illegal invocation").
// Node does not, which is how the detached call slipped through every earlier test.
function browserLikeFetch(status: number, body?: string): typeof fetch {
  return function (this: unknown) {
    if (this !== undefined && this !== globalThis) return Promise.reject(new TypeError("Failed to execute 'fetch' on 'Window': Illegal invocation"));
    return Promise.resolve(new Response(body ?? null, { status }));
  } as unknown as typeof fetch;
}

describe('catalog transport works with a receiver-checking (browser) fetch', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('an injected fetch is called without the transport as receiver', async () => {
    await expect(new CatalogFetchTransport(browserLikeFetch(404)).read()).resolves.toBeNull();
    const bytes = await new CatalogFetchTransport(browserLikeFetch(200, '{"a":1}')).read();
    expect(new TextDecoder().decode(bytes!)).toBe('{"a":1}');
  });

  it('the default transport uses the global fetch correctly', async () => {
    vi.stubGlobal('fetch', browserLikeFetch(404));
    await expect(new CatalogFetchTransport().read()).resolves.toBeNull();
  });
});
