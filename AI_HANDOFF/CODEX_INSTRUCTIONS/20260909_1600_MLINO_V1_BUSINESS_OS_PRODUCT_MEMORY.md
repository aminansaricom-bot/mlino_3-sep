INSTRUCTION_ID: OWNER-20260909-1600-V1-BUSINESS-OS-PRODUCT-MEMORY
AUTHOR: PRODUCT_OWNER
STATUS: EXECUTED
TARGET_HANDOFF_ID: (none — new product-direction line, not a review of a prior delivery)
TARGET_REPORT_PATH: (n/a)
TARGET_REPORT_SHA256: (n/a)
ISSUED_AT: 2026-09-09T16:00:00
AUTHORIZATION_SCOPE: DOCUMENTATION_AND_DESIGN_ONLY_NO_CODE_NO_FROZEN_FILE_CHANGE

---

# ثبت دستور مالک محصول در پروتکل — MLINO V1 به‌عنوان سیستم‌عامل کسب‌وکار

## چرا این آرتیفکت وجود دارد

دستور مالک محصول («MLINO V1 as an AI Business Operating System» و سپس تصمیم‌های
دوازده‌بندی پس از ممیزی) خارج از پروتکل AI_HANDOFF رسید — بدون INSTRUCTION_ID و
بدون TARGET.

مالک محصول صریحاً تصمیم گرفت که **پروتکل حفظ شود** و این خط کاری **زیر** آن قرار
بگیرد، نه جایگزینش. این فایل همان ثبت است، تا خط محصول هم مثل بقیه‌ی کارها شناسه
و ردپای قابل‌ممیزی داشته باشد.

## دامنه‌ی مجاز

فقط مستندسازی و طراحی. صریحاً **بدون**:

- هیچ تغییری در `implementation/` (کد V1)
- هیچ تغییری در `mlino2/` (کد V2)
- هیچ تغییری در `C:\CONTENT STUDIO`
- هیچ تغییری در دو فایل منجمد
- هیچ تغییری در قرارداد `02`
- هیچ کپی یا بازنویسی سند تحت چک‌سام

## تصمیم‌های مصوب مالک

1. پروتکل AI_HANDOFF حفظ می‌شود؛ MLINO BOOK زیر آن است
2. V1 = ستون فقرات هویت، سازمان، حاکمیت و Business OS
   Content Studio = MLINO V1 Content & Social Intelligence Module
3. مخازن فعلاً جدا + قرارداد صریح و نسخه‌دار
4. `organization` در V1 = هویت متعارف؛ نگاشت `workspace` صریح و قابل‌ممیزی
5. دو موتور پیشنهاد حذف نمی‌شوند؛ اول قرارداد مشترک
6. MLINO BOOK = لایه‌ی Product Memory، نه جایگزین حاکمیت
7. صدای مشتری DEFER تا تصویب سیاست R8-a
8. Business Brain نیازمند مدل دانش پیش از پیاده‌سازی
9. Content Studio حفظ می‌شود؛ هدف مرحله‌ی اول integration است نه rewrite

## تحویل

گزارش: `AI_HANDOFF/CLAUDE_REPORTS/20260909_MLINO_BOOK_V1_PRODUCT_MEMORY_REPORT.md`

## نکته‌ی حاکمیتی که نباید گم شود

HANDOFF قبلی (`HANDOFF-20260907-V1-DOCKER-LOCAL-RUN`) هنوز در وضعیت
`DELIVERED_AWAITING_INDEPENDENT_REVIEW` است و بازبینی مستقل ممد روی آن انجام
نشده. این خط جدید آن را **باطل یا جایگزین نمی‌کند**؛ آن بازبینی همچنان باز است.
