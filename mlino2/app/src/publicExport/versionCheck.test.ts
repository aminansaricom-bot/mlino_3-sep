import { describe, expect, it, vi } from 'vitest'
import { checkForBuildUpdate, type VersionCheckDeps } from './versionCheck'

const CURRENT = 'build-current'
function harness(next: unknown = { build_id: 'build-next' }) {
  const values = new Map<string, string>()
  const fetcher = vi.fn(async () => ({ ok: true, json: async () => next }))
  const reload = vi.fn()
  const storage = { getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { values.set(key, value) }) }
  return { deps: { fetcher, reload, storage } satisfies VersionCheckDeps, fetcher, reload, storage }
}

describe('شناسهٔ ساخت عمومی', () => {
  it('reloads once when a valid different build_id is returned', async () => {
    const { deps, reload } = harness()
    expect(await checkForBuildUpdate(CURRENT, deps)).toBe(true)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('does not reload for the embedded build_id', async () => {
    const { deps, reload } = harness({ build_id: CURRENT })
    expect(await checkForBuildUpdate(CURRENT, deps)).toBe(false)
    expect(reload).not.toHaveBeenCalled()
  })

  it('ignores network, HTTP, JSON and storage errors', async () => {
    const cases = [
      { fetcher: async () => { throw new Error('offline') } },
      { fetcher: async () => ({ ok: false, json: async () => ({ build_id: 'build-next' }) }) },
      { fetcher: async () => ({ ok: true, json: async () => { throw new Error('bad json') } }) },
      { storage: { getItem: () => { throw new Error('storage') }, setItem: () => undefined } },
    ]
    for (const part of cases) {
      const { deps, reload } = harness()
      expect(await checkForBuildUpdate(CURRENT, { ...deps, ...part } as VersionCheckDeps)).toBe(false)
      expect(reload).not.toHaveBeenCalled()
    }
  })

  it('reloads at most once per new build_id, including after a repeated page check', async () => {
    const { deps, reload } = harness()
    expect(await checkForBuildUpdate(CURRENT, deps)).toBe(true)
    expect(await checkForBuildUpdate(CURRENT, deps)).toBe(false)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('fetches version.json with no-store and does not read trust keys', async () => {
    const { deps, fetcher } = harness()
    await checkForBuildUpdate(CURRENT, deps)
    expect(fetcher).toHaveBeenCalledWith('/version.json', { cache: 'no-store' })
  })

  it('ignores malformed build identifiers', async () => {
    const { deps, reload } = harness({ build_id: '<script>' })
    expect(await checkForBuildUpdate(CURRENT, deps)).toBe(false)
    expect(reload).not.toHaveBeenCalled()
  })
})
