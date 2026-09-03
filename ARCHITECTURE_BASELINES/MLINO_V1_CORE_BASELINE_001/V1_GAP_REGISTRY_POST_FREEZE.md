# رجیستری گپ رسمی V1 — پس از انجماد (فاز ۳D)

**وضعیت: FORMALLY FROZEN.** این نسخه‌ی رسمی و نهایی رجیستری گپ است، جایگزین [V1_GAP_REGISTRY_AFTER_3B.md](V1_GAP_REGISTRY_AFTER_3B.md) و [PHASE_3C_FREEZE_CANDIDATE/V1_GAP_REGISTRY_AFTER_3C.md](PHASE_3C_FREEZE_CANDIDATE/V1_GAP_REGISTRY_AFTER_3C.md) (هر دو محفوظ، نه حذف‌شده، طبق دستور صریح بخش ۱۱ فاز ۳D: «هرگز گپ‌های تاریخی را پاک نکن»).

---

## گپ‌های بسته‌شده توسط این انجماد

| شناسه | توضیح اصلی | وضعیت قبلی | وضعیت نهایی | مرجع بستن | مستند/ADR/IC | محدودیت باقی‌مانده | طبقه‌بندی |
|---|---|---|---|---|---|---|---|
| **G3** | پرچم Materiality — تولیدکننده مشخص نیست | باز (فاز ۱–۳B) | **CLOSED** | ADR-00AD | `governance/ADR-00AD-Opportunity-Producer-And-Materiality.md`؛ IC-13 | آستانه‌ی دقیق سرکوب هنوز باز (پیاده‌سازی) | V1 |
| **PA-01** | معنایی تولید Opportunity در V1 | باز (فاز ۲–۳B) | **CLOSED** | ADR-00AC | `governance/ADR-00AC-Opportunity-Architecture.md` | سیاست فشرده‌سازی بلندمدت (پیاده‌سازی) | V1 |
| **PA-02** | مسیریابی Context نقش‌آگاه | باز (فاز ۲–۳B) | **CLOSED** | ADR-00AE | `governance/ADR-00AE-Role-Aware-Opportunity-Delivery.md`؛ IC-14 | افزودن Doctor/Professional (تصمیم محصولی آینده) | V1، توسعه‌پذیر به V1.x |
| **PA-06** | قرارداد اطمینان/توضیح Opportunity | باز (فاز ۲) | **CLOSED** | ADR-00AC (بازاستفاده از Resolution Trace، §۱۷) | `opportunity_architecture/OPPORTUNITY_ARCHITECTURE_SPEC_v2.md` بند L | هیچ | V1 |
| **PA-09** | تداخل واژگانی «Opportunity» بین V1/V2 | باز (فاز ۲) | **CLOSED** | فضای نام `opportunity.*` (V1) به‌طور صریح مجزا از V2 | `SOURCE_OF_TRUTH_MAP.md` (بخش V2) | هیچ | مرزی V1/V2 |
| **PA-11** | مصنوع عمومی Context | باز (فاز ۲) | **CLOSED (نسخه‌ی حداقلی V1)** | ADR-00AC | `evidence_refs[]`؛ تصریح صریح که این جایگزین مفهوم گسترده‌تر محصولی Context/Reality نیست | مفهوم کامل محصولی Context/Reality همچنان بزرگ‌تر باقی می‌ماند — عمداً | V1 (حداقلی)، Product Vision (کامل) |

## گپ‌های جدیدی که طی فاز ۳B تا ۳D کشف و بسته شدند

| گپ | منبع کشف | مرجع بستن |
|---|---|---|
| ابهام اقتدار Value Engine در برابر Kernel §۶/§۲۰ | بازبینی نهایی فاز ۳B | الحاقیه‌ی Kernel v1.3 (پیوست ۴) |
| خلط `unique_key` با هویت پایدار | بازبینی نهایی فاز ۳B | ADR-00AC (تفکیک چهارگانه‌ی هویت) |
| ابهام واژگانی برچسب ACKNOWLEDGED | بازبینی نهایی فاز ۳B | `opportunity_architecture/OPPORTUNITY_LIFECYCLE_AND_CONTRACTS_v2.md` |
| قابل‌مقایسه‌نبودن Materiality بین خانواده‌ها | بازبینی نهایی فاز ۳B | ADR-00AD؛ IC-14 بند ۱۰–۱۱ |
| رد Opportunity چندمخاطبی توسط یک نقش | بازبینی نهایی فاز ۳B | ADR-00AE (رکورد تعامل مختص actor) |
| نبود منع صریح ACKNOWLEDGED≠AUTHORIZATION | بازبینی نهایی فاز ۳B | `opportunity_architecture/V1_HUMAN_ACTION_BOUNDARY_v2.md` |
| نقض احتمالی اصل صنعت‌کوری Kernel در بازیابی درآمد | بازبینی نهایی فاز ۳B | `opportunity_architecture/OPPORTUNITY_PRODUCER_BOUNDARIES_v2.md` (تفکیک دو‌لایه) |

## چهار مورد غیرمسدودکننده/معوق (طبق بخش ۱۲ فاز ۳D)

| مورد | مالک | فاز آینده | اثر معماری | آیا بر تست‌های پذیرش پیاده‌سازی اثر می‌گذارد؟ |
|---|---|---|---|---|
| سیاست بازارزیابی Materiality پس از تغییر داده‌ی زیرین (چه زمانی Value Engine باید Amend کند) | تیم پیاده‌سازی هر Value Engine، در زمان نگارش Feature Contract | فاز ۴ (طراحی Feature Contract) | هیچ — مکانیزم Amendment از قبل کامل است؛ فقط سیاست *زمان‌بندی* باز است | **بله، جزئی** — هر Feature Contract هر Value Engine باید این سیاست را صریح کند تا تست پذیرش قابل‌نگارش باشد |
| شواهد کهنه (`evidence_refs` به Projection تغییریافته) | تیم پیاده‌سازی IC-14/Feed | فاز ۴ | هیچ — مکانیزم ارجاع از قبل کامل است | خیر — رفتار پیش‌فرض (نمایش ارجاع فعلی) بدون ابهام قابل‌تست است |
| اصلاح داده‌ی زیرین Malino پس از تولید Opportunity (بدون Trigger بازارزیابی خودکار) | تیم یکپارچه‌سازی Connector (Capability ۸) | فاز ۴ یا بعد | هیچ — محدودیت شناخته‌شده و پذیرفته‌شده برای V1 | خیر — عدم‌بازارزیابی خودکار، رفتار پیش‌فرض مورد‌انتظار V1 است |
| بررسی تازگی منبع Opportunity در دروازه‌ی موجود Self-Critique (Capability ۶) | خارج از این بستن — مالک اصلی Capability ۶ (بدون تغییر توسط این فاز) | تحقیق جداگانه، هر زمان قبل از فعال‌سازی گسترده‌ی Recommendation روی Opportunity | نامشخص تا زمان بررسی Capability ۶ | **بله، احتمالی** — اگر Capability ۶ این بررسی را نداشته باشد، ممکن است یک گپ P1 جدید (نه اکنون) ثبت شود |

**این چهار مورد از حافظه‌ی پروژه حذف نمی‌شوند** — طبق دستور صریح بخش ۱۲ فاز ۳D، در همین سند برای همیشه ثبت باقی می‌مانند تا زمانی که هرکدام به‌طور رسمی بسته شوند.

## گپ‌های عمداً باز/معوق (بدون تغییر نسبت به فاز ۳B/۳C)

G1، G2 (Deferred رسمی)؛ G4، G7 (قابل‌تعویق)؛ سهم Reasoning و Learning & Feedback از G6 (عمداً باز نگه‌داشته شد تا اقتدار Reasoning گسترش نیابد)؛ PA-03، PA-04، PA-12 (V1.5)؛ PA-05 بخش UX روز اول، PA-10 (تصمیمات محصولی، خارج از حوزه‌ی Kernel)؛ P-03، P-09 (تصمیمات محصولی).

---

## نتیجه

**صفر گپ P0 یا P1 مسدودکننده باقی مانده است.** هر گپی که در طول فاز ۳B/۳C/۳D به‌عنوان مسدودکننده شناسایی شد، اکنون یا CLOSED است یا صریحاً به‌عنوان NON-BLOCKING/DEFERRED با مالک و فاز آینده‌ی مشخص ثبت شده است.
