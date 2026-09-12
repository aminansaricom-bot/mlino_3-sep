# MLINO Core Prisma Readiness Review

## Review Purpose

این گزارش برای ثبت وضعیت آمادگی پروژه MLINO پیش از تبدیل طراحی Core به `schema.prisma` تهیه شده است.

## Current Assessment

Status: **BLOCKED BEFORE SCHEMA IMPLEMENTATION**

طراحی مفهومی Core به مرحله‌ای رسیده که از نظر مرزبندی معماری آماده است، اما قبل از ایجاد Schema واقعی نیاز به بستن چند دروازه اجرایی وجود دارد.

## Confirmed Areas

- Core از Moduleها جدا شده است.
- Capability، Offer، Evidence و Publication در مالکیت Core قرار گرفته‌اند.
- Clinic Module فقط مسئول vocabulary، محتوای تخصصی، متخصص، ظرفیت و نوبت‌دهی است.
- Organization و Business Identity Claim از هم جدا هستند.
- Permission بر اساس Membership و Grant تعریف شده و Role منبع Permission نیست.
- Intent و Context در Persistence فاز اول ذخیره نمی‌شوند.

## Remaining Blockers

### 1. Branch Alignment

شاخه‌های توسعه هنوز به صورت کامل همگام نیستند و artefactهای لازم برای اجرای Prisma باید با مسیر نهایی پروژه هماهنگ شوند.

### 2. Foreign Key Policy

رفتار `ON DELETE` و `ON UPDATE` باید قبل از Migration نهایی مشخص شود.

پیشنهاد ثبت‌شده:

- ON DELETE RESTRICT
- ON UPDATE RESTRICT

برای حفظ تاریخچه و جلوگیری از حذف ناخواسته ارجاعات ممیزی.

### 3. Publication Consistency

رابطه بین `Publication` به عنوان منبع حقیقت و `publication_status` به عنوان projection باید در PostgreSQL اعتبارسنجی شود.

## Required Before schema.prisma

1. نهایی‌سازی تصمیم‌های باز در Handoff.
2. تأیید migration chain.
3. آماده‌سازی Prisma Client generation flow.
4. ثبت تصمیم FK و tenant isolation.
5. اطمینان از traceability اسناد معماری و تصمیم‌ها.

## Recommendation

تا قبل از بسته شدن موارد بالا، ایجاد `schema.prisma` و Migration واقعی انجام نشود.

پس از بسته شدن این موارد، مرحله بعد شامل طراحی Schema واقعی، تست PostgreSQL و Migration کنترل‌شده خواهد بود.

---

Generated for MLINO Architecture Review.
