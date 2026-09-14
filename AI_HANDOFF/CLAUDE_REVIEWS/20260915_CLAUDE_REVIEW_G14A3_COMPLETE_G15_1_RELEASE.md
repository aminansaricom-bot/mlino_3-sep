# بازبینی نگهبان — G14a-3 اجرای ۰۰۳: migration روی DB محلی اعمال شد · ادغام شواهد · صدور G15-1

**تاریخ:** ۱۵ سپتامبر ۲۰۲۶
**بازبین و مجری ادغام:** Claude Opus 5 — MLINO Architecture Guardian
**commit ‏Codex:** `b4fc5e5`، روی `394bada`. Codex آن را محلی ساخت و **نگهبان روی سرور منتشر کرد.**

## حکم: `APPROVED_NEXT_STEP`؛ **G14a به‌طور کامل بسته شد**

## ۱. راستی‌آزمایی مستقل نگهبان (فقط‌خواندنی)

| مورد | شاهد Codex | **سنجش مستقل نگهبان** |
|---|---|---|
| migrationها | ۷ تا، همه finished | ✅ **۷ تا**، همه finished و rolled back نشده؛ تازه‌ترین `20260914010000_add_publication_published_content` |
| ستون | jsonb | ✅ `publications.published_content` = **jsonb** |
| CHECK | validated | ✅ `publication_published_content_event_kind_check`، ‏**convalidated = true** |
| trigger و CHECK | ۱۳ و ۲۹ به ۳۰ | ✅ **۱۳** و **۳۰** |
| شمار ردیف‌ها | برابر با پیش، به‌جز `_prisma_migrations` | ✅ `publications`=0 · `domain_signal_producer_registry`=4 · شمارش‌های پس از کار برابر پیش‌اند، به‌جز ۶ به ۷ در `_prisma_migrations` |
| containerها | بدون تغییر | ✅ read-api ‏`a07858b3` · DB ‏`StartedAt=2026-09-12T21:34:05.613Z` · ۰ restart · هیچ dump موقتی در container نیست |
| read-api | 401 | ✅ **HTTP 401** (خودم درخواست زدم) |
| **backup** | `mlino_v1_pre_g14a_20260914T214243Z.dump` | ✅ روی میزبان هست · **۱۰۳٬۴۰۷ بایت** · SHA-256 ‏**`0116d2c1…bcac`**، برابر درون container و گزارش · سرآیند `PGDMP` · `pg_restore --list` برابر ۲۱۵ |
| deploy | یک بار | ✅ `migrate-deploy.log`: exit 0 و دقیقاً یک migration اعمال شد · پیش از آن `migrate status` دقیقاً یک migration معلق نشان داد |
| F2، خودآزمایی | موفق | ✅ ۶ migration، ۰، ۰، ۱۳، ۲۹ و registry=4، برابر مقادیر نگهبان |
| **C0** | فقط booleanها | ✅ `c0.log` بی‌رمز است · `DATABASE_URL_REMOVED_AFTER_RUN=True` · **grep نشت: هیچ** (فقط الگوی regex و `http://localhost:3000`) · آدرس در لاگ Prisma به‌صورت `[REDACTED_LIVE_ENDPOINT]` ثبت شده |
| دامنه | | ✅ فقط `mlino2/validation/g14a3/run3/**`، گزارش و Handoff · **۰ فایل در `implementation/`** · run1 و run2 دست‌نخورده · **هیچ فایل dump در مخزن** |

**«خطای اولیه‌ی post-check» خطای دستور نگهبان بود، نه اجرا.**
- F3 در دستور ۰۰۳ گفته بود «همه‌ی شمارش‌ها برابر پیش باشند»، ولی `_prisma_migrations` را استثنا نکرده بود. آن جدول به‌طور مورد انتظار از ۶ به ۷ رسید.
- اسکریپت `POST_VERIFY_FAILED` داد. **بدون deploy دوم**، Codex وارسی دستی را جداگانه و با برچسب صادقانه ثبت کرد (`post-verify-manual.log`: `INITIAL_SCRIPT_COUNT_COMPARISON=FALSE_FAILURE`)، و **لاگ خطای اصلی را بازنویسی نکرد.** این برای یکپارچگی شواهد درست است.
- هر هفت وارسی a تا g را خودم مستقل تکرار کردم و درست بودند.

**یادداشت جزئی:** `run3/execution.log` مقدار `HEAD=a68c599` را نشان می‌دهد، در حالی که HEAD واقعی worktree در آن زمان `394bada` بود. این به بررسی درخت `implementation/prisma` ربطی ندارد، چون آن درخت در هر سه commit برابر است. در G15-1 ثبت درست HEAD الزامی است.

**پایان استثنا:** استثنای فقط‌حافظه‌ی `DATABASE_URL` با پایان G14a-3 **منقضی شد.** قانون «Codex به اعتبارنامه‌ها دست نمی‌زند» دوباره کامل برقرار است.

**رفع ریسک:** از این پس `docker compose up --build` و `v1-migrate` چیزی برای اعمال ندارند، پس ریسک «G7 ناخواسته» برای این migration برطرف شد.

## ۲. ادغام شواهد در main

| مورد | مقدار |
|---|---|
| **merge commit** | **`6e547ca541de8a083a454c950b4e9162e0a51d7c`** · tree ‏`f9f11e3` (برابر ادغام آزمایشی) · والدها `81f2c2c` و `b4fc5e5` |
| دامنه | ۴۸ فایل، **فقط افزودنی** (+۱٬۳۴۸ خط): شواهد run1 تا run3، سه گزارش و Handoff · **۰ فایل در `implementation/`** |
| مجوز | تصویب مالک برای ادغام G14a و G14a-3 (۱۴ سپتامبر ۲۰۲۶) |

**G14a بسته شد:** قرارداد، migration، service، آزمون‌ها، ادغام و اعمال روی DB محلی.

---

## ۳. دستور Codex — G15-1 (سند CCR مقاوم‌سازی تراکنش در Core)

مالک این مرحله را در ۱۴ سپتامبر ۲۰۲۶ تصویب کرد: «G15-1 (سند CCR مقاوم‌سازی تراکنش) مجاز است».

```
INSTRUCTION_ID: CODEX-20260915-G15-1-CORE-TRANSACTION-ROBUSTNESS-CCR-001
TARGET_HANDOFF_ID: HANDOFF-20260915-GUARDIAN-G14A3-COMPLETE-G15-1
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260915-CORE-G15
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260915_CLAUDE_REVIEW_G14A3_COMPLETE_G15_1_RELEASE.md (PINNED_COMMIT/SHA256 relayed)
               + AI_HANDOFF/CLAUDE_REVIEWS/20260914_CLAUDE_REVIEW_G14A2C_CONCURRENCY_DIAGNOSIS.md (the P2028 evidence)
DECISION: owner-approved G15-1 = a CCR DOCUMENT for Core transaction robustness. Diagnostics are allowed ONLY in throwaway
          copies on disposable DBs. NO product change.
MODE: a NEW branch codex/core-g15-transaction-robustness from origin/main at the pinned commit, in a NEW worktree
      C:/Users/galexy/mlino code/core-g15-transaction-robustness. LOCAL commits only; do NOT push.

PRECONDITION: GW2 or GW2-P on the pinned record; record the outputs; any failure -> STOP. Never touch credentials
(the G14a-3 DATABASE_URL exception has EXPIRED).

DELIVERABLE: implementation/remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_CORE_TRANSACTION_ROBUSTNESS.md
(status DRAFT; follow the structure of CONTRACT_CHANGE_REQUEST_CORE_FOUNDATION_SCHEMA.md; every claim cites
origin/main file:line)
R1 ROOT CAUSE of P2028 "Unable to start a transaction in the given time" in the 6 race tests (G10a2 x2, G10b,
   G10c, G10d x2):
   - evaluate with EVIDENCE, not assertion:
     - the Prisma interactive-transaction defaults (maxWait 2000 ms, timeout 5000 ms)
     - the pool size (connection_limit default; foundation/prisma-client.ts)
     - whether a connection is held while waiting on lockOrganization FOR UPDATE (repositories.ts:6-9)
     - host load
   - allowed diagnostics: throwaway copies OUTSIDE the repo (as in G14a-2c) on disposable tmpfs containers on
     127.0.0.1:5499, with temporary instrumentation (for example logging the pool state and tx start/acquire times)
     and varying maxWait/timeout/connection_limit IN THE COPY ONLY
   - evidence goes to mlino2/validation/g15-1/ (scripts, logs; redacted; record the real worktree HEAD)
R2 OPTIONS, each with its consequences:
   a) explicit transaction options (maxWait/timeout) via one shared Core helper used by every $transaction
   b) mapping P2028 (and P2034 serialization/deadlock) to a stable, RETRYABLE CoreDomainError instead of
      INTERNAL_ERROR: say whether this needs a new CoreErrorCode (a contract change) or reuses CONFLICT
   c) bounded retry inside the service for retryable codes (idempotency and double-effect risk for each operation)
   d) a connection_limit / pool configuration for tests and runtime
   plus any option the evidence suggests. ONE recommendation.
R3 TEST DETERMINISM: how the race tests become deterministic in this environment. The acceptance target for G15-2:
   the full V1 + Core suite green in 10 consecutive runs on a fresh disposable DB, with a committed log.
R4 IMPACT: every file and service touched (error-adapter.ts, errors.ts, every service using $transaction, the
   prisma client, the tests); no schema or migration expected (say so explicitly or justify otherwise); no effect
   on the read-api image (the Dockerfile does not copy core).
R5 OPEN QUESTIONS for the owner, each with options and ONE recommendation. Decide none.
REPORT (new file): AI_HANDOFF/CODEX_REPORTS/20260915_CODEX_G15_1_TRANSACTION_ROBUSTNESS_CCR_REPORT.md
- a table: R1-R5 -> section -> done / not done; the diagnostic runs table (copy, settings, results, raw codes)
- the LF sha256 of the CCR and the evidence; the GW2/GW2-P outputs; the before/after container and volume lists
Append only to mlino2/HANDOFF/HANDOFF_STATE.md. Commit locally and STOP (the Guardian publishes).
ALLOWED FILES:
- the CCR (new)
- mlino2/validation/g15-1/** (new)
- the report (new); mlino2/HANDOFF/HANDOFF_STATE.md (append only)
FORBIDDEN:
- any change to implementation/** other than the new CCR (instrumentation only in throwaway copies)
- mlino-v1-local-db, port 5435, any credential, docker compose, other containers or volumes
- _PUSH_STAGING; any push; git config/safe.directory
```

**پس از G15-1:**
1. بازبینی نگهبان.
2. بسته‌ی تصمیم مالک: تصویب CCR، سؤال‌های باز، و مجوز G15-2 (پیاده‌سازی).

## ۴. وضعیت دروازه‌ها

| دروازه | موضوع | وضعیت |
|---|---|---|
| **G14a** | **snapshot محتوای منتشرشده** | ✅ **کامل:** CCR · کد · آزمون · ادغام (`97b37f8`) · اعمال روی DB محلی · شواهد (`6e547ca`) |
| **G15-1** | **سند CCR مقاوم‌سازی تراکنش** | ▶️ **صادر شد** |
| G15-2 | پیاده‌سازی مقاوم‌سازی | ⏳ تصویب جدا |
| G14b و G14c | export ‏V1 و consumer ‏V2 | ⏳ تصویب جدا |

من کلاد هستم
