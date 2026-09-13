# گزارش اجرای G10d — Offer و OfferVersion

## ۱. کار اجراشده

برش Core برای Offer، OfferVersion، پیوند Capability و انتشار OfferVersion اجرا شد. S14-A نیز در CapabilityService پیاده شد. schema و migration تغییر نکردند.

## ۲. مبنای اجرا و precondition

- دستور: `CODEX-20260914-G10D-CORE-OFFER-SLICE-001`
- بازبینی پین‌شده: `AI_HANDOFF/CLAUDE_REVIEWS/20260914_CLAUDE_REVIEW_G10C_MERGE_G10D_RELEASE.md`
- commit بازبینی: `cf1da02bf3abe5e5701185cc1db1584b80df27d2`
- SHA-256 سند از `git show`: `790fdf5a0e1e8c6f64b3110ae6d06dbaf3e39b4daac0092a3a2fbeeae3e4361b`
- `git fetch origin` با خطای دسترسی شبکه شکست خورد؛ GW2-P موفق شد: commit موجود بود، ancestor نسبت به `origin/main` بود و hash سند برابر بود.

## ۳. فایل‌های تغییرکرده

- `implementation/core/offer-service.ts`
- `implementation/core/publication-service.ts`
- `implementation/core/capability-service.ts`
- `implementation/core/error-adapter.ts`
- `implementation/test/core/g10d-offer.spec.ts`
- `implementation/test/core/g10c-profile-capability.spec.ts`
- `mlino2/validation/g10d/*`

## ۴. رفتار پیاده‌شده

- OfferService با مجوز `offer.manage`، کلید یکتا، allowlist، ساخت نسخه با شماره‌گذاری قفل‌شده، و پیوند/حذف Capability پیش از انتشار.
- OfferVersion هیچ مسیر update/delete سرویس ندارد و قید immutable پایگاه داده حفظ شد.
- PublicationService ترتیب قفل سازمان → Offer → نسخه را برای OfferVersion رعایت می‌کند. `content_revision` برای OfferVersion تهی است.
- نتایج انتشار شامل `PUBLISHED`، `ALREADY_PUBLISHED`، `REPLACED` و `WITHDRAWN` است. در `REPLACED` ابتدا Publication برداشت نسخه‌ی قدیمی و سپس Publication انتشار نسخه‌ی جدید در همان تراکنش ثبت می‌شود.
- S14-A: تغییر واقعی فیلد عمومی Capability تأیید را در همان update به `UNCONFIRMED` برمی‌گرداند؛ مقدارهای یکسان reset نمی‌کنند.
- mapping قید `offer_organization_key_unique` به `CONFLICT` اضافه شد.

## ۵. آزمون‌های G10d و شواهد هر ادعا

فایل `implementation/test/core/g10d-offer.spec.ts` این ۱۰ تست نام‌گذاری‌شده را دارد:

1. `offer key conflict, allowlists, and lifecycle or publication fields are not settable`
2. `createVersion numbers versions 1, 2, 3 and concurrent creates get distinct numbers`
3. `price and validity checks map to validation failures`
4. `OfferVersion content cannot be updated or deleted`
5. `capability links work before publication and are blocked after publication or withdrawal`
6. `OfferVersion publication is idempotent, withdrawable and republishable`
7. `publishing a second version replaces the first in withdrawal-then-publication order`
8. `S14-A resets confirmation only after a real public change`
9. `W1 and missing offer or publication permissions are denied`
10. `concurrent publication of two versions leaves exactly one published without a raw error`

## ۶. اعتبارسنجی نهایی

- `npm run prisma:generate`: موفق، Prisma Client نسخه 5.22.0.
- `npm run build`: موفق.
- `npm run prisma:migrate:deploy`: هر ۶ migration روی PostgreSQL موقت موفق.
- تست G10d: یک suite و ۱۰ تست موفق.
- کل V1: ۲۶ suite و ۳۳۷ تست موفق.

در اجرای نخست دو fixture معتبر `onRequest` نداشتند و یک mapping قید CHECK نیز لازم بود؛ هر دو اصلاح حداقلی انجام و نتایج نهایی با rerun ثبت شدند.

## ۷. ایمنی محیط

همه‌ی اجراها فقط روی PostgreSQL disposable با tmpfs و پورت ۵۴۹۹ انجام شد. volumeهای قبل و بعد یکسان بودند و کانتینر `mlino-g10d-postgres` حذف شد. پورت ۵۴۳۵، پایگاه زنده، `_PUSH_STAGING` و credentialها استفاده نشدند.

## ۸. manifest

manifest مبتنی بر bytes خروجی `git show` در `mlino2/validation/g10d/LF-MANIFEST.txt` ثبت شده است. commit پایه‌ی manifest: `b07f5433d41ba34b2bf8790d3d2673667caae528`.

## ۹. محدودیت‌ها

Evidence، HTTP، lifecycle/retire Offer، schema، migration و قراردادهای منجمد خارج از این برش هستند. تغییر فایل تست قبلی فقط برای هم‌راستا کردن انتظار قدیمی «OfferVersion خارج از scope» با قابلیت مصوب G10d انجام شد.

## ۱۰. وضعیت و گام بعد

وضعیت: **DELIVERED_AWAITING_GUARDIAN_REVIEW**.

commit پیاده‌سازی و شواهد: `b07f5433d41ba34b2bf8790d3d2673667caae528`.
گام بعد فقط بازبینی Guardian است. هیچ merge با main یا G10e شروع نشده است.

من کدکس هستم.
