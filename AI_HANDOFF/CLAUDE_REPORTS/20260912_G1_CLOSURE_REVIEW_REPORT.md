# گزارش Claude — بازبینی بستن G1

**INSTRUCTION_ID:** `CLAUDE-20260912-G1-VALIDATION-REVIEW-001`
**HANDOFF_ID:** HANDOFF-20260912-G1-CLOSURE-REVIEW
**تاریخ:** ۱۲ سپتامبر ۲۰۲۶
**مجری:** Claude Opus 5

## خروجی
- `mlino_book/MLINO_G1_CLOSURE_REVIEW.md` — فایل تازه روی main.
- بدون تغییر `schema.prisma`، migration، ADR یا شاخه‌ی Codex.

## حکم: ⛔ G1 NOT CLOSED — نزدیک، و بدون وابستگی به G2 یا `schema.prisma`

**پذیرفته:** ۱۲ از ۱۴ مورد گزارش‌شده (۴ مورد با دامنه‌ی محدود) — FK مرکب، RESTRICT، یکتای جزئی ادعا و نسخه، هسته‌ی C15، rollback، تغییرناپذیری، یک رقابت انتشار. «حفظ ایندکس پس از DDL دستی» به‌عنوان آزمون migration پذیرفته نیست.

**سه مانع ماهوی:**
1. **C15:** گونه‌ی آزموده‌شده همان «پرچم transaction-local» است که نشتش در طرح main پیش‌بینی شده بود؛ آزمون نشت (PC-04) اجرا نشده است.
2. **Prisma Migrate اصلاً اجرا نشد.** خطر پاک شدن قیدهای دستی در migration بعدی دست‌نخورده مانده است — از جمله برای ایندکس موجود `external_workspace_link_active_unique`.
3. **گزارش هیچ DDL یا SQL ندارد** و fixture حذف شده. هیچ PASS قابل بازبینی مستقل نیست.

**یافته‌های دیگر:**
- **بن‌بست حلقوی غیرواقعی:** گزارش Codex بستن G1 را به G2 و به `schema.prisma` گره زده، در حالی که `schema.prisma` منتظر G1 است.
  - زنجیره‌ی `origin/main` در پوشه‌ی موقت بیرون از مخزن قابل اعمال است.
  - **Prisma 5.22.0 روی clone main نصب است.**
- **نسخه‌ی Prisma:** lockfile هر دو شاخه `5.22.0` است؛ «5.20.0» فقط در اسناد است → مستندسازی.
- **مبنا:** اجرا طرح ۱۳-آزمونی Codex را دنبال کرده، نه طرح ۶۲-آزمونی main. hash اعلام‌شده `72d18031…` با هیچ نسخه‌ای (LF یا CRLF) از هیچ‌کدام از دو طرح نمی‌خواند.
- **آزمون‌های غایب:** پنج آزمون خود طرح Codex نه PASS هستند نه NOT_EXECUTED: C6، C2 تا C4، الگوی نوشتن Prisma، FK حلقوی، رقابت publish و withdraw.

## طبقه‌بندی
- **Required before `schema.prisma` (G1b، بدون G2):**
  - R1: شواهد DDL و SQL
  - R2: نشت C15
  - R3: Prisma Migrate 5.22.0 — DR-01 تا DR-03، FK-07، validate و generate، الگوی نوشتن
  - R4: آزمون‌های غایب + تعامل C6/C7 با `MATCH SIMPLE`
- **Can move to G2:**
  - M1: artefactهای `ExternalWorkspaceLink`
  - M2: C7 تا C11 روی متن DDL نهایی CCR
  - M3: اجرای مجدد با نام‌های واقعی
  - M4: گسترش هم‌زمانی
  - M5: نرمال‌سازی
- **Documentation only:**
  - D1: Prisma 5.22.0
  - D2: hash مبنا
  - D3: دو طرح هم‌نام
  - D4: FK `ExternalWorkspaceLink` — تصمیم مالک
  - D5: P1 تا P12
  - D6: Handoff

## محدودیت‌ها
- هیچ Secret در Commit.
- به V1، AC‑2، Backend، قراردادهای منجمد، Adapter یا Connector دست زده نشد.
- Content Studio `f6946a8` همچنان فقط محلی است — OD-09.

من کلاد هستم
