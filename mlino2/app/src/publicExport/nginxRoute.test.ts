import { describe, expect, it } from 'vitest'
import config from '../../nginx.conf?raw'
import compose from '../../docker-compose.yml?raw'
import dockerfile from '../../Dockerfile?raw'

function exactLocation(route: string): string {
  const escaped = route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = config.match(new RegExp(`location = ${escaped} \\{([\\s\\S]*?)\\n    \\}`))
  expect(match, `exact location ${route}`).not.toBeNull()
  return match![1]
}

describe('مسیرهای دقیق Nginx', () => {
  it('serves the signed artifact from its read-only directory with a real 404, no SPA fallback', () => {
    const block = exactLocation('/public-export/public-business.v1.json')
    expect(block).toContain('alias /srv/mlino-public-export/public-business.v1.json;')
    expect(block).toMatch(/if \(!-f \/srv\/mlino-public-export\/public-business\.v1\.json\) \{ return 404; \}/)
    expect(block).toContain('limit_except GET { deny all; }')
    expect(block).not.toContain('/index.html')
  })

  it('serves version.json with a real 404, no SPA fallback', () => {
    const block = exactLocation('/version.json')
    expect(block).toContain('alias /usr/share/nginx/html/version.json;')
    expect(block).toMatch(/if \(!-f \/usr\/share\/nginx\/html\/version\.json\) \{ return 404; \}/)
    expect(block).toContain('limit_except GET { deny all; }')
    expect(block).not.toContain('/index.html')
  })

  it.each(['/public-export/public-business.v1.json', '/version.json'])('sets JSON, no-store, nosniff and all security headers on %s', (route) => {
    const block = exactLocation(route)
    expect(block).toContain('default_type application/json;')
    expect(block).toContain('charset_types application/json;')
    expect(block).toContain('charset utf-8;')
    expect(block).toContain('Cache-Control "no-store, max-age=0" always;')
    expect(block).toContain('X-Content-Type-Options "nosniff" always;')
    expect(block).toContain('Permissions-Policy')
    expect(block).toContain('Referrer-Policy "no-referrer" always;')
  })

  it('does not cache index.html across a redeploy', () => {
    expect(exactLocation('/index.html')).toContain('Cache-Control "no-cache" always;')
  })

  it('mounts only the public export folder as read-only, with an empty default', () => {
    expect(compose).toContain('${MLINO_PUBLIC_EXPORT_DIR:-./public-export-empty}:/srv/mlino-public-export:ro')
  })

  it('passes the public URL and public-only trust bundle at build time', () => {
    expect(compose).toContain('VITE_PUBLIC_EXPORT_URL: ${VITE_PUBLIC_EXPORT_URL:-/public-export/public-business.v1.json}')
    expect(compose).toContain('VITE_PUBLIC_EXPORT_TRUST_BUNDLE: ${VITE_PUBLIC_EXPORT_TRUST_BUNDLE:-}')
    expect(dockerfile).toContain('ARG VITE_PUBLIC_EXPORT_URL=/public-export/public-business.v1.json')
    expect(dockerfile).toContain('ARG VITE_PUBLIC_EXPORT_TRUST_BUNDLE=')
  })
})
