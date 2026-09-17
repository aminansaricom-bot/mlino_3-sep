# بازبینی نگهبان معماری — CCR ایندکس یکتای پروفایل (Q8)

**تاریخ:** ۱۷ سپتامبر ۲۰۲۶
**بازبین:** Claude Opus 5 — MLINO Architecture Guardian
**commitها:** `70b73d6` (CCR) و `e74191f` (گزارش و Handoff)، روی `6514b84`. Codex آن‌ها را محلی ساخت و **نگهبان روی سرور منتشر کرد.**
**CCR:** `implementation/remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_PROFILE_PUBLISHED_UNIQUE.md`، LF sha256 ‏`1fa0fcd0…5d82b`، وضعیت DRAFT

## حکم: `APPROVED_NEXT_STEP`؛ آماده‌ی تصمیم مالک

## ۱. راستی‌آزمایی

| مورد | نتیجه |
|---|---|
| **دامنه** | ✅ دقیقاً سه فایل مجاز · Handoff فقط الحاقی · **هیچ schema، migration، کد، تست یا config تغییر نکرده** · CCR پس از commit اول دست‌نخورده مانده · worktree تمیز |
| **hash** | ✅ `1fa0fcd0…` که خودم محاسبه کردم برابر گزارش است |
| **GW2-P** | ✅ ثبت شده و hash ‏pin برابر است |
| **بدون اجرا** | ✅ هیچ query، Docker، Prisma یا npm اجرا نشده است |
| **ارجاع‌ها** | ✅ نمونه‌ها را مستقل بررسی کردم و همه درست‌اند |

**ارجاع‌هایی که خودم بررسی کردم:**
- `builder.ts:168-178` واقعاً همان جایی است که سازمان دارای چند پروفایل منتشرشده کنار گذاشته و `MULTIPLE_PUBLISHED_PROFILES` ثبت می‌شود.
- trigger ‏projection واقعاً `business_profiles.publication_status` را تغییر می‌دهد، پس قید روی همان UPDATE اعمال می‌شود.
- **شاهد قوی برای محدودیت Prisma:** در همین مخزن، migration ‏`20260910020000_add_external_workspace_link` **دقیقاً همین مشکل را ثبت کرده** و ایندکس یکتای جزئی را با SQL دستی ساخته است. پس راه پیشنهادی، **الگوی از پیش پذیرفته‌شده‌ی همین پروژه** است، نه اختراع تازه.
- enum ‏`PublicationStatus` سه مقدار UNPUBLISHED، PUBLISHED و WITHDRAWN دارد، مطابق آنچه CCR فرض کرده است.

## ۲. ارزیابی فنی

**درست و کامل:**
- **قید دقیق:** برای هر سازمان حداکثر یک ردیف با وضعیت PUBLISHED · ردیف‌های UNPUBLISHED و WITHDRAWN آزادند، پس تاریخچه و پیش‌نویس‌ها محدود نمی‌شوند.
- **preflight پیش از DDL** با همان الگوی migration قبلی: تراکنش، قفل، بررسی، ساخت ایندکس. اگر بررسی شکست بخورد، ایندکس نیمه‌ساخته نمی‌ماند.
- **مسیر انتشار درست تحلیل شده:** تلاش برای انتشار پروفایل دوم در همان UPDATE با خطای یکتایی شکست می‌خورد و کل تراکنش برمی‌گردد، پس رویداد انتشار معلق نمی‌ماند.
- **هشدار درست درباره‌ی نگاشت خطا:** فقط همین قید به پیام روشن نگاشت شود، نه همه‌ی خطاهای یکتایی. و شکل واقعی خطا باید در آزمون ثبت شود، نه حدس زده شود.
- **withdraw جا را آزاد می‌کند** و `REPLACED` مخصوص Offer است، نه پروفایل.
- **هیچ اصلاح داده‌ی خودکاری پیشنهاد نشده.** اگر روزی داده‌ی متناقض پیدا شود، تصمیم با مالک است.

**بررسی سازگاری که خودم انجام دادم:** پس از این قید، وضعیت «انتشار پروفایل الف، سپس برداشت آن، سپس انتشار پروفایل ب» همچنان مجاز است و تولیدکننده هم دقیقاً یک رکورد می‌سازد. یعنی قید دیتابیس و منطق تولیدکننده با هم تعارض ندارند. محافظ fail-closed در تولیدکننده به‌عنوان لایه‌ی دوم می‌ماند.

**یادداشت:** قفل `ACCESS EXCLUSIVE` جدول پروفایل‌ها را در لحظه‌ی اعمال کوتاه قفل می‌کند. روی دیتابیس فعلی شما که این جدول خالی است، عملاً بی‌اثر است.

## ۳. بسته‌ی تصمیم مالک

| # | موضوع | **توصیه‌ی نگهبان** |
|---|---|---|
| **CCR** | متن سند با hash ‏`1fa0fcd0…` | **تصویب** |
| **OQ-Q8-1** | اگر هنگام اعمال، سازمانی با دو پروفایل منتشرشده پیدا شد | **A: توقف.** سیستم خودش انتخاب نکند که کدام پروفایل «برنده» است. این تصمیم هویتی کسب‌وکار است و باید با شواهد و اجازه‌ی جدا انجام شود |
| **OQ-Q8-2** | روش ساخت ایندکس | **A: همان تراکنش و قفل.** ساده و اتمیک است و روی جدول خالی فعلی هیچ توقفی ایجاد نمی‌کند |
| **OQ-Q8-3** | ترتیب انتشار کد و migration | **A: با هم در یک بسته،** پس از آزمون شکل واقعی خطا. این‌طور کاربر هیچ‌وقت پیغام مبهم نمی‌گیرد |
| **Q8-2** | پیاده‌سازی: migration، نگاشت خطا و آزمون‌ها روی DB یک‌بارمصرف | **مجاز شود** |

**پاسخ پیشنهادی مالک:**
> «CCR ایندکس یکتای پروفایل تصویب شد (OQ-Q8-1=A، OQ-Q8-2=A، OQ-Q8-3=A)؛ Q8-2 مجاز است.»

**اعمال روی دیتابیس واقعی شما (Q8-3)** مثل دفعات قبل مرحله‌ی جدا با نسخه‌ی پشتیبان است و بعداً پرسیده می‌شود.

---

## ۴. کار موازی G14c-1 — دوباره صادر شد

Codex هنوز G14c-1 را شروع نکرده بود. چون همین ثبت، شناسه‌ی Handoff را عوض می‌کند، دستور قبلی دیگر پذیرفته نمی‌شود. **متن زیر جایگزین آن است و فقط شناسه و pin آن تازه است.**

```
INSTRUCTION_ID: CODEX-20260917-G14C1-V2-CONSUMER-DESIGN-002
TARGET_HANDOFF_ID: HANDOFF-20260917-GUARDIAN-Q8-CCR-REVIEW
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260917-V2-PUBLIC-CONSUMER
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260917_CLAUDE_REVIEW_Q8_PROFILE_UNIQUE_CCR.md (PINNED_COMMIT/SHA256 relayed)
SUPERSEDES: CODEX-20260917-G14C1-V2-CONSUMER-DESIGN-001 (same content; only the target handoff and pin changed)
DECISION: the owner authorized this parallel task; the Guardian selected the V2 consumer design.
MODE: DOCUMENT ONLY - a NEW branch codex/v2-public-consumer-design from origin/main at the pinned commit, in a NEW
      worktree C:/Users/galexy/mlino code/v2-public-consumer. LOCAL commits only; do NOT push.
      Do NOT modify the V2 branch codex/v2-intent-flow-foundation; read it only.

PRECONDITION: GW2 or GW2-P on the pinned record; record the outputs; any failure -> STOP. Never touch credentials.

DELIVERABLE (new): mlino2/MLINO_V2_PUBLIC_CONSUMER_DESIGN.md (status DRAFT; every claim cites file:line, using
origin/main for V1 and origin/codex/v2-intent-flow-foundation for V2). The public-business.v1 contract is FIXED.
C1 READ PATH: where V2 obtains the artifact (a shared directory, a copied file, or a fetch), what it must never do
   (no database access, no V1 module import), and the failure modes of each option; ONE recommendation.
C2 VERIFICATION before acceptance: contract_version, the key_id allowlist and trust bundle, the Ed25519 signature
   over the same canonical bytes (cite implementation/public-export/signing.ts and canonical.ts on origin/main),
   and rejection of any artifact failing any check. Verification happens BEFORE the cache is replaced.
C3 FRESHNESS: the TTL evaluated against generated_at; fail-closed behavior when the artifact is missing,
   unreadable, unsigned, expired or older than the current cache; an explicit statement that the signed `stale`
   field is NOT the freshness source (the producer always writes false); propose the TTL value.
C4 MAPPING public-business.v1 to what V2 needs: a field-by-field table to the existing V2 directory types
   (contract.ts on the V2 branch), naming exactly what V2 must stop expecting - category, floor_level, building_id
   and products are absent by S25 and S26 - and what V2 does instead.
C5 draft-1 MOCK: how it is retired or kept clearly labelled so real and mock data can never be confused.
C6 CACHE AND ATOMICITY: how V2 swaps its in-memory snapshot atomically, in-flight reads, and what users see while
   no valid artifact exists.
C7 TESTS for G14c-2 (list only): accept a valid artifact; reject a tampered one; reject an unknown key_id; reject
   an expired one; keep serving the previous valid cache when a new artifact is invalid; show nothing when no valid
   artifact was ever accepted; the mapping of every DTO field.
C8 OPEN QUESTIONS with options and ONE recommendation each. Decide none.
REPORT (new): AI_HANDOFF/CODEX_REPORTS/20260917_CODEX_G14C1_V2_CONSUMER_DESIGN_REPORT.md
- a table C1-C8 -> section -> done/not done; the LF sha256 of the design document; the GW2/GW2-P outputs
Append only to mlino2/HANDOFF/HANDOFF_STATE.md. Commit locally and STOP.
ALLOWED FILES (exactly three): the design document (new), the report (new), mlino2/HANDOFF/HANDOFF_STATE.md (append only)
FORBIDDEN: any code, test, schema, migration or config change; any Docker, database or npm run; ANY change to the V2
branch or to the FINAL read contract; deciding any open question; _PUSH_STAGING; any push; git config
```

## ۵. وضعیت دروازه‌ها

| دروازه | موضوع | وضعیت |
|---|---|---|
| G14a، G15 و G14b | snapshot، تراکنش و تولیدکننده‌ی export | ✅ در main |
| **CCR ایندکس یکتای پروفایل** | | ✅ **پذیرفته شد** · شاخه روی `e74191f` · ⏳ تصمیم مالک |
| Q8-2 و Q8-3 | پیاده‌سازی و اعمال روی DB محلی | ⏳ تصویب جدا |
| **G14c-1** | سند طراحی مصرف‌کننده‌ی V2 | ▶️ **دوباره صادر شد** |

من کلاد هستم
