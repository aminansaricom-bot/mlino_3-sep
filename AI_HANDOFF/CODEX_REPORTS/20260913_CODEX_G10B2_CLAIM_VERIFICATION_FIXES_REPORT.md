# گزارش اجرای G10b2 — اصلاحات Claim و Verification

## ۱. کار اجراشده

دستور `CODEX-20260913-G10B2-CLAIM-VERIFICATION-FIXES-001` بر اساس review pinned اجرا شد. دامنه فقط اصلاحات R1 و Y1 تا Y5 بود.

## ۲. پیش‌شرط و منبع review

`git fetch origin` به‌دلیل خطای احراز هویت ویندوزی `SEC_E_NO_CREDENTIALS` شکست خورد. طبق GW2-P، هر سه بررسی موفق بودند:

- `git cat-file -e b52f1493823c394f052d103dbf48d68c8036ab1d^{commit}` با کد خروجی صفر.
- `git merge-base --is-ancestor b52f1493823c394f052d103dbf48d68c8036ab1d origin/main` با کد خروجی صفر.
- SHA-256 متن review از بایت‌های pinned برابر `209824ea5203cddd04ae0d8a133f7ad9812a19470a773c4541a8e81904b36152` بود.

تمام خروجی‌ها در `mlino2/validation/g10b2/precondition.log` ثبت شده‌اند. هیچ credential، token، git config یا credential helper تغییر نکرد.

## ۳. اصلاحات اعمال‌شده

- در هر تغییر وضعیت Claim، همه‌ی تلاش‌های دیگر با وضعیت `PENDING` یا `UNDER_REVIEW` در همان تراکنش به `EXPIRED` می‌روند.
- دلیل انقضا دقیقاً `superseded: claim <STATUS>` و زمان تصمیم همان زمان تغییر وضعیت است.
- تصمیم روی Claim تعلیق‌شده فقط وقتی مجاز است که `attempt.startedAt > claim.statusChangedAt` باشد.
- مقدار runtime تصمیم فقط `VERIFIED` یا `REJECTED` است.
- شروع Verification با سازمان متفاوت اکنون `TENANT_MISMATCH` برمی‌گرداند.
- خواندن Claim با عضویت سازمان دیگر و شناسه‌ی سازمان مقصد، `AUTHORIZATION_DENIED` می‌دهد.
- بررسی دوباره‌ی attempt غیر `PENDING` و تصمیم دوباره روی attempt تصمیم‌گیری‌شده، `CONFLICT` می‌دهد.
- تست S12-A دقیقاً یک attempt تازه پس از تعلیق ایجاد می‌کند.

## ۴. سناریوهای آزموده‌شده

سناریوی A1/A2 اجرا شد: دو attempt شروع شدند، A1 تأیید شد، Claim تعلیق شد، A2 به‌صورت خودکار منقضی ماند و تصمیم روی آن رد شد. سپس یک attempt تازه پس از تعلیق با موفقیت تأیید شد.

همچنین انقضای همه‌ی attemptهای باز هنگام انتقال Claim به `EXPIRED` مستقیماً بررسی شد.

## ۵. فایل‌های تغییرکرده

- `implementation/core/identity-claim-service.ts`
- `implementation/core/identity-verification-service.ts`
- `implementation/core/repositories.ts`
- `implementation/test/core/identity-claim-verification.spec.ts`
- `mlino2/validation/g10b2/`
- این گزارش و ورودی append-only در `mlino2/HANDOFF/HANDOFF_STATE.md`

Manifest چهار فایل کد/تست با SHA-256 بایت‌های Git در `mlino2/validation/g10b2/LF-MANIFEST.txt` ثبت شده است.

## ۶. فایل‌های تغییرنکرده و محدودیت‌ها

هیچ تغییری در `schema.prisma`، migrationها، `types.ts`، قراردادها، ADRها، V2، main یا `_PUSH_STAGING` انجام نشد. مرحله‌ی بعدی و G10c شروع نشد.

## ۷. ایمنی پایگاه آزمون

PostgreSQL 16 در کانتینر موقت با `tmpfs` و پورت ۵۴۹۹ اجرا شد. شش migration اعمال شدند. پس از آزمون کانتینر حذف شد و مقایسه‌ی volume قبل و بعد `NO_VOLUME_CHANGE` بود. هیچ تستی به دیتابیس زنده‌ی V1 وصل نشد.

## ۸. تست و نتیجه

- `npm run build`: موفق.
- Core: ۴ suite و ۵۰ تست موفق.
- کل V1: ۲۳ suite و ۲۹۹ تست موفق.
- ابتدا یک خطای سناریوی تست به‌دلیل ساخت سناریوی نامعتبر برای Claim `PENDING` پیدا شد؛ سناریو طبق A1/A2 اصلاح و اجرای نهایی بدون شکست انجام شد.

## ۹. Commitها و وضعیت Push

- `cfe376f` — اصلاحات R1 و Y1 تا Y5 و شواهد اجرای G10b2.
- `f4d1135` — manifest شواهد LF.

گزارش و Handoff در Commit بعدی ثبت و سپس همه‌ی Commitها فقط به `codex/core-prisma-foundation` Push می‌شوند.

## ۱۰. ریسک و گام بعد

ریسک معماری جدیدی شناسایی نشد. اعتبارسنجی هویت پلتفرم همچنان از verifier تزریق‌شده‌ی محیط آزمون استفاده می‌کند و اتصال production خارج از این slice است.

وضعیت: `COMPLETED — AWAITING ARCHITECTURE GUARDIAN REVIEW`.

گام بعد فقط پس از بازبینی Guardian تعیین شود؛ اجرای G10c یا هر مرحله‌ی دیگر خودکار نیست.

من کدکس هستم.
