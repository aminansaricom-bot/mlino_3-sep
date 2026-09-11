# گزارش اصلاحات مدل دادهٔ Core MLINO

تاریخ: ۲۰۲۶-۰۹-۱۱
نقش: MLINO Data Model Specification Maintainer
وضعیت: **مستندات اصلاح شد؛ پیاده‌سازی انجام نشد**

## مبنا

این گزارش اصلاحات خواسته‌شده در `MLINO_CORE_DATA_MODEL_FINAL_REVIEW.md` را برای سند زیر ثبت می‌کند:

- `mlino2/MLINO_CORE_FOUNDATION_IMPLEMENTATION_SPEC.md`
- مبنای بررسی اعلام‌شده: `edabffa` — `docs: align core foundation spec with approved boundaries`

متن ADRها و تصمیم‌های معماری تغییر نکرده است. این پاس هیچ شِما، Migration، کد یا API ایجاد یا اصلاح نکرد.

## اصلاحات اعمال‌شده

### ۱. جداسازی Organization و Business Identity Claim

- `Organization` به‌عنوان هویت داخلی و پایدار سازمان تعریف شد.
- `BusinessIdentityClaim` به‌عنوان ادعای جداگانهٔ اتصال Organization به کسب‌وکار واقعی ثبت شد.
- برای Claim، `identifier_type` از واژگان ثبت‌شده و `identifier_value` نرمال‌شده اضافه شد.
- چرخهٔ مفهومی Verification ثبت شد: `submitted → under_review → verified / rejected / expired / revoked`.
- قید یکتایی مفهومی برای جفت `(identifier_type, identifier_value)` در Claim راستی‌آزمایی‌شده و فعال ثبت شد.
- محدودیت این قید نیز صریح شد: دو نوع شناسهٔ متفاوت به‌تنهایی معادل‌بودن دو کسب‌وکار را ثابت نمی‌کنند.
- راستی‌آزمایی Claim همچنان Permission یا اختیار حکمرانی ایجاد نمی‌کند.

### ۲. Membership و هویت خارجی

- Membership اکنون به `(identity_provider, external_subject)` ارجاع می‌دهد.
- Core هیچ User داخلی، گذرواژه یا Credential نگه نمی‌دارد.
- سازوکار صادرکنندهٔ نهایی به OD-08 وابسته باقی ماند و تصمیم تازه‌ای ساخته نشد.

### ۳. Permission قابل‌گسترش

- کلید Permission به‌صورت رشتهٔ ثبت‌شده و قابل‌گسترش تعریف شد، نه Enum بستهٔ دیتابیس.
- Registry می‌تواند کلیدهای Core و در آینده کلیدهای فضانام‌دار Module را نگه دارد.
- Role همچنان هرگز منشأ Permission نیست و هیچ Grant به‌صورت ضمنی از Role ساخته نمی‌شود.

### ۴. Publication و دادهٔ لازم برای V2

- نام، توضیح کوتاه، `category_key`، شکل Offer، شرایط، قیمت یا `on_request` و بازهٔ اعتبار به‌عنوان دادهٔ عمومی قرارداد Core/Published تعریف شد.
- Core برای ساخت Published Read Port جدول Module را نمی‌خواند.
- وضعیت جاری انتشار فقط روی بُعد انتشار Capability/Offer منبع حقیقت است.
- Publication فقط Gate و سابقهٔ ممیزی افزایشی است و منبع حقیقت وضعیت جاری دوم محسوب نمی‌شود.

### ۵. مالکیت Evidence

- هر Evidence دقیقاً یک مالک تایپ‌شده از میان Capability یا Offer دارد.
- استفاده از مالک آزاد `owner_type + owner_id` ممنوع شد.
- شاهد راستی‌آزمایی هویت در سابقهٔ Verification خود Claim می‌ماند و وارد Evidence عمومی نمی‌شود.
- روش اجرای فیزیکی این قاعده به‌صورت ارجاع‌های تایپ‌شده یا جدول‌های پیوند جدا، برای CCR Persistence آینده، ثبت شد.

### ۶. حذف اشیای runtime از Persistence Core

- `Session`، `assistant conversation context`، `Intent` و `Context` از موجودیت‌های پایدار Core جدا شدند.
- این اشیا فقط در بخش runtime تعریف می‌شوند و در Phase 1 جدول، Entity پایدار یا رکورد بلندمدت ندارند.
- روابط آن‌ها از فهرست روابطی که Persistence آینده باید ذخیره کند خارج و در بخش روابط runtime ثبت شد.

## کنترل‌های انجام‌شده

- دامنهٔ اصلاح به دو سند مستنداتی محدود است: مشخصات Core و همین گزارش.
- هیچ فایل کد، شِما، Migration، API یا ADR برای این اصلاحات تغییر نکرد.
- بخش‌های ممنوعیت Core schema به‌روزرسانی شد تا User داخلی، مالکیت چندریختی Evidence، خواندن جدول Module و نبود Published data لازم برای V2 را صریحاً رد کند.
- مسیر اجرای بعدی به دو CCR جدا تفکیک شد: CCR اول برای هویت/اختیار/حقیقت کسب‌وکار و CCR دوم برای Recommendation v1.1 و `ActionRecord`.

## مواردی که عمداً باز ماندند

- واژگان نهایی `identifier_type` و روش راستی‌آزمایی هر صنف باید در قرارداد و Governance مربوط تعیین شود.
- صادرکنندهٔ نهایی هویت خارجی Membership طبق OD-08 هنوز تصمیم‌نشده است.
- محل فیزیکی Storage و شکل نهایی Published Projection طبق D-71 در این سند انتخاب نشده است.
- هیچ منطق runtime، Persistence، Migration یا API برای اجرای این مدل در این پاس ساخته نشده است.

من کدکس هستم
