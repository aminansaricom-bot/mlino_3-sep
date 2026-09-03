# نقشه‌ی بازبینی FP-03 (سازگارساز مجوز)

> **یادداشت پاس اصلاح/Contract Resolution:** دو تغییر پس از بسته‌بندی اولیه اعمال شده: (۱) R7 — حذف Fallback ناامن `JWT_SECRET`؛ اکنون بدون `MLINO_JWT_SECRET` صریح، Fail-Closed می‌شود (`AuthenticationError`). (۲) R6 — فیلد خروجی `ActorContext` از `actor_core_entity_id` به `actor_id` تغییرنام یافت (claim JWT هم همین‌طور) تا هویت Actor از هویت CoreEntity موضوعی متمایز شود؛ FP-03 هم‌چنان هیچ بررسی CoreEntity انجام نمی‌دهد (بدون تغییر). جزئیات: [[remediation/WAVE_1_SURGICAL_REMEDIATION_REPORT.md]]، [[CONTRACT_RESOLUTION/R6_ACTOR_SUBJECT_CONTRACT_CHANGE.md]].

## مسیر فایل

`foundation/auth-adapter/auth-adapter.ts` (تنها فایل این مؤلفه؛ بدون فایل کمکی جداگانه).

## نکته‌ی صریح ثبت‌شده در کد (خطوط ۴–۱۹)

> «AC-2 ≠ this file. This is a *current* adapter wrapping JWT verification into the ActorContext shape... If the underlying auth mechanism ever changes... only this file changes.»

یعنی خودِ فایل صراحتاً می‌گوید **این پیاده‌سازی AC-2 نیست، بلکه سازگارساز فعلی آن است** — دقیقاً طبق دستور این بازبینی که این تمایز باید حفظ شود.

## تأیید هویت (JWT)

`resolveActorContext(bearerToken)`:
1. اگر توکن نباشد → `AuthenticationError('missing bearer token')` (خط ۴۲–۴۴)
2. `jwt.verify(bearerToken, JWT_SECRET)` — شکست (امضای نامعتبر/منقضی) → `AuthenticationError('invalid or expired token')` (خط ۴۶–۵۰)
3. غیبت هرکدام از `organization_id`/`actor_core_entity_id`/`role` → `AuthenticationError('malformed token claims')` (خط ۵۱–۵۳)
4. `role` خارج از دو مقدار مجاز → `AuthenticationError('unrecognized role claim')` (خط ۵۴–۵۶)

خروجی موفق: `ActorContext { organization_id, actor_core_entity_id, role }` — دقیقاً همان نوع مشترک.

## استخراج ادعا (Claims) و رزولوشن سازمان/actor

استخراج مستقیم و بدون پردازش اضافی از payload توکن decode‌شده است؛ هیچ Query دیتابیسی در این فایل انجام نمی‌شود — یعنی FP-03 به‌تنهایی وجود actor به‌عنوان CoreEntity را بررسی **نمی‌کند** (این بررسی در FP-01 رخ می‌دهد، طبق [[ACTOR_COREENTITY_FINDING.md]] بند A/B).

## نگاشت به AC-2

فایل خروجی خود را دقیقاً به شکل `ActorContext` (قرارداد مشترک) برمی‌گرداند که هر Feature (F-01 تا F-05) آن را به‌عنوان ورودی actor مصرف می‌کند. هیچ تصمیم مجوزدهی فراتر از تأیید صحت توکن و شکل claim ها در این فایل گرفته نمی‌شود — تفویض تصمیم نهایی AC-2 به لایه‌های بالادست (Governance واقعی) باقی مانده، دقیقاً طبق کامنت خط ۴–۱۹.

## رفتار شکست

هر سه نوع شکست (بدون توکن، توکن نامعتبر/جعلی، claim ناقص/نقش نامعتبر) یک `AuthenticationError` پرتاب می‌کند — کلاس یکسان برای همه، تفکیک فقط از طریق پیام. یک کلاس دوم `AuthorizationError` نیز صادر شده اما در این فایل **هرگز پرتاب نمی‌شود** — رزرو شده برای لایه‌ی بالادستی که تصمیم مجوز واقعی (فراتر از تأیید هویت) را می‌گیرد.

## تست‌های امنیتی (۶/۶ — `test/foundation/auth-adapter.spec.ts`)

توکن معتبر → ActorContext درست؛ رد توکن غایب؛ رد توکن دستکاری‌شده/نامعتبر؛ رد توکن امضاشده با راز اشتباه (محافظت جعل/چند‌مستأجری)؛ رد نقش ناشناخته؛ رد claim ناقص.

## فرض‌های وابستگی به Legacy

طبق کامنت خط ۱۴–۱۸: این سازگارساز عمداً **هنوز به `JWT_SECRET` واقعی Malino متصل نشده** — رازی محلی و قابل‌پیکربندی (`MLINO_JWT_SECRET`, پیش‌فرض `dev-only-insecure-secret-change-me`) استفاده می‌شود. اتصال واقعی به میان‌افزار موجود Malino (`src/middleware/auth.js` معادل) یک گام یکپارچگی جداگانه و بازبینی‌شده برای Wave 2+ است — **در این بسته پیاده‌سازی نشده، به‌عمد.**
