# بازبینی نگهبان — S1b پذیرفته شد و P1 (وارد کردن داده به دیتابیس محلی) صادر شد

**تاریخ:** ۱۹ سپتامبر ۲۰۲۶
**بازبین:** Claude Opus 5 — نگهبان معماری MLINO
**commitها:**
- `a3890ae`: ادغام main
- `fba2f83`: پیاده‌سازی
- `859bf38` و `228a95f`: گزارش

**نگهبان شاخه‌ی `codex/test-seed-vanak` را با lease پیشروی از `425b716` به `228a95f` روی سرور برد.**

## حکم: `APPROVED_NEXT_STEP`؛ S1 پذیرفته شد و اجازه‌ی پیشاپیش P1 فعال شد

## ۱. راستی‌آزمایی

| مورد | نتیجه |
|---|---|
| **دامنه** | ✅ فقط `tools/test-seed`، آزمون‌ها و شواهد · ادغام main بی‌نقص · تعارض Handoff طبق قاعده حل شد (هیچ نشانه‌ی تعارضی باقی نمانده) · بدون نشت نام یا موبایل |
| **ترتیب فراخوانی** | ✅ `linkIdentityClaim` → `activate` → `publish` برای نمایه · `confirm` → `activate` → `publish` برای توانمندی |

## ۲. اجرای مستقل نگهبان روی دیتابیس دور‌ریختنی 5499

| آزمون | نتیجه |
|---|---|
| آزمون‌های ابزار، شامل آزمون یکپارچه، روی دیتابیس تازه | ✅ **۱۸ از ۱۸، سه بار**، هر بار با دیتابیس از نو ساخته‌شده |
| بازآزمایی هسته، خروجی عمومی و ابزار | ✅ **۲۴ فایل، ۱۹۴ از ۱۹۴** |
| **تمرین کامل با ۱۵ کسب‌وکار واقعی ونک**، فقط روی دیتابیس دور‌ریختنی | ✅ اجرای اول: ۱۵ ساخته شد · اجرای دوم: ۰ ساخته و ۱۵ رد شد، یعنی بدون تکرار · **فایل عمومی: دقیقاً ۱۵ کسب‌وکار** · ۱۲ با مختصات · ۷ با ساعت کاری · ۱۰ توانمندی · ۱۶٬۱۹۰ بایت · برچسب «داده‌ی آزمایشی» روی همه |

دیتابیس دور‌ریختنی پس از کار خاموش و حذف شد.

## ۳. یادداشت‌ها

| # | یادداشت |
|---|---|
| S1-N1 | آزمون یکپارچه فقط روی دیتابیس **تازه** درست کار می‌کند. در اجرای دوم روی همان دیتابیس، سازمان‌های قبلی رد می‌شوند و انتظار «۳ ساخته‌شده» برآورده نمی‌شود. خود ابزار درست رفتار می‌کند و این فقط محدودیت آزمون است. **اقدامی لازم نیست**؛ در ادغام نهایی ابزار، به آزمون یک پیشوند یکتا برای هر اجرا داده شود |
| **S1-N2** | `implementation/tsconfig.json` پوشه‌ی `tools/**` را در بر ندارد، پس `npm run build` این ابزار را نمی‌سازد و ts-node هم نصب نیست. برای P1، ساختی **موقت** با خود `tsc` انجام می‌شود (بند ۴ دستور P1) |

## ۴. P1 — وارد کردن ۱۵ کسب‌وکار به دیتابیس محلی مالک

**مبنای اجازه:** اجازه‌ی پیشاپیش مالک در ۱۹ سپتامبر ۲۰۲۶ (`20260919_OWNER_ADVANCE_GRANT_SEED_AND_TEST_LAUNCH.md`)، که با پذیرش S1 **فعال شد**. C0 فقط برای P1 و P2 است.

به خواست مالک، متن دستور کدکس انگلیسی است.

```
INSTRUCTION_ID: CODEX-20260919-P1-SEED-LOCAL-DB-001
TARGET_HANDOFF_ID: HANDOFF-20260919-GUARDIAN-S1B-APPROVED-P1
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260918-TEST-SEED
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260919_CLAUDE_REVIEW_S1B_AND_P1.md (PINNED_COMMIT/SHA256 relayed)
MODEL: SOL.
AUTHORITY: the owner's advance grant P1 + C0 (AI_HANDOFF/CLAUDE_REVIEWS/20260919_OWNER_ADVANCE_GRANT_SEED_AND_TEST_LAUNCH.md),
  activated by this Guardian approval of S1.
MODE: OPERATIONAL, ONE run, from the EXISTING worktree C:/Users/galexy/mlino code/test-seed-vanak at HEAD
  228a95f8c80d85f311305021cf93fb191e1cf2bc (else STOP). No product code change. Evidence may be committed on this
  branch under implementation/validation/p1/ ; no push.
PRECONDITION: GW2 or GW2-P on the pinned record; record the outputs; any failure -> STOP.
  Never open GITHUB_TOKEN.txt; never print, log or commit any DATABASE_URL, password or host credential.

1 READ-ONLY PRE-CHECK (via `docker exec mlino-v1-local-db psql -U <db user from the container env> ...` or the
  Prisma client; counts and metadata only):
  - containers mlino-v1-local-db (healthy) and mlino-v1-read-api running; record image, StartedAt, RestartCount;
  - _prisma_migrations: 8 rows, all finished, none rolled back; triggers 13; CHECK constraints 30;
  - count organizations WHERE id LIKE 'test-vanak-%' MUST be 0 (else STOP - never seed twice);
  - baseline counts for organizations, business_profiles, capabilities, business_identity_claims, memberships,
    permission_grants, publications - both TOTAL and for rows NOT belonging to 'test-vanak-%' organizations.
2 BACKUP B1-B6, exactly the proven G7b/Q8-3 method: pg_dump -Fc inside the container to /tmp, docker cp to
  C:\Users\galexy\mlino-backups\mlino_v1_pre_p1_<UTC>.dump, SHA-256 inside the container equals SHA-256 on the host,
  header PGDMP, pg_restore --list line count > 0, then remove the container temp file. Any mismatch -> STOP.
  The dump is NEVER committed.
3 C0: read ONLY the DATABASE_URL line from C:\mlino code\_PUSH_STAGING\.env into memory and pass it ONLY to the
  child process environment; log only booleans (C0_LINES=1, HOST_LOCAL=true, PORT=5435, DB name). If the host is
  not localhost/127.0.0.1 or the port is not 5435 -> STOP.
4 TEMPORARY BUILD (tools/** is not in tsconfig include - Guardian note S1-N2): verify
  node_modules/.prisma/client/index.d.ts contains 'publishedContent' (fresh client; else STOP). Compile the CLI into
  a temporary folder INSIDE implementation/ so node_modules resolves, for example:
  npx tsc tools/test-seed/cli.ts --outDir .p1-build --rootDir . --target ES2022 --module commonjs --esModuleInterop
  --skipLibCheck --resolveJsonModule
  (report the exact command). Do not edit tsconfig or any tracked file.
5 RUN ONCE: with MLINO_TEST_SEED_CONFIRM=LOCAL_TEST_DATA_ONLY and the in-memory DATABASE_URL,
  node .p1-build/tools/test-seed/cli.js seed "C:\mlino code\_TEST_DATA\vanak_businesses.json"
  Expected output: created 15, skipped 0, failed 0. Anything else -> do NOT retry; go to 6 and report.
6 READ-ONLY POST-CHECK:
  - 15 organizations 'test-vanak-%'; 15 business_profiles ACTIVE; 10 capabilities ACTIVE and HUMAN_CONFIRMED;
  - every count for rows NOT belonging to 'test-vanak-%' is IDENTICAL to the baseline (nothing else touched);
    totals increased only by test-vanak rows (report deltas per table);
  - _prisma_migrations still 8; triggers 13; CHECKs 30; containers same image/StartedAt/RestartCount 0;
    read-api still answers HTTP 401 without a token;
  - an in-memory export check: buildPublicExport with a throwaway in-memory Ed25519 key (never written anywhere)
    returns exactly 15 records; report only counts (records, with coordinates, with hours, capabilities).
7 CLEANUP: delete .p1-build; `git status` must be clean apart from the evidence files.
EVIDENCE: implementation/validation/p1/ - precheck.log, backup.log (file name, size, both SHA-256, header, list
  count), c0.log (booleans only), run.log (the CLI counts), postcheck.log, leak-grep.log (grep the evidence for
  postgresql://, password, 09\d{9} and the real business names -> must be empty).
REPORT (new file): AI_HANDOFF/CODEX_REPORTS/20260919_CODEX_P1_SEED_LOCAL_DB_REPORT.md. Append only to
  mlino2/HANDOFF/HANDOFF_STATE.md. Commit the evidence and report locally and STOP.
FORBIDDEN:
- any DELETE, TRUNCATE, DROP, ALTER or migrate command; docker compose up/down/build; `down -v`; volume removal;
  restarting or recreating any container; touching any container other than exec/cp on mlino-v1-local-db and a
  GET to mlino-v1-read-api;
- running the seed more than once; the withdraw command; any real signing key; writing any key to disk;
- printing or committing DATABASE_URL or credentials; committing the dump; editing tracked product files;
  _PUSH_STAGING writes; push; git config.
```

## ۵. پس از P1

1. **بازبینی نگهبان:** بررسی مستقل و فقط‌خواندنی دیتابیس و پشتیبان.
2. **P2:** راه‌اندازی آزمایشی طبق اجازه‌ی پیشاپیش.
   - پیش از P2 باید روشن شود زمان‌بند زیر **کدام حساب** اجرا می‌شود (G5) و وب‌سرور با کدام هویت از پوشه‌ی عمومی می‌خواند (G7).
   - برای آزمایش روی سیستم خود مالک، ساده‌ترین گزینه **حساب خود مالک** است.

## ۵. وضعیت دروازه‌ها

| دروازه | موضوع | وضعیت |
|---|---|---|
| L | فعال‌سازی در هسته | ✅ در main |
| **S1 و S1b** | **ابزار داده‌ی آزمایشی** | ✅ **پذیرفته** · تمرین با داده‌ی واقعی: ۱۵ کسب‌وکار در فایل عمومی |
| **P1** | **وارد کردن داده به 5435** | ▶️ **صادر شد** (اجازه‌ی پیشاپیش فعال) |
| P2 | راه‌اندازی آزمایشی | ⏳ پس از P1 |

من کلاد هستم
