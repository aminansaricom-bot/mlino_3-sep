# گزارش همگام‌سازی مرجع ADRهای MLINO

تاریخ: ۲۰۲۶-۰۹-۱۱  
نقش: MLINO Repository Structure Maintainer  
وضعیت: **SYNCED**  
دامنه: فقط مستندات؛ بدون پیاده‌سازی

## ۱. نتیجه

منبع رسمی فایل‌های ADR-0001 تا ADR-0012 در Workspace متصل پیدا شد و هر دوازده فایل بدون تغییر بایتی به مسیر رسمی زیر اضافه شدند:

```text
docs/architecture/ADR/
```

محتوای ADRها بازنویسی، تکمیل، ترجمه، تغییر وضعیت یا تفسیر نشده است. هیچ ADR جدیدی ایجاد نشده است.

## ۲. منبع و مقصد

| مورد | مسیر |
|---|---|
| منبع بازیابی‌شده | `C:\mlino code\_PUSH_STAGING\mlino_book\adr` |
| مقصد رسمی مخزن | `C:\Users\galexy\mlino code\v2-intent-flow\docs\architecture\ADR` |
| تعداد فایل‌های همگام‌شده | ۱۲ |
| روش راستی‌آزمایی | SHA-256 کامل فایل مبدأ و مقصد |

منبع مبدأ روی Workspace staging قرار دارد و به‌عنوان متن ADRها استفاده شد؛ متن آن در این عملیات تغییر نکرد.

## ۳. فهرست و تطبیق SHA-256

برای هر ردیف، هش مقصد با هش متناظر مبدأ یکسان است.

| ADR | فایل مقصد | SHA-256 مبدأ = مقصد |
|---|---|---|
| ADR-0001 | `docs/architecture/ADR/ADR-0001-v1-as-backbone.md` | `4de16d58a29a96689345a2d51d9d36daf6df29a69f1fd787a1b128d164582b38` |
| ADR-0002 | `docs/architecture/ADR/ADR-0002-separate-repositories.md` | `1a536cb74012c5fd1aa6ee8e3a3bbdb487f9893814daa046d94adfebd1736d23` |
| ADR-0003 | `docs/architecture/ADR/ADR-0003-shared-recommendation-contract.md` | `88df59816b7141cce9207bb15ef7d2e491f17e443c4f428fc199e63e5281a6bd` |
| ADR-0004 | `docs/architecture/ADR/ADR-0004-workspace-organization-mapping.md` | `626ce2ec3a07a9244cd9754babd70f16fee190841b9230d0baa98366fe02dc33` |
| ADR-0005 | `docs/architecture/ADR/ADR-0005-recommendation-lifecycle-entity-separation.md` | `4ba2a52cade6baa633d9b5143ff4ac9fbbcef06592da5a3156ee1e5db58703c9` |
| ADR-0006 | `docs/architecture/ADR/ADR-0006-provenance-versus-confirmation.md` | `ba840d4584c9c9513b876815abc283a5fa18b6e4361c0bd66a55db1bfd4e9f7d` |
| ADR-0007 | `docs/architecture/ADR/ADR-0007-action-independent-entity.md` | `c7ef78d69044b4b0b6d3df68f266f90ec56f45a8fba3df72075a58ca82fa05c3` |
| ADR-0008 | `docs/architecture/ADR/ADR-0008-recommendation-lifecycle-ends-at-decision.md` | `83485e7eda5687d66bee7b104e4eec0982e20107b2a986873f229195a79731a3` |
| ADR-0009 | `docs/architecture/ADR/ADR-0009-role-is-not-permission.md` | `61f259db9f301e5e9cffdf6db07a411f18fb345a6491220684cbe42c5bd977d0` |
| ADR-0010 | `docs/architecture/ADR/ADR-0010-platform-executes-not-authorizes.md` | `0ed05afb9f83d70e9a1d976a0efd4fd401caf4941106240784522cb5ddeef0ab` |
| ADR-0011 | `docs/architecture/ADR/ADR-0011-core-module-boundary.md` | `853285770f3df0f6001a75f90422b8693e081b0b670726fa091ff9a9895c5831` |
| ADR-0012 | `docs/architecture/ADR/ADR-0012-experience-assistant-session-boundary.md` | `292309466b0b31d56f1bd89bef41ef91a506f682a8bf182d78b1942c785cbb03` |

## ۴. بررسی تاریخچه و منبع

بررسی Workspace staging، Checkout فعلی، شاخه‌های Git و اشیای قابل دسترس تاریخچه انجام شد. ADRهای حرفی قدیمی مانند `ADR-00X` تا `ADR-00AE` به‌عنوان جایگزین ADR-0001 تا ADR-0012 استفاده نشدند؛ آن‌ها مجموعهٔ دیگری با شماره‌گذاری متفاوت هستند.

منبع دقیق هر فایل همان مسیر staging در بخش ۲ است. بنابراین Traceability اکنون به فایل محلی مبدأ و هش محتوای مقصد متصل است.

## ۵. دامنهٔ تغییر

فایل‌های اضافه‌شده:

- دوازده فایل ADR در `docs/architecture/ADR/`؛
- `docs/architecture/ADR/README.md` به‌عنوان فهرست و مرجع مسیر؛
- همین گزارش.

فایل‌های تغییرنیافته:

- کد V1 و V2؛
- `implementation/prisma/schema.prisma`؛
- Migrationها؛
- APIها و Connectorها؛
- ADRهای قبلی و فایل‌های `AI_HANDOFF`؛
- قراردادهای منجمد.

Working tree پیش از این کار دو فایل گزارش Phase 0 را به‌صورت untracked داشت؛ آن‌ها بخشی از این همگام‌سازی نیستند و تغییر نکرده‌اند.

## ۶. اعتبارسنجی نهایی

- هر ۱۲ ADR در مقصد قابل دسترسی هستند: **تأیید شد**؛
- تطبیق SHA-256 مبدأ/مقصد برای هر ۱۲ فایل: **تأیید شد**؛
- تغییر کد: **یافت نشد**؛
- تغییر Schema: **یافت نشد**؛
- تغییر API یا Migration: **یافت نشد**؛
- تغییر تصمیم یا وضعیت ADR: **انجام نشد**؛
- Phase 1 یا هر قابلیت محصولی: **شروع نشد**.

این گزارش فقط وضعیت همگام‌سازی مستندات را پوشش می‌دهد. برای خروج رسمی از Gate Phase 0، تطبیق محتوایی با ADRهای اکنون در دسترس باید در گزارش Closure مربوط ثبت شود؛ این عملیات خودِ آن Closure را بازنویسی نمی‌کند.

من کدکس هستم
