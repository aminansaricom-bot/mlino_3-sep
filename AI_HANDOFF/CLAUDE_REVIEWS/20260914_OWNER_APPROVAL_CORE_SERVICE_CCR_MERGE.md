# ثبت تصویب مالک — CCR لایه‌ی service هسته و ادغام G10a و G10b در main

**تاریخ:** ۱۴ سپتامبر ۲۰۲۶
**ثبت‌کننده:** Claude Opus 5 — MLINO Architecture Guardian

**تصویب‌کننده:** مالک محصول. مالک پیام تأیید را خودش در گفت‌وگوی مستقیم با Claude فرستاد. متن آن پیام را Codex نوشته بود و مالک همان را بازارسال کرد:
> «CCR لایه‌ی Service هسته تصویب شد؛ ادغام G10a و G10b در main مجاز است.»

این پیام در پاسخ به بخش ۵ بازبینی `20260913_CLAUDE_REVIEW_G11A_CORE_SERVICE_MERGE_PREP.md` آمد (commit `b599706`، LF sha256 `4617b414…0744`). شاخه‌ی Codex روی `0624296` بی‌تغییر و پاک ماند.

**عبارت رسمی:** Core service layer CCR approved with the scope of section 3 of the G11a review; merge of G10a and G10b into main is authorized.

## دامنه‌ی تصویب‌شده

دامنه همان بخش ۳ بازبینی G11a است، بدون هیچ افزوده‌ای.

**زیر `implementation/`:**
- ۱۱ فایل تازه در `core/`
- ۵ فایل تازه در `test/core/`
- فایل CCR
- یک خط `"core/**/*.ts"` در `include` فایل `tsconfig.json`

**بیرون از `implementation/`:** سند طراحی نهایی، گزارش‌های Codex، شواهد `mlino2/validation/**` و Handoff شاخه‌ی Codex

**بدون تغییر:** prisma (schema و migrationها)، shared-contracts، package، jest، docker-compose و `setup-env`. هیچ حذفی در کار نیست.

**اثر runtime:** هیچ.
- هیچ فایلی از `core/` import نمی‌کند.
- image ‏read-api تغییری نمی‌کند و rebuild لازم نیست.

**راه بازگشت:** `git revert -m 1 <merge-commit>`

## ترتیب اجرا

1. **G11b-1 (Codex، فقط سند):** CCR را کامل می‌کند (بخش‌های ۳ و ۴ بازبینی G11a)، وضعیت را `APPROVED` می‌گذارد و به این سند ارجاع می‌دهد.
2. **G11b-2 (نگهبان):** بازبینی CCR · merge-tree دوباره (درخت فقط در فایل CCR با `67859e1` فرق داشته باشد) · ادغام `--no-ff` در main با push محافظت‌شده · راستی‌آزمایی پس از ادغام

**تصویب نشده:**
- G10c و برش‌های بعدی
- مسیر HTTP
- adapter واقعی پلتفرم یا AC-2
- هر تغییر schema یا migration
- rebuild یا restart ‏runtime

من کلاد هستم
