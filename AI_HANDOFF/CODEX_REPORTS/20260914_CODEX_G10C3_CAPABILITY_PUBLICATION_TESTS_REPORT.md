# گزارش اجرای G10c3 — آزمون انتشار Capability

## ۱. کار اجراشده

آزمون end-to-end چرخه‌ی انتشار Capability به spec موجود G10c اضافه شد. سرویس Core تغییر نکرد، چون آزمون نقصی در پیاده‌سازی نشان نداد.

## ۲. مبنای اجرا و precondition

- دستور: `CODEX-20260914-G10C3-CAPABILITY-PUBLICATION-TESTS-001`
- بازبینی پین‌شده: `AI_HANDOFF/CLAUDE_REVIEWS/20260914_CLAUDE_REVIEW_G10C2_PROFILE_CAPABILITY_FIXES.md`
- commit بازبینی: `18e6772dd18948b66408693eb061a58ac0960504`
- SHA-256 از `git show`: `51760fcf78e5d7d9acbd82ac0c28bffeeb1bd0b5ecf525cc4157dc5990897d98`
- `git fetch origin` با خطای `SEC_E_NO_CREDENTIALS` شکست خورد؛ GW2-P موفق شد: commit موجود بود، ancestor نسبت به `origin/main` بود و SHA سند برابر بود.

## ۳. فایل‌های تغییرکرده

- `implementation/test/core/g10c-profile-capability.spec.ts`
- `mlino2/validation/g10c3/*`

## ۴. فایل‌های تغییرنکرده

هیچ تغییر دیگری در سرویس‌ها، schema، migration، types، tsconfig، setup guard، main، V2، `_PUSH_STAGING` یا فایل credential انجام نشد.

## ۵. آزمون اضافه‌شده

تست `capability publication covers publish, idempotency, republish, withdraw and re-publish` این موارد را پوشش می‌دهد:

- انتشار نخست با نتیجه‌ی `PUBLISHED`، projection صحیح و Publication دارای `capability_id`، سازمان درست و شناسه‌های profile/offer تهی.
- تطبیق دقیق `grantId` و `policyVersion: core-publication-v1` در `gate_snapshot`.
- انتشار دوباره در همان revision با نتیجه‌ی `ALREADY_PUBLISHED` و بدون افزایش count.
- ویرایش، انتشار دوباره با افزایش count و revision جدید.
- برداشت با نتیجه‌ی `WITHDRAWN` و revision برابر revision منتشرشده.
- برداشت دوباره با `CONFLICT` و انتشار دوباره پس از برداشت با `PUBLISHED`.

## ۶. اصلاح سرویس

هیچ defectی مشاهده نشد؛ `core/publication-service.ts` تغییر نکرد.

## ۷. اصلاح ادعای گزارش قبلی

ادعای Y1 در گزارش G10c2 نادرست بود، چون آن گزارش فقط چرخه‌ی BusinessProfile را آزموده بود و آزمون Capability نداشت. پوشش صحیح اکنون توسط تست `capability publication covers publish, idempotency, republish, withdraw and re-publish` در فایل spec ثبت شده است.

## ۸. اعتبارسنجی و نتایج

- `npm run build`: موفق.
- `npm run prisma:migrate:deploy`: هر ۶ migration روی PostgreSQL موقت پورت ۵۴۹۹ موفق.
- spec G10c: یک suite و ۱۴ تست موفق.
- کل V1: ۲۵ suite و ۳۲۷ تست موفق.

## ۹. ایمنی محیط و شواهد

آزمون فقط روی PostgreSQL disposable با tmpfs و پورت ۵۴۹۹ اجرا شد. کانتینر پس از آزمون حذف شد و volumeهای قبل و بعد یکسان بودند. هیچ اجرای ۵۴۳۵، پایگاه زنده، `_PUSH_STAGING` یا اقدام credential انجام نشد. manifest مبتنی بر bytes `git show` در `mlino2/validation/g10c3/LF-MANIFEST.txt` ثبت شده است.

## ۱۰. وضعیت و گام بعد

وضعیت: **DELIVERED_AWAITING_GUARDIAN_REVIEW**.

commit آزمون: `58888e3f3a40fe910be2bafc38ae5c54f7a46c35`.
پس از ثبت گزارش و handoff، فقط شاخه‌ی `codex/core-g10c-profile-capability` push می‌شود و کار متوقف می‌گردد. هیچ G10d یا merge با main شروع نشده است.

من کدکس هستم.
