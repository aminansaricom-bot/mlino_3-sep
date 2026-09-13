# گزارش اجرای G10c — Profile، Capability و Publication

## ۱. کار اجراشده

برش افزایشی Core برای BusinessProfile، Capability و انتشار/برداشت آن‌ها
پیاده شد. OfferVersion، Evidence، HTTP و اتصال V2 عمداً خارج از scope ماندند.

## ۲. مبنا و پیش‌شرط

- review: `AI_HANDOFF/CLAUDE_REVIEWS/20260914_CLAUDE_REVIEW_G12B_MERGE_G10C_RELEASE.md`
- pinned commit: `6a224ddfec2f1bf4b35c30504538a1a482dd3b9b`
- pinned SHA-256: `cb1b3265e9afdd8456f2741e3b91eb9d1665f50e5706ac0874203316cb82801f`
- owner decisions: S1–S12/S12-A، R4 و S13-A

`git fetch origin` به‌دلیل `SEC_E_NO_CREDENTIALS` شکست خورد؛ GW2-P موفق شد:
commit پین‌شده موجود بود، ancestor `origin/main` بود و SHA-256 فایل review دقیقاً
برابر مقدار pinned بود.

## ۳. فایل‌های تغییرکرده

- `implementation/core/business-profile-service.ts`
- `implementation/core/capability-service.ts`
- `implementation/core/publication-service.ts`
- `implementation/core/error-adapter.ts`
- `implementation/test/core/g10c-profile-capability.spec.ts`
- `mlino2/validation/g10c/**`
- این گزارش
- `mlino2/HANDOFF/HANDOFF_STATE.md` به‌صورت append-only

## ۴. فایل‌های خارج از scope

schema، migration، types، tsconfig، setup-env، test-db-guard، package، jest config،
docker-compose، Offer، OfferVersion service، Evidence، HTTP، V2، main، شاخه‌ی
Core و `_PUSH_STAGING` تغییر نکردند.

## ۵. رفتار پیاده‌شده

- پروفایل با وضعیت `UNPUBLISHED` ساخته می‌شود و service projection/revision را نمی‌نویسد.
- public-field updateهای مجاز از D6 استفاده می‌کنند؛ افزایش revision در DB انجام می‌شود.
- پیوند claim فقط برای claim تأییدشده‌ی همان سازمان مجاز است و جفت FK با هم set/clear می‌شود.
- capability key در سطح سازمان یکتا است؛ confirmation انسانی یک‌باره و جدا از revision است.
- publication با قفل سازمان و ردیف هدف، revision جاری و grant فعال انجام می‌شود.
- انتشار تکراری همان revision مقدار `ALREADY_PUBLISHED` می‌دهد و Publication جدید نمی‌سازد.
- برداشت فقط از حالت منتشرشده مجاز است.
- `gate_snapshot` شامل grant دقیق و `core-publication-v1` است.
- publication فقط با درج Publication انجام می‌شود و trigger projection را اعمال می‌کند.
- OfferVersion در این برش رد می‌شود.

## ۶. آزمون‌ها و نتایج

- `npm ci --ignore-scripts` در worktree مستقل — موفق
- `npx prisma generate` با Prisma 5.22.0 — موفق
- `npm run build` — موفق
- تست اختصاصی G10c — ۹ تست موفق
- `npm run prisma:migrate:deploy` روی PostgreSQL 16 tmpfs پورت ۵۴۹۹ — موفق، ۶ migration
- کل V1: ۲۵ suite و ۳۲۲ تست موفق

اجرای نخست تست اختصاصی چهار failure داشت؛ fixture audit claim، ترتیب آزمون
withdraw، رد زودهنگام OfferVersion و mapping خطای constraint اصلاح شدند و
اجرای نهایی پس از اصلاح کامل سبز شد.

## ۷. ایمنی محیط

volume قبل/بعد یکسان است و کانتینر `mlino-g10c-postgres` حذف شده است. هیچ URL
پورت ۵۴۳۵، دیتابیس زنده یا `_PUSH_STAGING` استفاده نشد.

## ۸. manifest و شواهد

شواهد migration، تست اختصاصی، اجرای کامل، وضعیت container و volume در
`mlino2/validation/g10c/` قرار دارد. `LF-MANIFEST.txt` hash پنج فایل پیاده‌سازی
و تست را ثبت می‌کند.

## ۹. ریسک‌ها و موارد باز

- reset کردن confirmation پس از public-field update در این برش پیاده نشده و به تصمیم آینده نیاز دارد.
- انتشار OfferVersion و Evidence در برش‌های بعدی است.
- هشدارهای audit وابستگی‌ها خارج از scope هستند و اصلاح نشده‌اند.

## ۱۰. وضعیت و گام بعد

وضعیت اعتبارسنجی: PASS.
گام بعد فقط پس از بازبینی Guardian مجاز است؛ هیچ برش بعدی خودکار شروع نمی‌شود.

Commit hash در پیام تحویل نهایی پس از commit ثبت می‌شود.
