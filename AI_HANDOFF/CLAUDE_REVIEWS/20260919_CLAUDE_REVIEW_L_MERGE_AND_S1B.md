# بازبینی و ادغام L (فعال‌سازی در هسته) و صدور S1b

**تاریخ:** ۱۹ سپتامبر ۲۰۲۶
**بازبین و مجری ادغام:** Claude Opus 5 — نگهبان معماری MLINO
**commitها:**
- `1da3d9c` (کد) و `d046a89` (گزارش)، ساخت کدکس
- `517d03d`: اصلاح آزمون به‌دست نگهبان

## حکم: `APPROVED_NEXT_STEP`؛ L در main ادغام شد (L5)

## ۱. راستی‌آزمایی

| مورد | نتیجه |
|---|---|
| **دامنه** | ✅ فقط دو سرویس (متدهای تازه)، یک فایل آزمون تازه و شواهد · بدون schema، migration یا وابستگی تازه |
| **L1 تا L3** | ✅ `activate` نمایه فقط از `DRAFT` و فقط با ادعای هویت `VERIFIED` و منقضی‌نشده · `archive` پایانی · `activate` و `retire` برای توانمندی · مجوزها و محدوده‌ی سازمان رعایت شده |

## ۲. اجرای مستقل نگهبان روی دیتابیس دور‌ریختنی

دیتابیس `postgres:16-alpine` موقت روی `127.0.0.1:5499`، از image موجود و با گذرواژه‌ی دور‌ریختنی، که پس از کار خاموش و حذف شد. هر ۸ migration روی آن اعمال شد. کتابخانه‌ها از `core-profile-unique` گرفته شد، چون Prisma client آن تازه است. **به دیتابیس مالک (5435) دست زده نشد.**

| آزمون | نتیجه |
|---|---|
| نخستین اجرای `l-lifecycle-activation.spec.ts` | ۱۱ از ۱۲ · **شکست در آزمون PENDING** |
| **علت** | خطا در خود آزمون، نه در کد: آزمون یک ادعای `VERIFIED` را مستقیم به `PENDING` برمی‌گرداند، بی‌آن‌که فیلدهای ثبت تأیید را پاک کند. قید `business_identity_claim_status_audit_check` درست جلویش را گرفت، پیش از آن‌که `activate` اصلاً اجرا شود |
| **اصلاح نگهبان** (`517d03d`) | در حالت PENDING، فیلدهای ثبت تأیید هم null می‌شوند، مطابق همان قید · **فقط فایل آزمون** |
| پس از اصلاح | ✅ **۱۲ از ۱۲، سه بار پیاپی** |
| آزمایش حذف (i): برداشتن شرط VERIFIED و انقضا | ✅ ۳ آزمون شکست خوردند |
| آزمایش حذف (ii): فعال‌سازی از ARCHIVED | ✅ ۱ آزمون شکست خورد |
| آزمایش حذف (iii): برداشتن مجوز در `capability.activate` | ✅ ۱ آزمون شکست خورد |
| **بازآزمایی همه‌ی آزمون‌های هسته و خروجی عمومی** | ✅ **۲۱ فایل، ۱۷۶ از ۱۷۶** |
| **آزمون سرتاسری L3** | ✅ کسب‌وکار فعال‌شده **در فایل عمومی ظاهر می‌شود** و پس از بایگانی یا کنار گذاشتن، حذف می‌شود |

## ۳. ادغام

| مورد | مقدار |
|---|---|
| شاخه | `codex/core-lifecycle-activation` روی سرور، در `517d03d` |
| **merge در main** | **`7d30d1ea493388b237af8cd2e588596cba3d7ef7`**، با `--no-ff` و lease روی `945fa10` |
| دامنه | ۱۲ فایل (+۳۹۵، −۱) |

## ۴. دستور کدکس — S1b (تکمیل ابزار داده)

به خواست مالک، متن دستور کدکس انگلیسی است.

```
INSTRUCTION_ID: CODEX-20260919-S1B-TEST-SEED-ACTIVATE-001
TARGET_HANDOFF_ID: HANDOFF-20260919-GUARDIAN-L-MERGED
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260918-TEST-SEED
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260919_CLAUDE_REVIEW_L_MERGE_AND_S1B.md (PINNED_COMMIT/SHA256 relayed)
MODEL: SOL.
MODE: continue on the EXISTING branch codex/test-seed-vanak in the EXISTING worktree
      C:/Users/galexy/mlino code/test-seed-vanak. HEAD must equal 425b7167351a7a0ba341606550cef28cc39d2565 (else
      STOP). LOCAL commits only; no push, rebase, amend or force. All rules of CODEX-20260918-S1-TEST-SEED-TOOL-001
      still apply unless changed below.
PRECONDITION: GW2 or GW2-P on the pinned record; record the outputs; any failure -> STOP.

0 Merge main at 7d30d1ea493388b237af8cd2e588596cba3d7ef7 into the branch (git merge --no-ff; NO rebase). It brings
  BusinessProfileService.activate/archive and CapabilityService.activate/retire. On conflict STOP and report.
1 seed.ts: after linkIdentityClaim call profiles.activate(context, profile.id) BEFORE publishing the profile; after
  capabilities.confirm call capabilities.activate(context, capability.id) BEFORE publishing the capability. Cite the
  real method signatures (file:line). Keep idempotency (skip existing test-vanak orgs).
2 withdraw.ts: keep withdraw-only (Guardian S1-D5); ALSO offer an optional `--archive` flag that, after withdrawing,
  archives each test-vanak profile via BusinessProfileService.archive with reason 'TEST DATA cleanup' - still no
  DELETE/TRUNCATE/DROP anywhere.
3 NEW integration spec test/tools/test-seed/seed.integration.spec.ts (disposable DB, localhost 5499 guard): a
  3-business SYNTHETIC fixture (one without coordinates, one with hours, one with 2 services) is seeded with the
  confirm variable on localhost; buildPublicExport (TEST key) then contains exactly those 3 records, ACTIVE, with the
  test marker in the description, ISO-day hours, and the capabilities; a second seed run changes nothing; withdraw
  removes them from the next export; --archive leaves them ARCHIVED; row counts of organizations, profiles,
  capabilities and claims never decrease.
  If the DB is not reachable in your sandbox, do NOT start Docker: build, record that the integration spec could not
  run, commit and STOP - the Guardian runs it on a disposable database.
4 VALIDATION: npm run build THREE times plus the non-DB specs THREE times; logs in implementation/validation/s1b/;
  the same leak grep as S1 (09\d{9}, real names from the input file, PRIVATE KEY, DATABASE_URL values).
REPORT (new file): AI_HANDOFF/CODEX_REPORTS/20260919_CODEX_S1B_TEST_SEED_ACTIVATE_REPORT.md
- the merge output; the exact Core call sequence now used (file:line); test names; run totals or the DB-unavailable
  note; LF sha256; GW2/GW2-P outputs. Append only to mlino2/HANDOFF/HANDOFF_STATE.md. Commit locally and STOP.
ALLOWED FILES: implementation/tools/test-seed/**, implementation/test/tools/test-seed/**, implementation/validation/s1b/**
  (new), the report (new), mlino2/HANDOFF/HANDOFF_STATE.md (append only), plus the merge commit of main.
FORBIDDEN: any change to core/**, public-export/**, schema, migrations, package.json, lockfile; running anything
  against 5435 or the owner's database; committing the real 15-business data; Docker; any real key; _PUSH_STAGING;
  push; git config.
```

## ۵. پس از S1b

1. نگهبان آزمون یکپارچه را روی 5499 دور‌ریختنی اجرا می‌کند و S1 را تأیید می‌کند.
2. سپس **P1** (وارد کردن ۱۵ کسب‌وکار به 5435 با پشتیبان‌گیری) و **P2** (راه‌اندازی آزمایشی)، هر دو طبق اجازه‌ی پیشاپیش مالک.

من کلاد هستم
