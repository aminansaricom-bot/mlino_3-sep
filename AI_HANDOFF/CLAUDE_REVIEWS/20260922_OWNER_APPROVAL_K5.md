# ثبت تصویب مالک — K5: نمایش کاتالوگ و ویترین دوربین روی گوشی

**تاریخ:** ۲۲ سپتامبر ۲۰۲۶
**ثبت‌کننده:** Claude Opus 5 — نگهبان معماری MLINO
**مبنا:** CCR کاتالوگ و K4 در main (`0b3795b`) · برنامه‌ی نسخه‌ی دوم در شاخه‌ی `codex/v2-intent-flow-foundation` @ `47b1733`

## ۱. متن تصویب مالک

> «مرحله‌ی K5 (نمایش کاتالوگ و ویترین دوربین روی گوشی) مجاز است»

## ۲. یافته‌ی نگهبان پیش از دستور

در `nginx.conf` فعلی، هر مسیر ناشناخته زیر `/public-export/` به `location /` می‌رسد و **صفحه‌ی HTML برنامه با کد 200** برمی‌گردد. یعنی اگر فایل کاتالوگ نباشد، برنامه به‌جای «کاتالوگ نیست» یک HTML دریافت می‌کند. K5 باید این را با مسیر دقیق و یک نگهبان ۴۰۴ برای کل `/public-export/` ببندد.

## ۳. تصمیم‌های نگهبان برای K5

| # | تصمیم |
|---|---|
| **K5-G1** | **کاتالوگ هرگز برنامه‌ی فعلی را نمی‌شکند.** هر خرابی کاتالوگ یعنی «کاتالوگ خالی». نقشه، کسب‌وکارها و پیشنهادها دقیقاً مثل امروز می‌مانند |
| **K5-G2** | **هیچ تصویری بدون سنجش نمایش داده نمی‌شود.** بایت‌ها دریافت، اثرانگشت و قالب و ابعاد سنجیده و سپس از روی همان بایت‌ها blob ساخته می‌شود. آدرس بیرونی هرگز مستقیم در `img` قرار نمی‌گیرد |
| **K5-G3** | ناهمخوانی گره‌خوردن با فایل کسب‌وکار فقط کاتالوگ **همان** کسب‌وکار را پنهان می‌کند (K-D14) |
| **K5-G4** | fixture مُهرشده‌ی K4 **بایت‌به‌بایت** در برنامه استفاده می‌شود تا سازنده و مصرف‌کننده روی یک نمونه قفل شوند |
| **K5-G5** | بدون وابستگی تازه · بدون شبکه برای کدکس · بدون تصویر واقعی |

## ۴. دستور کدکس — K5

به خواست مالک، متن دستور کدکس انگلیسی است. کار چندبخشی و رابط‌کاربری‌محور است: ساخت با **سول**، و **بازبینی پایانی با استرا** پیشنهاد می‌شود.

```
INSTRUCTION_ID: CODEX-20260922-K5-CATALOG-CONSUMER-AR-001
TARGET_HANDOFF_ID: HANDOFF-20260922-OWNER-APPROVAL-K5
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260921-CATALOG-MEDIA
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260922_OWNER_APPROVAL_K5.md (PINNED_COMMIT/SHA256 relayed)
MODEL: SOL.
MODE: IMPLEMENTATION - a NEW branch codex/v2-catalog-ui from origin/codex/v2-intent-flow-foundation at
      47b1733 in a NEW worktree C:/Users/galexy/mlino code/v2-catalog-ui. LOCAL commits only; do NOT push.
      No network, no Docker, no database, no new dependency (mlino2/app/package.json and lockfile MUST NOT change).
      For node_modules use an ignored junction to C:/Users/galexy/mlino code/v2-intent-flow/mlino2/app/node_modules.
PRECONDITION: GW2-P on the pinned record (pinned commit on origin/main); confirm origin/codex/v2-intent-flow-foundation
  == 47b1733; record outputs; any failure -> STOP. Never open any .env, GITHUB_TOKEN.txt or key file.
BASIS (binding): on origin/main - the approved CCR sections 6 and 8 (implementation/remediation/
  CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_CATALOG_ITEM_AND_MEDIA.md), the K4 producer
  implementation/public-export/{catalog-builder,catalog-artifact,media,signing}.ts, and the frozen fixture
  implementation/test/public-export/fixtures/public-catalog.v1.fixture.json (git-byte sha256
  dc945f4aefb705956000c21cb8b14eb05ff3f0f2bf12912eaef7ed8494a47442); the K1 design
  f02436f9ac0c48e6df42cf879b5d187ab7d31efc:mlino2/MLINO_CATALOG_MEDIA_DESIGN.md sections 4.3, 6 and 8; Guardian
  decisions K5-G1..K5-G5 and the nginx finding in sections 2-3 of the pinned record.

U1 NGINX (mlino2/app/nginx.conf): (a) exact route /public-export/public-catalog.v1.json identical in form to the
   business route (alias, real 404, GET only, application/json, no-store, all security headers repeated);
   (b) the media route of K1 4.3 - regex restricted to ^/public-export/media/sha256/([0-9a-f]{2})/([0-9a-f]{64})
   \.(avif|webp|jpg|png)$, the two-hex directory must equal the first two hash characters, GET only, content type
   from the extension allowlist only, Cache-Control "public, max-age=31536000, immutable", nosniff, all security
   headers repeated, real 404; (c) a guard `location ^~ /public-export/ { return 404; }` so NO other path under
   /public-export/ can ever reach the SPA fallback. Extend nginxRoute.test.ts for all three, including a negative
   test that the SPA fallback cannot serve anything under /public-export/.
U2 VERIFY: parameterize the domain separator in src/publicExport/verify.ts; business stays
   'MLINO-PUBLIC-BUSINESS-V1\n' byte-for-byte, catalog uses 'MLINO-PUBLIC-CATALOG-V1\n'. Copy the K4 fixture
   byte-identically to src/publicExport/fixtures/public-catalog.v1.fixture.json with a test asserting its sha256;
   the fixture verifies under the catalog domain and fails under the business domain, and a business fixture fails
   under the catalog domain. All existing publicExport tests stay unchanged and green.
U3 CATALOG CONSUMER: new src/publicExport/catalog*.ts - fetch /public-export/public-catalog.v1.json through its
   own FetchTransport (cap 2,000,000); HTTP 404 = "catalog not published" (empty, not an error); strict parsing of
   envelope, record, item and media with unknown-field rejection exactly like mapping.ts; same TTL/skew as the
   business consumer; binding (K5-G3): a record is accepted only if business_snapshot_id equals the CURRENTLY
   accepted business artifact's snapshot_id and business_publication_id equals that organization's publication id;
   a mismatch hides only that organization's catalog; offer_version_links resolve only to offers present in the
   accepted business artifact. Any catalog failure yields an empty catalog and never changes business state or
   polling (K5-G1). Poll on the same cadence as the business artifact, after it.
U4 MEDIA LOADER (K5-G2): new src/publicExport/catalogMedia.ts - fetch the media path under /public-export/ with a
   streaming cap of 1,500,000 bytes, verify SHA-256 (crypto.subtle), magic bytes for the declared type, no animation,
   and header width/height equal to the metadata (port the dependency-free header rules of the producer media.ts to
   Uint8Array); only then create an object URL from the verified bytes. Failure = neutral placeholder frame (alt text
   shown), never an unverified source. Offline cache (K-D11): Cache Storage keyed by sha256 holding ONLY verified
   bytes, re-verified on every read; a poisoned or partial cache entry is deleted. Lazy-load only visible cards
   plus the next one. Revoke object URLs on unmount.
U5 UI: (a) in the business details, a catalog section grouped by grouping_label in artifact order, each card with
   name, short description, price (IRR, Persian digits, existing uiFormat helpers) or an "on request" label, first
   image and alt text; hidden entirely when the catalog is empty. (b) AR vitrine (src/ar/ArVitrineView.tsx): for the
   business in focus, a horizontally swipeable stack of semi-transparent catalog cards (touch and pointer, keyboard
   arrows for accessibility) over the camera view, keeping the existing offer overlay behaviour; with no catalog the
   vitrine behaves exactly as today. All user-visible text in Persian.
U6 TESTS (vitest, fixtures built in tests, never an image from the internet): binding accept/hide per organization,
   404 empty, unknown-field rejection at every level, expired/future, cross-domain signatures, catalog failure leaves
   business state identical, media hash/type/animation/dimension/size failures show the placeholder, cache poisoning,
   lazy-load order, swipe order, and an "old build" test that public-business.v1 handling is unchanged.
VERIFY (offline): npm run build (tsc -b && vite build) and npm test in mlino2/app; report exact outputs.
REPORT (new file): mlino2/HANDOFF/20260922_CODEX_K5_CATALOG_CONSUMER_AR_REPORT.md - changed files, commands and
  outputs, anything NOT verified (for example real camera or real phone), open choices made. Append only to
  mlino2/HANDOFF/HANDOFF_STATE.md. Commit locally and STOP.
ALLOWED FILES: mlino2/app/nginx.conf; mlino2/app/src/** (new files allowed, existing files edited only as needed);
  the report (new); mlino2/HANDOFF/HANDOFF_STATE.md (append only).
FORBIDDEN: mlino2/app/package.json and lockfile, Dockerfile, docker-compose.yml, anything under implementation/,
  the business contract, the assistant/LLM modules, any real image, Docker, database, network, main, push,
  git config, any .env or key file.
```

## ۵. پس از K5

نگهبان ساخت و آزمون‌ها را اجرا می‌کند، `nginx -t` و مسیرها را در یک کانتینر واقعی می‌آزماید، و زنجیره‌ی کامل سازنده، توزیع و مصرف‌کننده را با fixture و تصویر ساختگی امتحان می‌کند. برای دیدن روی گوشی، **K6** (محصول و تصویر آزمایشی برای کسب‌وکارهای ونک) لازم است که تصویب جدا می‌خواهد.

من کلاد هستم
