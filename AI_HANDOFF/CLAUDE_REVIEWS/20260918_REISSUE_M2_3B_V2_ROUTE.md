# صدور دوباره‌ی دستور M2-3b — نشانی فایل در نسخه‌ی دوم

**تاریخ:** ۱۸ سپتامبر ۲۰۲۶
**ثبت‌کننده:** Claude Opus 5 — نگهبان معماری MLINO

## ۱. چرا دوباره صادر می‌شود

دستور M2-3b هنوز شروع نشده بود و در این فاصله، بازبینی بخش اول (M2-3a) در پرونده ثبت شد. طبق قاعده، هر ثبت تازه در پرونده دستورهای شروع‌نشده را کهنه می‌کند. پس همان دستور، **بدون هیچ تغییری در محتوا**، با نشانی‌های تازه صادر می‌شود.

به خواست مالک، متن دستورهای کدکس انگلیسی می‌ماند و بقیه‌ی نوشته‌ها فارسی‌اند.

**جایگزین:** `CODEX-20260918-M2-3B-V2-SAME-ORIGIN-ROUTE-001`

## ۲. دستور کدکس — M2-3b، نسخه‌ی ۰۰۲

```
INSTRUCTION_ID: CODEX-20260918-M2-3B-V2-SAME-ORIGIN-ROUTE-002
SUPERSEDES: CODEX-20260918-M2-3B-V2-SAME-ORIGIN-ROUTE-001 (identical content; only the pins changed)
TARGET_HANDOFF_ID: HANDOFF-20260918-GUARDIAN-M2-3B-REISSUE
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260918-PUBLIC-EXPORT-OPERATIONS
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260918_REISSUE_M2_3B_V2_ROUTE.md (PINNED_COMMIT/SHA256 relayed)
MODEL: SOL (an Astra review round follows separately).
MODE: IMPLEMENTATION in V2 - a NEW branch codex/v2-public-export-route from origin/codex/v2-intent-flow-foundation
      at 540ad2d45f245a1bc5960bfdb15dc21b85f00947, in a NEW worktree
      C:/Users/galexy/mlino code/v2-public-export-route. LOCAL commits only; do NOT push.
PRECONDITION: GW2 or GW2-P on the pinned record (it lives on origin/main); record the outputs; any failure -> STOP.
  Never touch credentials, .env files, GITHUB_TOKEN.txt, git config, or any real key.
DESIGN BASIS: mlino2/MLINO_PUBLIC_EXPORT_OPERATIONS_DESIGN.md O2 and O4 (O2=A, O4=A conditional), Guardian G2.

1 nginx.conf: add EXACT-match locations, placed so they win over "location /":
  - location = /public-export/public-business.v1.json -> served from a read-only directory
    /srv/mlino-public-export/ ; Content-Type application/json; charset=utf-8; Cache-Control "no-store, max-age=0";
    X-Content-Type-Options nosniff; if the file is missing -> a real 404 (NEVER index.html); GET/HEAD only;
  - location = /version.json -> no-store, same header rules, 404 if missing;
  - keep every existing security header (remember add_header inheritance is cut at a lower level - repeat them);
  - index.html itself must be served with Cache-Control no-cache so a redeploy is picked up.
2 docker-compose.yml: bind-mount ${MLINO_PUBLIC_EXPORT_DIR:-./public-export-empty} to /srv/mlino-public-export
  READ-ONLY; add an empty ./public-export-empty/.gitkeep so an unset variable yields 404, not an error.
  Dockerfile/compose: pass VITE_PUBLIC_EXPORT_URL (default /public-export/public-business.v1.json) and
  VITE_PUBLIC_EXPORT_TRUST_BUNDLE (PUBLIC JSON only, default empty) as build args; document that the bundle comes
  from M2-2 buildV2TrustBundle and holds public keys only.
3 G2 version refresh:
  - at build, generate dist/version.json = {"build_id": "<id>"} and embed the same id in the app
    (import.meta.env.VITE_BUILD_ID or a vite define); the id must change on every build (for example a timestamp
    plus the short git hash when available) and must not contain secrets;
  - in RealPublicApp, on each 60s polling cycle, fetch /version.json with cache:'no-store'; if it returns a valid
    build_id different from the embedded one, reload the page once (guard against reload loops: at most one reload
    per new build_id, remembered in sessionStorage with try/catch); network or parse errors are ignored (the
    signed-artifact TTL rules stay unchanged);
  - the check must never change the trust bundle or accept keys from the network.
4 TESTS (vitest, no network): the version check reloads on a different id, not on the same id, not on errors,
  and at most once per id; the fetch uses no-store; nginx: a test or script that parses nginx.conf text and asserts
  the exact-match locations exist, carry no-store and nosniff, and contain no try_files fallback to index.html.
  If Docker is not allowed, do NOT run it; state that an nginx -t / live check is left to the Guardian.
  MUTATION PROOF (throwaway copy): (i) remove the reload guard, (ii) add a fallback to /index.html in the artifact
  location, (iii) drop no-store; each must make a test FAIL.
5 VALIDATION: npm run build and npm test in mlino2/app THREE times, committed logs in mlino2/validation/m2-3b/.
REPORT (new file): AI_HANDOFF/CODEX_REPORTS/20260918_CODEX_M2_3B_V2_ROUTE_REPORT.md
- files, requirement -> file -> exact test name, mutation outcomes, run totals, LF sha256, GW2/GW2-P.
  Append only to mlino2/HANDOFF/HANDOFF_STATE.md. Commit locally and STOP.
ALLOWED FILES:
- mlino2/app/nginx.conf, mlino2/app/docker-compose.yml, mlino2/app/Dockerfile, mlino2/app/vite.config.ts,
  mlino2/app/public-export-empty/.gitkeep (new), mlino2/app/src/publicExport/** (minimal changes + new tests),
  mlino2/validation/m2-3b/** (new), the report (new), mlino2/HANDOFF/HANDOFF_STATE.md (append only)
FORBIDDEN:
- the canonical/verify/trustBundle/consumer acceptance logic (only RealPublicApp wiring and a new version-check
  module may change); any real key; any new dependency; network in tests
- docker build/up or any container action; any real host folder; V1 files; main; _PUSH_STAGING; push; git config
```

من کلاد هستم
