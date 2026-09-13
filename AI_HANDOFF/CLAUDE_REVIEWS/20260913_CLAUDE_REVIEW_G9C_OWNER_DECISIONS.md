# بازبینی نگهبان معماری — G9c: ثبت تصمیم‌های مالک در طراحی لایه‌ی service

**تاریخ:** ۱۳ سپتامبر ۲۰۲۶
**بازبین:** Claude Opus 5 — MLINO Architecture Guardian
**گزارش بررسی‌شده:** `origin/codex/core-prisma-foundation:AI_HANDOFF/CODEX_REPORTS/20260913_CODEX_G9C_CORE_SERVICE_LAYER_OWNER_DECISIONS_REPORT.md`
**سند طراحی:** `mlino2/MLINO_CORE_SERVICE_LAYER_DESIGN.md` — ۳۰۴ خط، LF sha256 `cd041054c34d9e3827f5d590ff6dcb07c82e51b208f7d489443501ceecb561a8`
**commitها:** `861bf3c` (طراحی و گزارش) و `091d422` (Handoff)

## حکم: `APPROVED_NEXT_STEP`

**طراحی لایه‌ی service برای تصویب نهایی مالک آماده است.**
- S1 تا S11 و R4 با وضعیت DECIDED و با همان معنای تصمیم مالک ثبت شده‌اند.
- F1 تا F9 اعمال شده‌اند.
- هیچ تصمیمی تغییر یا تفسیر دوباره نشده است.

چهار نکته‌ی جزئی باقی مانده که ارزش یک دور سندی دیگر ندارند. به‌عنوان قید ورود به G10 ثبت می‌شوند (بخش ۳).

**گام بعدی (G10a، نخستین برش کد) به تصویب مالک نیاز دارد.**

---

## ۱. راستی‌آزمایی

| مورد | نتیجه |
|---|---|
| **دامنه** | ✅ `645f6e2..091d422` فقط سه فایل مجاز را تغییر داده است. Handoff و گزارش‌های پیشین بدون حذف‌اند. `git diff --check` پاک است. main (`1583302`) و V2 (`f4d326f`) بدون تغییرند |
| **hash گزارش** | ✅ `a6fa1ca0…6783` |
| **GW2-P** | ✅ هر دو مرجع با pinها برابرند. fetch همچنان `SEC_E_NO_CREDENTIALS` می‌دهد و Codex به credential دست نزده است |
| **وفاداری به تصمیم مالک** | ✅ جدول DECIDED در بخش ۱۱ را سطر به سطر با سند تصویب مقایسه کردم و معنا یکسان است. تصمیم‌ها در بخش‌های مربوط هم منعکس شده‌اند: S2، S3 و S8 ← بخش ۲ · S7، R4، S10 ← بخش ۵ · S11 ← بخش ۶ · S4 ← بخش ۷ |
| **F1 تا F9** | ✅ همه مطابق migration و schema: C7 `:587-589` · `retired_at` · `schema:401` · `schema:637` · `:675-683` · شش سطر تازه در جدول مجوز · حذف Membership از actor گذار claim · F6 صریح · قاب S3 · VERIFIED و SUSPENDED → EXPIRED · C1 → `IdentifierAlreadyClaimed` · آزمون‌های منفی S10 و S11 |
| **ادعاهای محل در گزارش** | ⚠️ گزارش S1 و S5 را «بخش ۲ و ۵» و F8 را «بخش ۶ و ۹» نوشته، ولی diff این بخش‌ها را تغییر نداده است (S1 و S5 فقط در بخش ۱۱ آمده‌اند). اثری ندارد، ولی الگوی تکراری «ادعای محل بیش از واقع» است ← در G10 هر ادعا باید با diff یا خروجی فرمان همراه باشد |

## ۲. بررسی معماری

| محور | نتیجه |
|---|---|
| **ADR-0009 / ADR-0010** | ✅ مسیرهای ساختن authority اکنون قاعده دارند (S10). پلتفرم هرگز منتشر نمی‌کند و authority نمی‌سازد |
| **ADR-0011** | ✅ Core در پوشه‌ی مستقل است و ماژول‌ها فقط از مرز عمومی استفاده می‌کنند (S8) |
| **tenant (W1)** | ✅ W1 قطعی است. S2 انتخاب سازمان را به Membership فعال گره می‌زند |
| **درستی انتشار** | ✅ قرارداد revision، جایگزینی در یک تراکنش، idempotency طبیعی (S4) |
| **بدهی عمدی** | S10 فقط در service اجرا می‌شود (بدون guard در DB) و SQLSTATE جدا برای هر trigger هم به CCR آینده رفته است. هر دو صریح ثبت شده‌اند |

## ۳. قیدهای ورود به G10 (بدون دور سندی تازه)

| # | قید |
|---|---|
| **E1** | **خطای 23505 سه منبع دارد:** شناسه‌ی claim ‏(`business_identity_claim_active_identifier_unique`)، رقابت نسخه (`offer_version_number_unique`) و index انتشار (`offer_version_published_unique`). adapter خطا باید **بر اساس نام constraint** تفکیک کند، نه یک `UniquenessConflict` کلی |
| **E2** | **S4 برای Profile و Capability:** publish دوباره‌ی ردیفی که PUBLISHED است با همان revision، از trigger خطای `invalid publication transition` می‌گیرد. service فقط وقتی آن را به «قبلاً منتشر شده» نگاشت کند که `published_content_revision` برابر revision درخواستی باشد. در غیر این صورت conflict است. همین قاعده برای OfferVersion با `publication_status = PUBLISHED` |
| **E3** | گذار `SUSPENDED → VERIFIED/REJECTED` هنوز «فقط اگر تصویب شود» است. به G10a ربطی ندارد (claim در G10a نیست) و پیش از برش claim به‌صورت **S12** به مالک ارائه می‌شود. توصیه: مجاز با platform ref |
| **E4** | سرآیند سند هنوز «G9b — DRAFT» است. در نخستین commit برش G10a به «FINAL — owner-approved» تغییر کند |

## ۴. خطر ایمنی داده که در این بازبینی پیدا شد

- چند spec از V1 در `afterEach` این دستورها را **بدون شرط** اجرا می‌کنند:
  - `deleteMany({})` روی `event_log`، `admission_observability`، `core_entity` و جدول‌های opportunity
  - نمونه: `test/feed/opportunity-feed.spec.ts:38-41`
- `foundation/prisma-client.ts:9` از `DATABASE_URL` استفاده می‌کند.
- `.env.example` به `localhost:5435` اشاره می‌کند، یعنی همان `mlino-v1-local-db` که داده دارد.
- **فایل `_PUSH_STAGING/implementation/.env` وجود دارد.** فقط وجودش را بررسی کردم و محتوایش را نخواندم.
- پس اجرای `npm test` در clone اصلی می‌تواند داده‌ی زنده‌ی V1 را پاک کند.
- **قاعده‌ی ثابت:** هیچ‌کس `npm test` یا `jest` را در `_PUSH_STAGING` اجرا نکند. G10a guard صریح دارد (بخش ۵). یک guard سراسری در `test/setup-env.ts` می‌تواند بعداً با CCR کوچک V1 افزوده شود.

---

## ۵. گام بعدی — G10a: نخستین برش کد (هسته‌ی authority)

**چرا این برش اول است:** پرخطرترین بخش است (S10، R4، W1، S2) و همه‌ی برش‌های بعدی به بررسی مجوز آن وابسته‌اند.

**بیرون از G10a:**
- claim و verification
- Profile، Capability، Offer، Evidence و Publication
- HTTP
- اتصال واقعی AC-2

**تصویب مالک لازم است:** این برش، نخستین کد تولیدی Core در V1 است. شامل یک تغییر یک‌خطی در `tsconfig.json` هم هست.

```
INSTRUCTION_ID: CODEX-20260913-G10A-CORE-AUTHORITY-SLICE-001
TARGET_HANDOFF_ID: HANDOFF-20260912-CORE-PRISMA-FOUNDATION
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260913_CLAUDE_REVIEW_G9C_OWNER_DECISIONS.md (PINNED_COMMIT/SHA256 relayed)
DESIGN_REFERENCE: origin/codex/core-prisma-foundation mlino2/MLINO_CORE_SERVICE_LAYER_DESIGN.md @ 091d422
                  (sha256 cd041054c34d9e3827f5d590ff6dcb07c82e51b208f7d489443501ceecb561a8)
OWNER_APPROVAL: ________ ("Design approved as final; G10a authorized")
MODE: CODE — additive only, on branch codex/core-prisma-foundation from 091d422.

PRECONDITION:
- GW2 / GW2-P for REVIEW_REFERENCE.
- The DESIGN_REFERENCE bytes must hash to the sha256 above.
- Any mismatch → STOP.

SCOPE (implement exactly, per the design):
 1. implementation/core/ (new):
    - auth-context:
      - S2: one issuer; the selected org is valid only with an ACTIVE Membership for the same
        identity_provider and external_subject in that org, otherwise a uniform rejection.
      - organizationId comes only from the AuthContext (W1).
    - permission registry: a closed constant list of the keys in design section 5 (no free-form keys).
      - Grant-admin key = permission_grant.issue.
      - Membership-admin key = membership.create.
    - repositories for Organization, Membership and PermissionGrant:
      - every method takes organizationId first
      - composite where {id, organizationId}
      - no findUnique({id}) without the org
    - permission check: ACTIVE Membership + ACTIVE Grant for the key. A role is never consulted.
    - BootstrapService (R4):
      - Organization (id supplied by the caller as the AC-2 identifier, never generated), the founding
        Membership, and founding grants (basis_key='founding') for every registry key, in ONE
        transaction.
      - A second bootstrap for the same org is rejected.
      - The caller identity is a platform/AC-2 reference parameter; the AC-2 contract itself is out of scope.
    - MembershipService: create (needs membership.create); revoke (membership.revoke, or a platform
      ref under ADR-0010; the audit fields satisfy the CHECK at migration :632-643).
    - PermissionGrantService, implementing S10:
      - issue (basis member_grant): the grantor holds permission_grant.issue AND the key being granted
      - no self-grant
      - founding is never issued outside BootstrapService
      - revoke: permission_grant.revoke or a platform ref; revoking the last ACTIVE holder of
        permission_grant.issue in the org is rejected
    - error adapter (S6 + E1): stable domain errors; map P0001 by message, and 23505/23503/23514 by
      constraint name; no raw DB text leaks.
 2. implementation/test/core/**/*.spec.ts (new; matches the existing testMatch, no jest config change).
    Negative tests, each asserting the expected domain error:
    - W1 cross-org access; S2 wrong org or revoked membership
    - self-grant; granting a key not held; founding outside bootstrap; second bootstrap
    - last grant-admin revoke; a role-only attempt; full rollback on mid-transaction failure
    Positive tests for each operation.
 3. implementation/tsconfig.json: add "core/**/*.ts" to "include". NOTHING else in that file.
 4. Design doc header → "FINAL — owner-approved" (E4) in the same branch.

DATABASE SAFETY (hard rules):
- Tests run ONLY against a disposable container:
    docker run -d --name mlino-g10a-test-<UTC> -p 5499:5432 --tmpfs /var/lib/postgresql/data
      -e POSTGRES_USER=... -e POSTGRES_PASSWORD=... -e POSTGRES_DB=... postgres:16-alpine
  Credentials live only in the process env and are never logged.
- Before ANY jest or prisma command, a guard script must fail if:
  - DATABASE_URL is unset, contains ":5435" or "@db:", or names any host or port other than
    the disposable container
  - an implementation/.env file exists in the worktree
- Apply migrations with `npx prisma migrate deploy` against the disposable DB only.
  Never use migrate dev or db push.
- Run npm ci and prisma generate only in the core worktree's implementation/. Never in _PUSH_STAGING.
  node_modules is never committed.
- Record `docker volume ls` before and after: no new volume. Teardown: docker rm -f the container.
- NEVER connect to mlino-v1-local-db or port 5435. NEVER run anything in _PUSH_STAGING.

VALIDATION:
- tsc build passes
- the new Core specs pass
- the FULL existing V1 suite passes against the disposable DB (no regression)
- evidence goes to mlino2/validation/g10a/ (commands, logs, guard output, volume before/after,
  LF sha256 manifest over git show bytes)
- every claim in the report is backed by a command output or a diff reference

REPORT: AI_HANDOFF/CODEX_REPORTS/20260913_CODEX_G10A_CORE_AUTHORITY_SLICE_REPORT.md
Append only to mlino2/HANDOFF/HANDOFF_STATE.md, then STOP.

ALLOWED FILES (Core branch only):
  implementation/core/** (new) · implementation/test/core/** (new)
  implementation/tsconfig.json (one include entry) · mlino2/MLINO_CORE_SERVICE_LAYER_DESIGN.md (header only)
  mlino2/validation/g10a/** · the G10a report · mlino2/HANDOFF/HANDOFF_STATE.md (append only)

FORBIDDEN:
- schema.prisma, migrations, shared-contracts/types.ts
- any existing V1 source, test or config file other than the one tsconfig line
  (explicitly: jest.config.js, package.json, package-lock.json, docker-compose.yml, test/setup-env.ts, .env*)
- new dependencies
- claim, verification, profile, capability, offer, evidence or publication services; HTTP routes
- merging to main; changes to V2, _PUSH_STAGING or the root AI_HANDOFF files
- any action on credentials, tokens, git config or credential helpers
```

## ۶. وضعیت دروازه‌ها

| دروازه | موضوع | وضعیت |
|---|---|---|
| G9، G9b و G9c | طراحی لایه‌ی service | ✅ **آماده‌ی تصویب نهایی مالک** |
| **G10a** | **هسته‌ی authority (کد)** | ⏳ **تصویب مالک** |
| G10b و بعد | claim/verification (پس از S12) · Profile/Capability · Offer · Evidence · Publication | ⏳ |
| ادغام در main | پس از برش‌های G10 | ⏳ دروازه‌ی جدا |

من کلاد هستم
