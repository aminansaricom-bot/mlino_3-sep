# گزارش تحویل G13B — اصلاحات طراحی قرارداد خواندن V2

## ۱. کار اجراشده

طبق دستور `CODEX-20260914-G13B-V2-READ-CONTRACT-DESIGN-FIXES-001`، سند G13A در یک commit جدید اصلاح شد. دامنه فقط مستندات بود و هیچ تصمیم S را قطعی نکردم.

## ۲. پیش‌شرط و مبنا

`git fetch origin` با خطای `SEC_E_NO_CREDENTIALS` شکست خورد. GW2-P برای review pinned اجرا شد: commit `308d3b59d70fe3b2f60893de865799eb9c8d8b0a` موجود بود، ancestor بودن آن نسبت به `origin/main` موفق بود و SHA-256 بایت‌های `git show` برابر `6ca8e1dbbe0b01e93038ee60996c7a0fe5ea21815a7ed4c356ec7bfb61793a7e` بود. هیچ credential یا تنظیم Git تغییر نکرد.

## ۳. تغییرات اعمال‌شده

- بخش fidelity با گزینه‌های A1، A2، B و C بازنویسی شد؛ adapter از fidelity حذف و event به transport منتقل شد.
- برای هر گزینه اثر CCR، D6، S4، service/trigger و UX ثبت شد و یک توصیهٔ واحد A2 داده شد.
- نگاشت field-by-field از V2 `draft-1` به Core اضافه شد: business_id، category، location، products، offers، discount_percent و last_synced_at.
- برنامهٔ نسخهٔ `draft-1` → `mlino.v2.public-business.v1` و deprecation ثبت شد.
- قواعد Y1 تا Y3 اضافه شدند: gate تأیید انسانی Capability به‌صورت S18 باز، اثر Evidence با `AI_INFERRED` طبق ADR-0006، و پیوند OfferVersionCapability با شرط exposure.
- S17 به یک توصیهٔ واحد export-first تبدیل شد.
- احراز مصرف‌کنندهٔ V2، rate limit و policy لازم برای PII در `contact_information` اضافه شد.
- ordering بر اساس `Publication.occurred_at` و هدف پیشنهادی latency برای withdrawal propagation اضافه شد.
- تصمیم‌های باز به S16 تا S24 با گزینه، پیامد و یک توصیه برای هر مورد شماره‌گذاری شدند.

## ۴. فایل‌های مجاز تغییرکرده

- `mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md`
- این گزارش
- append به `mlino2/HANDOFF/HANDOFF_STATE.md`

## ۵. فایل‌های تغییرنکرده

هیچ code، test، config، schema، migration، Prisma، Docker، database، V2 branch، main، ADR یا `_PUSH_STAGING` تغییر نکرد.

## ۶. وضعیت تصمیم‌ها

همهٔ S16 تا S24 همچنان `OPEN` هستند. A2، S16-A، S17-B و سایر موارد فقط توصیهٔ طراحی‌اند و به‌عنوان تصمیم مالک ثبت نشده‌اند.

## ۷. traceability

ارجاعات schema با `origin/main: implementation/prisma/schema.prisma:file:line` و ارجاعات V2 با `origin/codex/v2-intent-flow-foundation: mlino2/app/src/...:line` داخل سند ثبت شده‌اند.

## ۸. اعتبارسنجی

فقط validation مستنداتی انجام شد: بررسی headingها، `git diff --check` و تطبیق ارجاعات با فایل‌های مبنا. هیچ test، build، Prisma، Docker یا database اجرا نشد.

## ۹. وضعیت تحویل

وضعیت: **DELIVERED_AWAITING_GUARDIAN_REVIEW**.

## ۱۰. گام بعد

فقط Guardian review مجاز است. تا دریافت تصمیم بعدی، هیچ implementation، CCR یا transport آغاز نمی‌شود.

من کدکس هستم.
