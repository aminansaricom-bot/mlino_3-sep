# گزارش اصلاح جراحی Wave 1

## ۱. حکم اجرایی (Executive Verdict)

**WAVE 1 REMEDIATION — READY FOR CENTRAL REVIEW**

هر چهار یافته‌ی قابل‌اصلاح در سطح پیاده‌سازی (R1، R2، R3، R7) رفع و با تست واقعی روی Postgres محلی تأیید شدند. سه یافته‌ی باقی‌مانده (R4، R5، R6) عمداً در کد حل نشدند — طبق دستور صریح این تکلیف — و به‌جای آن مستندسازی/اسکالیشن رسمی شدند. Frozen Architecture و Shared Contract بدون تغییر ماندند. این حکم به‌معنای «Wave 1 برای FP-02 آماده است» نیست — آن تصمیم منوط به بازبینی مرکزی و حل R4/R5/R6 است (بند ۲۰ و ۲۱ همین گزارش).

## ۲. تأیید Baseline منجمد

بدون رانش. `Kernel_Architecture_v1.3_FROZEN.md`، `Interaction_Contracts_v1.1_FROZEN.md`، و ADR-00AC/AD/AE در طول این تکلیف خوانده شدند (نه نوشته) و محتوایشان با نقل‌قول‌های موجود در اسناد بازبینی Wave 1 قبلی مطابقت کامل داشت. جزئیات در [[PRE_REMEDIATION_STATE.md]].

## ۳. تأیید Shared Contract

`PHASE_4B_DISTRIBUTED_IMPLEMENTATION_PLAN/01_SHARED_CONTRACTS/MLINO_SHARED_IMPLEMENTATION_CONTRACTS_v1/CONTRACTS.md` — بدون تغییر. `implementation/shared-contracts/types.ts` — **بدون تغییر** (صفر خط ویرایش‌شده در کل این تکلیف). هر رفع (R1/R2/R3/R7) با استفاده از مقادیر/ساختارهای از قبل موجود در قرارداد پیاده‌سازی شد.

## ۴. R1 — Idempotency همزمان

**وضعیت: رفع‌شده و تأیید‌شده.**

- **علت ریشه:** الگوی `findUnique → if missing → create` در `event-log.service.ts` دارای شکاف TOCTOU بود.
- **اثبات مستقل مسئله:** یک اسکریپت یک‌بارمصرف (نه بخشی از مجموعه‌ی تست دائمی) که دقیقاً همان الگوی قدیمی را بازپیاده‌سازی می‌کرد، روی Postgres واقعی اجرا شد و با خطای `PrismaClientKnownRequestError: Unique constraint failed on unique_key (P2002)` **کنترل‌نشده** شکست خورد — اثبات این‌که Race واقعی است، نه فرضی.
- **رفع:** `create` اکنون در `try/catch` است؛ برخورد به Constraint یکتایی دیتابیس (P2002 روی `unique_key`) گرفته و به همان نتیجه‌ی `DuplicateEvent` که مسیر سریع برمی‌گرداند، ترجمه می‌شود.
- **نتیجه‌ی تست همزمانی (بند ۳۹ درخواست):**

| فیلد | مقدار |
|---|---|
| نتیجه | **PASS** |
| تعداد ارسال هم‌زمان | ۲۰ (تست اول) + ۲۰ (تست دوم، مخلوط) |
| تعداد Event ماندگارشده | دقیقاً ۱ (برای کاندید یکسان)؛ دقیقاً ۲ (برای دو کاندید مجزا در تست مخلوط) |
| تعداد Event ID یکتای بازگردانده‌شده به Callerها | ۱ |
| تعارض کنترل‌نشده‌ی DB | صفر |
| پایگاه‌داده | PostgreSQL 16 واقعی (Docker `mlino-v1-local-db`) — بدون Mock |
| Flaky بودن | خیر — سه بار اجرای مستقل، هر بار سبز |

## ۵. R2 — اعتبارسنجی زمان اجرای IC-13

**وضعیت: رفع‌شده و تأیید‌شده.**

بررسی‌های الزامی و صریح IC-13 §5 (producer، domain_tag، core_entity_refs، payload کامل) حفظ شدند. یک ماژول جدید (`candidate-structural-validator.ts`) بررسی نوع/enum/شکل کامل envelope و payload را اضافه کرد.

**CONTRACT UNDERSPECIFICATION رسمی:** `materiality_score` — هیچ سند مرجعی (Kernel، ADR-00AD، CONTRACTS.md) بازه‌ی عددی برایش تعریف نکرده (برخلاف `confidence_level` که `[0,1]` صریحاً در CONTRACTS.md خط ۳۲ آمده). این رفع **هیچ بازه‌ای برای materiality_score حدس نزد** — فقط نوع (عدد متناهی) را بررسی می‌کند. تست صریح «does NOT reject an out-of-[0,1] materiality_score» این را تضمین می‌کند.

**یافته‌ی جانبی کشف‌شده:** نوشتن ردیف `AdmissionObservability` برای کاندیدهای بدشکل خودش با خطای Prisma کنترل‌نشده شکست می‌خورد (چون فیلدهای کاندید بدشکل مستقیماً پاس داده می‌شدند). رفع شد (`safeString`/`safeJsonObject` در `event-admission.service.ts`).

## ۶. R3 — یکپارچگی هدف Amendment

**وضعیت: رفع‌شده و تأیید‌شده.**

بررسی (ه) تقویت شد: هدف Amendment/Retraction اکنون باید (i) از نوع `OCCURRENCE` باشد، (ii) در همان خانواده‌ی `domain_tag` باشد — **به‌جز** `opportunity.interaction` که یک خانواده‌ی متقاطع مجاز است.

**باگ واقعی کشف‌شده حین توسعه:** نسخه‌ی اول بررسی تطابق دامنه، بدون استثنای بالا، تست idempotency موجود F-04 را شکست داد — چون رکورد تعامل (`domain_tag:'opportunity.interaction'`) یک Occurrence با دامنه‌ی متفاوت (`opportunity.capacity`) را هدف می‌گیرد. این رفتار، پس از بررسی کد `opportunity-feed.service.ts`، **صحیح و عمدی** تشخیص داده شد (تعامل باید بتواند روی هر خانواده‌ی تشخیص اعمال شود) و استثنا اضافه شد. این نمونه‌ی مستقیمی از «تست واقعی، فرض غلط را آشکار کرد» است — دقیقاً همان انضباطی که این اصلاح می‌طلبید.

هیچ مقدار جدیدی به `RejectionReasonCode` افزوده نشد؛ هر دو بررسی جدید از `OPPORTUNITY_CORRELATION_ID_INVALID` موجود استفاده می‌کنند.

## ۷. R4 — یکپارچگی evidence_refs

**وضعیت: اسکالیشن‌شده — بدون تغییر کد، طبق دستور صریح.**

پژوهش نشان داد این معانی (وجود evidence + تطابق سازمان) در هیچ سند مرجعی به‌عنوان بررسی زمان‌نوشتن الزامی نشده‌اند — فقط در سطح مدل تهدید (اعتماد به Producer + فیلتر AC-2 در لحظه‌ی خواندن) مطرح شده‌اند، و رجیستری گپ این حوزه را «کامل» اعلام کرده بود. طبق بند ۱۲ دستور («اگر پشتیبانی نمی‌شود، اختراع نکن؛ CCR بساز»)، `CONTRACT_CHANGE_REQUEST_EVIDENCE_INTEGRITY.md` نوشته شد. **کد `admission-validator.ts` هیچ بررسی‌ای روی evidence_refs ندارد — نه پیش از این تکلیف، نه پس از آن.**

## ۸. R5 — بازبینی هویت Opportunity

**وضعیت: بررسی‌شده، بدون حل کد — نتیجه: CONTRACT_CHANGE_REQUEST REQUIRED.**

جزئیات کامل در [[OPPORTUNITY_BUSINESS_SITUATION_IDENTITY_REVIEW.md]]. خلاصه: هیچ کلید طبیعی («هویت وضعیت کسب‌وکار») مستقل از `unique_key`/`id` وجود ندارد؛ آرزوی F-01 Phase 4B («تشخیص تکراری = Amendment») هرگز مکانیزم‌دار نشد؛ IC-13 Replay clause فقط حالت داده‌ی بدون‌تغییر را پوشش می‌دهد. F-01/F-02/F-03 هم‌چنان همیشه `OCCURRENCE` تولید می‌کنند — **بدون تغییر، بدون موتور Dedup ساخته‌شده** (طبق منع صریح بند ۱۶).

## ۹. R6 — بازبینی Actor/CoreEntity

**وضعیت: بررسی‌شده، بدون حل کد — نتیجه: UNRESOLVED — تصمیم محصول/معماری لازم است.**

جزئیات کامل در [[ACTOR_COREENTITY_CONTRACT_REVIEW.md]]. یافته‌ی کلیدی جدید: IC-13 §5 **منجمد** actor را از core_entity_refs عمومی به‌صورت صریح متمایز نگه داشته بود (`actor_ref?` به‌عنوان فیلد جداگانه) — چیزی که در بازبینی Wave 1 قبلی («ACTOR_COREENTITY_FINDING.md») دیده نشده بود. این تمایز، هر دو مدل A (رفتار فعلی) و B (تفکیک actor/subject) را قابل‌دفاع می‌کند، بدون یک برنده‌ی روشن. `CONTRACT_CHANGE_REQUEST_ACTOR_COREENTITY.md` دو مسیر را (بدون انتخاب) مستند کرد. **کد بدون تغییر ماند.**

## ۱۰. R7 — Fail-Closed JWT

**وضعیت: رفع‌شده و تأیید‌شده.**

Fallback ناامن حذف شد؛ بدون آن، `resolveActorContext`/`issueTokenForTesting` در نبود `MLINO_JWT_SECRET` بدون قید‌وشرط (نه فقط در تولید) پرتاب می‌کنند. تست‌ها راز را صریحاً از طریق `test/setup-env.ts` (بارگذاری‌شده با Jest `setupFiles`) تنظیم می‌کنند — جدا از کد تولیدی. AC-2 دوباره تعریف نشد؛ FP-03 هم‌چنان «سازگارساز فعلی»، نه خودِ AC-2.

## ۱۱. تغییرات دیتابیس

**صفر.** بدون Migration جدید. Constraint یکتایی لازم برای R1 از قبل در `prisma/schema.prisma` وجود داشت.

## ۱۲. تغییرات وابستگی

**صفر.** هیچ بسته‌ی جدیدی نصب نشد. R1 از `Prisma.PrismaClientKnownRequestError` موجود در `@prisma/client` استفاده کرد؛ R2/R3 صرفاً TypeScript دستی هستند.

## ۱۳. بازبینی امنیتی پس از اصلاح

| حوزه | نتیجه |
|---|---|
| جداسازی Tenant | تأیید‌شده — هر بررسی جدید (R1/R2/R3) صریحاً `organization_id` را رعایت می‌کند؛ تست‌های cross-tenant جدید (R3) این را مستقیماً می‌آزمایند |
| Evidence بین‌سازمانی | **هنوز محافظت‌نشده** — طبق R4، عمداً اسکالیت‌شده، نه رفع‌شده |
| هدف Amendment بین‌سازمانی | **اکنون محافظت‌شده** (R3) |
| Fail-Closed JWT | **اکنون تأیید‌شده** (R7) |
| نوشتن مستقیم Event Log | بدون تغییر — هنوز فقط یک محل (`event-log.service.ts:54`) |
| دسترسی مستقیم Prisma از Feature | بدون تغییر — صفر مورد |
| ترتیب مجوز (AC-2 → intended_audience → actor-state) | بدون تغییر — دست‌نخورده در F-04 |
| جداسازی وضعیت actor | بدون تغییر — دست‌نخورده |

## ۱۴. بازبینی مرز Feature

F-01 هم‌چنان فقط هوش ظرفیت است؛ F-02 هم‌چنان فقط کنسلی/عدم‌حضور؛ F-03 هم‌چنان بدون پیام/تماس (تست موجود بدون تغییر)؛ F-04 هم‌چنان بدون تشخیص Opportunity (تست موجود بدون تغییر)؛ F-05 هم‌چنان AI اختیاری با Fallback الزامی PROFILE 0 (تست موجود بدون تغییر). **هیچ Feature گسترش داده نشد.**

## ۱۵. حفظ تست‌های موجود

هر ۳۷ تست Wave 1 اصلی **بدون تغییر ادعا** باقی ماندند. تنها فایل تست موجودی که لمس شد `auth-adapter.spec.ts` بود — فقط برای افزودن یک `describe` جدید در انتهای فایل (R7)؛ ۶ تست اصلی آن بدون تغییر خط سبز ماندند.

## ۱۶. تست‌های جدید

۲۶ تست جدید — ۲ (R1 همزمانی) + ۲۱ (R2 ماتریس نامعتبر + R3 یکپارچگی Amendment) + ۳ (R7 Fail-Closed). جزئیات کامل در [[WAVE_1_REMEDIATION_CHANGELOG.md]].

## ۱۷. اعتبارسنجی کامل

| بررسی | نتیجه |
|---|---|
| `npx tsc --noEmit -p tsconfig.json` | PASS — Exit 0 |
| `npx prisma validate` | PASS |
| `npx jest` (کامل، شامل تست‌های جدید) | PASS — ۹ Suite، ۶۳ تست، همگی موفق |
| بررسی Import بین‌Featureای | PASS — صفر مورد |
| بررسی دسترسی مستقیم Prisma خارج از foundation/ | PASS — صفر مورد |
| مسیر نوشتن Event Log | PASS — تنها یک محل تولیدی |
| نمونه‌سازی PrismaClient | PASS — تنها یک نمونه |
| بررسی رجیستری Producer (بدون تضعیف) | PASS — بررسی‌های `active`/`allowedDomainTags` دست‌نخورده |

## ۱۸. درخواست‌های تغییر قرارداد

۳ مورد: `CONTRACT_CHANGE_REQUEST_EVIDENCE_INTEGRITY.md` (R4)، `CONTRACT_CHANGE_REQUEST_OPPORTUNITY_IDENTITY.md` (R5)، `CONTRACT_CHANGE_REQUEST_ACTOR_COREENTITY.md` (R6). **هیچ‌کدام اعمال نشدند** — همگی در انتظار تصویب.

## ۱۹. درخواست‌های تغییر معماری

**صفر.** تحلیل هر سه یافته‌ی اسکالیت‌شده (R4/R5/R6) نشان داد راه‌حل‌های پیشنهادی می‌توانند بدون تغییر Kernel/ADR/IC (سطح منجمد) در سطح Phase 4A/4B/Feature Package حل شوند — بنابراین هیچ ARCHITECTURE_CHANGE_REQUEST لازم نبود.

## ۲۰. موانع باقی‌مانده

۳ مورد، هر سه مسدودکننده‌ی FP-02 (نه مسدودکننده‌ی این گزارش):
1. R4 — یکپارچگی evidence_refs (در انتظار تصویب CCR)
2. R5 — مکانیزم تشخیص‌مجدد وضعیت کسب‌وکار (در انتظار تصویب CCR)
3. R6 — معنای‌شناسی Actor/CoreEntity (در انتظار تصمیم محصول/معماری بین مدل A/B)

## ۲۱. توصیه‌ی آمادگی FP-02

**توصیه نمی‌شود مستقیماً به FP-02 برویم** تا R6 (Actor/CoreEntity) حل شود — چون FP-02 دقیقاً همان لایه‌ی Projection/IC-14 است که وضعیت actor را برای همیشه در `opportunity_interaction_state` ذخیره می‌کند؛ ساختن آن روی یک مدل هویت actor نامشخص، ریسک بازکاری گسترده دارد. R4 و R5 کم‌ریسک‌تر هستند و می‌توانند موازی با شروع FP-02 حل شوند. این توصیه‌ای است، نه تصمیم — تصمیم نهایی با بازبینی مرکزی است.
