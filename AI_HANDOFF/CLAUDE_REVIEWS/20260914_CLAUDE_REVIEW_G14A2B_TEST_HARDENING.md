# بازبینی نگهبان معماری — G14a-2b: سخت‌تر کردن آزمون‌های `published_content`

**تاریخ:** ۱۴ سپتامبر ۲۰۲۶
**بازبین:** Claude Opus 5 — MLINO Architecture Guardian
**commitها:** Codex این سه commit را محلی ساخت و **نگهبان روی سرور منتشر کرد:**
- `bcdcdeb` (آزمون و اسکریپت‌ها)
- `8572d83` (لاگ‌ها)
- `a4d9a75` (گزارش و Handoff)
- پایه: `9cb193e`

## حکم: `APPROVED_WITH_FIXES`؛ T1 تا T4 پذیرفته شد، **دروازه‌ی ادغام تا تشخیص بسته است**

**آنچه خواسته شده بود درست انجام شده است:**
- رد شدن‌ها با نام قید و پیام trigger سنجیده می‌شوند و کنترل مثبت دارند.
- یک اسکریپت تکرارپذیر ثابت می‌کند migration روی DB غیرخالی رد می‌شود و ستونی نمی‌ماند.

**ولی مجموعه‌ی کامل قرمز است:** ۶ شکست از ۳۶۰ آزمون (۳۵۴ موفق). Codex به‌درستی آن‌ها را گزارش کرد و خودسرانه چیزی را درست نکرد.

تشخیص نگهبان این است که علت **به احتمال زیاد محیطی است، نه پسرفت G14a.** ولی **بدون کد خطای خام نمی‌توان آن را اثبات کرد،** و مجموعه‌ی قرمز در main ادغام نمی‌شود. پس یک دور **فقط-تشخیصی** (G14a-2c) لازم است.

---

## ۱. راستی‌آزمایی

| مورد | نتیجه |
|---|---|
| **دامنه** | ✅ `9cb193e..a4d9a75`: فقط spec، پوشه‌ی `mlino2/validation/g14a2/`، و گزارش و Handoff (هر دو فقط الحاقی) · **هیچ تغییری در کد محصول، schema، migration یا CCR** · worktree تمیز |
| **T1** | ✅ `c7-01`، `c7-02` و `c7-12` حالا `rejects.toThrow(/publication_published_content_event_kind_check/)` هستند، و هر رد یک کنترل مثبت با همان fixture دارد که موفق می‌شود |
| **T2** | ✅ `c7-07`: `rejects.toThrow(/publications are append-only/)` |
| **T3** | ✅ `c7-10` صادقانه نام‌گذاری شد · `validate-migration-refusal.ps1` روی DB یک‌بارمصرف تازه این کارها را کرد: شش migration اول را اعمال کرد، یک Publication کاشت، سپس `migrate deploy` را اجرا کرد · **لاگ نشان می‌دهد:** `TARGET_DEPLOY_EXIT=1` · ردیف `20260914010000_…` با `finished_at=NULL` · **شمار ستون `published_content` = 0** · بدون رمز و بدون connection string |
| **T4** | ✅ خطای قابل مشاهده `current transaction is aborted…` است، نه P0001 · علت: `BEGIN` صریح. بلوک `DO` تراکنش را abort می‌کند و Prisma خطای دستور بعدی را نشان می‌دهد · **برای runbook ‏G14a-3 کافی است،** چون G14a-3 شمار `publications` را پیش از deploy می‌سنجد |
| **پاک‌سازی** | ✅ هر دو container حذف شدند · فهرست container و volume پیش و پس برابر است · اکنون container آزمایشی وجود ندارد |
| **runtime** | ✅ بدون تغییر: read-api ‏`a07858b3` · DB همان StartedAt · ۶ migration · `publications`=0 · ستون روی DB محلی وجود ندارد |

## ۲. تحلیل ۶ شکست

| suite | آزمون | الگو |
|---|---|---|
| G10a2 ‏(`core-authority`) | لغو هم‌زمان دو grant مدیر · لغو هم‌زمان دو membership مدیر | تراکنش دوم به‌جای «revoking the last grant administrator is forbidden»، پیام **«Core operation failed»** می‌گیرد |
| G10b ‏(`identity-claim-verification`) | شماره‌ی attempt یکتا در شروع‌های هم‌زمان | INTERNAL_ERROR |
| G10c ‏(`g10c-profile-capability`) | ویرایش و انتشار هم‌زمان | INTERNAL_ERROR |
| G10d ‏(`g10d-offer`) | `createVersion` هم‌زمان · انتشار هم‌زمان دو نسخه | INTERNAL_ERROR |

**چرا به احتمال زیاد پسرفت G14a نیست:**
1. **هر ۶ مورد آزمون مسابقه‌اند** و در همه، **تراکنش دوم که پشت `lockOrganization … FOR UPDATE` منتظر است** یک خطای DB نگاشت‌نشده می‌گیرد.
2. **چهار سرویس از پنج سرویس درگیر در G14a تغییر نکرده‌اند:** PermissionGrant، Membership، IdentityClaim و `OfferService.createVersion`.
3. **همین کد در G14a-2 نتیجه‌ی ۳۶۰ از ۳۶۰ داد.** G14a-2b فقط spec و اسکریپت اضافه کرد.
4. `mapCoreDatabaseError` برای `P2028` (timeout تراکنش یا `maxWait` در Prisma) و `P2034` (تعارض یا deadlock) نگاشتی ندارد و **علت را دور می‌ریزد.** `PrismaClient` هم با پیش‌فرض‌ها ساخته شده است (`foundation/prisma-client.ts`): ‏timeout ‏۵ ثانیه و `maxWait` ‏۲ ثانیه. زیر بار سنگین میزبان (۱۹ container در حال اجرا)، تراکنش منتظر می‌تواند زودتر از قفل به timeout برسد.

**ولی این فقط فرضیه است.** تا کد خام دیده نشود، نمی‌توان پسرفت، مثلاً از قفل تازه در مسیر انتشار، را رد کرد.

**یک یافته‌ی جانبی هم هست، مستقل از نتیجه:** نگاشت نشدن P2028 و P2034 یعنی زیر رقابت، کاربر به‌جای CONFLICT قابل تکرار، **INTERNAL_ERROR** می‌گیرد. این یک بدهی مقاومت در Core است، ولی **خارج از دامنه‌ی G14a** است و پس از تشخیص به یک CCR جداگانه سپرده می‌شود.

---

## ۳. دستور Codex — G14a-2c (فقط تشخیص؛ هیچ اصلاحی)

```
INSTRUCTION_ID: CODEX-20260914-G14A2C-CONCURRENCY-DIAGNOSIS-001
TARGET_HANDOFF_ID: HANDOFF-20260914-GUARDIAN-G14A2B-REVIEW
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260914-CORE-G14A
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260914_CLAUDE_REVIEW_G14A2B_TEST_HARDENING.md (PINNED_COMMIT/SHA256 relayed)
DECISION: APPROVED_WITH_FIXES - diagnosis within the owner's G14a-2 approval; no new approval needed.
MODE: DIAGNOSIS ONLY - NO fix to any product code, test, schema, migration or CCR in the worktree.
      Evidence and report only, as LOCAL commits on codex/core-g14a-published-content on top of a4d9a75.

PRECONDITION: GW2 or GW2-P on the pinned review; record the outputs; any failure -> STOP. Never touch credentials.

GOAL: decide whether the 6 concurrency failures are a G14a regression or pre-existing/environmental, using
the raw database error behind each INTERNAL_ERROR.

D1 Build TWO throwaway copies OUTSIDE the repository (for example under %TEMP%), never modifying the worktree:
   - HEAD copy: the worktree's implementation/ at a4d9a75, including node_modules
   - BASELINE copy: the same, then overwrite with the ee25ead versions (via git show ee25ead:<path>) of
     core/publication-service.ts and prisma/schema.prisma; delete
     prisma/migrations/20260914010000_add_publication_published_content and test/core/g14a2-published-content.spec.ts;
     run prisma generate INSIDE the baseline copy only
   - record a hash list proving the baseline copy's core/, prisma/ and test/core/ equal ee25ead, and the head
     copy's equal a4d9a75
D2 Temporary instrumentation in BOTH copies only (never committed): in core/error-adapter.ts, just before
   returning INTERNAL_ERROR, write one stderr line: G14A2C_RAW constructor=<name> code=<code> meta=<json> msg=<first
   300 chars, with any URL redacted>.
D3 For EACH copy, THREE runs. Each run uses a FRESH disposable tmpfs container on 127.0.0.1:5499: migrate deploy,
   then `jest --runInBand` (full suite). One container at a time; remove it after each run.
   Before each run, record the host context: the running container count and CPU load percent.
D4 A focused repeat: for EACH copy, run ONLY the 4 failing spec files 5 times (one fresh container per copy is
   fine) and count failures per test.
D5 Evidence under mlino2/validation/g14a2c/: the scripts and logs (G14A2C_RAW lines, suite totals, failing test
   names), redacted as in g14a2. Delete the throwaway copies at the end and record it.

REPORT: append a section "G14a-2c" to AI_HANDOFF/CODEX_REPORTS/20260914_CODEX_G14A2_PUBLISHED_CONTENT_IMPLEMENTATION_REPORT.md
- a table: copy x run -> suites/tests failed -> failing test names -> raw codes
- the D4 counts per test and copy
- a factual conclusion ONLY (for example "baseline also fails with P2028", or "only head fails"); do NOT fix
  anything or propose code in the product tree
- the LF sha256 of the scripts and logs; the GW2/GW2-P outputs; the before/after container and volume lists
Append only to mlino2/HANDOFF/HANDOFF_STATE.md. Commit locally and STOP (the Guardian publishes).
ALLOWED FILES:
- mlino2/validation/g14a2c/** (new)
- the report (append a section); mlino2/HANDOFF/HANDOFF_STATE.md (append only)
FORBIDDEN:
- any change to implementation/** in the worktree (instrumentation lives only in the throwaway copies)
- applying anything to mlino-v1-local-db; port 5435; docker compose; other containers or volumes
- _PUSH_STAGING; any push; git config/safe.directory; credentials; npm install that changes the worktree lockfile
```

**پس از G14a-2c:**
- **اگر baseline هم با همان کد، مثلاً P2028، شکست بخورد:** شکست محیطی و از پیش موجود ثبت می‌شود، ادغام G14a به مالک پیشنهاد می‌شود، و سخت‌سازی نگاشت خطا و timeoutها به‌صورت یک CCR جدا مطرح می‌شود.
- **اگر فقط head شکست بخورد:** پسرفت است و اصلاح در G14a لازم می‌شود.

## ۴. وضعیت دروازه‌ها

| دروازه | موضوع | وضعیت |
|---|---|---|
| G14a-2 و G14a-2b | پیاده‌سازی و آزمون‌ها | ✅ کد و آزمون‌های G14a · ⚠️ مجموعه‌ی کامل ۶ شکست هم‌زمانی دارد |
| **G14a-2c** | **تشخیص: baseline در برابر head** | ▶️ صادر شد |
| ادغام در main و G14a-3 | | ⛔ تا نتیجه‌ی G14a-2c |

من کلاد هستم
