const LAST_RELOAD_KEY = 'mlino:last-reloaded-build-id'
const BUILD_ID = /^[A-Za-z0-9._:-]{1,128}$/

type VersionResponse = Pick<Response, 'ok' | 'json'>
export type VersionCheckDeps = {
  fetcher: (input: string, init: RequestInit) => Promise<VersionResponse>
  storage: Pick<Storage, 'getItem' | 'setItem'>
  reload: () => void
}

/** فایل نسخه فقط سبب refresh صفحه می‌شود؛ هیچ کلید یا دادهٔ اعتماد از آن خوانده نمی‌شود. */
export async function checkForBuildUpdate(currentBuildId: string, deps: VersionCheckDeps): Promise<boolean> {
  if (!BUILD_ID.test(currentBuildId)) return false
  try {
    const response = await deps.fetcher('/version.json', { cache: 'no-store' })
    if (!response.ok) return false
    const body: unknown = await response.json()
    if (!body || typeof body !== 'object' || Array.isArray(body)) return false
    const next = (body as Record<string, unknown>).build_id
    if (typeof next !== 'string' || !BUILD_ID.test(next) || next === currentBuildId) return false
    if (deps.storage.getItem(LAST_RELOAD_KEY) === next) return false
    deps.storage.setItem(LAST_RELOAD_KEY, next)
    deps.reload()
    return true
  } catch {
    // خطای شبکه، قالب یا sessionStorage نباید پذیرش خروجی امضاشده را تغییر دهد.
    return false
  }
}
