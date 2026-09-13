# اجرای نگهبان — ادغام G12a (محافظ سراسری آزمون V1) در main و صدور G12b

**تاریخ:** ۱۴ سپتامبر ۲۰۲۶
**مجری:** Claude Opus 5 — MLINO Architecture Guardian

**تأیید مالک:** «ادغام G12a در `main` مجاز است.» مالک این تأیید را خودش در گفت‌وگوی مستقیم با Claude فرستاد؛ متن را Codex نوشته بود و مالک بازارسالش کرد.

**مرجع بازبینی:** `AI_HANDOFF/CLAUDE_REVIEWS/20260914_CLAUDE_REVIEW_G12A_V1_TEST_DB_GUARD.md` (commit `e992937`)

## نتیجه: ادغام انجام شد

| مورد | مقدار |
|---|---|
| **merge commit** | `ebf404c969482b1b552f6bdfc018e3c3a8734be2` |
| **والدها** | `e992937` (main) و `289be12` (`codex/v1-test-guard`) |
| **درخت** | `f4317f50b191e5ac74085131fd4b40d0d78c836c` = خروجی `merge-tree` نگهبان (پیش‌نمایش و اجرا) |

| گام | نتیجه |
|---|---|
| **پیش‌شرط** | clone اصلی روی `main` = `origin/main` = `e992937` بود، پاک · شاخه‌ی محافظ بی‌تغییر = `289be12` |
| **دامنه‌ی ادغام** | تازه: `test-db-guard.ts`، `test-db-guard.spec.ts`، CCR، ۹ فایل شواهد `g12a`، گزارش Codex · تغییر: `setup-env.ts` و `mlino2/HANDOFF/HANDOFF_STATE.md` (فقط افزودنی) · **بدون حذف یا تغییر نام** |
| **push** | محافظت‌شده با `--force-with-lease=main:e992937`، به‌همراه همین سند |
| **runtime** | read-api همان `a07858b3` · DB با StartedAt بدون تغییر و `Restarts=0` · شش migration · `dspr=4` · بدون build، restart، migration یا آزمون |

**اثر:** از این لحظه، jest در هر checkout از main، از جمله `_PUSH_STAGING`، اجرای spec را رد می‌کند، مگر اینکه `DATABASE_URL` به `localhost:5499` اشاره کند. فایل `.env` فعلی `_PUSH_STAGING` به 5435 اشاره می‌کند و **رد می‌شود**.
**قاعده‌ی ماندگار باز هم برقرار است:** در `_PUSH_STAGING` آزمون اجرا نشود. محافظ لایه‌ی دفاعی است، نه اجازه.

---

## G12b: سخت‌سازی محافظ (H1 تا H3 از بازبینی G12a)

در همان مجوز G12a است و تصویب تازه‌ی مالک لازم ندارد. ادغامش در main مثل G12a پس از بازبینی با تأیید کوتاه مالک انجام می‌شود.

```
INSTRUCTION_ID: CODEX-20260914-G12B-V1-TEST-DB-GUARD-HARDENING-001
TARGET_HANDOFF_ID: HANDOFF-20260914-GUARDIAN-G12A-MERGE
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260914-V1-TEST-GUARD
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260914_CLAUDE_REVIEW_G12A_MERGE.md (this file; PINNED_COMMIT/SHA256 relayed)
MODE: CODE — test-only, on a NEW branch codex/v1-test-guard-hardening created from origin/main
      (the head that contains merge ebf404c).

PRECONDITION: GW2 or GW2-P for REVIEW_REFERENCE; record the outputs; any failure → STOP. Never touch credentials.

CHANGES:
1. implementation/test/test-db-guard.ts:
   assertSafeTestDatabase(env: NodeJS.ProcessEnv, envFilePaths: readonly string[]): void
   - If env has DATABASE_URL (own property): validate ONLY that value (the env value takes precedence,
     as with Prisma). Behavior is unchanged.
   - Otherwise: collect EVERY DATABASE_URL assignment from EVERY existing file in envFilePaths.
     Accept an optional leading "export ", optional single or double quotes, and surrounding whitespace.
     If ANY collected value is unsafe → reject (fail closed; this covers dotenv last-wins, H1).
     If none are found → allow.
   - The safety rule is unchanged: localhost/127.0.0.1/::1 AND port 5499; always reject :5435, @db: and
     unparsable values. The message is fixed and never contains a URL or credentials.
2. implementation/test/setup-env.ts: pass
   [path.resolve(__dirname, '../.env'), path.resolve(__dirname, '../prisma/.env')]   (H3)
   The call stays first; the JWT logic is unchanged.
3. implementation/test/test-db-guard.spec.ts: keep all existing tests (adapted to the array signature) and add:
   - H1: first line 5499 + last line 5435 → throw; first 5435 + last 5499 → throw
   - H2: "export DATABASE_URL=...5435" → throw; "export DATABASE_URL=...5499" → ok
   - H3: only prisma/.env present, containing 5435 → throw; both files 5499 → ok
   - env 5499 + both files unsafe → ok (env precedence)
   - no file contains a DATABASE_URL → ok
4. CCR update (the same file, CONTRACT_CHANGE_REQUEST_V1_TEST_DB_GUARD.md):
   - add a "G12b hardening" section (H1–H3 and the rule)
   - fix the rollback to "git revert -m 1 <merge-commit>"
   - keep Status DRAFT for the G12b delta

VALIDATION (disposable only, same rules as G12a):
- tmpfs postgres on 5499, docker volume ls before/after, rm -f
- migrate deploy, build, the guard unit tests, and the FULL V1 suite with the guard active
- End-to-end refusal with DATABASE_URL=postgresql://x:y@db:5432/x (0 tests run). NEVER a 5435 URL.
- Evidence in mlino2/validation/g12b/ with an LF manifest (path  sha256).
REPORT: AI_HANDOFF/CODEX_REPORTS/20260914_CODEX_G12B_V1_TEST_DB_GUARD_HARDENING_REPORT.md
Append only to mlino2/HANDOFF/HANDOFF_STATE.md (under HANDOFF-20260914-V1-TEST-GUARD).
Push ONLY to codex/v1-test-guard-hardening (if blocked, ask the owner). Then STOP.
ALLOWED: test-db-guard.ts · test-db-guard.spec.ts · setup-env.ts · the existing G12a CCR file
         · mlino2/validation/g12b/** · the report · the handoff (append only)
FORBIDDEN:
- any other implementation file; jest.config.js; package*.json; tsconfig; test/core/**
- schema, migrations, types.ts, docker-compose, any .env file
- ANY push to main or other branches
- G10c scope
- port 5435 or mlino-v1-local-db; running anything in _PUSH_STAGING; credentials
```

## وضعیت دروازه‌ها

| دروازه | موضوع | وضعیت |
|---|---|---|
| **G12a** | **محافظ سراسری آزمون V1** | ✅ **در main ادغام شد** (`ebf404c`) |
| **G12b** | **سخت‌سازی H1 تا H3** | ▶️ صادر شد |
| G10c | Profile و Capability | ⏳ پس از بسته شدن G12b، با تصویب مالک |

من کلاد هستم
