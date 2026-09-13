# بازبینی نگهبان معماری — توقف G9b به‌خاطر شکست fetch

**تاریخ:** ۱۳ سپتامبر ۲۰۲۶
**بازبین:** Claude Opus 5 — MLINO Architecture Guardian
**گزارش بررسی‌شده:** `origin/codex/core-prisma-foundation:AI_HANDOFF/CODEX_REPORTS/20260913_CODEX_G9B_CORE_SERVICE_LAYER_DESIGN_FIXES_REPORT.md`

| commit | کار |
|---|---|
| `3286e95` | گزارش توقف |
| `ec67c39` | تکمیل Handoff |

## حکم: `APPROVED_NEXT_STEP`

**توقف درست بود.** Codex دقیقاً طبق شرط GW2 عمل کرد:
- fetch شکست خورد (`SEC_E_NO_CREDENTIALS`) و Codex چیزی را اجرا نکرد.
- سند طراحی را تغییر نداد.
- توقف را شفاف گزارش کرد.

این همان رفتاری است که بازبینی G9 خواسته بود.

**مانع به محیط اجرا مربوط است، نه به کار.** برای اینکه این مانع هر گام بعدی را هم متوقف نکند، روش جایگزین **GW2-P** تعریف می‌شود: خواندن بازبینی از یک commit مشخص که hash محتوایش را هم دارد. G9b با همین روش دوباره صادر می‌شود.

---

## ۱. راستی‌آزمایی

| مورد | نتیجه |
|---|---|
| **دامنه** | ✅ `75d5188..ec67c39` فقط گزارش تازه و افزودن به Handoff را دارد (بدون حذف) |
| **سند طراحی** | ✅ دست نخورده است؛ LF sha256 `6664b986…f407`، همان مقدار G9 |
| **hash گزارش** | ✅ `589d525d…d9af` = مقدار اعلام‌شده |
| **main و V2** | ✅ `e79585b` و `f4d326f`، بدون تغییر |
| **Codex بازبینی درست را در دسترس داشت** | ✅ clone Codex و worktree Core refها را مشترک دارند. reflog نشان می‌دهد `refs/remotes/origin/main` ساعت 16:55 با fetch خود من به `e79585b` رسیده است. پس نسخه‌ی محلی همان بازبینی G9 بود، ولی Codex بدون fetch راهی برای **اثبات** این نداشت |
| **fetch شکست خورد، ولی push موفق بود** | ⚠️ push `3286e95` و `ec67c39` روی remote هست، ولی fetch شکست خورده است. تنظیمات: `credential.helper=manager`، `http.sslbackend=schannel`. یعنی محیط Codex گاهی به credential دسترسی دارد و گاهی نه. رفع این مشکل با مالک است؛ **نه Codex و نه من به credential، فایل token یا تنظیمات git دست نمی‌زنیم** |

## ۲. اصلاح حاکمیتی — GW2-P (روش جایگزین با commit مشخص)

**هدف GW2** این است که Codex متن **دقیق و معتبر** بازبینی را از مخزن بخواند، نه از حافظه یا خلاصه. GW2-P همین تضمین را بدون fetch می‌دهد:
- hash یک commit در git با محتوایش گره خورده است.
- hash فایل هم در دستور آمده است.
- پس متن قابل جعل یا جابه‌جایی نیست.

**قاعده:** اگر `git fetch origin` شکست خورد و دستور یک `PINNED_COMMIT` و یک `PINNED_SHA256` برای هر بازبینی مرجع دارد، Codex فقط وقتی ادامه می‌دهد که **هر سه** بررسی زیر موفق شوند:

```
1. git cat-file -e <PINNED_COMMIT>^{commit}
2. git merge-base --is-ancestor <PINNED_COMMIT> origin/main
3. git show <PINNED_COMMIT>:<REVIEW_PATH> | sha256sum   == PINNED_SHA256
```

- خروجی هر سه بررسی در گزارش ثبت می‌شود.
- هر شکست یعنی **توقف**.
- اگر دستور pin نداشته باشد، GW2 عادی برقرار است و شکست fetch یعنی توقف.

**ریسک باقیمانده و دلیل پذیرفتنش:** ممکن است بازبینی تازه‌تری پس از commit پین‌شده منتشر شده باشد. این قابل قبول است، چون هر بازبینی تازه با یک دستور تازه و شناسه‌ی تازه به دست Codex می‌رسد و دستور جاری همیشه به بازبینی خودش پین شده است.

**ممنوع در هر حالت:**
- دست زدن Codex به credential، به `GITHUB_TOKEN.txt` یا به تنظیمات git و credential helper.
- تلاش برای دور زدن احراز هویت.

---

## ۳. گام بعدی — اجرای دوباره‌ی G9b

- محتوای اصلاح‌ها **بی‌تغییر** همان R1 تا R6 و Y1 تا Y9 بازبینی G9 است.
- فقط شرط پیش‌نیاز و مسیر گزارش عوض شده‌اند. نام گزارش پیشین G9b صرف گزارش توقف شده و آن گزارش **تغییرناپذیر** می‌ماند.

```
INSTRUCTION_ID: CODEX-20260913-G9B-CORE-SERVICE-LAYER-DESIGN-FIXES-002
SUPERSEDES: CODEX-20260913-G9B-CORE-SERVICE-LAYER-DESIGN-FIXES-001 (stopped correctly at GW2)
TARGET_HANDOFF_ID: HANDOFF-20260912-CORE-PRISMA-FOUNDATION
REVIEW_REFERENCE (fix content):
  path:            AI_HANDOFF/CLAUDE_REVIEWS/20260913_CLAUDE_REVIEW_G9_CORE_SERVICE_LAYER_DESIGN.md
  PINNED_COMMIT:   e79585ba3431b662fd32819a57f92bd88b3c855d
  PINNED_SHA256:   35def70586113d2a0f08c9f1155d31a09e688aed2d9a48ae5efc01fae2ff32c7
GOVERNANCE_REFERENCE (GW2-P rule):
  path:            AI_HANDOFF/CLAUDE_REVIEWS/20260913_CLAUDE_REVIEW_G9B_GW2_FETCH_STOP.md
  PINNED_COMMIT / PINNED_SHA256: as relayed by the owner with this instruction
DECISION: APPROVED_NEXT_STEP
MODE: DOCUMENT ONLY — no code, no Prisma, no Docker, no database.

PRECONDITION:
- Try git fetch origin.
  - If it succeeds: standard GW2 applies (read both reviews from origin/main).
  - If it fails: apply GW2-P to BOTH references (the three checks each). Record all outputs in the report.
- Any check that fails → STOP.
- Never touch credentials, token files, git config or credential helpers.

TASK:
- Revise mlino2/MLINO_CORE_SERVICE_LAYER_DESIGN.md in a NEW commit.
- Apply every item R1–R6 and Y1–Y9 in sections 2 and 3 of the pinned G9 review, exactly.
- Cite every schema fact with origin/main file:line.
- Compute every SHA-256 over git show bytes and paste it from command output.

REPORT (new path; the stop report stays immutable):
  AI_HANDOFF/CODEX_REPORTS/20260913_CODEX_G9B_CORE_SERVICE_LAYER_DESIGN_FIXES_RUN2_REPORT.md
  - precondition outputs (fetch result; GW2-P checks 1–3 for each reference)
  - table: fix ID → section changed → applied / not applied (reason)
  - Y9: state what is known about fetch failing while push succeeds (observation only; no credential action)
Append only to mlino2/HANDOFF/HANDOFF_STATE.md, then STOP.

ALLOWED FILES (Core branch only):
  mlino2/MLINO_CORE_SERVICE_LAYER_DESIGN.md
  AI_HANDOFF/CODEX_REPORTS/20260913_CODEX_G9B_CORE_SERVICE_LAYER_DESIGN_FIXES_RUN2_REPORT.md (new)
  mlino2/HANDOFF/HANDOFF_STATE.md (append only)

FORBIDDEN:
- any code, test, script or config; implementation/**; schema.prisma; migrations; types.ts
- Prisma, Docker or any database connection
- changes to main, V2, _PUSH_STAGING, the root AI_HANDOFF files, ADRs or mlino_book/**
- editing the G9 report or the G9b stop report
- deciding any S item yourself (recommend only)
- starting implementation
- any action on credentials, tokens, git config or credential helpers
```

## ۴. برای مالک (اختیاری، مانع نیست)

**مشکل:** fetch در محیط Codex با `SEC_E_NO_CREDENTIALS` شکست می‌خورد. یعنی Git Credential Manager در آن محیط در دسترس نیست.

**راه‌حل:** اگر خواستید fetch معمولی برگردد، دسترسی Codex به credential را خودتان از تنظیمات Codex یا Git Credential Manager برقرار کنید. GW2-P تا آن زمان کار را پیش می‌برد.

## ۵. وضعیت دروازه‌ها

| دروازه | موضوع | وضعیت |
|---|---|---|
| G9 | طراحی لایه‌ی service | ⚠️ APPROVED_WITH_FIXES |
| G9b (001) | اصلاح طراحی | ⛔ توقف درست در GW2 |
| **G9b (002)** | **اصلاح طراحی با GW2-P** | ▶️ صادر شد |
| تصمیم مالک | S1 تا Sn، به‌علاوه‌ی bootstrap | ⏳ پس از بازبینی G9b |

من کلاد هستم
