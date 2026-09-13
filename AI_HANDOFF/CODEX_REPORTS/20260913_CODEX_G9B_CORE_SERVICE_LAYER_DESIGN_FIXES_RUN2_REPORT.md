# گزارش اجرای G9b — اصلاح طراحی لایهٔ سرویس Core

## ۱. کار اجراشده

دستور `CODEX-20260913-G9B-CORE-SERVICE-LAYER-DESIGN-FIXES-002` اجرا شد. فقط سند طراحی سرویس Core اصلاح شد؛ هیچ پیاده‌سازی آغاز نشد.

## ۲. مراجع استفاده‌شده

- بازبینی pin‌شدهٔ G9 در commit `e79585ba3431b662fd32819a57f92bd88b3c855d`.
- بازبینی حاکمیت GW2-P در commit `59322dcbbfa8bbeb15b89933f77e1cd635e63452`.
- schema و migration از `origin/main` محلی با ارجاع‌های file:line.

## ۳. خروجی پیش‌شرط GW2-P

`git fetch origin` شکست خورد:

`fatal: unable to access ... schannel: AcquireCredentialsHandle failed: SEC_E_NO_CREDENTIALS (0x8009030e)`

پس GW2-P برای هر دو مرجع اجرا شد:

| مرجع | `git cat-file -e <commit>^{commit}` | `git merge-base --is-ancestor <commit> origin/main` | SHA خروجی `git show ... \| sha256sum` |
|---|---:|---:|---|
| G9 review / `e79585ba...` | exit 0 | exit 0 | `35def70586113d2a0f08c9f1155d31a09e688aed2d9a48ae5efc01fae2ff32c7`، برابر pin |
| GW2-P review / `59322dcb...` | exit 0 | exit 0 | `d99e53148821192102cbeb02fa1759ada4fab10dec88239de17d563cb54acef5`، برابر pin |

## ۴. فایل‌های تغییرکرده

- `mlino2/MLINO_CORE_SERVICE_LAYER_DESIGN.md`
- `AI_HANDOFF/CODEX_REPORTS/20260913_CODEX_G9B_CORE_SERVICE_LAYER_DESIGN_FIXES_RUN2_REPORT.md`
- `mlino2/HANDOFF/HANDOFF_STATE.md` به‌صورت append-only

## ۵. فایل‌های تغییرنیافته

`AI_HANDOFF/CODEX_REPORTS/20260913_CODEX_G9_CORE_SERVICE_LAYER_DESIGN_REPORT.md`، کد، `implementation/**`، schema، migrationها، ADRها، `mlino_book/**`، main، V2 و `_PUSH_STAGING` تغییر نکردند.

## ۶. جدول اصلاحات

| شناسه | بخش تغییرکرده | وضعیت | توضیح |
|---|---|---|---|
| R1 | ۷ و ۸ | applied | قرارداد revision، `FOR UPDATE`، withdraw با published revision، OfferVersion با NULL، جایگزینی اتمیک و ترتیب قفل ثبت شد |
| R2 | ۷ و ۸ و ۹ | applied | immutable از لحظهٔ ایجاد، DELETE ممنوع، محدودیت link با `published_at IS NULL` و version race ثبت شد |
| R3 | ۲ و ۹ | applied | تضمین درون‌ردیفی DB از W1 caller جدا شد؛ signature و composite where و MATCH SIMPLE ثبت شد |
| R4 | ۵ و ۱۱ | applied | bootstrap یک‌تراکنشی، یک‌بار برای سازمان و گزینه‌های مالک با توصیه ثبت شد |
| R5 | ۵ و ۱۱ | applied | جدول permission/actor و کنش‌های مجاز platform تحت ADR-0010 اضافه شد |
| R6 | ۶ | applied | وضعیت‌ها، actor گذار، پیوند تصمیم Verification و Claim، و attempt race ثبت شد |
| Y1 | ۴ و ۱۰ | applied | مالک Evidence دقیقاً یک owner typed دارد و audit فهرست شد |
| Y2 | ۷ | applied | projection OfferVersion فقط `publication_status` و `published_at` ثبت شد |
| Y3 | ۹ | applied | همهٔ پیام‌های P0001 و SQLSTATEهای 23514/23505/23503 نگاشت شدند؛ SQLSTATE جدید فقط گزینهٔ CCR آینده است |
| Y4 | ۲ | applied | لایه‌های repository، service، caller و public read با توصیهٔ محل اضافه شد |
| Y5 | ۱۰ | applied | بخش audit و مرز history برای Verification/Publication اضافه شد |
| Y6 | ۱۱ | applied | برای S1 تا S9 و R4 گزینه، پیامد و توصیه ثبت شد؛ تصمیمی اتخاذ نشد |
| Y7 | ۱۱ | applied | SHA migration از خروجی مستقیم `git show origin/main ... \| sha256sum` درج شد |
| Y8 | ۱ و ۴ و ۱۱ | applied | ExternalWorkspaceLink خارج از دامنهٔ این service layer صریح شد |
| Y9 | گزارش و Handoff | applied | شکست fetch و موفقیت push فقط به‌صورت مشاهدهٔ محیطی ثبت شد؛ هیچ credential/config تغییر نکرد |

## ۷. اعتبارسنجی سند و شواهد

`git diff --check` موفق شد. سند اکنون ۱۱ بخش شماره‌دار دارد. هیچ تست نرم‌افزاری، Prisma، Docker یا اتصال دیتابیس اجرا نشد؛ این با حالت DOCUMENT ONLY سازگار است.

SHAهای استفاده‌شده:

- schema: `760b25b59735c7dbb4b2ca4602f3ccf4dc353f5e3d71f2dff9ec893500222ee4`
- migration: `99e7ae8a06e804d6fa282727ce5b5ef65e4bbea5add0e936b4d9604411751169`

هر دو از bytes خروجی `git show` محاسبه شده‌اند.

## ۸. توضیح fetch در برابر push

در این محیط، fetch به credential Schannel دسترسی نداشت و با `SEC_E_NO_CREDENTIALS` متوقف شد. Push پیشین در اجرای جداگانه موفق شده بود؛ بنابراین این دو عملیات رفتار یکسانی در زمان اجرا نشان نداده‌اند. این گزارش هیچ علت قطعی فراتر از همین مشاهده اعلام نمی‌کند و هیچ credential، token، git config یا credential helper دست‌کاری نشد.

## ۹. تصمیم‌های باز و ریسک‌ها

S1 تا S9 و R4 فقط با گزینه، پیامد و توصیه ثبت شدند و هیچ‌کدام تصمیم‌گیری نشدند. ریسک‌های باقی‌مانده شامل انتخاب bootstrap، قرارداد AuthContext، error payload، idempotency و public read contract V2 است.

## ۱۰. Commit و اقدام بعدی

Commit جدید برای این اجرا ایجاد می‌شود و پس از Push، اجرای کار متوقف خواهد شد. اقدام بعدی فقط بازبینی مستقل Guardian است؛ implementation service، repository، API، Prisma یا Docker آغاز نمی‌شود.

من کدکس هستم.
