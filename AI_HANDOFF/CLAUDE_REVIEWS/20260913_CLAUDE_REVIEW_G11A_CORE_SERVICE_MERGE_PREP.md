# بازبینی نگهبان معماری — G11a: آماده‌سازی ادغام لایه‌ی service هسته

**تاریخ:** ۱۳ سپتامبر ۲۰۲۶
**بازبین:** Claude Opus 5 — MLINO Architecture Guardian
**گزارش بررسی‌شده:** `origin/codex/core-prisma-foundation:AI_HANDOFF/CODEX_REPORTS/20260913_CODEX_G11A_CORE_SERVICE_MERGE_PREP_REPORT.md` (LF sha256 `2d7a039e…fea0`)
**commitها:**

| commit | محتوا |
|---|---|
| `6487a56` | M1 و M2 |
| `e4466f3` | CCR و ادغام آزمایشی |
| `3c903e0` | manifest |
| `003b2ae` و `0624296` | گزارش و Handoff |

## حکم: `APPROVED_NEXT_STEP`

**آماده‌سازی فنی ادغام کامل و سالم است:**
- M1 و M2 انجام شده‌اند.
- ادغام آزمایشی بدون تعارض است و کل آزمون‌های V1 روی درخت ادغام‌شده سبزند. تعارض‌نداشتن را خودم هم مستقل تأیید کردم.
- محیط سالم است.

**ولی CCR پیش‌نویس به‌عنوان سند تصویب کامل نیست.** بخش ۳ حقایق دقیق دامنه را که خودم از درخت ادغام استخراج کرده‌ام ثبت می‌کند. **مالک CCR را بر اساس همین دامنه تصویب می‌کند.** Codex پس از تصویب CCR را کامل و APPROVED می‌کند و نگهبان ادغام را انجام می‌دهد.

---

## ۱. راستی‌آزمایی

| مورد | نتیجه |
|---|---|
| **دامنه** | ✅ `65168f1..0624296`: دو service، spec، CCR (تازه)، شواهد، گزارش و Handoff · بدون حذف · بدون secret |
| **main و V2** | ✅ `41f6a20` و `f4d326f`، بدون تغییر · **ادغام آزمایشی push نشده است** |
| **worktree موقت** | ✅ حذف شده است. `git worktree list` فقط دو worktree اصلی را نشان می‌دهد و در `%TEMP%` هم اثری نمانده |
| **GW2-P** | ✅ `EXIT 0` برای هر سه بررسی · hash برابر pin |
| **پایگاه داده‌ی زنده‌ی V1** | ✅ شش migration · `dspr=4` · جدول‌های Core = ۰ · `StartedAt` بدون تغییر · `Restarts=0` · بدون volume بی‌نام تازه |
| **آزمون head** | ✅ tmpfs · شش migration · build · Core: ۴ suite و ۵۰ آزمون · کل V1: ۲۳ suite و ۲۹۹ آزمون · `NO_VOLUME_CHANGE` |
| **آزمون ادغام آزمایشی** | ✅ `MERGE_EXIT=0`، `CONFLICTS=NONE`، `COMMIT_CREATED=NO`، `PUSHED=NO` · روی پایگاه یک‌بارمصرف تازه: build، ۵۰ آزمون Core، ۲۹۹ آزمون کل V1 · `NO_VOLUME_CHANGE` · شکست اولیه‌ی build به‌خاطر نبود Prisma Client در worktree تازه بود و پس از `prisma generate` حل شد. محیطی بود، نه کد |
| **merge-tree مستقل** | ✅ `git merge-tree --write-tree origin/main core@0624296` ← درخت `67859e1`، بدون تعارض · merge-base `31c9ec1` |
| **manifest و hash گزارش** | ✅ ‏۵ از ۵ · `2d7a039e…` = Handoff |

## ۲. M1 و M2

| # | وضعیت | شاهد |
|---|---|---|
| M1 | ✅ | پارامتر `organizationId` از `read()` حذف شد و سازمان فقط از `AuthContext` می‌آید. آزمون: context با هویت عضو B و `organizationId` سازمان A ← `AUTHORIZATION_DENIED` |
| M2 | ✅ | `start()` مقدار `startedAt` را صریحاً از `applicationNow`، یعنی ساعت برنامه، تنظیم می‌کند و قاعده‌ی یک ساعت در کد ثبت شده است |

## ۳. دامنه‌ی دقیق ادغام (استخراج نگهبان از درخت `67859e1`)

**زیر `implementation/`، فقط افزودنی به‌علاوه‌ی یک خط:**
- **۱۱ فایل تازه در `implementation/core/`:**
  - `auth-context`، `bootstrap-service`، `error-adapter`، `errors`
  - `identity-claim-service`، `identity-verification-service`
  - `membership-service`، `permission-grant-service`، `permission-registry`
  - `platform-identity-verifier`، `repositories`
- **۵ فایل تازه در `implementation/test/core/`:**
  - `core-authority.spec`، `db-guard.spec`، `db-guard`
  - `error-adapter.spec`، `identity-claim-verification.spec`
- **۱ فایل تازه:** `implementation/remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_CORE_SERVICE_LAYER.md`
- **۱ تغییر:** `implementation/tsconfig.json`، فقط افزودن `"core/**/*.ts"` به `include`

**بیرون از `implementation/`:** سند طراحی نهایی · ۱۴ گزارش Codex (G6 تا G10b2) · ‏۱۸۴ فایل شواهد در `mlino2/validation/**` · `mlino2/HANDOFF/HANDOFF_STATE.md`

**بدون تغییر (تأییدشده با diff خالی):**
- `implementation/prisma/**` (schema و همه‌ی migrationها)
- `implementation/shared-contracts/**`
- `package.json`، `package-lock.json`، `jest.config.js`، `docker-compose.yml`، `test/setup-env.ts`
- فایل‌های ریشه‌ی `AI_HANDOFF`
- **هیچ حذف یا تغییر نامی نیست**

**اثر runtime:** هیچ.
- **هیچ فایل غیر Core‌ای از `core/` import نمی‌کند** (`git grep` خالی).
- `Dockerfile` فقط `shared-contracts`، `foundation`، `feed`، `briefing`، `value-engines`، `composition` و `http` را کپی می‌کند و `.dockerignore` پوشه‌ی `test` را کنار می‌گذارد. پس **image ‏read-api نه `core/` را دارد و نه تغییری می‌کند.** الگوی `include` تازه همان رفتاری را دارد که `test/**/*.ts` از G8 تاکنون داشته است. rebuild لازم نیست.
- **یادداشت آینده:** وقتی مسیری در HTTP از `core/` استفاده کند، `Dockerfile` باید `COPY core ./core` بگیرد. آن تغییر CCR جدا لازم دارد.

**تصمیم‌های پیاده‌شده:** S1 تا S12 (S12-A)، R4، E1 تا E4، W1 (D2)، ADR-0009 و ADR-0010. جزئیات در سند طراحی نهایی و بازبینی‌های G10a تا G10b2 است.

**ایمنی آزمون:**
- specهای Core محافظ داخلی دارند (فقط `localhost:5499`) و پاک‌سازی‌شان محدود به پیشوند آزمون است.
- **خطر پیشین که پس از ادغام در `_PUSH_STAGING` هم می‌ماند:** specهای V1 روی جدول‌های V1 ‏`deleteMany({})` بدون شرط اجرا می‌کنند و `_PUSH_STAGING/implementation/.env` وجود دارد. **در `_PUSH_STAGING` هرگز `npm test` یا `jest` اجرا نشود.**

**راه بازگشت:** `git revert -m 1 <merge-commit>` روی main. داده یا migration تازه‌ای در کار نیست، پس بازگشت فقط کد را برمی‌گرداند.

## ۴. کمبودهای CCR پیش‌نویس (در G11b-1 اصلاح می‌شوند)

CCR فعلی قاعده‌های claim را خوب ثبت کرده است، ولی این‌ها را **ندارد**:
1. فهرست دقیق فایل‌ها و خط `tsconfig`
2. شاهد نبود import و یادداشت Docker
3. تصمیم‌های برش authority: S10، R4، port پلتفرم، قفل سازمان
4. خطر پیشین `_PUSH_STAGING`
5. راه بازگشت مشخص (به‌جای «سیاست Guardian»)
6. hash برای **همه‌ی** ۱۷ فایل `implementation/` در head نهایی (فعلاً فقط ۴ فایل)

همچنین CCR با «من کدکس هستم» تمام می‌شود که جای سند قراردادی نیست.

---

## ۵. تصمیم مالک و گام‌های G11b

**درخواست تصویب از مالک:**
> «CCR لایه‌ی service هسته با دامنه‌ی بخش ۳ این بازبینی تصویب شد؛ ادغام G10a و G10b در main مجاز است.»

**ترتیب پس از تصویب:**
1. نگهبان تصویب را روی main ثبت می‌کند.
2. **G11b-1 (Codex، فقط سند):** CCR را کامل می‌کند (موارد ۱ تا ۶ بخش ۴)، وضعیت را `APPROVED` با ارجاع به سند تصویب می‌گذارد و فقط روی شاخه‌ی Core push می‌کند.
3. **G11b-2 (نگهبان):**
   - CCR را بازبینی می‌کند.
   - merge-tree را دوباره اجرا می‌کند. درخت باید با `67859e1` فقط در فایل CCR فرق داشته باشد.
   - ادغام `--no-ff` در main را با push محافظت‌شده انجام می‌دهد.
   - پس از ادغام تأیید می‌کند که درخت main با merge-tree یکی است و image یا پایگاه داده‌ی زنده تغییری نکرده‌اند.

```
INSTRUCTION_ID: CODEX-20260913-G11B1-CORE-SERVICE-CCR-FINAL-001   (issued after owner approval)
TARGET_HANDOFF_ID: HANDOFF-20260912-CORE-PRISMA-FOUNDATION
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260913_CLAUDE_REVIEW_G11A_CORE_SERVICE_MERGE_PREP.md (pinned)
OWNER_APPROVAL: ________ (pinned approval record)
MODE: DOCUMENT ONLY — on codex/core-prisma-foundation from 0624296.
PRECONDITION: GW2 or GW2-P for both references; any failure → STOP. Never touch credentials.
TASK: rewrite CONTRACT_CHANGE_REQUEST_CORE_SERVICE_LAYER.md so it contains, verbatim in substance,
      section 3 of REVIEW_REFERENCE:
      - the exact 17-path implementation/ scope and the tsconfig line
      - the outside-implementation summary
      - the unchanged list
      - the no-import grep and the Dockerfile/.dockerignore note, plus the future COPY core note
      - the implemented decisions
      - test safety, including the _PUSH_STAGING hazard
      - rollback = git revert -m 1 <merge-commit>
      Add an LF sha256 table (git show bytes) for ALL 17 implementation/ paths at the new head (the CCR
      row: state "self — see the manifest"). Set Status: APPROVED, with a reference to the pinned owner
      approval record. Remove the "من کدکس هستم" line.
EVIDENCE: mlino2/validation/g11b1/LF-MANIFEST.txt (path  sha256).
REPORT: AI_HANDOFF/CODEX_REPORTS/20260913_CODEX_G11B1_CORE_SERVICE_CCR_FINAL_REPORT.md
Append only to the handoff; push only to codex/core-prisma-foundation; STOP.
ALLOWED: the CCR file · mlino2/validation/g11b1/** · the report · the handoff (append only)
FORBIDDEN: any code or test change; ANY commit or push to main; schema, migrations, tsconfig,
           other V1 files; credentials.
```

## ۶. وضعیت دروازه‌ها

| دروازه | موضوع | وضعیت |
|---|---|---|
| G10a و G10b | برش‌های authority و claim | ✅ بسته |
| **G11a** | **آماده‌سازی ادغام** | ✅ **پذیرفته** |
| G11b | تصویب CCR، سپس G11b-1 (تکمیل CCR)، سپس G11b-2 (ادغام توسط نگهبان) | ⏳ **تصویب مالک** |
| G10c و بعد | Profile/Capability · Offer · Evidence · Publication | ⏳ پس از ادغام |

من کلاد هستم
