# ثبت تصویب مالک — دسترسی فقط‌حافظه به `DATABASE_URL` برای G14a-3، و صدور دوباره‌ی G14a-3

**تاریخ:** ۱۴ سپتامبر ۲۰۲۶
**ثبت‌کننده:** Claude Opus 5 — MLINO Architecture Guardian

## ۱. بازبینی توقف G14a-3 (اجرای ۰۰۱)

| مورد | نتیجه |
|---|---|
| وضعیت | ✅ `HARD_STOP_BEFORE_MIGRATION`، **درست و طبق دستور** |
| علت | `DATABASE_URL` در محیط Codex نبود و worktree آن هم `.env` نداشت |
| commit | `0af93e5` روی `a68c599` · فقط گزارش، Handoff و `mlino2/validation/g14a3/**` · **۰ فایل در `implementation/`** · **هیچ رمز یا URL اتصال** در diff نیست. نگهبان commit را روی سرور منتشر کرد |
| بررسی source | ✅ درخت `implementation/prisma` در `97b37f8` و `a68c599` برابر است (`d5a7fc88…`) |
| DB محلی (فقط‌خواندنی) | ✅ **بدون تغییر**: ۶ migration · `publications`=0 · ستون وجود ندارد · هیچ dump موقتی در container نیست · هیچ backup ‏g14a ساخته نشده · read-api و DB با همان image و StartedAt و ۰ restart |

## ۲. متن تصویب مالک

مالک مستقیماً در گفت‌وگو نوشت:

> «راه ۱: برای G14a-3 فقط، خواندن DATABASE_URL از فایل ‎.env‎ در ‎_PUSH_STAGING‎ به‌صورت فقط-حافظه مجاز است.»

**دامنه‌ی این استثنا:**
- **فقط برای G14a-3.**
- **فقط خط `DATABASE_URL`** از `C:\mlino code\_PUSH_STAGING\implementation\.env`.
- **فقط در حافظه‌ی پردازه:** چاپ، ثبت، کپی در فایل و commit ممنوع است.
- پس از پایان G14a-3 **خودبه‌خود منقضی می‌شود.**
- قانون دائمی «Codex به اعتبارنامه‌ها دست نمی‌زند» برای هر کار دیگری همچنان برقرار است.

---

## ۳. دستور Codex — G14a-3، اجرای ۰۰۲

```
INSTRUCTION_ID: CODEX-20260914-G14A3-LOCAL-MIGRATION-002
TARGET_HANDOFF_ID: HANDOFF-20260914-OWNER-APPROVAL-G14A3-DBURL
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260914-CORE-G14A
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260914_OWNER_APPROVAL_G14A3_DB_CONNECTION.md (PINNED_COMMIT/SHA256 relayed)
               + AI_HANDOFF/CLAUDE_REVIEWS/20260914_CLAUDE_REVIEW_G14A_MERGE_G14A3_RELEASE.md (the -001 instruction, section 3)
DECISION: the owner authorized G14a-3 (apply ONLY 20260914010000_add_publication_published_content to mlino-v1-local-db
          with a verified backup first) AND, for G14a-3 ONLY, an in-memory read of DATABASE_URL from the
          _PUSH_STAGING .env.
BASE: LOCAL commits on codex/core-g14a-published-content on top of 0af93e5.
BACKUP_DIR: C:\Users\galexy\mlino-backups\
EVIDENCE: a NEW folder mlino2/validation/g14a3/run2/ (the run-1 files in mlino2/validation/g14a3/ stay unchanged).

PRECONDITION: GW2 or GW2-P on the pinned record; record the outputs; any failure -> STOP.

C0 CONNECTION VALUE (the owner exception; the only credential access allowed):
  - read ONLY the file C:\mlino code\_PUSH_STAGING\implementation\.env, and ONLY the line(s) whose key is
    DATABASE_URL (an optional `export ` prefix and quotes are allowed). Read nothing else in _PUSH_STAGING; run
    nothing there.
  - exactly ONE DATABASE_URL line must exist; zero or more than one -> STOP
  - parse it IN MEMORY: the host must be localhost or 127.0.0.1, the port 5435, the database mlino_v1; otherwise STOP
  - log ONLY: C0_LINES=1 HOST_LOCAL=true PORT=5435 DB=mlino_v1 (never the user, password, full URL or any part
    of it)
  - pass it ONLY as a process environment variable to the prisma migrate status/deploy (and, per step 7, resolve)
    child processes; never write it to any file, log, report, commit or console; remove it from the environment
    at the end
  - the evidence logs must pass a redaction check (no "://", no "password") before commit
STEPS 1-7: exactly as in the -001 instruction (section 3 of the G14a merge record), with these clarifications:
  1 SOURCE CHECK: as -001 (97b37f8:implementation/prisma == a68c599:implementation/prisma; implementation/ clean;
    Prisma 5.22.0). The existing uncommitted change in mlino2/validation/g14a2c/run-cleanup.log stays untouched and
    uncommitted.
  2 PRE-STATE via docker exec mlino-v1-local-db psql -U mlino -d mlino_v1 (metadata and exact counts only):
    6 finished migrations; exact count(*) of every public table; PREFLIGHT publications=0 and no
    published_content column, otherwise STOP; triggers 13; CHECK count; docker inspect of both containers.
  3 BACKUP B1-B6 (G7b): FILE=mlino_v1_pre_g14a_<TS>.dump; pg_dump -Fc -f inside the container; sha256 and
    pg_restore --list inside; docker cp; equal host SHA-256; rm the temp file. Any failure -> HARD STOP.
  4 prisma migrate status (with the C0 value): EXACTLY ONE pending = 20260914010000_add_publication_published_content,
    otherwise STOP.
  5 prisma migrate deploy ONCE.
  6 VERIFY a)-g) as in -001: 7 finished migrations; jsonb column; CHECK convalidated; all counts equal the
    pre-state; triggers 13 and CHECK +1; containers unchanged; read-api unauthenticated -> 401.
  7 ON FAILURE: as in -001 (resolve --rolled-back only if deploy failed AND the column is absent; then STOP;
    restoring the backup needs owner approval).
REPORT (new file): AI_HANDOFF/CODEX_REPORTS/20260914_CODEX_G14A3_LOCAL_MIGRATION_RUN2_REPORT.md
- C0 result (the booleans only); each step; the backup name, size and SHA-256 on both sides; a)-g); incidents
- the LF sha256 of every run2 evidence file; the GW2/GW2-P outputs
Append only to mlino2/HANDOFF/HANDOFF_STATE.md. Commit locally and STOP (the Guardian publishes).
FORBIDDEN:
- any credential access other than C0; printing or persisting any part of the connection value
- docker compose (any), docker build, restart/recreate of any container, v1-migrate
- down -v, volume rm, DROP, TRUNCATE, DELETE, UPDATE; tests against this DB; any other migration; editing product files
- any other use of _PUSH_STAGING; any push; git config/safe.directory
```

**پس از اجرا:**
1. بازبینی نگهبان، که DB را هم فقط‌خواندنی می‌سنجد.
2. انتشار شاخه.
3. صدور G15-1.

## ۴. وضعیت دروازه‌ها

| دروازه | موضوع | وضعیت |
|---|---|---|
| G14a | | ✅ در main (`97b37f8`) |
| G14a-3 اجرای ۰۰۱ | | ⛔ توقف درست (نبود اتصال) · بدون اثر |
| **G14a-3 اجرای ۰۰۲** | **با دسترسی فقط‌حافظه به `DATABASE_URL`** | ▶️ **صادر شد** |
| G15-1 | سند CCR مقاوم‌سازی تراکنش | ✅ تصویب شد · ⏳ پس از G14a-3 |

⚠️ **هنوز:** تا پایان G14a-3 هیچ `docker compose up --build` یا `v1-migrate` اجرا نشود.

من کلاد هستم
