# گزارش اصلاح مشخصات Foundation هستهٔ MLINO

تاریخ: ۲۰۲۶-۰۹-۱۱
مبنای بازبینی: `C:\mlino code\_PUSH_STAGING\mlino_book\MLINO_CORE_FOUNDATION_FINAL_REVIEW.md`
سند اصلاح‌شده: `MLINO_CORE_FOUNDATION_IMPLEMENTATION_SPEC.md`
وضعیت: **DOCUMENTATION_CORRECTED**

## اصلاحات اعمال‌شده

۱. **تفکیک Organization از هویت کسب‌وکار:**

- `Organization` فضای کاری و هویت متعارف V1 است.
- `BusinessIdentityClaim / Verification` رکورد جداگانهٔ ادعای نمایندگی یک کسب‌وکار واقعی است.
- یک Organization می‌تواند چند Claim داشته باشد؛ حداکثر یک Claim راستی‌آزمایی‌شدهٔ فعال برای هر کسب‌وکار واقعی مجاز است.
- راستی‌آزمایی هویت مالکیت حقوقی یا Permission ایجاد نمی‌کند.
- Publication Gate به Claim راستی‌آزمایی‌شدهٔ فعال نگاه می‌کند، نه به Organization به‌تنهایی.

۲. **اصلاح Capability:**

Capability دیگر با یک lifecycle status واحد توصیف نشده است. چهار بُعد مستقل آن ثبت شد:

- توانایی: `planned`، `active`، `retired`؛
- مخاطب: `internal`، `customer_facing`؛
- تأیید: طبق ADR-0006 و با `confirmedBy`؛
- انتشار: `unpublished`، `published`، `withdrawn`.

هم‌زمانی `active + unpublished` معتبر است و `withdrawn` با `retired` یا دسترس‌پذیری لحظه‌ای یکی نیست.

۳. **کامل‌شدن Publication Gate:** پنج پیش‌شرط D-52 و پیش‌شرط ششم D-61 ثبت شدند. برای Offer نیز انتشار همهٔ Capabilityها و Offerهای ارجاع‌شده، آبشار پس گرفتن و ممنوعیت انتشار خودکار نسخهٔ تازه تصریح شد.

۴. **اصلاح Permission:**

- Permission فقط از Membership فعال به‌اضافهٔ Permission Grant فعال روی همان Membership می‌آید.
- Role هرگز منشأ Permission نیست.
- `ActorContext.role` در بررسی اجازه خوانده نمی‌شود.
- مسیرهای اعطای مصوب `founding`، `member_grant`، `designated_succession` و `ownership_recovery` ثبت شدند.
- `ADMIN_ACTION` هرگز مبنای اعطای Permission نیست.
- حداقل شش Permission انتشار و Permission جداگانهٔ D-61 برای درخواست/رهاسازی Claim ثبت شد.

۵. **اصلاح مرز Intent:**

Intent به assistant conversation context و وضعیت session-only گفت‌وگوی دستیار تعلق دارد و برای شروع گفت‌وگوی مشتری به Session احرازشدهٔ Core وابسته نیست. Session احرازشده فقط در مسیر عضو احرازشدهٔ V1 و به‌صورت اختیاری وارد زنجیره می‌شود.

۶. **حذف Consent Persistence از Phase 1:**

- `Consent` در فهرست مفهومی به‌صورت deferred تا OD-01 باقی مانده است.
- هیچ Entity، جدول، ذخیره یا چرخهٔ پایدار Consent در Phase 1 طراحی نمی‌شود.
- رضایت انتشار همان عمل انتشار عضو مجاز برای شیء مشخص است.
- رضایت آغاز گفت‌وگو فقط session-only است.
- مدل Consent داده‌ای پس از تصمیم OD-01 طراحی خواهد شد.

## اعتبارسنجی

- فقط `MLINO_CORE_FOUNDATION_IMPLEMENTATION_SPEC.md` و این گزارش تغییر کرده‌اند.
- هیچ کد، Schema، Migration، API عملیاتی یا ADR تغییر نکرده است.
- مسیرهای Content Studio، V2 Business Truth، EventLog و فایل‌های منجمد دست‌نخورده مانده‌اند.
- این تحویل فقط مستنداتی است؛ تست نرم‌افزاری اجرا نشد.
- فایل هدف از نظر `git diff --check` و نبود تغییر در مسیرهای محافظت‌شده بررسی شد.

## نتیجه

مشخصات Core Foundation با اصلاحات C1 تا C6 بازبینی نهایی هم‌راستا شد و برای بازبینی مستنداتی بعدی آماده است. این گزارش مجوز اجرای کد، طراحی شِما یا ایجاد Migration نیست.

من کدکس هستم
