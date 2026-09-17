# ثبت ادغام Q8 در main و صدور Q8-3

**تاریخ:** ۱۷ سپتامبر ۲۰۲۶
**مجری ادغام و ثبت‌کننده:** Claude Opus 5 — MLINO Architecture Guardian

## ۱. تصویب مالک

> «ادغام Q8 در main و Q8-3 مجاز است»

## ۲. ادغام انجام‌شده

| مورد | مقدار |
|---|---|
| **merge commit** | **`736bf2d73221368d20e7afe125ab1970d8dfa510`** · tree ‏`47b97890` · والدها `68fb692` و `e0348a1` |
| ادغام آزمایشی | ✅ tree برابر است · تفاوت با آزمایش پیشین فقط سه فایل AI_HANDOFF |
| دامنه | ۱۲ فایل، +۶۹۵ و −۲ خط · **۰ فایل ممنوع**: `schema.prisma`، Dockerfile و package دست‌نخورده |
| migration | ✅ پوشه‌ی تازه در main است و hash فایل (`3874e179…`) برابر نسخه‌ی بازبینی‌شده است |
| **وضعیت DB محلی** | **هنوز ۷ migration** · قفل تازه روی دیتابیس شما **اعمال نشده است** · این کار Q8-3 است |

⚠️ **از این لحظه تا پایان Q8-3:** هیچ `docker compose up --build` یا اجرای `v1-migrate` انجام نشود، چون migration تازه **بدون backup** اعمال می‌شود.

---

## ۳. یک نکته‌ی لازم پیش از Q8-3 — اجازه‌ی دسترسی به اتصال دیتابیس

اجازه‌ی «خواندن فقط-حافظه‌ی `DATABASE_URL`» که قبلاً دادید، **صریحاً فقط برای G14a-3 بود و با پایان آن منقضی شد.** Q8-3 همان نیاز را دارد.

**یک جمله‌ی تأیید لازم است.** آن را همراه دستور برای Codex بفرستید:

> «اجازه‌ی فقط-حافظه‌ی خواندن DATABASE_URL برای Q8-3 هم برقرار است.»

بدون این جمله، Codex طبق دستور در همان مرحله متوقف می‌شود و هیچ کاری انجام نمی‌دهد.

## ۴. دستور Codex — Q8-3

```
INSTRUCTION_ID: CODEX-20260917-Q8-3-LOCAL-INDEX-MIGRATION-001
TARGET_HANDOFF_ID: HANDOFF-20260917-GUARDIAN-Q8-MERGE-Q8-3
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260917-CORE-PROFILE-UNIQUE
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260917_CLAUDE_REVIEW_Q8_MERGE_Q8_3_RELEASE.md (PINNED_COMMIT/SHA256 relayed)
DECISION: the owner authorized Q8-3 = apply ONLY 20260917010000_add_business_profile_published_unique to
          mlino-v1-local-db (database mlino_v1, host port 5435), with a verified backup first. Method = G14a-3 run 3.
BACKUP_DIR: C:\Users\galexy\mlino-backups\
MODE: LOCAL commits only on codex/core-profile-unique-ccr on top of e0348a1; do NOT push.
EVIDENCE: a NEW folder mlino2/validation/q8-3/.

PRECONDITION: GW2 or GW2-P on the pinned record; record the outputs; any failure -> STOP.

C0 CONNECTION VALUE - ONLY if the owner's message extending the exception to Q8-3 is present; otherwise STOP and
   report before touching anything:
   - read ONLY the DATABASE_URL line from C:\mlino code\_PUSH_STAGING\implementation\.env; read nothing else there
     and run nothing there
   - exactly ONE such line must exist; parse it IN MEMORY; the host must be localhost or 127.0.0.1, the port 5435,
     the database mlino_v1; otherwise STOP
   - log ONLY: C0_LINES=1 HOST_LOCAL=true PORT=5435 DB=mlino_v1
   - pass it ONLY as a child-process environment variable to prisma; never write, print or commit it; remove it
     from the environment at the end; the evidence must contain no "://" and no password
1 SOURCE CHECK: git rev-parse 736bf2d73221368d20e7afe125ab1970d8dfa510:implementation/prisma must equal
  git rev-parse e0348a17798e684612f09c8ea4b6fcd9a6d97889:implementation/prisma; `git status --short implementation/`
  in the worktree must be empty; the Prisma CLI is 5.22.0. Any mismatch -> STOP.
2 PRE-STATE (read-only, via docker exec psql; metadata and counts only):
  - docker inspect both containers: image, StartedAt, RestartCount, health
  - _prisma_migrations: exactly 7 rows, all finished, none rolled back
  - exact count(*) of every public table -> pre-table-counts.log; record non-internal triggers (13) and CHECKs (30)
  - PREFLIGHT for this migration: the query from CCR P4 must return ZERO rows, and the index
    business_profile_one_published_per_organization_unique must NOT exist yet; otherwise STOP
3 BACKUP B1-B6 exactly as in G14a-3: FILE=mlino_v1_pre_q8_<TS>.dump; pg_dump -Fc -f INSIDE the container; sha256
  and pg_restore --list inside; docker cp to BACKUP_DIR; the host SHA-256 must equal; record the size; remove the
  temp file. Any failure or mismatch -> HARD STOP (no migration).
4 prisma migrate status: EXACTLY ONE pending migration, 20260917010000_add_business_profile_published_unique.
  Otherwise STOP.
5 prisma migrate deploy ONCE. Never retry automatically.
6 VERIFY (read-only):
  a) _prisma_migrations: 8 rows, all finished, none rolled back
  b) the index exists, is UNIQUE and valid (pg_indexes plus pg_index.indisvalid) with the PUBLISHED predicate
  c) every public table count equals pre-table-counts.log
  d) non-internal triggers still 13; CHECK constraints still 30 (this migration adds an index, not a CHECK)
  e) both containers unchanged: image, StartedAt, RestartCount
  f) the read-api unauthenticated request still returns 401
7 ON FAILURE of 5: record the _prisma_migrations row and verify the index is absent; only if deploy failed AND the
  index is absent, run prisma migrate resolve --rolled-back 20260917010000_add_business_profile_published_unique;
  then REPORT and STOP. Restoring the backup needs a separate owner approval.
REPORT (new): AI_HANDOFF/CODEX_REPORTS/20260917_CODEX_Q8_3_LOCAL_INDEX_MIGRATION_REPORT.md
- each step with its result; the backup name, size and SHA-256 on both sides; verification a)-f); every incident
- the LF sha256 of every evidence file; the GW2/GW2-P outputs
Append only to mlino2/HANDOFF/HANDOFF_STATE.md. Commit locally and STOP (the Guardian publishes).
FORBIDDEN:
- any credential access other than C0; printing or persisting any part of the connection value
- docker compose, docker build, restarting or recreating any container, v1-migrate
- down -v, volume rm, DROP, TRUNCATE, DELETE, UPDATE; tests against this database; any other migration
- editing any product file; _PUSH_STAGING beyond the single C0 line; any push; git config
```

## ۵. کار موازی G14c-1 — نسخه‌ی ۰۰۵

متن دستور همان است؛ فقط TARGET و pin تازه‌اند. برای صرفه‌جویی، **کامل در بخش ۵ بازبینی قبلی** آمده است؛ تنها این دو سطر عوض می‌شوند:

```
INSTRUCTION_ID: CODEX-20260917-G14C1-V2-CONSUMER-DESIGN-005
TARGET_HANDOFF_ID: HANDOFF-20260917-GUARDIAN-Q8-MERGE-Q8-3
SUPERSEDES: CODEX-20260917-G14C1-V2-CONSUMER-DESIGN-001 through -004
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260917_CLAUDE_REVIEW_Q8_MERGE_Q8_3_RELEASE.md (PINNED_COMMIT/SHA256 relayed)
```

بقیه‌ی بندها، فایل‌های مجاز و ممنوعیت‌ها بدون تغییرند.

## ۶. وضعیت دروازه‌ها

| دروازه | موضوع | وضعیت |
|---|---|---|
| G14a، G15 و G14b | | ✅ در main |
| **Q8** | **قفل یک پروفایل منتشرشده** | ✅ **در main ادغام شد (`736bf2d`)** |
| **Q8-3** | اعمال روی DB محلی با backup | ▶️ **صادر شد** · نیازمند یک جمله‌ی تأیید اتصال |
| G14c-1 و G14c-2 | مصرف‌کننده‌ی V2 | ▶️ G14c-1 نسخه‌ی ۰۰۵ · G14c-2 تصویب جدا |

من کلاد هستم
