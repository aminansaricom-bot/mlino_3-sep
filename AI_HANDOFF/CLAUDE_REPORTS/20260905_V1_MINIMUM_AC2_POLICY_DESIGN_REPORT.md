HANDOFF_ID: HANDOFF-20260905-AC2-MIN-POLICY-DESIGN
AUTHOR: CLAUDE
PHASE: V1_MINIMUM_AC2_ACCESS_POLICY_DESIGN
STATUS: DELIVERED_AWAITING_INDEPENDENT_REVIEW
DELIVERABLE_PATH: C:\mlino code\V1_MINIMUM_AC2_ACCESS_POLICY.md
DELIVERABLE_SHA256: 3f49e91d053325f15ee54d5cd2316ed08893891bd7a5a7c33a904facacfde4bf

---

# گزارش — طراحی سیاست حداقلی AC-2 برای V1 (فقط طراحی، بدون کد Adapter)

## ۱. مجوز این پاس

**این پاس طبق دستور مستقیم و مکتوب مالک محصول در چت اجرا شد، نه از طریق فایل `CODEX_NEXT_INSTRUCTION.md` و چرخه‌ی رسمی ممد.** مالک محصول یک طراحی بسیار دقیق و کامل از ساختار مطلوب سند (۷ بخش + جدول‌های الزامی) ارائه داد و صراحتاً «گزینه‌ی چهارم» را به‌عنوان مسیر تایید‌شده اعلام کرد (`APPROVED DIRECTION: MINIMUM V1 AC-2 POLICY DESIGN BEFORE IMPLEMENTATION`). طبق الگوی صداقتی این پروژه، این انحراف از چرخه‌ی رسمی صریحاً ثبت می‌شود — نه پنهان.

## ۲. چه چیزی تحویل داده شد

`V1_MINIMUM_AC2_ACCESS_POLICY.md` — یک سند طراحی خالص، دقیقاً طبق ۷+۱ بخش درخواستی مالک محصول:

۰. زمینه‌ی فنی واقعی (بازخوانی مستقیم کد: `ac2-decision-port.ts`، `access-candidate.ts`، `auth-adapter.ts`، `shared-contracts/types.ts`، `prisma/schema.prisma`، `opportunity-read.service.ts`) — نه فرض، بلکه بازخوانی واقعی.
۱. جدول ورودی‌های تصمیم + وضعیت در‌دسترس‌بودن امروز هرکدام.
۲. سیاست حداقلی ۱۰‌قاعده‌ای، رسمی‌سازی‌شده.
۳. تفکیک دو‌سطحی Opportunity/Evidence + تصمیم صریح: بدون نمای Redacted رسمی، کل Candidate باید Deny شود (نه فقط حذف Evidence).
۴. سوال باز اصلی (Consumer، نیاز Consent برای مصرف داخلی) — **صریحاً بدون پاسخ گذاشته شد**، طبق دستور.
۵. فهرست زیرساخت کامل Consent به‌عنوان GAP آینده.
۶. برنامه‌ی تست الزامی (۱۷ سناریو).
۷. ده خروجی الزامی (Policy Matrix، تعریف Actor/Resource/Ownership/Consumer، داده‌های موجود/ناموجود، اثر بر قراردادهای منجمد، تشخیص CCR در برابر Implementation Design، مدل Fail-closed، برنامه‌ی تست، فهرست GAP، Scope پیشنهادی پیاده‌سازی).

## ۳. یافته‌های صادقانه‌ی مهم (نه صرفاً تکرار خواسته‌ی دستور)

- بازخوانی کد نشان داد **هیچ فیلد مالکیت یا رضایتی در هیچ‌کدام از `EventLog`، `OpportunityCurrentState`، `CoreEntity`، یا `EvidenceRef` امروز وجود ندارد** — یعنی اگر ماتریس ۱۰‌قاعده‌ای دقیقاً روی داده‌ی واقعی امروز اعمال شود، طبق قاعده‌ی ۳ (مالکیت نامشخص → Deny)، **همه‌چیز فعلاً Deny می‌شود**. این پیامد در خودِ سند صریح ثبت شد، نه پنهان.
- Tenant Isolation (بین‌سازمانی) از قبل و مستقل از AC-2 در سطح Query انجام می‌شود (`organizationId: actor.organization_id` در خودِ `findMany`) — یعنی ارزش واقعی AC-2 دقیقاً همان لایه‌ی درون‌سازمانی (مالکیت/رضایت فردی) است که این سند به آن پرداخته، نه تکرار Tenant Isolation.
- پیاده‌سازی کامل این سیاست (افزودن فیلد مالکیت) به `prisma/schema.prisma` و `shared-contracts/types.ts` دست می‌زند — **هر دو منجمد** — یعنی گام بعدی نیازمند یک CCR رسمی است، نه صرفاً یک Implementation Design ساده. این تشخیص در بخش ۷.۶ سند ثبت شده، با این پیشنهاد که به‌احتمال زیاد سطح CCR کافی است (نه ACR کامل)، چون Kernel §۱۰/§۱۱ از قبل این مفاهیم را به‌رسمیت شناخته.

## ۴. آنچه انجام نشد (طبق قید صریح دستور)

- هیچ کد Adapter واقعی نوشته نشد.
- هیچ تغییری در Kernel، Shared Contract، `AC2DecisionPort`، یا هر فایل کد دیگر.
- هیچ Consent جعلی/ضمنی پیشنهاد نشد.
- سوال «Consumer دقیقاً چیست؟» و «آیا مصرف داخلی نیاز به Consent صریح دارد؟» عمداً بدون پاسخ ماند — تصمیم محصولی/حقوقی، نه چیزی که من اختراع کنم.

## ۵. اقدام بعدی

**متوقف می‌شوم.** طبق دستور مالک محصول، بعد از آماده‌شدن این سند و بازبینی مستقل (ممد)، درباره‌ی مجوز کدنویسی Adapter واقعی تصمیم گرفته می‌شود. تا آن زمان: Mock همیشه‌مجاز فقط در Test/Development باقی می‌ماند؛ استفاده در Production ممنوع است؛ هیچ فاز جدیدی شروع نمی‌شود.
