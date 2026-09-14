# گزارش تحویل G13A — طراحی قرارداد خواندن V2

## ۱. کار اجراشده

سند طراحی `mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md` بر اساس دستور `CODEX-20260914-G13A-V2-READ-CONTRACT-DESIGN-001` ایجاد شد. این مرحله فقط مستندسازی بود.

## ۲. مبناهای بررسی‌شده

- بازبینی pinned: `AI_HANDOFF/CLAUDE_REVIEWS/20260914_CLAUDE_REVIEW_G10E_MERGE_S9_RELEASE.md`
- schema و تصمیم‌های Core در `origin/main`
- کد و قرارداد خواندنی V2 در `origin/codex/v2-intent-flow-foundation`
- ADR-0001 تا ADR-0012 و پیش‌نویس V1↔V2

`git fetch origin` به‌دلیل `SEC_E_NO_CREDENTIALS` شکست خورد. GW2-P اجرا شد: commit pinned موجود بود، ancestor بودن آن نسبت به `origin/main` تأیید شد و SHA-256 بایت‌های `git show` برابر `b854f096fd71033ff6d54f665c19165396ab1f298743325555751e6499af2957` بود. هیچ credential، token، تنظیم Git یا helper تغییر نکرد.

## ۳. فایل‌های تغییرکرده

- `mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md`
- `AI_HANDOFF/CODEX_REPORTS/20260914_CODEX_G13A_V2_READ_CONTRACT_DESIGN_REPORT.md`
- append به `mlino2/HANDOFF/HANDOFF_STATE.md`

## ۴. فایل‌های تغییرنکرده

هیچ کد، schema، migration، Prisma، Docker، database، فایل V2، ADR یا فایل پیکربندی تغییر نکرد. شاخهٔ `origin/codex/v2-intent-flow-foundation` و main دست‌نخورده ماندند.

## ۵. اجزای سند طراحی

سند شامل ۱۱ بخش اجباری است: هدف و مصرف‌کننده، دامنهٔ exposure، شکاف fidelity و گزینه‌های A تا D، freshness/validity، سیاست claim تعلیق/انقضا، DTOهای versioned، transport، امنیت و tenancy، consistency/cache، راهبرد آزمون، و تصمیم‌های باز S16 تا S20 همراه ماتریس ADR.

## ۶. شکاف اصلی ثبت‌شده

Publication در Core رویداد و revision/gate را ثبت می‌کند، اما snapshot کامل محتوای عمومی را نگه نمی‌دارد. Profile/Capability revision منتشرشده و revision جاری جدا دارند. در V2 نیز DTO فعلی `products` و `offers` دارد، در حالی که Core مدل Product ندارد و شکل OfferVersion متفاوت است. این شکاف با ارجاع خط‌به‌خط مستند و گزینهٔ B، projection عمومی مالک‌شده توسط Core، به‌عنوان توصیه ثبت شد؛ تصمیم قطعی گرفته نشد.

## ۷. تصمیم‌های باز مالک

S16 سیاست نمایش پس از تعلیق/انقضا، S17 transport، S18 fidelity، S19 freshness و S20 شکل typed فیلدهای public همچنان OPEN هستند. توصیه‌ها در سند آمده‌اند و هیچ‌کدام به‌عنوان تصمیم مالک ثبت نشده‌اند.

## ۸. ارجاع‌دهی و traceability

فکت‌های schema با مسیر و خط `origin/main: implementation/prisma/schema.prisma` ارجاع داده شده‌اند. فکت‌های V2 با مسیر و خط `origin/codex/v2-intent-flow-foundation: mlino2/app/src/...` ارجاع داده شده‌اند. ارجاعات در متن سند آمده‌اند.

## ۹. اعتبارسنجی

اعتبارسنجی فقط مستنداتی انجام شد: وجود سند، مرور بخش‌های موردنیاز و ثبت GW2-P. هیچ test، build، Prisma، Docker یا database اجرا نشد، چون دستور صریحاً document-only بود.

## ۱۰. وضعیت و گام بعد

وضعیت: **DELIVERED_AWAITING_GUARDIAN_REVIEW**.

پس از commit و Push فقط بازبینی Guardian مجاز است. هیچ implementation، CCR، transport یا G13b خودکار آغاز نمی‌شود.

من کدکس هستم.
