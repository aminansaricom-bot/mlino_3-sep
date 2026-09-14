# ثبت ادغام G14a در main و صدور G14a-3 (اعمال migration روی DB محلی با backup)

**تاریخ:** ۱۴ سپتامبر ۲۰۲۶
**مجری ادغام و ثبت‌کننده:** Claude Opus 5 — MLINO Architecture Guardian

## ۱. تصویب مالک

مالک مستقیماً در گفت‌وگو نوشت:

> «ادغام G14a در main، G14a-3 (اعمال migration روی DB محلی با backup) و G15-1 (سند CCR مقاوم‌سازی تراکنش) مجاز است.»

## ۲. ادغام انجام‌شده

| مورد | مقدار |
|---|---|
| **merge commit** | **`97b37f8664f27e254e3d8b2064adc9d557708da9`** · tree ‏`56bd4cb` · والدها `d251599` (main) و `a68c599` (G14a) |
| ادغام آزمایشی | tree برابر است · تفاوت با tree آزمایش پیشین (`d80488f`، روی `3ffa327`) فقط سه فایل AI_HANDOFF از `d251599` است |
| دامنه | ۲۰ فایل، +۵٬۹۶۰ و −۲۶ خط، بدون تعارض |
| hashهای کلیدی در main | migration ‏`7b424e9c…` · `schema.prisma` ‏`9a4dd47c…` · `publication-service.ts` ‏`03250e13…`، همه برابر نسخه‌های بازبینی‌شده |
| پوشه‌ی migrations در main | ۷ migration؛ تازه‌ترین `20260914010000_add_publication_published_content` |
| push | با قید `--force-with-lease` روی `d251599` |
| **runtime** | ✅ بدون تغییر: read-api ‏`a07858b3` · DB همان StartedAt · ۰ restart · **هنوز ۶ migration روی DB محلی** · ستون وجود ندارد · هیچ build یا compose‌ای اجرا نشد |

**شکست‌های شناخته‌شده و از پیش موجود:** ۶ آزمون هم‌زمانی با P2028 در این محیط، هم در baseline و هم در head (G14a-2c). G15-1 به آن‌ها رسیدگی می‌کند.

⚠️ **از این لحظه تا پایان G14a-3:** هیچ `docker compose up --build` یا اجرای `v1-migrate` انجام نشود. در غیر این صورت migration تازه **بدون backup** روی DB محلی اعمال می‌شود.

---

## ۳. دستور Codex — G14a-3

```
INSTRUCTION_ID: CODEX-20260914-G14A3-LOCAL-MIGRATION-001
TARGET_HANDOFF_ID: HANDOFF-20260914-GUARDIAN-G14A-MERGE-G14A3
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260914-CORE-G14A
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260914_CLAUDE_REVIEW_G14A_MERGE_G14A3_RELEASE.md (PINNED_COMMIT/SHA256 relayed)
DECISION: the owner authorized G14a-3 = apply ONLY migration 20260914010000_add_publication_published_content to
          mlino-v1-local-db (database mlino_v1, host port 5435), with a verified backup first. Method = G7b.
BACKUP_DIR: C:\Users\galexy\mlino-backups\

PRECONDITION: GW2 or GW2-P on the pinned record; record the outputs; any failure -> STOP. Never touch credentials
beyond using the existing DB connection value from the environment (never print, log or commit it; if it is not
available, STOP and report).

1 SOURCE CHECK (read-only):
  - git rev-parse 97b37f8664f27e254e3d8b2064adc9d557708da9:implementation/prisma must equal
    git rev-parse a68c599516a87468e66d9b5411bbc7b8ed5782b0:implementation/prisma
  - `git status --short implementation/` in C:/Users/galexy/mlino code/core-g14a-published-content must be empty
  - the Prisma CLI is 5.22.0 from that worktree's node_modules
  Any mismatch -> STOP.
2 PRE-STATE (read-only; metadata and exact counts only, no row data):
  - docker inspect for mlino-v1-local-db and mlino-v1-read-api: image, StartedAt, RestartCount, health
  - _prisma_migrations: exactly 6 rows, all finished, none rolled back (list the names)
  - exact count(*) of EVERY table in schema public -> pre-table-counts.log
  - PREFLIGHT: publications must be 0 and publications.published_content must NOT exist; otherwise STOP
  - non-internal trigger count (expected 13) and CHECK count
3 BACKUP B1-B6 exactly as in G7b:
  B1 ensure C:\Users\galexy\mlino-backups exists
  B2 TS=$(date -u +%Y%m%dT%H%M%SZ), matching ^20[0-9]{6}T[0-9]{6}Z$; FILE=mlino_v1_pre_g14a_$TS.dump
  B3 docker exec mlino-v1-local-db pg_dump -U mlino -d mlino_v1 -Fc -f /tmp/$FILE  (NEVER pipe or redirect through
     the host shell)
  B4 docker exec mlino-v1-local-db sh -c "sha256sum /tmp/$FILE; pg_restore --list /tmp/$FILE | wc -l"  (count > 0)
  B5 docker cp mlino-v1-local-db:/tmp/$FILE C:\Users\galexy\mlino-backups\$FILE ; the host SHA-256 must equal B4;
     record the size
  B6 docker exec mlino-v1-local-db rm -f /tmp/$FILE
  Any failure or mismatch in B1-B5 -> HARD STOP (no migration).
4 `prisma migrate status` against localhost:5435/mlino_v1 (schema: the worktree's implementation/prisma/schema.prisma):
  it must list EXACTLY ONE pending migration, 20260914010000_add_publication_published_content; otherwise STOP.
5 `prisma migrate deploy` ONCE. Never retry automatically.
6 VERIFY (read-only):
  a) _prisma_migrations: 7 rows, all finished, none rolled back
  b) publications.published_content exists as jsonb
  c) constraint publication_published_content_event_kind_check exists with convalidated = true
  d) every public table count equals pre-table-counts.log (publications still 0)
  e) the trigger count is unchanged (13); the CHECK count is +1
  f) mlino-v1-local-db and mlino-v1-read-api: StartedAt, RestartCount and image unchanged
  g) the read-api unauthenticated request still returns 401 (as in G7b)
7 ON FAILURE of 5:
  - record the _prisma_migrations row and verify the column is absent
  - only if deploy failed AND the column is absent: prisma migrate resolve --rolled-back
    20260914010000_add_publication_published_content, then re-verify 6 finished migrations
  - REPORT and STOP
  - restoring the backup requires a separate owner approval
EVIDENCE: mlino2/validation/g14a3/ (the logs of steps 1-7; no credentials, no connection strings, no row data;
the dump file is NEVER copied into the repository).
REPORT (new file): AI_HANDOFF/CODEX_REPORTS/20260914_CODEX_G14A3_LOCAL_MIGRATION_REPORT.md
- each step with its result; the backup file name, size and SHA-256 (both sides); verification a)-g); every incident
- the LF sha256 of every evidence file; the GW2/GW2-P outputs
Append only to mlino2/HANDOFF/HANDOFF_STATE.md. Commit locally and STOP (the Guardian publishes).
ALLOWED:
- the read-only DB metadata and count queries above
- backup B1-B6
- the one prisma migrate status and deploy (and resolve only per step 7)
- new files in mlino2/validation/g14a3/, the report, the handoff append
FORBIDDEN:
- docker compose (any), docker build, restarting or recreating any container, v1-migrate
- docker compose down -v, docker volume rm, DROP, TRUNCATE, DELETE, UPDATE on any table
- running V1 or Core tests against this database; any other migration; editing any migration or product file
- _PUSH_STAGING (including reading its .env); any push; git config/safe.directory; printing credentials
```

**پس از G14a-3:**
1. بازبینی نگهبان، که DB را هم فقط‌خواندنی می‌سنجد.
2. انتشار شاخه.
3. سپس صدور **G15-1** (سند CCR مقاوم‌سازی تراکنش)، که تصویب شده است.

## ۴. وضعیت دروازه‌ها

| دروازه | موضوع | وضعیت |
|---|---|---|
| **G14a** | CCR، migration، service و آزمون‌ها | ✅ **در main ادغام شد (`97b37f8`)** |
| **G14a-3** | اعمال migration روی DB محلی با backup | ▶️ **صادر شد** |
| G15-1 | سند CCR مقاوم‌سازی تراکنش | ✅ تصویب شد · ⏳ صدور پس از G14a-3 |
| G14b و G14c | export ‏V1 و consumer ‏V2 | ⏳ تصویب جدا |

من کلاد هستم
