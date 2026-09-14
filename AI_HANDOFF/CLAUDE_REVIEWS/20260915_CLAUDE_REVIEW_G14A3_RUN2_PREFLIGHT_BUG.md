# بازبینی نگهبان معماری — G14a-3 اجرای ۰۰۲: توقف preflight بر اثر خطای تجزیه در اسکریپت

**تاریخ:** ۱۵ سپتامبر ۲۰۲۶
**بازبین:** Claude Opus 5 — MLINO Architecture Guardian
**commit:** `394bada`، روی `0af93e5`. Codex آن را محلی ساخت و **نگهبان روی سرور منتشر کرد.**

## حکم: `APPROVED_WITH_FIXES`؛ توقف ایمن بود ولی **علتش خطای اسکریپت است، نه وضعیت DB**

## ۱. آنچه رخ داد

اسکریپت Codex این مقادیر را گزارش کرد: `publications=48`، `published_content_columns=48`، `non_internal_triggers=49` و `check_constraints=50`.

**این عددها کد ASCII نویسه‌اند:** `'0'` برابر ۴۸، `'1'` برابر ۴۹ و `'2'` برابر ۵۰ است.

**مقادیر واقعی** را خودم فقط‌خواندنی از DB خواندم:

| سنجه | گزارش اسکریپت | **مقدار واقعی** | انتظار |
|---|---|---|---|
| migrationها | ۶ | **۶**، همه finished | ۶ ✅ |
| `publications` | ۴۸ | **۰** | ۰ ✅ |
| ستون `published_content` | ۴۸ | **۰** | ۰ ✅ |
| triggerهای غیرداخلی | ۴۹ | **۱۳** | ۱۳ ✅ |
| CHECKهای schema ‏public | ۵۰ | **۲۹** | ۲۹ (بعد از migration: ۳۰) |

**علت** در `run2/g14a3-local-migration-run2.ps1:133-136` است:
- کد `[int](Psql '…')[0]` نوشته شده است.
- وقتی کوئری فقط یک ردیف برمی‌گرداند، PowerShell آرایه‌ی تک‌عضوی را به یک رشته باز می‌کند.
- پس `[0]` **نخستین نویسه** را برمی‌دارد، و `[int]` روی نویسه **کد آن** را برمی‌گرداند.
- همین الگو در خط ۱۳۰ (`pre-table-counts.log`) هر شمارش چندرقمی را به رقم اولش کوتاه می‌کند. این بار همه‌ی شمارش‌ها تک‌رقمی بودند، پس آن لاگ **به‌تصادف درست است**، ولی قابل اتکا نیست.
- خط‌های ۱۷۱ و ۱۹۳ تا ۱۹۷ (راستی‌آزمایی پس از migration) هم همین خطا را دارند.

**پیامد:**
- ✅ دروازه **fail-closed** عمل کرد: نه backup گرفته شد، نه deploy و نه هیچ تغییری.
- DB بدون تغییر است. خودم دوباره سنجیدم: همان image و StartedAt، ۰ restart، و هیچ backup ‏g14a ساخته نشده.

## ۲. راستی‌آزمایی commit

| مورد | نتیجه |
|---|---|
| دامنه | ✅ فقط `mlino2/validation/g14a3/run2/**`، گزارش و Handoff · **۰ فایل در `implementation/`** · شواهد run1 دست‌نخورده |
| **C0** | ✅ `c0.log` فقط `C0_LINES=1 HOST_LOCAL=true PORT=5435 DB=mlino_v1` را دارد |
| **نشت** | ✅ **هیچ.** سه تطابق grep فقط الگوی regex پاک‌سازی و آدرس `http://localhost:3000/` (بررسی 401) هستند · `redaction-check.log` = PASS |
| migrationها | ✅ ۶ تا، همه finished و rolled back نشده |

---

## ۳. دستور Codex — G14a-3، اجرای ۰۰۳

این اجرا در محدوده‌ی همان تصویب G14a-3 و همان استثنای فقط‌حافظه‌ی `DATABASE_URL` است. **تصویب تازه لازم نیست.**

```
INSTRUCTION_ID: CODEX-20260915-G14A3-LOCAL-MIGRATION-003
TARGET_HANDOFF_ID: HANDOFF-20260915-GUARDIAN-G14A3-RUN2-REVIEW
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260914-CORE-G14A
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260915_CLAUDE_REVIEW_G14A3_RUN2_PREFLIGHT_BUG.md (PINNED_COMMIT/SHA256 relayed)
                + the -002 instruction in AI_HANDOFF/CLAUDE_REVIEWS/20260914_OWNER_APPROVAL_G14A3_DB_CONNECTION.md
DECISION: same owner authorization and same C0 in-memory DATABASE_URL exception as -002 (still G14a-3). No new approval.
BASE: LOCAL commits on codex/core-g14a-published-content on top of 394bada.
EVIDENCE: a NEW folder mlino2/validation/g14a3/run3/ (run1 and run2 stay unchanged). Start from a COPY of the run2
          script placed in run3/; do not edit run2 files.

PRECONDITION: GW2 or GW2-P on the pinned review; record the outputs; any failure -> STOP.

FIX (in the run3 script only):
F1 Replace every `[int](Psql ...)[0]` and every `(Psql ...)[0]` with a scalar helper:
     function PsqlScalarInt([string]$sql) {
       $rows = @(Psql $sql)
       if ($rows.Count -ne 1 -or $rows[0] -notmatch '^\d+$') { throw "HARD_STOP: non-scalar result" }
       return [int]$rows[0]
     }
   and for string scalars a PsqlScalarString with the same single-row check. This covers the table counts, the
   preflight, the deploy-failure state and the post-verify.
F2 SELF-TEST before any backup: the preflight must equal the Guardian's independent read-only values, exactly:
     _prisma_migrations=6 (all FINISHED, NOT_ROLLED_BACK), publications=0, published_content_columns=0,
     non_internal_triggers=13 (public), check_constraints=29 (public)
   and pre-table-counts must include domain_signal_producer_registry=4. Any difference -> STOP (do not "fix" it).
F3 Post-verify expectations: 7 migrations; column jsonb; the constraint validated=true; triggers 13;
   check_constraints 30; all table counts equal the pre-state.
THEN execute steps 2-7 of -002 unchanged: C0 exactly as in -002 (the same booleans-only log); the pre-state; backup
B1-B6 (FILE=mlino_v1_pre_g14a_<TS>.dump); migrate status (exactly one pending); deploy ONCE; verify a)-g); the failure
path via resolve --rolled-back only if deploy failed and the column is absent.
REPORT (new file): AI_HANDOFF/CODEX_REPORTS/20260915_CODEX_G14A3_LOCAL_MIGRATION_RUN3_REPORT.md
- the F1 diff summary (run2 script -> run3 script); F2 values; each step; the backup name, size and SHA-256 on both
  sides; a)-g)
- the redaction check; the LF sha256 of every run3 file; the GW2/GW2-P outputs
Append only to mlino2/HANDOFF/HANDOFF_STATE.md. Commit locally and STOP (the Guardian publishes).
FORBIDDEN: everything forbidden in -002 (no other credential access; no compose, build or restart; no v1-migrate;
no DROP/TRUNCATE/DELETE/UPDATE; no tests on this DB; no product-file edits; no other use of _PUSH_STAGING; no push;
no git config).
```

## ۴. وضعیت دروازه‌ها

| دروازه | موضوع | وضعیت |
|---|---|---|
| G14a-3 اجرای ۰۰۱ | نبود اتصال | ⛔ توقف درست |
| G14a-3 اجرای ۰۰۲ | خطای تجزیه در اسکریپت | ⛔ توقف ایمن · DB بدون تغییر |
| **G14a-3 اجرای ۰۰۳** | **اصلاح تجزیه به‌همراه خودآزمایی با مقادیر نگهبان** | ▶️ **صادر شد** |
| G15-1 | سند CCR مقاوم‌سازی تراکنش | ✅ تصویب شد · ⏳ پس از G14a-3 |

⚠️ تا پایان G14a-3 هیچ `docker compose up --build` یا `v1-migrate` اجرا نشود.

من کلاد هستم
