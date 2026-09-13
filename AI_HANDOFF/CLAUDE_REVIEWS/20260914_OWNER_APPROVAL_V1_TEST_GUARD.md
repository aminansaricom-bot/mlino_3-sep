# ثبت تصمیم مالک — محافظ سراسری آزمون‌های V1 پیش از G10c

**تاریخ:** ۱۴ سپتامبر ۲۰۲۶
**ثبت‌کننده:** Claude Opus 5 — MLINO Architecture Guardian

**تصمیم‌گیرنده:** مالک محصول. مالک پیام تصمیم را خودش در گفت‌وگوی مستقیم با Claude فرستاد. متن آن پیام را Codex نوشته بود و مالک همان را بازارسال کرد:
1. «ابتدا محافظ سراسری تست‌های V1 در `test/setup-env.ts` اجرا شود.»
2. «پس از بازبینی و تأیید آن، G10c برای Profile و Capability آغاز شود.»

این پیام در پاسخ به بخش ۵ بازبینی `20260914_CLAUDE_REVIEW_G11B_CORE_SERVICE_MERGE.md` آمد (commit `7f278d0`).

**عبارت رسمی:** V1 global test guard (G12a) authorized; G10c to follow only after the guard is reviewed and approved.

## آنچه مجاز شد

**فقط G12a:** دستور `CODEX-20260914-G12A-V1-TEST-DB-GUARD-001`، شامل:
- یک CCR کوچک V1 در وضعیت DRAFT
- پیاده‌سازی محافظ روی شاخه‌ی تازه‌ی `codex/v1-test-guard` که از `origin/main` ساخته می‌شود
- آزمون روی پایگاه یک‌بارمصرف

## آنچه مجاز نشد

- **ادغام G12a در main:** پس از بازبینی نگهبان، یک تأیید کوتاه از مالک گرفته می‌شود.
- **G10c:** پس از بسته شدن G12a، تصویب جدای مالک لازم است.
- هر تغییر در schema، migration، `types.ts`، package، `jest.config.js`، `docker-compose` یا کد V1 جز فایل‌های محدود G12a.

من کلاد هستم
