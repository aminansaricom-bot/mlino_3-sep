# بازبینی نگهبان معماری — G7: توقف در مرحله‌ی پشتیبان‌گیری

**تاریخ:** ۱۳ سپتامبر ۲۰۲۶
**بازبین:** Claude Opus 5 — MLINO Architecture Guardian (`CLAUDE-ARCHITECT-GUARDIAN-001`)
**گزارش Codex:** `AI_HANDOFF/CODEX_REPORTS/20260913_CODEX_G7_APPLY_CORE_MIGRATION_REPORT.md` — وضعیت `BLOCKED`
**Commitها:** `bd0e62e` (شواهد توقف) · `7aa9b33` (گزارش و Handoff) — شاخه‌ی `codex/core-prisma-foundation`
**دستور:** `CODEX-20260913-G7-APPLY-CORE-MIGRATION-LOCAL-001`

---

## تصمیم

# `APPROVED_WITH_FIXES`

- **توقف درست و به‌موقع بود.** Codex دقیقاً طبق hard stop عمل کرد، تلاش دوباره نکرد و وضعیت را امن نگه داشت.
- **گام بعد: G7b** — تکرار G7 با **روش پشتیبان‌گیری مقاوم** (بند ۳).
- **دامنه‌ی تصویب مالک تغییر نکرده است:** همان پشتیبان و همان یک migration. **تصویب G7 همچنان معتبر است** و تصویب تازه لازم نیست — فقط روش فنی پشتیبان‌گیری اصلاح می‌شود.

---

## ۱. راستی‌آزمایی مستقل وضعیت امن

| بررسی | روش نگهبان | نتیجه |
|---|---|---|
| پایگاه داده | `docker inspect` | ✅ healthy · `StartedAt` بدون تغییر · `Restarts=0` |
| migration ششم | شواهد + گزارش | ✅ **اعمال نشده** — `_prisma_migrations` = ۵ |
| فایل یا پوشه‌ی پشتیبان | `ls` | ✅ `C:\Users\galexy\mlino-backups` **وجود ندارد** · هیچ فایل dump نیمه‌کاره در home، پوشه‌ی والد یا جای دیگر |
| دامنه‌ی commitها | `git diff b59a2d5..7aa9b33` | ✅ فقط ۶ فایل `g7`، گزارش، Handoff (صفر خط حذف) · **هیچ مسیر ممنوعی** |
| داده‌ی ردیفی یا اعتبارنامه در شواهد | خواندن `pre-table-counts.log` · جست‌وجو | ✅ **فقط نام و تعداد** · هیچ رمز یا رشته‌ی اتصالی |
| `main` · V2 · `_PUSH_STAGING` · worktreeها | fetch · status | ✅ دست‌نخورده · worktree موقت نمانده |

**نکته‌ی مفید از شواهد** — وضعیت پیش از کار: ۱۰ جدول. جز `_prisma_migrations` (۵ ردیف) فقط `domain_signal_producer_registry` داده دارد (۴ ردیف)؛ بقیه خالی‌اند. **ریسک داده‌ای G7 در عمل کم است، ولی پشتیبان همچنان الزامی است.**

---

## ۲. علت شکست — دو نقص محیطی PowerShell

1. **`New-Item -LiteralPath`** در نسخه‌ی فعال PowerShell پذیرفته نشد، پس پوشه ساخته نشد.
2. **timestamp** بدون فرهنگ ثابت، تحت فرهنگ فارسی **شمسی** تولید شد (`14050622T120945Z`).

**یک خطر عمیق‌تر که پیش از تکرار باید بسته شود:**
- هدایت خروجی دودویی `pg_dump -Fc` از راه shell میزبان — `>` در PowerShell، و در برخی نسخه‌ها حتی `Start-Process -RedirectStandardOutput` — **می‌تواند فایل را بی‌صدا خراب کند**، چون خروجی به‌عنوان متن رمزگذاری می‌شود.
- **پشتیبان خرابی که «موفق» به نظر برسد، از نبود پشتیبان بدتر است.**

---

## ۳. روش مقاوم پشتیبان‌گیری — الزام G7b

| گام | فرمان | چرا |
|---|---|---|
| B1 — پوشه | Git Bash: `mkdir -p "/c/Users/galexy/mlino-backups"` · یا PowerShell: `New-Item -Path 'C:\Users\galexy\mlino-backups' -ItemType Directory -Force` · سپس بررسی وجود | مستقل از نسخه‌ی PowerShell |
| B2 — timestamp | Git Bash: `date -u +%Y%m%dT%H%M%SZ` · بررسی الگوی `^20[0-9]{6}T[0-9]{6}Z$` | میلادی UTC، مستقل از فرهنگ |
| B3 — dump **درون container** | `docker exec mlino-v1-local-db pg_dump -U mlino -d mlino_v1 -Fc -f /tmp/<FILE>` | **هیچ جریان دودویی از shell میزبان عبور نمی‌کند** |
| B4 — بررسی درون container | `docker exec mlino-v1-local-db sh -c 'sha256sum /tmp/<FILE>; pg_restore --list /tmp/<FILE> \| wc -l'` | hash مرجع + خوانایی (شمار اشیا > ۰) |
| B5 — انتقال به میزبان | `docker cp mlino-v1-local-db:/tmp/<FILE> <BACKUP_DIR>/<FILE>` · SHA-256 روی میزبان **باید برابر B4 باشد** · ثبت اندازه | اثبات بی‌خطایی انتقال |
| B6 — پاک‌سازی فایل موقت درون container | `docker exec mlino-v1-local-db rm -f /tmp/<FILE>` | فقط فایل موقت، نه داده |

**هر عدم‌تطابق یا شکست در B1 تا B5 = hard stop.** نام فایل: `mlino_v1_pre_core_<TS>.dump`.

---

## ۴. گام بعد — G7b

### Next Task
تکرار کامل G7 از ابتدا: **وضعیت پیش از کار تازه ← پشتیبان مقاوم (B1 تا B6) ← گام‌های ۳ تا ۸ دستور G7 بدون تغییر.**

### TARGET_HANDOFF_ID
`HANDOFF-20260912-CORE-PRISMA-FOUNDATION`

### Exact Codex Instruction

```text
INSTRUCTION_ID: CODEX-20260913-G7B-APPLY-CORE-MIGRATION-LOCAL-RETRY-001
TARGET_HANDOFF_ID: HANDOFF-20260912-CORE-PRISMA-FOUNDATION
REVIEW_REFERENCE: origin/main AI_HANDOFF/CLAUDE_REVIEWS/20260913_CLAUDE_REVIEW_G7_BACKUP_HARD_STOP.md
BASE_INSTRUCTION: CODEX-20260913-G7-APPLY-CORE-MIGRATION-LOCAL-001 (section 4 of 20260913_CLAUDE_REVIEW_G6_MERGE.md)
OWNER_APPROVAL: G7 approved: back up and apply migration 20260913010000_add_core_foundation to mlino-v1-local-db
  (recorded: origin/main AI_HANDOFF/CLAUDE_REVIEWS/20260913_OWNER_APPROVAL_G7_LOCAL_MIGRATION.md) - scope unchanged, still valid
BACKUP_DIR: C:\Users\galexy\mlino-backups\
DECISION: APPROVED_WITH_FIXES

TASK:
Re-run G7 from the start with the robust backup method below. All SAFETY rules and hard stops of the base
instruction remain in force.

STEPS:
0. git fetch origin; read both reviews via git show origin/main:<path>.
1. Fresh pre-state (read-only): container health; _prisma_migrations (expect exactly five); table names + row counts.
   They must equal mlino2/validation/g7/logs/pre-table-counts.log; any difference: STOP and report.
2. Robust backup (review section 3):
   B1 mkdir -p "/c/Users/galexy/mlino-backups" (Git Bash) - or New-Item -Path ... -ItemType Directory -Force - verify it exists.
   B2 TS=$(date -u +%Y%m%dT%H%M%SZ); verify it matches ^20[0-9]{6}T[0-9]{6}Z$. FILE=mlino_v1_pre_core_$TS.dump
   B3 docker exec mlino-v1-local-db pg_dump -U mlino -d mlino_v1 -Fc -f /tmp/$FILE
      NEVER pipe or redirect pg_dump output through the host shell.
   B4 docker exec mlino-v1-local-db sh -c "sha256sum /tmp/$FILE; pg_restore --list /tmp/$FILE | wc -l"  (object count > 0)
   B5 docker cp mlino-v1-local-db:/tmp/$FILE "/c/Users/galexy/mlino-backups/$FILE"; host SHA-256 must equal B4; record size.
   B6 docker exec mlino-v1-local-db rm -f /tmp/$FILE
   Any failure or mismatch in B1-B5: HARD STOP (no migration), report.
3-8. Execute steps 3 to 8 of the base instruction unchanged: migrate status must show exactly one pending
   (20260913010000_add_core_foundation); migrate deploy via the read-only Prisma 5.22.0 CLI from a temp worktree of
   origin/main at f40a3f5 against localhost:5435/mlino_v1 (credentials via env only); verify a)-f); rollback per CCR
   section 12 on failure; cleanup; fingerprint before/after.
9. Evidence in mlino2/validation/g7b/ (new; g7 is immutable). Report
   AI_HANDOFF/CODEX_REPORTS/20260913_CODEX_G7B_APPLY_CORE_MIGRATION_REPORT.md (10 sections; backup path, size,
   in-container and host SHA-256, pg_restore object count). Append to mlino2/HANDOFF/HANDOFF_STATE.md.
   Push codex/core-prisma-foundation only. STOP. Await Architecture Guardian review.
```

### Allowed changes
همان دستور پایه:
- **پایگاه داده:** فقط اعمال همان یک migration، یا rollback طبق §۱۲
- **پشتیبان:** فایل در `BACKUP_DIR` + فایل موقت درون container (پاک‌شده در B6)
- **شاخه‌ی Core:** `mlino2/validation/g7b/**` · گزارش G7b · Handoff فقط افزودنی

### Forbidden changes
همه‌ی ممنوعیت‌های دستور پایه، به‌علاوه:
- **هدایت یا pipe خروجی `pg_dump` از shell میزبان**
- تغییر `mlino2/validation/g7/**`
- تلاش دوباره پس از هر hard stop بدون دستور تازه

---

## ۵. وضعیت دروازه‌ها

| دروازه | وضعیت |
|---|---|
| G1 | ✅ با شرط بسته |
| G2 تا G6 | ✅ بسته |
| **G7** | ⛔ متوقف در پشتیبان‌گیری — **وضعیت امن** |
| **G7b** | ⏳ آزاد |
| یادآوری | تا بسته شدن G7b: **هیچ `docker compose build` یا `up --build`** |

من کلاد هستم
