# گزارش اصلاح مرز MVP ملینو

تاریخ: ۲۰۲۶-۰۹-۱۱
مبنای بازبینی: `C:\mlino code\_PUSH_STAGING\mlino_book\MLINO_MVP_BOUNDARY_REVIEW.md`، نسخهٔ ۲
وضعیت: **DOCUMENTATION_CORRECTED**

## دامنهٔ تغییر

فقط این سه سند در این تحویل اصلاح شدند:

- `mlino2/MLINO_FIRST_VERTICAL_MVP_SCOPE.md`
- `mlino2/MLINO_MVP_IMPLEMENTATION_ROADMAP.md`
- `mlino2/MLINO_MVP_BOUNDARY_CORRECTION_REPORT.md`

هیچ کد، Schema، API، Migration، قرارداد منجمد یا ADR تغییر نکرده است.

## اصلاحات اعمال‌شده

۱. MLINO صریحاً یک Platform چندVertical باقی ماند و Clinic فقط نخستین Module اجرایی معرفی شد.

۲. مالکیت معماری از Clinic Module به Core اصلاح شد:

- Capability به‌عنوان Entity و چرخهٔ عمومی؛
- Offer به‌عنوان Entity عمومی شامل نسخه، Scope، شرایط و بازهٔ اعتبار؛
- Evidence با جدایی provenance، confirmation و freshness؛
- Publication به‌عنوان Gate عمومی انتشار و پس‌گرفتن.

Clinic Module اکنون فقط vocabulary خدمات و درمان، محتوای کاتالوگ و Offer، Doctor/Specialist، روش راستی‌آزمایی صنفی، workflow نوبت‌دهی، آداپتور نوبت و منطق ظرفیت را مالک است.

۳. ترتیب اجرا اصلاح شد: Core و Clinic Module، سپس حلقهٔ ارزش کسب‌وکار V1 و بعد تجربهٔ مشتری V2. V2 تا قبل از وجود حلقهٔ V1 وارد مسیر مشتری نمی‌شود.

۴. معنای V2 برای Session، Permission و Consent در اسناد جدا شد تا با Session احرازشدهٔ Core، Membership Grant و R8-a اشتباه نشود.

۵. فرض «موجود بودن» Identity/Membership/Grant در V1 حذف شد؛ Phase 3 باید حداقل D-57 را آماده کند یا از Fixture صریح و برچسب‌خورده استفاده کند و راستی‌آزمایی هویت پیش از نخستین Publication را انجام دهد.

۶. چرخهٔ عمر Recommendation در roadmap با وضعیت‌های مصوب ADR-0008 هم‌راستا شد و `feedback` تا OD-01 مسدود باقی ماند.

۷. اصطلاح `Option` به‌عنوان Entity جدید پذیرفته نشد و در اسناد به Scope یا مصداق ثبت‌شدهٔ Capability/Offer ارجاع داده شد. دسته‌بندی V2 نیز باید از دادهٔ V1 و vocabulary ثبت‌شدهٔ Module بیاید.

## نتیجهٔ اعتبارسنجی

- Scope MVP تغییر نکرد؛ فقط مالکیت و ترتیب اجرا دقیق شد.
- معماری Core/Module و مرز V1/V2 تغییر نکرد.
- ADR-0001 تا ADR-0012 تغییر نکردند.
- هیچ پیاده‌سازی، Matching activation، V1 connection یا persistence جدیدی انجام نشد.
- این تحویل مستنداتی است و تست نرم‌افزاری لازم ندارد؛ بررسی نهایی با `git diff` و فهرست فایل‌ها انجام می‌شود.

## نتیجه

وضعیت اصلاح مرز: **آماده برای بازبینی مستنداتی و سپس اجرای مرحله‌ای**.

من کدکس هستم
