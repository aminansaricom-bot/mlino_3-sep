# بازبینی نگهبان معماری — G5: سازگاری V1 با شِمای Core

**تاریخ:** ۱۳ سپتامبر ۲۰۲۶
**بازبین:** Claude Opus 5 — MLINO Architecture Guardian (`CLAUDE-ARCHITECT-GUARDIAN-001`)
**گزارش Codex:** `AI_HANDOFF/CODEX_REPORTS/20260913_CODEX_G5_V1_COMPATIBILITY_REPORT.md`
**Commitها:** `807af10` (شواهد) · `31c9ec1` (گزارش و Handoff) — شاخه‌ی `codex/core-prisma-foundation`، مبنا `f47c852`
**دستور اجراشده:** `CODEX-20260913-G5-V1-COMPATIBILITY-001`

---

## تصمیم

# `APPROVED_NEXT_STEP`

- **G5 — PASS.** V1 با شِما و Prisma Client تازه **بدون هیچ رگرسیونی** build و آزمون می‌شود.
- **گام بعد: G6 — ادغام شاخه‌ی Core در `main`** — **فقط با تصویب صریح مالک.**
- **هشدار حیاتی (بند ۳):** پس از G6، **یک `docker compose up --build` migration تازه را خودکار روی `mlino-v1-local-db` اعمال می‌کند** — یعنی G7 ناخواسته و بدون پشتیبان. تا تصویب G7 نباید رخ دهد.

---

## ۱. راستی‌آزمایی مستقل

| بررسی | روش نگهبان | نتیجه |
|---|---|---|
| دامنه | `git diff --name-status f47c852..31c9ec1` | ✅ فقط ۳۰ فایل `g5`، گزارش، Handoff (صفر خط حذف) · **هیچ مسیر ممنوعی** · **صفر فایل `node_modules` یا `dist`** |
| آزمون‌ها | خلاصه‌های jest در logها | ✅ **مبنا و G4 هر دو: `Test Suites: 19 passed, 19 total` · `Tests: 249 passed, 249 total`** |
| مقایسه‌ی فایل‌به‌فایل | `SPEC_COMPARISON.md` | ✅ هر ۱۹ فایل آزمون در هر دو PASS · «موفق در مبنا و ناموفق در G4» = **۰** |
| build و TypeScript | `*-build-summary.log` | ✅ هر دو `BUILD_EXIT=0` · `TS_ERROR_COUNT=0` |
| migration | `*-migrate-summary.log` | ✅ مبنا ۵/۵ · G4 ۶/۶ |
| مدل‌های Client | `model-name-comparison.log` | ✅ مبنا ۸ · G4 ۲۰ · گمشده ۰ · افزوده‌ی غیرمنتظره ۰ · ۱۲ مدل تازه دقیقاً فهرست CCR |
| **پایگاه داده‌ی آزمون** | logهای Prisma و container | ✅ فقط `mlino_g5` روی `127.0.0.1:55437` و `:55438` · container `mlino-g5-base-db` و `mlino-g5-core-db` · **tmpfs، بدون volume** |
| **`mlino-v1-local-db` دست‌نخورده** | `docker inspect` مستقل | ✅ `StartedAt=2026-09-12T21:34` (پیش از G5) · `RestartCount=0` · volume `implementation_mlino_v1_local_db_data` موجود |
| پاک‌سازی | `git worktree list` · docker · TEMP | ✅ هر دو worktree موقت حذف شدند · container G5 صفر |
| اثر انگشت `_PUSH_STAGING` | بازمحاسبه | ✅ برابر مبنا · `git status` پاک |
| Secret | جست‌وجو | ✅ هیچ رشته‌ی اتصال یا رمزی در شواهد |
| `main` و V2 | fetch | ✅ `main` = `3ef9fe9` · V2 = `f4d326f` |

**حادثه‌ی بی‌اثر:** یک تلاش `npm ci --offline` به‌دلیل مجوز cache رد شد؛ نصب عادی با exit صفر تکرار و ثبت شد. هشدارهای deprecated وابستگی‌ها در مبنا و G4 یکسان‌اند — **رگرسیون G4 نیستند.**

---

## ۲. بررسی هفت‌گانه

| # | معیار | وضعیت |
|---|---|---|
| ۱ | ADR-0001 تا ADR-0012 | ✅ V1 همچنان ستون فقرات است و دست‌نخورده کار می‌کند (ADR-0001) |
| ۲ | مشخصات مصوب | ✅ CCR اعمال‌شده با کد موجود V1 سازگار است |
| ۳ | Core و ماژول | ✅ |
| ۴ | چند Vertical | ✅ |
| ۵ | امنیت و اجازه | ✅ آزمون‌های auth-adapter، AC-2 و workspace-link همه PASS |
| ۶ | ایمنی migration | ✅ هیچ اجرایی روی DB دارای داده · ⚠️ ریسک G7 ناخواسته پس از G6 — بند ۳ |
| ۷ | بدهی فنی | ✅ بدون مورد تازه |

---

## ۳. ⚠️ هشدار حیاتی — G7 ناخواسته از راه `docker compose`

**واقعیت** (`implementation/docker-compose.yml` روی `main`، و `docker inspect mlino-v1-migrate`):
- سرویس `v1-migrate` از همان پوشه‌ی `implementation/` build می‌شود و فرمانش **`npx prisma migrate deploy`** روی **`mlino-v1-local-db`** است.
- با `docker compose up -d --build` خودکار اجرا می‌شود.

**پس از G6:**
- هر clone از `main` — از جمله `_PUSH_STAGING` پس از `git pull` — migration `20260913010000_add_core_foundation` را دارد.
- **یک `docker compose up -d --build` (یا `docker compose build` و سپس `up`) آن را روی داده‌ی محلی V1 اعمال می‌کند — بدون پشتیبان و بدون طرح.**
- `docker compose up -d` **بدون** rebuild، image قدیمی را به کار می‌برد و بی‌اثر است، **ولی تا G7 هیچ عملیات compose توصیه نمی‌شود.**

**قاعده‌ی نگهبان تا تصویب G7:** **هیچ `docker compose build` یا `docker compose up --build` در `implementation/` هیچ clone از `main`.** container‌های در حال اجرا (`mlino-v1-local-db`، `mlino-v1-read-api`) دست‌نخورده بمانند.

---

## ۴. گام بعد — G6

### پیش‌شرط
**تصویب صریح مالک:** «G6 approved: merge codex/core-prisma-foundation into main.»

### Next Task
**G6 — ادغام کنترل‌شده‌ی `codex/core-prisma-foundation` در `main`:**
- یک merge commit بدون تعارض
- اثبات اینکه `implementation/` روی `main` پس از ادغام **دقیقاً همان** درخت آزموده‌شده در G5 است
- Push بدون force
- **بدون هیچ عملیات Docker یا پایگاه داده**

**روش جایگزین:** مالک PR را در GitHub بسازد و خودش merge کند. `gh` روی این سیستم نصب نیست.

### TARGET_HANDOFF_ID
`HANDOFF-20260912-CORE-PRISMA-FOUNDATION`

### Exact Codex Instruction

```text
INSTRUCTION_ID: CODEX-20260913-G6-MERGE-CORE-INTO-MAIN-001
TARGET_HANDOFF_ID: HANDOFF-20260912-CORE-PRISMA-FOUNDATION
REVIEW_REFERENCE: origin/main AI_HANDOFF/CLAUDE_REVIEWS/20260913_CLAUDE_REVIEW_G5_V1_COMPATIBILITY.md
OWNER_APPROVAL: ________   (owner must state: "G6 approved: merge codex/core-prisma-foundation into main")
DECISION: APPROVED_NEXT_STEP (G5 PASS)

TASK:
Merge origin/codex/core-prisma-foundation into main with one conflict-free merge commit. No Docker, no database.

STEPS:
0. git fetch origin; read the review via git show origin/main:<path>. If OWNER_APPROVAL is blank: STOP.
1. Preconditions: origin/codex/core-prisma-foundation must be exactly 31c9ec15db525cfc40eea63e4aa38e77ddb246ff
   (the reviewed head). Every origin/main commit after 3ef9fe9 must touch only AI_HANDOFF/** (guardian records);
   otherwise STOP and report.
2. Create a temporary worktree of origin/main OUTSIDE the repo (e.g. %TEMP%\g6-main). Do not use
   C:\mlino code\_PUSH_STAGING, the V2 clone or the core-prisma-foundation worktree.
3. git merge-tree --write-tree must report no conflicts. Then:
   git merge --no-ff origin/codex/core-prisma-foundation -m "merge: Core Foundation schema (CCR fcddfc2, G1-G5 passed) into main"
   plus a body citing OWNER_APPROVAL, the G5 review and both heads. Any conflict: git merge --abort, STOP.
4. Verify and record:
   a) git diff origin/codex/core-prisma-foundation HEAD -- implementation  -> must be EMPTY
   b) git diff --name-only origin/main HEAD -> must equal exactly the set of files the core branch adds/changes
      (recorded list; no other path)
   c) root AI_HANDOFF/CLAUDE_LATEST_REPORT.md, AI_HANDOFF/HANDOFF_STATE.md and AI_HANDOFF/CLAUDE_REVIEWS/** are
      unchanged by the merge (equal to origin/main)
   d) implementation/prisma/migrations lists exactly six migrations ending with 20260913010000_add_core_foundation
5. git push origin HEAD:main (no force). If rejected because main moved: re-fetch, re-check step 1, redo once; else STOP.
6. Do NOT run docker, docker compose, prisma migrate, npm, or connect to any database. Do NOT touch
   C:\mlino code\_PUSH_STAGING. Remove the temp worktree; git worktree prune.
7. On codex/core-prisma-foundation only: write AI_HANDOFF/CODEX_REPORTS/20260913_CODEX_G6_MERGE_REPORT.md
   (10 sections, merge commit hash, verification outputs a-d) and append to mlino2/HANDOFF/HANDOFF_STATE.md.
   Push that branch. STOP. Await Architecture Guardian review.
```

### Allowed changes
- **`main`:** فقط **یک merge commit** از `origin/codex/core-prisma-foundation` (`31c9ec1`) — هیچ commit دیگر
- **`codex/core-prisma-foundation`:** `AI_HANDOFF/CODEX_REPORTS/20260913_CODEX_G6_MERGE_REPORT.md` (تازه) · `mlino2/HANDOFF/HANDOFF_STATE.md` (فقط افزودنی)

### Forbidden changes
- هر تغییر محتوایی در merge — **حل دستی تعارض ممنوع** · rebase · squash · cherry-pick · `push --force`
- **هر فرمان Docker یا `docker compose`** · `prisma migrate` · `npm` · اتصال به هر پایگاه داده
- هر نوشتن در `C:\mlino code\_PUSH_STAGING` · شاخه‌ی V2
- حذف شاخه‌ی `codex/core-prisma-foundation`
- هر گام پس از گزارش G6 بدون بازبینی نگهبان

---

## ۵. پیش‌نمایش G7 — تصمیم جداگانه‌ی مالک، پس از G6

**هدف:** اعمال کنترل‌شده‌ی migration ششم روی `mlino-v1-local-db`.

**طرح پیشنهادی نگهبان:**
1. **پشتیبان کامل:** `pg_dump` از `mlino-v1-local-db` به فایلی **بیرون از مخزن** + hash
2. شمارش ردیف‌های جدول‌های موجود V1 پیش از اعمال
3. rebuild و اجرای `v1-migrate` → اعمال فقط `20260913010000_add_core_foundation`
4. بررسی: `_prisma_migrations` شش ردیف · شمارش جدول‌های V1 بدون تغییر · ۱۲ جدول تازه خالی · API فقط‌خواندنی سالم
5. rollback طبق §۱۲ CCR: پیش از داده‌ی واقعی Core → حذف ۱۲ جدول تازه و اشیای دستی، یا بازگردانی پشتیبان

---

## ۶. وضعیت دروازه‌ها

| دروازه | وضعیت |
|---|---|
| G1 | ✅ با شرط بسته |
| G2 · G3 · G4 | ✅ بسته |
| **G5** | ✅ **بسته — ۲۴۹/۲۴۹، بدون رگرسیون** |
| **G6** | ⏳ منتظر تصویب مالک |
| G7 | پس از G6 — تصمیم جداگانه · **تا آن زمان هیچ `docker compose up --build`** |

من کلاد هستم
