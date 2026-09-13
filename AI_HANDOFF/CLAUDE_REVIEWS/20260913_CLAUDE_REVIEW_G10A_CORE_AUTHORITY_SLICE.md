# بازبینی نگهبان معماری — G10a: برش هسته‌ی authority (نخستین کد Core)

**تاریخ:** ۱۳ سپتامبر ۲۰۲۶
**بازبین:** Claude Opus 5 — MLINO Architecture Guardian
**گزارش بررسی‌شده:** `origin/codex/core-prisma-foundation:AI_HANDOFF/CODEX_REPORTS/20260913_CODEX_G10A_CORE_AUTHORITY_SLICE_REPORT.md` (LF sha256 `578f154e…305d`)
**commitها:**

| commit | محتوا |
|---|---|
| `aa225d1` | کد و شواهد |
| `6c85212` | گزارش |
| `52689a4` | Handoff |

## حکم: `APPROVED_WITH_FIXES`

**محیط اجرا کاملاً سالم است:**
- دامنه‌ی تغییرها درست است و فقط فایل‌های افزودنی و یک خط `tsconfig` تغییر کرده‌اند.
- محافظ پایگاه داده درست کار می‌کند، پایگاه داده‌ی زنده‌ی V1 دست نخورده است و volume یتیمی نمانده است.
- manifest با blobهای git می‌خواند و ۲۵۵ آزمون سبز است.
- ساختار کد درست است: repositoryها از W1 پیروی می‌کنند، S2 رعایت شده، registry بسته است و bootstrap در یک تراکنش انجام می‌شود.

**ولی در منطق authority چهار شکاف امنیتی واقعی هست** که آزمون‌ها آن‌ها را نمی‌گیرند؛ یکی از آزمون‌ها حتی خودش آن را نمایش می‌دهد. این شکاف‌ها باید پیش از هر برش بعدی و پیش از هر ادغام در main بسته شوند.

**اصلاح در دامنه‌ی مجوز همین G10a است** (همان پوشه‌ها)، پس تصویب تازه‌ی مالک لازم نیست. G10b و ادغام تا بسته شدن G10a2 **متوقف‌اند**.

---

## ۱. راستی‌آزمایی محیط و شواهد

| مورد | نتیجه |
|---|---|
| **دامنه** | ✅ ‏۲۹ فایل، همه در مسیرهای مجاز · `tsconfig` فقط `core/**/*.ts` · در سند طراحی فقط سرآیند (۲ خط) · Handoff فقط افزودنی · بدون `.env`، `node_modules`، dump، schema، migration یا package · بدون الگوی secret |
| **main و V2** | ✅ `f39b28d` و `f4d326f`، بدون تغییر |
| **پایگاه داده‌ی زنده‌ی V1** | ✅ شش migration · `domain_signal_producer_registry=4` · جدول‌های Core، `event_log` و `core_entities` = ۰ · `StartedAt` بدون تغییر · `Restarts=0` |
| **container آزمون** | ✅ حذف شده است. volume قبل و بعد (هر دو اجرا) یکسان است. همه‌ی ۷ volume بی‌نام قدیمی‌ترند؛ جدیدترین مربوط به `2026-09-12` است |
| **محافظ** | ✅ `guard.ps1`: ‏DATABASE_URL فقط `localhost:5499`، رد `:5435` و `@db:`، رد وجود `implementation/.env`. مسیر نسبی درست است |
| **manifest** | ✅ ‏۱۲ از ۱۲ با `git show aa225d1:<path>` برابرند |
| **آزمون** | ✅ ‏۲۰ suite و ۲۵۵ آزمون، شامل `test/core/core-authority.spec.ts` · `tsc` پاک · شش migration روی پایگاه یک‌بارمصرف |
| **hash گزارش** | ✅ `578f154e…` = `REPORT_SHA256` در Handoff |
| **اجرای دوم (r2)** | ✅ شفاف گزارش شده است: خطای import در build نخست. اعتبارسنجی کامل با container تازه تکرار شد |

## ۲. یافته‌های قرمز (پیش از هر برش یا ادغام باید بسته شوند)

### A1 — authority پلتفرم بدون هیچ راستی‌آزمایی (ADR-0010، S5)

- `platformIdentityRef` یک فیلد ساده در `AuthContext` است (`auth-context.ts:12`). `requirePlatformIdentity` فقط غیرتهی بودنش را می‌سنجد (`:37-41`).
- **در `MembershipService.revoke` (`membership-service.ts:18`) و `PermissionGrantService.revoke` (`permission-grant-service.ts:23`)، صرفِ حضور این فیلد همه‌ی بررسی‌های Membership و Grant را دور می‌زند.**
- پیامد: هر caller که این رشته را در context بگذارد، بدون هیچ مجوزی می‌تواند هر عضویت یا grant سازمان را revoke کند.
- تصمیم S5 می‌گوید «adapter مستقل هویت پلتفرم با audit». این‌جا adapter وجود ندارد و یک رشته جای authority را گرفته است.

### A2 — bootstrap بدون authority و بدون audit (R4)

- `BootstrapService` ‏`platformIdentityRef` را فقط برای غیرتهی بودن بررسی می‌کند (`bootstrap-service.ts:12`) و **بعد دورش می‌اندازد**. هیچ جا ثبت نمی‌شود.
- هر کدی که به service دسترسی داشته باشد می‌تواند برای هر شناسه‌ای سازمان و grantهای founding بسازد، و اثری از اینکه چه کسی این کار را کرده نمی‌ماند.
- bootstrap همزمان برای یک شناسه با PK رد می‌شود، ولی به‌صورت **خطای خام Prisma**.

### A3 — دور زدن قاعده‌ی آخرین مدیر grant (S10-د)

- `countActiveForKey` (`repositories.ts:22`) grantهای ACTIVE را می‌شمارد، **بدون توجه به اینکه Membership آن‌ها فعال است یا نه**.
- `MembershipService.revoke` هیچ بررسی آخرین مدیری ندارد. پس با revoke کردن **عضویتِ** آخرین مدیر، grant او ACTIVE می‌ماند ولی بی‌اثر است و سازمان قفل می‌شود.
- **خود spec همین کار را می‌کند:** `core-authority.spec.ts:59-60` تنها عضو و مدیر سازمان `g10a-a` را revoke می‌کند و آزمون سبز می‌شود.
- **شرط رقابتی:** شمارش سپس revoke بدون قفل انجام می‌شود (`permission-grant-service.ts:22`). با isolation پیش‌فرض READ COMMITTED، دو revoke همزمان روی دو مدیر آخر هر دو موفق می‌شوند و سازمان بی‌مدیر می‌ماند.

### A4 — adapter خطا نوشته شده، ولی هیچ جا صدا زده نمی‌شود (S6، E1)

- `mapCoreDatabaseError` در کل شاخه **فقط در تعریف خودش** آمده است و هیچ فراخوانی ندارد. پس خطاهای خام DB به caller می‌رسند.
- نمونه‌ی واقعی در همین برش: issue دوباره‌ی کلیدی که هدف دارد، index ‏`permission_grant_active_unique` (`migration.sql:501-503`) را نقض می‌کند و **Prisma P2002 خام** برمی‌گردد.
- نگاشت P0001 بر اساس پیام، که E1 و طراحی بخش ۹ خواسته‌اند، پیاده نشده است و همه‌ی P0001ها یک پیام کلی می‌گیرند.
- شکل واقعی خطای trigger در Prisma هم آزموده نشده است.
- **بند ۹ گزارش ادعا می‌کند «P0001 بر اساس پیام نگاشت می‌شود». این نادرست است.**

### A5 — spec، جدول‌های authority را بدون محافظ داخلی پاک می‌کند

- `clearCoreRows` (`core-authority.spec.ts:8-21`) روی **همه‌ی** جدول‌های Core، از جمله `organizations`، `memberships` و `permission_grants`، `deleteMany()` بدون شرط اجرا می‌کند.
- این spec از `foundation/prisma-client` (یعنی `DATABASE_URL`) استفاده می‌کند و محافظش فقط یک اسکریپت بیرونی است.
- پس از ادغام در main، این spec وارد `_PUSH_STAGING` می‌شود، جایی که `implementation/.env` هست. آن‌جا یک `npm test` جدول‌های authority پایگاه زنده را پاک می‌کند.
- یادداشت: `publications` و `offer_versions` با trigger در برابر DELETE محافظت می‌شوند. این پاک‌سازی سراسری در برش‌های بعدی خودش خراب می‌شود.

## ۳. یافته‌های زرد

| # | یافته |
|---|---|
| **A6** | آزمون‌های الزامی دستور جا مانده‌اند: **rollback وسط تراکنش** و **founding خارج از bootstrap**. `createFounding` یک متد عمومی export‌شده است (`repositories.ts:23`) و هر کد آینده می‌تواند صدایش بزند |
| **A7** | revoke دوباره‌ی Membershipی که قبلاً REVOKED شده، فیلدهای audit revoke نخست را **بازنویسی** می‌کند، چون مدل «فقط آخرین audit» است. issue grant به Membership غیرفعال هم رد نمی‌شود |
| **A8** | چند دستور در یک خط، مثل `permission-grant-service.ts:10-15`، با سبک کد V1 نمی‌خواند و بازبینی را سخت می‌کند |
| **A9** | گزارش باز هم بیش از واقع ادعا کرده است (A4). در G10a2 هر ادعا باید با آزمون یا خروجی فرمان همراه باشد |

## ۴. بررسی معماری

| محور | نتیجه |
|---|---|
| **W1** | ✅ repositoryها `organizationId` را اول می‌گیرند و کلید مرکب دارند. سازمان همیشه از context می‌آید |
| **S2** | ✅ `requireActiveMembership` ‏ACTIVE را برای همان provider و subject در همان سازمان می‌سنجد |
| **ADR-0009** | ✅ مجوز فقط از Membership + Grant می‌آید · ❌ قاعده‌ی آخرین مدیر دور زده می‌شود (A3) |
| **ADR-0010 و S5** | ❌ authority پلتفرم تأیید نمی‌شود (A1، A2) |
| **S6 و E1** | ❌ adapter خطا بی‌استفاده است (A4) |
| **ایمنی داده** | ✅ برای اجرای G10a · ❌ برای ادغام آینده (A5) |

---

## ۵. گام بعدی — G10a2: اصلاح برش authority

**فقط کد در همان مسیرهای G10a.** مجوز مالک G10a این دامنه را پوشش می‌دهد و تصویب تازه لازم نیست.

```
INSTRUCTION_ID: CODEX-20260913-G10A2-CORE-AUTHORITY-FIXES-001
TARGET_HANDOFF_ID: HANDOFF-20260912-CORE-PRISMA-FOUNDATION
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260913_CLAUDE_REVIEW_G10A_CORE_AUTHORITY_SLICE.md (PINNED_COMMIT/SHA256 relayed)
DECISION: APPROVED_WITH_FIXES — within the owner's G10a authorization (same paths); no new owner approval needed
MODE: CODE — on codex/core-prisma-foundation from 52689a4, NEW commits only.

PRECONDITION:
- GW2 or GW2-P for REVIEW_REFERENCE; record the outputs; any failure → STOP.
- Never touch credentials, token files, git config or credential helpers.

FIXES (all mandatory):
A1 Remove platformIdentityRef from AuthContext.
   - Add a PlatformIdentityVerifier port (interface; the S5 adapter boundary), injected into the services.
   - Platform operations take a separate platform credential that the port verifies, returning a
     verified PlatformActor { ref }.
   - No verifier configured → platform paths reject (fail-closed).
   - A member AuthContext can never reach a platform path.
   - Tests use a fake verifier.
   - Negative tests: unverified or absent platform credential → AUTHORIZATION_DENIED; a member context
     cannot revoke through the platform path.
A2 BootstrapService requires a verified PlatformActor from the same port (fail-closed).
   - Record provenance without a schema change: founding grants get reason = "bootstrap:<platform ref>".
   - A concurrent or duplicate bootstrap returns CONFLICT (mapped; never a raw Prisma error).
A3 Last grant-admin rule:
   - count ACTIVE permission_grant.issue grants whose Membership is ACTIVE
   - apply it in BOTH PermissionGrantService.revoke AND MembershipService.revoke
   - serialize every authority mutation (grant issue/revoke, membership create/revoke) by locking the
     organization row first, with a parameterized raw query:
     SELECT id FROM organizations WHERE id = $1 FOR UPDATE
   Tests:
   - revoking the membership of the last admin → CONFLICT
   - two concurrent revokes of the last two admin grants → exactly one succeeds
   - fix spec lines 59-60, which currently lock an organization out
A4 Wire the error adapter.
   - Every service transaction passes CoreDomainError through and maps everything else via
     mapCoreDatabaseError.
   - Map P2002 on membership_active_subject_unique and permission_grant_active_unique → CONFLICT.
   - Implement P0001 mapping by exact message for the 10 trigger messages in design section 9.
   - Verify the real Prisma error shape with one real trigger on the disposable DB (e.g. insert a
     business_profile with publication_status PUBLISHED → "initial publication status must be
     UNPUBLISHED"), plus unit tests for the rest.
   - No raw DB text reaches callers.
   Tests: a duplicate grant issue and a duplicate active membership → CONFLICT, not a raw Prisma error.
A5 In-spec guard + scoped cleanup.
   - Add implementation/test/core/db-guard.ts, called in beforeAll of every Core spec BEFORE any query.
     It throws unless DATABASE_URL targets localhost/127.0.0.1:5499, and rejects ":5435" and "@db:".
   - Replace the global deleteMany() with deletes scoped to test-owned organization ids (a fixed test
     prefix), and only on the tables this slice writes (permission_grants, memberships, organizations).
A6 Tests:
   - rollback mid-transaction (e.g. foundingExternalSubject > 255 chars → no organization persisted)
   - founding never reachable outside bootstrap (issue always yields member_grant)
   - createFounding is not exported from the module surface
A7 Membership revoke only from ACTIVE (a re-revoke → CONFLICT, the first audit preserved). Issuing a grant
   to a non-ACTIVE membership → VALIDATION_FAILED.
A8 One statement per line, formatted to the V1 code style.
A9 In the report, back every claim with a test name or command output. Correct the G10a report's
   P0001 claim in the new report (the G10a report stays immutable).

VALIDATION: the same DATABASE SAFETY rules as G10a.
- disposable tmpfs postgres on 5499, guard script, no .env, volume before and after, rm -f
- tsc passes; the Core specs pass; the FULL V1 suite passes
- evidence in mlino2/validation/g10a2/ with an LF manifest (path  sha256)

REPORT: AI_HANDOFF/CODEX_REPORTS/20260913_CODEX_G10A2_CORE_AUTHORITY_FIXES_REPORT.md
Append only to mlino2/HANDOFF/HANDOFF_STATE.md.
Push only to codex/core-prisma-foundation (if the push is blocked, ask the owner; no workaround). Then STOP.

ALLOWED FILES:
  implementation/core/** · implementation/test/core/** · mlino2/validation/g10a2/**
  the G10a2 report · mlino2/HANDOFF/HANDOFF_STATE.md (append only)

FORBIDDEN:
- tsconfig.json (no further change), schema.prisma, migrations, types.ts
- any other existing V1 file (jest.config.js, package*.json, docker-compose.yml, test/setup-env.ts, .env*)
- new dependencies
- G10b scope (claim/verification/profile/capability/offer/evidence/publication, HTTP)
- merging to main; changes to V2, _PUSH_STAGING or the root AI_HANDOFF files
- connecting to mlino-v1-local-db or port 5435
- any action on credentials
```

## ۶. وضعیت دروازه‌ها

| دروازه | موضوع | وضعیت |
|---|---|---|
| G10a | هسته‌ی authority | ⚠️ **APPROVED_WITH_FIXES** — محیط سالم، ۴ شکاف امنیتی |
| **G10a2** | **اصلاح A1 تا A9** | ▶️ صادر شد |
| G10b | claim و verification (پس از S12) | ⛔ تا بسته شدن G10a2 |
| ادغام در main | | ⛔ تا بسته شدن G10a2، به‌علاوه‌ی دروازه‌ی جدا |

من کلاد هستم
