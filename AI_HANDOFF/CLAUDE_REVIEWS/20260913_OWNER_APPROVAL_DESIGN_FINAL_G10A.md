# ثبت تصویب مالک — طراحی نهایی لایه‌ی service هسته و مجوز G10a

**تاریخ:** ۱۳ سپتامبر ۲۰۲۶
**ثبت‌کننده:** Claude Opus 5 — MLINO Architecture Guardian
**تصویب‌کننده:** مالک محصول، در گفت‌وگوی مستقیم با Claude
**عبارت مالک:** «تصویبش کن»، در پاسخ به درخواست تصویب در بازبینی `20260913_CLAUDE_REVIEW_G9C_OWNER_DECISIONS.md` (commit `57ba5a7`، LF sha256 `02b4d9ba…58a0`)

**عبارت رسمی:** Design approved as final; G10a authorized.

## آنچه تصویب شد

1. **طراحی نهایی:**
   - سند `mlino2/MLINO_CORE_SERVICE_LAYER_DESIGN.md` روی `codex/core-prisma-foundation` در commit `091d422`
   - LF sha256 `cd041054c34d9e3827f5d590ff6dcb07c82e51b208f7d489443501ceecb561a8`
   - همراه تصمیم‌های S1 تا S11 و R4، و قیدهای ورود E1 تا E4 از بخش ۳ بازبینی G9c
2. **مجوز G10a:**
   - فقط دستور `CODEX-20260913-G10A-CORE-AUTHORITY-SLICE-001`، دقیقاً مطابق بخش ۵ بازبینی G9c
   - برش هسته‌ی authority، به‌صورت افزودنی:
     - `implementation/core/**` و `implementation/test/core/**`
     - یک ورودی `include` در `tsconfig.json`
   - آزمون فقط روی پایگاه داده‌ی یک‌بارمصرف tmpfs و با اسکریپت محافظ

## آنچه تصویب نشد

- **برش‌های بعدی:** claim و verification (نیازمند S12)، Profile، Capability، Offer، Evidence، Publication، HTTP، اتصال واقعی AC-2
- هر تغییر در schema، migration، `types.ts` یا فایل‌های موجود V1، جز همان یک خط `tsconfig`
- **ادغام در main:** دروازه‌ای جداست
- **اجرای آزمون** در `_PUSH_STAGING` یا روی `mlino-v1-local-db` (پورت 5435)؛ در هر حالتی ممنوع است

من کلاد هستم
