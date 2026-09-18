# بازبینی نگهبان — M2-3b (نشانی فایل در نسخه‌ی دوم) و صدور دور بازبینی با استرا

**تاریخ:** ۱۸ سپتامبر ۲۰۲۶
**بازبین:** Claude Opus 5 — نگهبان معماری MLINO
**commitها:** `ced4077` (کد) و `be55774` (گزارش) روی `540ad2d`. **نگهبان شاخه‌ی `codex/v2-public-export-route` را روی سرور منتشر کرد** (شاخه‌ی تازه) · ادغام آزمایشی با شاخه‌ی نسخه‌ی دوم تمیز است.

## حکم: `APPROVED_NEXT_STEP`؛ آزمون زنده‌ی وب‌سرور قبول شد و دور استرا برای هر دو بخش صادر می‌شود

## ۱. راستی‌آزمایی

| مورد | نتیجه |
|---|---|
| **دامنه** | ✅ فقط فایل‌های مجاز · منطق پذیرش (canonical، verify، trustBundle، consumer، mapping، transport) **دست نخورده** · فهرست بسته‌ها بدون تغییر |
| **آزمون‌ها** | ✅ خودم روی نسخه‌ی جدا اجرا کردم: **۱۶ فایل، ۲۳۸ از ۲۳۸** · ساخت عادی و بدون ترفند بارگذار موفق بود |
| **برگه‌ی شماره‌ی نسخه** | ✅ `dist/version.json` ساخته می‌شود و **همان شناسه** داخل کد برنامه هم نشسته است |
| **تازه‌سازی صفحه** | ✅ فقط وقتی شناسه‌ی معتبر و متفاوت برسد · برای هر شناسه یک بار · خطاها نادیده گرفته می‌شوند · هیچ کلیدی از شبکه خوانده نمی‌شود |

## ۲. آزمون زنده‌ی وب‌سرور به‌دست نگهبان

یک کانتینر **موقت و جدا**، از image موجود `app-mlino2-web:latest` (بدون دانلود)، روی درگاه `127.0.0.1:18443`. پیکربندی تازه، خروجی ساخت تازه و یک پوشه‌ی موقت به‌صورت فقط‌خواندنی به آن وصل شد. پس از آزمون خاموش و حذف شد. **کانتینرهای در حال اجرا دست نخوردند.**

| درخواست | نتیجه |
|---|---|
| `nginx -t` | ✅ پیکربندی درست است |
| فایل عمومی **وقتی نیست** | ✅ **404 واقعی**، نه صفحه‌ی اصلی برنامه |
| فایل عمومی وقتی هست | ✅ 200 · `application/json; charset=utf-8` · `no-store, max-age=0` · `nosniff` · محتوا عیناً همان فایل |
| HEAD | ✅ 200 |
| POST | ✅ 403 |
| `/version.json` | ✅ 200 · JSON · `no-store` |
| `/` و مسیرهای برنامه | ✅ صفحه‌ی اصلی با `no-cache` |
| `/assets/...` | ✅ cache بلندمدت، مانند قبل |

## ۳. یادداشت‌ها

| # | یادداشت |
|---|---|
| G9 | نشانی‌های دیگر زیر `/public-export/` به صفحه‌ی اصلی برنامه می‌روند. خطری ندارد، چون فقط نشانی دقیق فایل خوانده می‌شود |
| **G10** | **دو پنجره‌ی زمانی یکسان‌اند:** مرحله‌ی توزیع فایلی تا ۳۰۰ ثانیه کهنه را می‌پذیرد و نسخه‌ی دوم هم فایل را ۳۰۰ ثانیه معتبر می‌داند. پس ممکن است فایلی منتشر شود که تنها چند ثانیه عمر دارد. **در دور استرا بررسی شود** |
| **G11** | **ریسک ویندوز:** جایگزین کردن فایل با rename وقتی فرایند دیگری، مثلاً وب‌سرور از راه اتصال داکر، همان لحظه آن را باز کرده، روی ویندوز ممکن است با `EPERM` یا `EBUSY` شکست بخورد. **در دور استرا با آزمون واقعی بررسی و در صورت نیاز با تلاش دوباره‌ی محدود حل شود** |

## ۴. دستور کدکس — دور بازبینی و اشکال‌زدایی با **استرا**

به خواست مالک، متن دستور کدکس انگلیسی است.

```
INSTRUCTION_ID: CODEX-20260918-M2-3R-ASTRA-JOINT-REVIEW-001
TARGET_HANDOFF_ID: HANDOFF-20260918-GUARDIAN-M2-3B-REVIEW
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260918-PUBLIC-EXPORT-OPERATIONS
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260918_CLAUDE_REVIEW_M2_3B_AND_ASTRA_ROUND.md (PINNED_COMMIT/SHA256 relayed)
MODEL: ASTRA - an adversarial review, cross-component testing and debugging round.
SCOPE: the two accepted, published branches:
  V1 codex/public-export-distribution @ f9e48756e28788e4a28bcb48f468bfa2145c65e6 (worktree public-export-distribution)
  V2 codex/v2-public-export-route     @ be5577477319c3ef1c8709d478c8c30ea14737e6 (worktree v2-public-export-route)
  Each local HEAD must equal the SHA above (else STOP). Add LOCAL commits on top of each branch only; do NOT push,
  rebase, amend or force. You may also read main (M2-2 key adapter) and the V2 base 540ad2d.
PRECONDITION: GW2 or GW2-P on the pinned record; record the outputs; any failure -> STOP.

GOAL: find and fix real defects BEFORE the owner authorizes touching the real host. Think like an attacker and like
an operator on a bad day. Report every finding, even those you do not fix.

1 CROSS-COMPONENT END-TO-END TEST (the main deliverable; no DB, no Docker, TEST keys only):
  - in V1: a test that builds a descriptor with TEST keys (fake protector), signs a canonical
    mlino.v2.public-business.v1 envelope through the M2-2 provider (signEnvelope), writes it as a producer-output
    file, runs distributeCurrent into a temp public dir, and writes a FIXTURE: the distributed bytes plus the trust
    bundle from buildV2TrustBundle, into mlino2/app/src/publicExport/fixtures/e2e/ ON THE V2 BRANCH (commit the
    generator script in V1 and the generated fixture in V2; record the fixture sha256 in both reports);
  - in V2: a vitest that loads that fixture through trustBundleFromBuildJson + PublicExportConsumer (FileTransport)
    and asserts acceptance, and asserts rejection after a one-byte change, with a revoked id, and after TTL.
  This proves the producer, the distributor, the bundle builder and the browser consumer agree byte-for-byte.
2 TIMING (Guardian G10): analyse distribution maxAgeMs (300s) against the V2 TTL (300s) and the 60s cycles. Propose
  and implement a safer default (for example maxAgeMs = 120s) with a test, or justify leaving it; never loosen V2.
3 WINDOWS RENAME (Guardian G11): write a test that holds the public file open for reading (as a reader would)
  while distributeCurrent replaces it, on Windows. If rename fails with EPERM/EBUSY/EACCES, add a bounded retry
  (for example 5 tries, 50-200ms backoff) that still never leaves a temp file and never writes a partial file;
  test both the success-after-retry and the give-up paths (the latter with an injected rename).
4 ADVERSARIAL REVIEW of both branches, at least: symlink/junction tricks on sourceDir/publicDir and on the artifact
  file (a junction that points into the repository or the producer dir), path case/8.3-name tricks on Windows,
  a huge artifact (size cap before reading fully - add one matching the V2 transport's 2,000,000-byte cap),
  duplicate JSON keys, BOM, a trailing newline, the reload guard when sessionStorage throws, reload storms across
  several tabs, the nginx 'if' inside location with alias, HEAD/Range requests, and the version.json race during a
  redeploy (old index.html + new version.json). Fix what is real, with a failing-then-passing test for each fix.
5 VALIDATION: V1 - npm run build and the distribution + key-provider specs THREE times; V2 - npm run build and
  npm test THREE times; logs in implementation/validation/m2-3r/ and mlino2/validation/m2-3r/. Tests the sandbox
  cannot run (ACL, real Windows file locking) must SKIP with a visible reason; the Guardian will run them.
REPORT (new file on EACH branch): AI_HANDOFF/CODEX_REPORTS/20260918_CODEX_M2_3R_ASTRA_REVIEW_REPORT.md
- a findings table: id, severity, component, description, fixed? (commit + test name) or why not;
- the e2e fixture sha256; the timing decision; the rename-lock result; run totals with skips and reasons;
  LF sha256 of changed files; GW2/GW2-P outputs. Append only to mlino2/HANDOFF/HANDOFF_STATE.md. Commit and STOP.
ALLOWED FILES:
- V1 branch: implementation/public-export/distribution/**, implementation/test/public-export/**/ (new or changed
  tests only), implementation/validation/m2-3r/** (new), the report, mlino2/HANDOFF/HANDOFF_STATE.md (append)
- V2 branch: mlino2/app/nginx.conf, mlino2/app/src/publicExport/versionCheck.ts, RealPublicApp.tsx,
  mlino2/app/src/publicExport/fixtures/e2e/** (new), tests under mlino2/app/src/**, mlino2/validation/m2-3r/**
  (new), the report, mlino2/HANDOFF/HANDOFF_STATE.md (append)
FORBIDDEN:
- the V2 acceptance logic (canonical/verify/trustBundle/consumer/mapping/transport) and the V1 signing, builder,
  canonical and key-provider PRODUCT code - if you find a defect there, REPORT it and STOP rather than change it;
- any real key; any new dependency; network in tests; Docker; any real host folder or ACL; any database beyond the
  safe test setup; port 5435; main; _PUSH_STAGING; push; git config
```

## ۵. وضعیت دروازه‌ها

| دروازه | موضوع | وضعیت |
|---|---|---|
| M2-3a | توزیع و پوشه‌ی عمومی | ✅ پذیرفته (`f9e4875`) |
| **M2-3b** | **نشانی فایل در نسخه‌ی دوم** | ✅ **پذیرفته** (`be55774`) · آزمون زنده‌ی وب‌سرور قبول |
| **M2-3r** | **دور بازبینی و اشکال‌زدایی با استرا** | ▶️ **صادر شد** |
| اعمال واقعی روی میزبان · کلید واقعی · M2-4 | | ⏳ اجازه‌ی جداگانه‌ی مالک |

من کلاد هستم
