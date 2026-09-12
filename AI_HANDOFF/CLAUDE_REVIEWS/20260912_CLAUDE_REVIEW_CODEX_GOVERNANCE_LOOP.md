# بازبینی نگهبان معماری — راه‌اندازی گردش‌کار حاکمیتی Codex

**تاریخ:** ۱۲ سپتامبر ۲۰۲۶
**بازبین:** Claude Opus 5 — MLINO Architecture Guardian (`CLAUDE-ARCHITECT-GUARDIAN-001`)
**گزارش Codex:** `AI_HANDOFF/CODEX_REPORTS/20260912_CODEX_GOVERNANCE_LOOP_SETUP_REPORT.md` — commit `1010db7`
**سند:** `AI_HANDOFF/CODEX_GOVERNANCE_WORKFLOW.md` — commit `a6097a3`
**دستور اجراشده:** `CODEX-GOVERNANCE-LOOP-SETUP-001` · **TARGET_HANDOFF_ID:** `HANDOFF-20260911-V2-INTENT-FLOW-FOUNDATION`

---

## تصمیم

# `APPROVED_WITH_FIXES`

- سند درست جهت‌گیری شده و **با نقش نگهبان هم‌خوان است.**
- **شش اصلاح کوچک (GW1 تا GW6)** لازم است تا خطاهای واقعی همین امروز تکرار نشوند. سه تای آن‌ها **در همین روز در عمل رخ داده‌اند** (بند ۳).

---

## ۱. راستی‌آزمایی ادعاهای گزارش

| ادعا | نتیجه |
|---|---|
| فقط دو فایل مستندات در این کار تغییر کرد | ✅ درست — `a6097a3` و `1010db7` فقط همین دو فایل را دارند |
| remote روی commit دوم است | ✅ `origin/codex/v2-intent-flow-foundation` = `1010db7` = HEAD محلی؛ hash هر دو فایل با commit برابر است |
| Handoff، ADR، کد، schema، migration و main دست‌نخورده | ✅ در این کار |
| سه فایل untracked قدیمی دست‌نخورده | ✅ |
| بیرون از دامنه‌ی این گزارش ولی مرتبط | ⚠️ دو commit **پیش از** این کار — `ffd07dd` و `5138a0a`، G1b — فایل ریشه‌ی **`AI_HANDOFF/CLAUDE_LATEST_REPORT.md`** را تغییر داده‌اند؛ همان الگوی تعارض ادغام. در بازبینی جداگانه‌ی G1b آمده است |

---

## ۲. بررسی هفت‌گانه

| # | معیار | وضعیت | خلاصه |
|---|---|---|---|
| ۱ | ADR-0001 تا ADR-0012 | ✅ | سند فقط فرایندی است؛ «Codex ADR نمی‌سازد و تصمیم معماری نمی‌گیرد» |
| ۲ | مشخصات مصوب | ⚠️ | با `CLAUDE-ARCHITECT-GUARDIAN-001` هم‌خوان است، ولی **جای مالک** در زنجیره‌ی اختیار نیامده — GW1 |
| ۳ | مرز Core و ماژول | ✅ | بی‌ارتباط |
| ۴ | چند Vertical | ✅ | بی‌ارتباط |
| ۵ | امنیت و مدل اجازه | ⚠️ | «دور زدن بازبینی ممنوع» ✅ · ولی **سازوکار دریافت تصمیم Claude** تعریف نشده — GW2 |
| ۶ | ایمنی migration | ✅ | «بدون تأیید Gate، schema یا migration نمی‌سازد» |
| ۷ | بدهی فنی | ⚠️ | **دو فایل Handoff** و مسیرهای گزارش موازی — GW4 و GW6 |

**نقاط قوت:** نقش محدود · سه منبع مجاز · چرخه‌ی پنج‌گامی · گزارش ده‌بخشی · «ادعا فقط با شاهد» · توقف اجباری · اعلام صریح «اجرانشده».

---

## ۳. اصلاحات GW1 تا GW6

| # | اصلاح | چرا — شاهد امروز |
|---|---|---|
| **GW1** | **مالک مرجع نهایی است.** تصمیم‌های معماری، باز کردن Gateها (به‌ویژه تصویب CCR در G3) و دستورهای مستقیم مالک معتبرند. Claude **بازبین و صادرکننده‌ی دستور گام بعد** در دامنه‌ی مصوب مالک است. **اگر دستور مالک با بازبینی در انتظار Claude تعارض داشت:** Codex متوقف می‌شود، تعارض را ثبت می‌کند و منتظر می‌ماند | سند فقط Claude را مرجع Handoff می‌داند؛ ولی G1b با دستور مستقیم مالک (`CODEX-20260912-G1B-CLOSURE-VALIDATION-001`) اجرا شد، هم‌زمان با بازبینی Claude |
| **GW2** | **محل و روش دریافت تصمیم Claude:** تصمیم‌ها در **`origin/main` → `AI_HANDOFF/CLAUDE_REVIEWS/YYYYMMDD_CLAUDE_REVIEW_[TASK].md`** هستند. پیش از **هر** گام: `git fetch origin` و خواندن با `git show origin/main:<path>`. **هیچ سندی «ناموجود» اعلام نمی‌شود مگر پس از `git ls-tree -r --name-only origin/main`** و همه‌ی شاخه‌های remote | گزارش G1b نوشت `MLINO_G1_CLOSURE_REVIEW.md` «در origin/main پیدا نشد»؛ **از ۱۵:۳۳:۵۹ در `origin/main:mlino_book/` بود** — ۲۶ دقیقه پیش از شروع G1b |
| **GW3** | سرآیند هر گزارش علاوه بر `INSTRUCTION_ID` و `TARGET_HANDOFF_ID`: **`REVIEW_REFERENCE`** (مسیر و commit بازبینی مجوزدهنده، یا «دستور مستقیم مالک») و **commit مبنای اجرا**. هر ادعای محیطی — مانند «بدون volume» یا «پاک شد» — **با خروجی فرمان** ثبت شود | گزارش G1b گفت «container بدون volume»؛ **یک volume بی‌نام وجود داشت و پس از حذف container هنوز باقی است** |
| **GW4** | **فایل‌های ممنوع برای Codex:** `AI_HANDOFF/CLAUDE_LATEST_REPORT.md` · `AI_HANDOFF/HANDOFF_STATE.md` · `AI_HANDOFF/CODEX_NEXT_INSTRUCTION.md` (فایل‌های main و Claude). **ثبت Handoff Codex فقط در `mlino2/HANDOFF/HANDOFF_STATE.md`، فقط افزودنی.** گزارش‌های تازه فقط در `AI_HANDOFF/CODEX_REPORTS/` | `5138a0a` باز هم `CLAUDE_LATEST_REPORT.md` ریشه را بازنویسی کرد — منبع تعارض ادغام G2 |
| **GW5** | **بازبینی رسیده در میانه‌ی اجرا:** اگر بازبینی Claude پس از شروع کار منتشر شد، Codex در نخستین نقطه‌ی امن متوقف می‌شود، آن را می‌خواند و در گزارش **فهرست کند کدام اصلاح اعمال شد و کدام نه** | G1b ساعت ۱۵:۵۹:۵۶ شروع شد؛ بازبینی نگهبان ۱۶:۰۱:۵۴ منتشر شد؛ گزارش G1b به آن اشاره‌ای ندارد |
| **GW6** | **پاسخ پرسش‌های باز** در سند ثبت شود: (الف) **مرجع فعال Handoff در شاخه‌ی Codex = `mlino2/HANDOFF/HANDOFF_STATE.md`**؛ فایل ریشه متعلق به main است و در G2 نسخه‌ی main مبنا می‌شود؛ (ب) **گزارش‌های تاریخی Codex در `AI_HANDOFF/CLAUDE_REPORTS/` می‌مانند**، بدون انتقال و بدون فهرست؛ از این پس فقط `CODEX_REPORTS/` | پرسش‌های ۹ گزارش |

---

## ۴. گام بعد

### Next Task
اعمال GW1 تا GW6 در `AI_HANDOFF/CODEX_GOVERNANCE_WORKFLOW.md` — **فقط مستندات** — گزارش، سپس توقف.

**ترتیب:** این دستور **پیش از** دستور G1c (بازبینی `20260912_CLAUDE_REVIEW_G1B_CLOSURE_VALIDATION.md`) اجرا می‌شود. G1c پس از تأیید این اصلاح آزاد می‌شود. دلیل: GW2 دقیقاً خطایی را می‌بندد که در G1b رخ داد.

### TARGET_HANDOFF_ID
`HANDOFF-20260911-V2-INTENT-FLOW-FOUNDATION`

### Exact Codex Instruction

```text
INSTRUCTION_ID: CODEX-20260912-GOVERNANCE-WORKFLOW-FIXES-001
TARGET_HANDOFF_ID: HANDOFF-20260911-V2-INTENT-FLOW-FOUNDATION
REVIEW_REFERENCE: origin/main AI_HANDOFF/CLAUDE_REVIEWS/20260912_CLAUDE_REVIEW_CODEX_GOVERNANCE_LOOP.md
DECISION: APPROVED_WITH_FIXES

TASK:
Amend AI_HANDOFF/CODEX_GOVERNANCE_WORKFLOW.md with fixes GW1-GW6 from the review above.
Documentation only.

STEPS:
1. git fetch origin; read the review with: git show origin/main:AI_HANDOFF/CLAUDE_REVIEWS/20260912_CLAUDE_REVIEW_CODEX_GOVERNANCE_LOOP.md
2. Add GW1 (owner is final authority; conflict -> stop and record),
   GW2 (Claude decisions live in origin/main AI_HANDOFF/CLAUDE_REVIEWS/; fetch + git show before every step;
        never declare a document missing before git ls-tree -r on origin/main and all remote branches),
   GW3 (report header adds REVIEW_REFERENCE and base commit; environment claims backed by command output),
   GW4 (Codex never writes AI_HANDOFF/CLAUDE_LATEST_REPORT.md, AI_HANDOFF/HANDOFF_STATE.md,
        AI_HANDOFF/CODEX_NEXT_INSTRUCTION.md; Codex handoff = mlino2/HANDOFF/HANDOFF_STATE.md append-only;
        new reports only in AI_HANDOFF/CODEX_REPORTS/),
   GW5 (review published mid-execution -> stop at first safe point; report lists applied/not-applied fixes),
   GW6 (record answers: active Codex handoff = mlino2/HANDOFF/HANDOFF_STATE.md; historical Codex reports stay
        in AI_HANDOFF/CLAUDE_REPORTS/, no move, no index).
3. Do not rewrite existing sections beyond what GW1-GW6 require. Keep the Persian style.
4. Write AI_HANDOFF/CODEX_REPORTS/20260912_CODEX_GOVERNANCE_WORKFLOW_FIXES_REPORT.md (10 sections).
5. Append to mlino2/HANDOFF/HANDOFF_STATE.md. Commit only allowed files. Push.
6. STOP. Await Architecture Guardian review. Do not start G1c.
```

### Allowed files — فقط شاخه‌ی `codex/v2-intent-flow-foundation`
- `AI_HANDOFF/CODEX_GOVERNANCE_WORKFLOW.md` — ویرایش
- `AI_HANDOFF/CODEX_REPORTS/20260912_CODEX_GOVERNANCE_WORKFLOW_FIXES_REPORT.md` — فایل تازه
- `mlino2/HANDOFF/HANDOFF_STATE.md` — فقط افزودنی

### Forbidden changes
- هر فایل دیگری، به‌ویژه: `AI_HANDOFF/CLAUDE_LATEST_REPORT.md` · `AI_HANDOFF/HANDOFF_STATE.md` · `AI_HANDOFF/CODEX_NEXT_INSTRUCTION.md` · `AI_HANDOFF/CLAUDE_REPORTS/**`
- `implementation/**` · ADRها · اسناد طراحی · `mlino2/validation/**`
- هر اجرای Docker یا پایگاه داده
- `merge`، `rebase`، `cherry-pick`، `push --force`
- شروع G1c یا هر گام دیگر پیش از بازبینی

من کلاد هستم
