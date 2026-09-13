# بازبینی نگهبان معماری — G6: ادغام Core Foundation در `main`

**تاریخ:** ۱۳ سپتامبر ۲۰۲۶
**بازبین:** Claude Opus 5 — MLINO Architecture Guardian (`CLAUDE-ARCHITECT-GUARDIAN-001`)
**گزارش Codex:** `AI_HANDOFF/CODEX_REPORTS/20260913_CODEX_G6_MERGE_REPORT.md` (شاخه‌ی Core، `b59a2d5`)
**Merge commit روی `main`:** `f40a3f5ff68337682ddc659be658807225f25bc1`
**دستور اجراشده:** `CODEX-20260913-G6-MERGE-CORE-INTO-MAIN-001` · **تصویب مالک:** `20260913_OWNER_APPROVAL_G6_MERGE.md`

---

## تصمیم

# `APPROVED_NEXT_STEP`

- **G6 — PASS.** شِما و migration Core Foundation اکنون روی `main` هستند — **دقیقاً همان درختی که در G1 تا G5 آزموده و تصویب شد.**
- **گام بعد: G7** — اعمال کنترل‌شده‌ی migration ششم روی `mlino-v1-local-db`، با پشتیبان کامل پیش از آن. **فقط با تصویب صریح و جداگانه‌ی مالک.**

---

## ۱. راستی‌آزمایی مستقل

| بررسی | روش نگهبان | نتیجه |
|---|---|---|
| والدهای merge | `git log -1 f40a3f5` | ✅ والد اول `496ff80` (سر `main` در لحظه‌ی ادغام) · والد دوم **`31c9ec1`** (head بازبینی‌شده و مصوب) |
| **بدون ویرایش دستی** | مقایسه‌ی tree حاصل از `git merge-tree` خودکار روی همان دو والد با tree واقعی merge | ✅ **یکسان** — `6c4bb847ba90…` در هر دو |
| `implementation/` | `git diff 31c9ec1 f40a3f5 -- implementation` | ✅ **صفر فایل** اختلاف با درخت آزموده‌شده در G5 |
| مجموعه‌ی تغییرات | فایل‌های `496ff80..f40a3f5` در برابر فایل‌های افزوده‌ی شاخه‌ی Core | ✅ **۱۴۵ / ۱۴۵** — دقیقاً برابر |
| اسناد نگهبان | diff روی `CLAUDE_LATEST_REPORT.md`، `HANDOFF_STATE.md` و `CLAUDE_REVIEWS/**` | ✅ دست‌نخورده |
| migrationها روی `main` | `git ls-tree` | ✅ دقیقاً شش، آخری `20260913010000_add_core_foundation` |
| commit گزارش روی شاخه‌ی Core | `31c9ec1..b59a2d5` | ✅ فقط گزارش تازه + Handoff افزودنی (صفر خط حذف) |
| شاخه‌ی V2 | fetch | ✅ `f4d326f` |
| worktree موقت | `git worktree list` | ✅ حذف شده |
| **`mlino-v1-local-db`** | `docker inspect` | ✅ `StartedAt` بدون تغییر · `Restarts=0` · **migration روی آن اعمال نشده** |
| `_PUSH_STAGING` | status · اثر انگشت | ✅ پاک · اثر انگشت برابر مبنا. نگهبان پس از بازبینی آن را fast-forward کرد تا این بازبینی را Push کند — **فقط git، بدون Docker یا npm** |

**نکته‌ی پذیرفته‌شده:** نخستین Push به‌خاطر محافظ `dubious ownership` Git برای worktree موقت رد شد. Codex یک استثنای **یک‌باره و محدود به همان مسیر** (`safe.directory`) به کار برد و **تنظیم سراسری Git را تغییر نداد.** این کار دور زدن کنترل امنیتی مخزن نیست — فقط مالکیت پوشه‌ی موقت در ویندوز است. **پذیرفته.**

---

## ۲. بررسی هفت‌گانه

| # | معیار | وضعیت |
|---|---|---|
| ۱ | ADR-0001 تا ADR-0012 | ✅ |
| ۲ | مشخصات مصوب | ✅ درخت مصوب CCR، بدون تغییر |
| ۳ | Core و ماژول | ✅ |
| ۴ | چند Vertical | ✅ |
| ۵ | امنیت و اجازه | ✅ بدون force · بدون بازنویسی تاریخچه |
| ۶ | ایمنی migration | ✅ روی هیچ DB اعمال نشده · ⚠️ ریسک G7 ناخواسته اکنون **فعال** است — بند ۳ |
| ۷ | بدهی فنی | ✅ |

---

## ۳. ⚠️ از این لحظه — ریسک G7 ناخواسته فعال است

`main` اکنون migration ششم را دارد. **هر `docker compose up --build` یا `docker compose build` در `implementation/` هر clone به‌روز از `main` — از جمله `_PUSH_STAGING` — سرویس `v1-migrate` را با image تازه اجرا می‌کند و migration را روی `mlino-v1-local-db` اعمال می‌کند، بدون پشتیبان.**

- containerهای در حال اجرا — `mlino-v1-local-db` و `mlino-v1-read-api` با image قدیمی — **امن‌اند.**
- `docker compose up -d` **بدون** build هم image قدیمی را به کار می‌برد. با این حال **تا G7 هیچ عملیات compose توصیه نمی‌شود.**

**این ریسک با اجرای G7 از بین می‌رود:** پس از اعمال کنترل‌شده، `migrate deploy` بعدی بی‌اثر است.

---

## ۴. G7 — طرح نگهبان (منتظر تصویب مالک)

**هدف:** اعمال فقط migration `20260913010000_add_core_foundation` روی `mlino-v1-local-db`، با پشتیبان کامل، شمارش پیش و پس، و rollback آماده.

**روش انتخابی نگهبان:**
- `prisma migrate deploy` **مستقیم** روی پورت محلی `5435`
- از یک worktree موقت `main` @ `f40a3f5`
- با Prisma CLI فقط‌خواندنی موجود در `_PUSH_STAGING`

**image هیچ سرویسی rebuild نمی‌شود** — `mlino-v1-read-api` با image فعلی کار می‌کند. Client قدیمی فقط مدل‌های قدیمی را می‌خواند و جدول‌های تازه روی آن اثری ندارند.

### پیش‌شرط
تصویب صریح مالک: «G7 approved: back up and apply migration 20260913010000_add_core_foundation to mlino-v1-local-db.» — به‌علاوه‌ی **مسیر ذخیره‌ی پشتیبان** (پیش‌فرض پیشنهادی: `C:\Users\galexy\mlino-backups\`، بیرون از هر مخزن).

### Next Task
G7 طبق دستور زیر.

### TARGET_HANDOFF_ID
`HANDOFF-20260912-CORE-PRISMA-FOUNDATION`

### Exact Codex Instruction

```text
INSTRUCTION_ID: CODEX-20260913-G7-APPLY-CORE-MIGRATION-LOCAL-001
TARGET_HANDOFF_ID: HANDOFF-20260912-CORE-PRISMA-FOUNDATION
REVIEW_REFERENCE: origin/main AI_HANDOFF/CLAUDE_REVIEWS/20260913_CLAUDE_REVIEW_G6_MERGE.md
OWNER_APPROVAL: ________   (owner must state: "G7 approved: back up and apply migration
                            20260913010000_add_core_foundation to mlino-v1-local-db")
BACKUP_DIR: ________       (default proposal: C:\Users\galexy\mlino-backups\ - outside every repository)
DECISION: APPROVED_NEXT_STEP (G6 PASS)

TASK:
Back up mlino-v1-local-db, apply ONLY migration 20260913010000_add_core_foundation to it, verify, and keep
rollback ready. Nothing else.

SAFETY (non-negotiable):
- NEVER run the V1 test suite against this database (it globally cleans tables).
- NEVER: docker compose down -v, docker volume rm, DROP DATABASE, TRUNCATE, DELETE on V1 tables.
- NEVER rebuild images or run docker compose build / up --build. Do not restart mlino-v1-read-api unless rollback requires it.
- Credentials: use the compose-defined local dev values only via environment variables; never print, log or commit
  them. The backup file contains data: never commit it, never copy it into any repository.

STEPS:
0. git fetch origin; read the review via git show origin/main:<path>. If OWNER_APPROVAL or BACKUP_DIR is blank: STOP.
1. Pre-state (read-only): docker inspect mlino-v1-local-db (StartedAt, health); via docker exec psql -U mlino -d mlino_v1:
   _prisma_migrations (migration_name, finished_at) - expect exactly the five existing migrations; exact row count
   of every table in schema public (names and counts only, no row data).
2. Backup: docker exec mlino-v1-local-db pg_dump -U mlino -d mlino_v1 -Fc > BACKUP_DIR\mlino_v1_pre_core_<UTC>.dump;
   record size and SHA-256; verify readability with pg_restore --list (object count). If the backup fails: STOP.
3. Temporary detached worktree of origin/main at f40a3f5 OUTSIDE the repo. Using the read-only Prisma 5.22.0 CLI from
   C:\mlino code\_PUSH_STAGING\implementation\node_modules (CHECKPOINT_DISABLE=1; four-folder fingerprint before/after):
   prisma migrate status --schema <temp>/implementation/prisma/schema.prisma  -> must list exactly one pending
   migration: 20260913010000_add_core_foundation. Anything else: STOP.
4. prisma migrate deploy --schema <temp>/implementation/prisma/schema.prisma with DATABASE_URL pointing at
   localhost:5435 / mlino_v1 (env only). Record output.
5. Verify (read-only):
   a) _prisma_migrations: six rows, all finished_at set, rolled_back_at null
   b) every pre-existing table's row count is IDENTICAL to step 1
   c) the 12 new Core tables exist and are empty
   d) protected objects present: C1-C5 indexes, C6-C11 checks, 13 non-internal triggers, all Core FKs RESTRICT/RESTRICT,
      and external_workspace_link_active_unique
   e) prisma migrate status: "Database schema is up to date"
   f) mlino-v1-read-api still running; if it exposes a health route, record its response; otherwise record container status.
6. If any check a)-e) fails: rollback per CCR section 12 (pre-data): stop mlino-v1-read-api; drop the Core objects
   in dependency order and delete the 20260913010000 row from _prisma_migrations; re-verify step-1 counts and five
   migrations; restart mlino-v1-read-api. Restore the full backup with pg_restore only if a pre-existing table was affected.
   Report and STOP.
7. Remove the temp worktree; git worktree prune. Fingerprint after = before.
8. Evidence (no credentials, no row data, not the dump) in mlino2/validation/g7/ on codex/core-prisma-foundation.
   Report AI_HANDOFF/CODEX_REPORTS/20260913_CODEX_G7_APPLY_CORE_MIGRATION_REPORT.md (10 sections; backup path, size,
   SHA-256). Append to mlino2/HANDOFF/HANDOFF_STATE.md. Push that branch. STOP. Await Architecture Guardian review.
```

### Allowed changes
- **`mlino-v1-local-db`:** فقط اعمال همان یک migration؛ یا در صورت شکست، rollback طبق §۱۲ CCR
- **فایل پشتیبان** در `BACKUP_DIR` — بیرون از هر مخزن
- **شاخه‌ی Core:** `mlino2/validation/g7/**` (تازه) · گزارش G7 (تازه) · `mlino2/HANDOFF/HANDOFF_STATE.md` (فقط افزودنی)

### Forbidden changes
- هر تغییر در `main`، شاخه‌ی V2، `implementation/**` یا هر فایل مخزن جز موارد بالا
- هر نوشتن در `C:\mlino code\_PUSH_STAGING`
- rebuild هر image · `docker compose build` / `up --build` / `down -v` · حذف volume
- اجرای آزمون‌های V1 روی این پایگاه داده
- commit یا کپی فایل پشتیبان در هر مخزن · ثبت اعتبارنامه یا داده‌ی ردیفی در شواهد
- هر گام پس از گزارش G7 بدون بازبینی نگهبان

---

## ۵. وضعیت دروازه‌ها

| دروازه | وضعیت |
|---|---|
| G1 | ✅ با شرط بسته |
| G2 تا G5 | ✅ بسته |
| **G6** | ✅ **بسته — Core Foundation روی `main` (`f40a3f5`)** |
| **G7** | ⏳ **منتظر تصویب مالک و مسیر پشتیبان** |
| بعد از G7 | rebuild اختیاری `mlino-v1-read-api` روی Client تازه · آغاز کد سرویس و Repository روی مدل‌های Core با **W1 به‌عنوان قاعده‌ی الزامی** |

من کلاد هستم
