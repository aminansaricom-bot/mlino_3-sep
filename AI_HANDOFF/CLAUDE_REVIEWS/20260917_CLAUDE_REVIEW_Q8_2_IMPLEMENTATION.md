# بازبینی نگهبان معماری — Q8-2: پیاده‌سازی ایندکس یکتای پروفایل

**تاریخ:** ۱۷ سپتامبر ۲۰۲۶
**بازبین:** Claude Opus 5 — MLINO Architecture Guardian
**commitها:** `8f7c07e` (کد)، `6b035b1` و `252301f` (شواهد)، `b9d5028` و `e0348a1` (گزارش)، روی `e74191f`. Codex آن‌ها را محلی ساخت و **نگهبان روی سرور منتشر کرد.**

## حکم: `APPROVED_NEXT_STEP`؛ آماده‌ی ادغام با تصویب مالک

## ۱. راستی‌آزمایی

| مورد | نتیجه |
|---|---|
| **دامنه** | ✅ **۰ فایل ممنوع**: `schema.prisma`، migrationهای قبلی، Dockerfile، package، tsconfig و `public-export` دست‌نخورده · worktree تمیز |
| **وفاداری migration** | ✅ **متن SQL دقیقاً همان بلوک مصوب CCR است**، بایت‌به‌بایت. خودم مقایسه کردم |
| **بدون drift** | ✅ `migrate status` می‌گوید schema به‌روز است و `migrate diff` می‌گوید تفاوتی نیست · `schema.prisma` دست‌نخورده ماند و برای راضی‌کردن ابزار تغییر داده نشد |
| **آزمون‌ها** | ✅ هر شش نام آزمون گزارش واقعاً در spec هست · سه اجرای کامل، هر بار **۳۱ از ۳۱ suite و ۳۹۰ از ۳۹۰ آزمون** · build موفق |
| **محیط** | ✅ container آزمایشی حذف شد · **دیتابیس زنده‌ی شما دست‌نخورده است: ۷ migration و هیچ ایندکسی با این نام وجود ندارد** |
| **صداقت گزارش** | ✅ یک تلاش ناموفق اولیه به‌خاطر نگاشت اشتباه پورت، به‌جای پنهان شدن، در فایل شواهد ثبت شده · هیچ دیتابیس زنده یا اشتباهی درگیر نشده بود |
| **ادغام آزمایشی** | ✅ tree ‏`5044894`، بدون تعارض، ۱۲ فایل |

## ۲. کیفیت آزمون‌ها

آزمون‌ها دقیقاً همان چیزی را می‌سنجند که باید:
- **ایندکس واقعاً ساخته شده، معتبر است و شرط درست را دارد** (`WHERE publication_status = 'PUBLISHED'`).
- انتشار پروفایل دوم **به CONFLICT با پیام روشن** تبدیل می‌شود، **و هیچ ردیف Publication نیمه‌ثبت‌شده‌ای نمی‌ماند**، و پروفایل دوم در وضعیت UNPUBLISHED باقی می‌ماند.
- **دو انتشار هم‌زمان:** دقیقاً یکی موفق و دیگری CONFLICT، نه «خطای داخلی».
- برداشتن انتشار اولی، جا را برای دومی باز می‌کند.
- **خطاهای یکتایی دیگر پیام قبلی خودشان را حفظ کرده‌اند.**
- تولیدکننده‌ی export همچنان برای سازمان دارای یک پروفایل، یک رکورد می‌سازد.

**نکته‌ی ارزشمند:** Codex شکل واقعی خطای Prisma را در آزمون ثبت کرده است، دو شکل متفاوت بسته به مسیر فراخوانی. این دقیقاً همان چیزی بود که در CCR خواسته شده بود که حدس زده نشود.

## ۳. یادداشت (بازدارنده نیست)

| # | یادداشت |
|---|---|
| **N1** | نگاشت خطا دو شرط دارد: یکی بر اساس **نام دقیق ایندکس** که کاملاً امن است، و یکی جایگزین بر اساس شکل خطای Prisma (`modelName: Publication` به‌همراه `target: organization_id`). شرط دوم لازم است، چون در آن مسیر Prisma نام ایندکس را برنمی‌گرداند، ولی کمی گشاد است: اگر روزی قید یکتای دیگری با همان شکل در مسیر انتشار پدید آید، همین پیام را می‌گیرد. امروز چنین قیدی وجود ندارد. **در اولین فرصتی که Prisma جزئیات قید را در آن مسیر برگرداند، این شرط باید تنگ‌تر شود.** ثبت شد تا فراموش نشود |

## ۴. بسته‌ی تصمیم مالک

پیشنهاد می‌کنم هر دو را **با هم** تصویب کنید، چون فاصله‌ی بین ادغام و اعمال، همان پنجره‌ی خطرناک «ساخت دوباره‌ی برنامه بدون پشتیبان» است و بهتر است کوتاه باشد.

| # | کار | توضیح |
|---|---|---|
| **۱** | **ادغام Q8 در main** | tree ‏`5044894`، ۱۲ فایل، بدون فایل ممنوع · نگهبان با `--no-ff` و push محافظت‌شده انجام می‌دهد |
| **۲** | **Q8-3: اعمال روی دیتابیس محلی** | دقیقاً به روش G14a-3: نسخه‌ی پشتیبان با بررسی hash در دو سو، سپس بررسی اینکه دقیقاً یک migration در انتظار است، سپس یک‌بار اعمال، سپس وارسی ایندکس و شمار ردیف‌ها و سلامت برنامه |

**پاسخ پیشنهادی مالک:**
> «ادغام Q8 در main و Q8-3 مجاز است.»

⚠️ تا پایان Q8-3 برنامه را از نو نسازید (`docker compose up --build` نزنید).

## ۵. کار موازی G14c-1 — دوباره صادر شد (نسخه‌ی ۰۰۴)

Codex هنوز آن را شروع نکرده است. متن دستور همان است؛ فقط TARGET و pin تازه‌اند:

```
INSTRUCTION_ID: CODEX-20260917-G14C1-V2-CONSUMER-DESIGN-004
TARGET_HANDOFF_ID: HANDOFF-20260917-GUARDIAN-Q8-2-REVIEW
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260917-V2-PUBLIC-CONSUMER
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260917_CLAUDE_REVIEW_Q8_2_IMPLEMENTATION.md (PINNED_COMMIT/SHA256 relayed)
SUPERSEDES: CODEX-20260917-G14C1-V2-CONSUMER-DESIGN-001, -002 and -003 (same content; only the target handoff and pin changed)
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

## ۶. وضعیت دروازه‌ها

| دروازه | موضوع | وضعیت |
|---|---|---|
| G14a، G15 و G14b | | ✅ در main |
| **Q8-2** | **migration، نگاشت خطا و آزمون‌ها** | ✅ **پذیرفته شد** · شاخه روی `e0348a1` |
| **ادغام Q8 و Q8-3** | | ⏳ **تصمیم مالک** |
| G14c-1 و G14c-2 | مصرف‌کننده‌ی V2 | ▶️ G14c-1 دوباره صادر شد · G14c-2 تصویب جدا |

من کلاد هستم
