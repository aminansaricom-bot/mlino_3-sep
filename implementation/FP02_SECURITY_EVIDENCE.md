# FP02_SECURITY_EVIDENCE.md

## ۱. Fail-Closed بودن AC-2 — شواهد مستقیم

چهار حالت شکست ممکن برای `AC2DecisionPort` به‌صورت جداگانه تست و تایید شدند که همگی به `deny` منجر می‌شوند، هرگز به `allow` تصادفی:

1. **Port در دسترس نیست (throw می‌کند)** → `opportunity-read.spec.ts::"AC-2 Port throws (unavailable): fails closed"` — PASS.
2. **Port آرایه‌ی خالی برمی‌گرداند (تصمیمی برای هیچ کاندیدایی نیست)** → `"AC-2 Port returns no decision for the candidate: fails closed"` — PASS.
3. **Port صراحتاً `access: 'deny'` برمی‌گرداند** → `"AC-2 deny: the Opportunity is dropped from both getById and the Feed"` — PASS.
4. **کاندیدا اصلاً `subject_core_entity_refs` ندارد** → deny **بدون فراخوانی Port** (کمینه‌سازی سطح حمله) → `"empty subject_core_entity_refs denies WITHOUT ever calling the Port"` — PASS، با شاهد `port.calls.length === 0`.

## ۲. ترتیب اجرای AC-2 نسبت به سایر فیلترها

تست `"AC-2 is evaluated before intended_audience filtering"` با شاهد مستقیم (`port.calls[0].candidates.length === 2`، شامل یک Opportunity با `intended_audience: 'owner_manager'` و یکی با `'receptionist_coordinator'`) ثابت می‌کند AC-2 روی مجموعه‌ی کامل Tenant اجرا می‌شود، **قبل از** آنکه `intended_audience` مجموعه را محدود کند — دقیقاً مطابق توالی هفت‌مرحله‌ای الزامی IC-14.

## ۳. عدم نشت Evidence

- **تزریق Ref بیگانه توسط Port** (شبیه‌سازی یک Governance Adapter معیوب یا مخرب که Refای خارج از `evidence_refs` خودِ کاندیدا برمی‌گرداند) → به‌صورت خاموش حذف می‌شود، هرگز به مصرف‌کننده نمی‌رسد → `"a Port-injected foreign EvidenceRef ... is silently dropped, never returned"` — PASS.
- **زیرمجموعه‌سازی صحیح**: وقتی Port فقط زیرمجموعه‌ای از Evidence را مجاز می‌کند، DTO خروجی دقیقاً همان زیرمجموعه را نشان می‌دهد، نه کل مقدار ذخیره‌شده → `"evidence_refs in the DTO is exactly the AC-2-authorized subset"` — PASS.

## ۴. جلوگیری از Existence-Oracle

`getOpportunityById` برای چهار حالت مجزا (id واقعاً ناموجود، id متعلق به سازمان دیگر، AC-2 deny، عدم تطابق audience) دقیقاً همان مقدار `null` را برمی‌گرداند — بدون هیچ کد خطا یا پیام متمایزکننده. تست مستقیم: `"by-id returns null identically for a truly nonexistent id and a wrong-org id (no existence oracle)"` — PASS.

**محدودیت صادقانه (بدون ادعای بیش‌ازحد):** هیچ ادعای Timing-Safety یا Constant-Time درباره‌ی این پیاده‌سازی نمی‌شود (مطابق اصلاح صریح فاز 5B.3) — فقط یکسانی مقدار بازگشتی و کد خطا تضمین می‌شود، نه زمان پاسخ.

## ۵. بازتایید ۴ تست SECURITY الزامی F-04 در برابر پیاده‌سازی واقعی

طبق الزام صریح دستور، این چهار تست که پیش‌تر فقط با `MockIC14ReadInterface` اثبات شده بودند، اکنون عیناً با `OpportunityReadService` واقعی (پشت یک `FakeAC2DecisionPort` با تصمیم پیش‌فرض allow-همه، تا فقط رفتار Feed/Tenant/Audience/Actor-State سنجیده شود، نه AC-2) بازاجرا و تایید شدند:

| تست | نتیجه با Mock (از پیش) | نتیجه با پیاده‌سازی واقعی (این فاز) |
|---|---|---|
| SECURITY 1 — عدم نشت بین‌سازمانی حتی با حدس id | PASS (بدون تغییر) | PASS — `"SECURITY 1 (real impl)"` |
| SECURITY 2 — receptionist هرگز Opportunity مخصوص owner_manager را نمی‌بیند | PASS (بدون تغییر) | PASS — `"SECURITY 2 (real impl)"` |
| SECURITY 3 — انزوای Tenant حتی برای audience:'both' | PASS (بدون تغییر) | PASS — `"SECURITY 3 (real impl)"` |
| SECURITY 4 — انزوای کامل وضعیت تعامل بین دو actor | PASS (بدون تغییر) | PASS — `"SECURITY 4 (real impl)"` |

فایل تست Mock موجود (`test/feed/opportunity-feed.spec.ts`) عیناً دست‌نخورده باقی ماند — هیچ تستی از آن حذف یا تضعیف نشد؛ بازتایید بالا در یک فایل تست **جدید و جداگانه** (`test/foundation/opportunity-read/opportunity-read.spec.ts`) انجام شد.

## ۶. Tenant Isolation در سطح Query

فیلتر `organizationId` در همان کوئری اولیه‌ی Prisma (`prisma.opportunityCurrentState.findMany({ where: { organizationId: actor.organization_id, ... } })`) اعمال می‌شود — یعنی ردیف‌های متعلق به سازمان دیگر حتی به حافظه هم بارگذاری نمی‌شوند، نه‌اینکه بعداً فیلتر شوند. این با تست‌های `SECURITY 1` و `SECURITY 3` (نسخه‌ی واقعی) و همچنین `"by-id denies cross-tenant access"` تایید شد.

## ۷. جمع‌بندی وضعیت امنیتی

هیچ یافته‌ی امنیتی جدید یا بازگشتی این فاز شناسایی نشد. تمام مسیرهای Fail-Closed، عدم‌نشت Evidence، انزوای Tenant/Audience/Actor-State، و جلوگیری از Existence-Oracle با تست مستقیم روی Postgres واقعی اثبات شدند.
