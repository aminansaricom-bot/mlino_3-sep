# گزارش G9c — ثبت تصمیم‌های مالک و اصلاح نهایی طراحی Service Layer

## ۱. کار اجراشده

دستور `CODEX-20260913-G9C-CORE-SERVICE-LAYER-OWNER-DECISIONS-001` در حالت DOCUMENT ONLY اجرا شد. تصمیم‌های مالک از مرجع pin‌شده ثبت و اصلاح‌های F1 تا F9 در سند طراحی اعمال شدند.

## ۲. مراجع

- فهرست اصلاح‌های F1 تا F9: commit `c6667bb34bf3ed0424bffbafd11ad0e5d26087f4`.
- ثبت تصمیم‌های مالک S1 تا S11 و R4: commit `15833023717985abadd6b8c70f0de5b6a977d529`.
- سند schema و migration از `origin/main` محلی با ارجاع file:line.

## ۳. پیش‌شرط fetch و GW2-P

`git fetch origin` با خطای زیر شکست خورد:

`SEC_E_NO_CREDENTIALS (0x8009030e)`

GW2-P برای هر دو مرجع اجرا شد و همهٔ بررسی‌ها موفق بودند:

| مرجع | cat-file | ancestor نسبت به origin/main | SHA-256 خروجی git show |
|---|---:|---:|---|
| fix list / `c6667bb...` | exit 0 | exit 0 | `2cb32c0a05f5afb655b1b87cd81943727c3629ece9d973891645a3fde6ab1a0c` برابر pin |
| owner decisions / `1583302...` | exit 0 | exit 0 | `a1cd8d1f3ac81f6526b882247ea8fca57ba575583d96cbc28aff546fdcdcc4ae` برابر pin |

هیچ credential، token، git config یا credential helper تغییر نکرد.

## ۴. فایل‌های تغییرکرده

- `mlino2/MLINO_CORE_SERVICE_LAYER_DESIGN.md`
- `AI_HANDOFF/CODEX_REPORTS/20260913_CODEX_G9C_CORE_SERVICE_LAYER_OWNER_DECISIONS_REPORT.md`
- `mlino2/HANDOFF/HANDOFF_STATE.md` به‌صورت append-only

## ۵. فایل‌های تغییرنیافته

گزارش‌های قبلی، کد، `implementation/**`، schema، migrationها، ADRها، `mlino_book/**`، main، V2 و `_PUSH_STAGING` تغییر نکردند.

## ۶. جدول تصمیم‌های مالک

| مورد | بخش تغییرکرده | وضعیت |
|---|---|---|
| S1 | ۲ و ۱۱ | applied — service داخلی؛ HTTP فقط با تصمیم جداگانه |
| S2 | ۲ و ۱۱ | applied — issuer قراردادی و Membership فعال همان subject/organization |
| S3 | ۲ و ۱۱ | applied — W1 اجباری؛ W2 پذیرفته نیست |
| S4 | ۷ و ۱۱ | applied — publish تکراری همان revision نتیجهٔ موفق idempotent است |
| S5 | ۵ و ۱۱ | applied — adapter مستقل platform identity با audit |
| S6 | ۹ و ۱۱ | applied — domain error پایدار و adapter transport جدا |
| S7 | ۵ و ۱۱ | applied — grant id و policy version در gate_snapshot |
| S8 | ۲ و ۱۱ | applied — implementation/Core جدا از value-engines |
| S9 | ۲ و ۱۱ | applied — public read contract نسخه‌دار و فقط‌خواندنی |
| R4 | ۵ و ۱۱ | applied — AC-2، transaction اتمیک، فقط یک‌بار |
| S10 | ۵، ۱۰ و ۱۱ | applied — grant delegation، self-grant، founding، آخرین admin و membership creation |
| S11 | ۶، ۱۰ و ۱۱ | applied — REJECTED/EXPIRED پایانی و Claim تازه |

## ۷. جدول اصلاح‌های F1 تا F9

| مورد | بخش تغییرکرده | وضعیت |
|---|---|---|
| F1 | ۱۰ | applied — Evidence دقیقاً یک owner با C7 |
| F2 | ۱۰ | applied — Offer دارای `created_at` و `retired_at`؛ `updated_at` حذف شد |
| F3 | ۶ | applied — attempt متعلق به IdentityVerification و نام قید صحیح با schema:401 |
| F4 | ۵، ۶ | applied — ارجاع Publication به schema:637، grant به migration:675-683 و attempt به قید صحیح اصلاح شد |
| F5 | ۵ | applied — عملیات Membership، Grant، Claim، Verification، Capability و Evidence اضافه شد؛ Membership از actor گذار Claim حذف شد |
| F6 | ۵ | applied — محدودیت DB و enforcement سرویس تحت S10 صریح شد |
| F7 | ۲ و ۱۱ | applied — W2 فقط علاوه بر W1 تعریف و رد شد |
| F8 | ۶ و ۹ | applied — VERIFIED→EXPIRED، C1 و `IdentifierAlreadyClaimed` اضافه شد؛ terminal states ثبت شد |
| F9 | ۱۰ | applied — آزمون‌های منفی S10 و S11 اضافه شد |

## ۸. شواهد و اعتبارسنجی

`git diff --check` موفق بود. سند طراحی ۱۱ بخش دارد. SHAهای Git استفاده‌شده:

- fix list: `2cb32c0a05f5afb655b1b87cd81943727c3629ece9d973891645a3fde6ab1a0c`
- owner decisions: `a1cd8d1f3ac81f6526b882247ea8fca57ba575583d96cbc28aff546fdcdcc4ae`
- schema: `760b25b59735c7dbb4b2ca4602f3ccf4dc353f5e3d71f2dff9ec893500222ee4`
- migration: `99e7ae8a06e804d6fa282727ce5b5ef65e4bbea5add0e936b4d9604411751169`

هیچ تست نرم‌افزاری، Prisma، Docker یا اتصال دیتابیس اجرا نشد.

## ۹. ریسک‌ها و وضعیت پیاده‌سازی

تصمیم‌های S1 تا S11 و R4 اکنون در سند DECIDED هستند، اما این گزارش مجوز شروع G10 نیست. S10 فعلاً enforcement سرویس و آزمون منفی می‌خواهد؛ DB guard آن به CCR آینده موکول است. هیچ implementation انجام نشده است.

## ۱۰. Commit و اقدام بعدی

پس از commit و Push این گزارش، کار متوقف می‌شود. اقدام بعدی فقط بازبینی Guardian و سپس تصویب نهایی طراحی است؛ بدون آن G10 آغاز نمی‌شود.

من کدکس هستم.
