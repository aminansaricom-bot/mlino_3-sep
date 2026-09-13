# CCR — Core Service Layer

## وضعیت و مجوز

**Status: APPROVED**

این CCR با دامنه‌ی بخش ۳ بازبینی G11a تصویب شده است. مرجع تصویب مالک:

`AI_HANDOFF/CLAUDE_REVIEWS/20260914_OWNER_APPROVAL_CORE_SERVICE_CCR_MERGE.md`

Pinned commit: `45926ce609e74d100b4e9bef48182baa93a369da`

این سند دامنه‌ی دقیق برش‌های G10a و G10b و اصلاحات آماده‌سازی G11a را ثبت می‌کند. ادغام واقعی با `main` در این سند انجام نشده و اجرای ادغام با Guardian است.

## ۱. دامنه‌ی دقیق زیر implementation

زیر `implementation/` دقیقاً ۱۷ مسیر در دامنه‌ی ادغام هستند: ۱۱ فایل Core، پنج فایل تست Core و همین CCR.

### ۱۱ فایل تازه در `implementation/core/`

- `implementation/core/auth-context.ts`
- `implementation/core/bootstrap-service.ts`
- `implementation/core/error-adapter.ts`
- `implementation/core/errors.ts`
- `implementation/core/identity-claim-service.ts`
- `implementation/core/identity-verification-service.ts`
- `implementation/core/membership-service.ts`
- `implementation/core/permission-grant-service.ts`
- `implementation/core/permission-registry.ts`
- `implementation/core/platform-identity-verifier.ts`
- `implementation/core/repositories.ts`

### پنج فایل تازه در `implementation/test/core/`

- `implementation/test/core/core-authority.spec.ts`
- `implementation/test/core/db-guard.spec.ts`
- `implementation/test/core/db-guard.ts`
- `implementation/test/core/error-adapter.spec.ts`
- `implementation/test/core/identity-claim-verification.spec.ts`

### تغییر محدود تنظیمات

- `implementation/tsconfig.json`: فقط افزودن `"core/**/*.ts"` به `include`.

هیچ فایل دیگری زیر `implementation/` در دامنه نیست.

## ۲. خارج از implementation و فهرست بدون تغییر

در بیرون از `implementation/` دامنه شامل سند طراحی Core Service، گزارش‌های Codex، شواهد `mlino2/validation/**` و ورودی append-only در `mlino2/HANDOFF/HANDOFF_STATE.md` است.

موارد زیر بدون تغییر باقی می‌مانند:

- `implementation/prisma/**` شامل `schema.prisma` و همه‌ی migrationها
- `implementation/shared-contracts/**`
- `package.json` و `package-lock.json`
- `jest.config.js`
- `docker-compose.yml`
- `test/setup-env.ts`
- فایل‌های ریشه‌ی `AI_HANDOFF`
- V2، `main` و `_PUSH_STAGING`

هیچ فایل حذف یا rename نشده است.

## ۳. اثر runtime و مرز معماری

بازبینی `git grep` نشان می‌دهد هیچ فایل غیر Core از `implementation/core/` import نمی‌کند. Core در این مرحله به‌صورت مستقل آماده شده و مصرف‌کننده‌ی runtime جدیدی در V1 یا V2 ندارد.

`Dockerfile` فقط `shared-contracts`، `foundation`، `feed`، `briefing`، `value-engines`، `composition` و `http` را کپی می‌کند و `.dockerignore` پوشه‌ی `test` را کنار می‌گذارد. بنابراین image فعلی read-api پوشه‌ی `core/` را ندارد و رفتار runtime یا نیاز rebuild آن تغییر نمی‌کند.

یادداشت آینده: وقتی مسیر HTTP واقعاً از Core استفاده کند، افزودن `COPY core ./core` به Dockerfile باید در CCR جداگانه بررسی و تصویب شود.

## ۴. تصمیم‌های پیاده‌شده

- **S1:** service داخلی و درون‌فرایندی V1؛ HTTP فقط با نیاز اثبات‌شده و تصمیم جداگانه.
- **S2:** issuer قراردادی MVP و Membership فعال برای همان identity provider، external subject و سازمان؛ رد یکنواخت در غیر این صورت.
- **S3:** W1 قطعی و اجباری؛ سازمان فقط از `AuthContext` می‌آید. W2 در این مرحله فعال نیست.
- **S4:** برای انتشار تکراری ستون تازه یا CCR idempotency اضافه نمی‌شود؛ همان revision نتیجه‌ی موفق idempotent دارد.
- **S5:** adapter مستقل برای platform identity reference با رفتار fail-closed و audit صریح.
- **S6:** خطای domain پایدار و adapter جدا برای transport؛ SQLSTATE جدا به CCR آینده موکول است.
- **S7:** `gate_snapshot` شامل Grant استفاده‌شده و نسخه‌ی policy است؛ permission key، actor و زمان از ستون‌های موجود استفاده می‌کنند.
- **S8:** Core در پوشه‌ی مستقل implementation و جدا از value-engines قرار دارد؛ ماژول‌ها فقط از مرز Service عمومی استفاده می‌کنند.
- **S9:** قرارداد نسخه‌دار و فقط‌خواندنی برای V2 و فقط بر داده‌ی منتشرشده.
- **S10:** Grant فقط توسط Membership دارای کلید لازم و با رعایت self-grant، founding و آخرین مدیر کنترل می‌شود؛ این مرحله Service و آزمون منفی را فراهم می‌کند.
- **S11:** `REJECTED` و `EXPIRED` پایانی‌اند و resubmit ردیف Claim تازه می‌سازد.
- **S12-A:** بازگرداندن `SUSPENDED` فقط از طریق attempt تازه‌ی Verification با تصمیم `VERIFIED` انجام می‌شود.
- **R4:** AC-2 مالک شناسه‌ی سازمان است؛ Organization، founding Membership و founding Grant یک‌بار و در یک تراکنش ساخته می‌شوند.
- **E1:** adapter خطای Core برای پیام‌های trigger و نام constraintهای شناخته‌شده متصل است.
- **E2:** PlatformIdentityVerifier مستقل و fail-closed است و actor پلتفرم را از Membership کسب‌وکار جدا نگه می‌دارد.
- **E3:** قفل سازمان/Claim و تراکنش واحد برای mutationها و rollback اتمیک استفاده می‌شود.
- **E4:** guardهای اجرای آزمون به پایگاه موقت محدودند و پاک‌سازی فقط با پیشوند آزمون انجام می‌شود.
- **ADR-0009:** Role هرگز منبع Permission نیست؛ Membership و Grant مبنا هستند.
- **ADR-0010:** Platform اجرا می‌کند و authority تازه ایجاد نمی‌کند؛ Publication به Membership نیاز دارد.

## ۵. ایمنی تست و خطر `_PUSH_STAGING`

تست‌های Core guard داخلی دارند، فقط `localhost:5499` را می‌پذیرند و پاک‌سازی را به رکوردهای دارای پیشوند آزمون محدود می‌کنند. اعتبارسنجی‌ها روی PostgreSQL موقت با `tmpfs` انجام شدند و کانتینر و volumeهای جدید پس از کار پاک‌سازی و مقایسه شدند.

هشدار عملیاتی: تست‌های قدیمی V1 در `_PUSH_STAGING/implementation` از پاک‌سازی بدون شرط جدول‌ها استفاده می‌کنند و فایل `.env` آن مسیر ممکن است به پایگاه زنده اشاره کند. در `_PUSH_STAGING` هرگز `npm test` یا `jest` اجرا نشود.

## ۶. شواهد و نتیجه‌ی آزمون

شواهد head و trial merge در `mlino2/validation/g11a/` ثبت شده‌اند. head و trial هر دو این نتایج را داشتند:

- build موفق
- Core: چهار suite و ۵۰ تست موفق
- کل V1: بیست‌وسه suite و ۲۹۹ تست موفق
- شش migration روی پایگاه موقت
- trial merge بدون تعارض، بدون Commit و بدون Push
- حذف worktree و کانتینر موقت
- بدون تغییر در volumeها

## ۷. بازگشت

اگر ادغام در `main` انجام شد، راه بازگشت دقیق آن:

```text
git revert -m 1 <merge-commit>
```

در این دامنه داده یا migration تازه‌ای وجود ندارد؛ بازگشت فقط تغییرات کد و اسناد ادغام‌شده را برمی‌گرداند.

## ۸. جدول SHA-256 بایت‌های Git برای ۱۷ مسیر

SHAها از بایت‌های `git show` در head `0624296478514f1dc4c021817bc2650af803b37c` محاسبه شده‌اند. برای ردیف CCR، مقدار به manifest همین مرحله ارجاع می‌دهد.

| مسیر | SHA-256 |
|---|---|
| `implementation/core/auth-context.ts` | `2efe5f83e278b37c959e5747fe6d296fc7d87abf9887704489b934543070bda5` |
| `implementation/core/bootstrap-service.ts` | `d249ff1e4e7c8e066406bc83dd46c7b5fbf929ed76e221dd5856fe883f1f5381` |
| `implementation/core/error-adapter.ts` | `37b4bb33d85c634af49bb03e04386ea7befa87754cd158314a9c28449e7f6d28` |
| `implementation/core/errors.ts` | `765d788c58efbdab89e3cd1d62ba4ac76aaff183aa0dd4341bf26e7f473a623d` |
| `implementation/core/identity-claim-service.ts` | `f3a115c046f1a3ce14f38460f3619a7aac6c75f919e8ba0fd23d70663e6f6eef` |
| `implementation/core/identity-verification-service.ts` | `6c5fc837c310a107f8f0bf9a18d3c7388f875e3911de8a4906d744c8e45e652e` |
| `implementation/core/membership-service.ts` | `cba05cdbb11310eb23a03b5b0997685d5cf9d060d715095ff6f17c49d6b78d84` |
| `implementation/core/permission-grant-service.ts` | `a8374400c3f15dae7839e7ad2dac2da4288291161484988e44369cd2018ac4c3` |
| `implementation/core/permission-registry.ts` | `6f85504095414ba15d643fd06973119f9002e8c9b91bcf18e263bb5302219f75` |
| `implementation/core/platform-identity-verifier.ts` | `fdcfe07a094e72efd1d88d018cb337bfad4bf87550e2185d5bb8e2b284dab590` |
| `implementation/core/repositories.ts` | `1110277ee31925e76e8941425ddef25a98f5c54f3939bfa5909d465fe6b7a83d` |
| `implementation/test/core/core-authority.spec.ts` | `5739ac3fdbcf1142837f48f7c48048169ae19ab105619bdc54c0eae3d9f3126f` |
| `implementation/test/core/db-guard.spec.ts` | `3dce604c5c49a78c2a64b02039550c8e3d3cd30c65d79bf75d962ea32ccc6fd4` |
| `implementation/test/core/db-guard.ts` | `ddb915121a7fa1b1b5cb2b42352c41c0c561a8886d8dad94b745a8cdddb7f2f9` |
| `implementation/test/core/error-adapter.spec.ts` | `6c1c3c0aaf4d717e934ff57aa717c9991de6b9c721db3aef7a9afd42364b0727` |
| `implementation/test/core/identity-claim-verification.spec.ts` | `8dc3c331c6e2adf76a8383fac06373b086742e21bba982ba2c16d8cf6eb5dce4` |
| `implementation/remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_CORE_SERVICE_LAYER.md` | `self — see the manifest` |

Manifest رسمی: `mlino2/validation/g11b1/LF-MANIFEST.txt`.

## ۹. محدوده‌ی ادغام

این سند فقط CCR تصویب‌شده و دامنه‌ی ادغام G10a/G10b را تثبیت می‌کند. ادغام واقعی در `main` توسط Guardian و طبق دستور جداگانه انجام می‌شود.
