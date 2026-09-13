# بازبینی نگهبان معماری — G9: طراحی لایه‌ی service هسته

**تاریخ:** ۱۳ سپتامبر ۲۰۲۶
**بازبین:** Claude Opus 5 — MLINO Architecture Guardian
**گزارش بررسی‌شده:** `origin/codex/core-prisma-foundation:AI_HANDOFF/CODEX_REPORTS/20260913_CODEX_G9_CORE_SERVICE_LAYER_DESIGN_REPORT.md`
**سند طراحی:** `mlino2/MLINO_CORE_SERVICE_LAYER_DESIGN.md` (۱۹۴ خط، LF sha256 `6664b986…f407`)
**commitها:** `dfe6a9f` (طراحی) و `75d5188` (Handoff)

## حکم: `APPROVED_WITH_FIXES`

اسکلت طراحی درست است:
- W1 اجباری است و W2 فقط گزینه است.
- مجوز از Membership + Grant می‌آید و role منبع مجوز نیست.
- projection فقط از مسیر Publication نوشته می‌شود.
- هر ۱۳ trigger نگاشت شده‌اند.
- آزمون فقط روی tmpfs است.
- Codex هیچ تصمیم باز را خودش نگرفته است.

**ولی سند هنوز برای تصمیم مالک آماده نیست.**
- چند ادعای آن با schema واقعی نمی‌خواند.
- قراردادهایی که پیاده‌سازی بدون آن‌ها قطعاً می‌شکند در سند نیامده‌اند: revision انتشار، bootstrap سازمان و ماشین حالت claim.
- چند بخش الزامی دستور نیامده است.

همه‌ی اصلاح‌ها فقط در سند انجام می‌شوند و هیچ‌کدام schema را تغییر نمی‌دهند.

---

## ۱. راستی‌آزمایی

| مورد | نتیجه |
|---|---|
| **دامنه‌ی git** | ✅ `669a992..75d5188` فقط سه فایل مجاز را تغییر داده است. Handoff فقط insertion دارد. main (`b41a172`) و V2 (`f4d326f`) تغییر نکرده‌اند. |
| **hash گزارش** | ✅ `2c1c78f5…4a34` با blob برابر است |
| **hash schema** | ✅ `760b25b5…22ee4` |
| **hash migration** | ❌ **سند و گزارش `…4411751167` ثبت کرده‌اند، ولی `git show origin/main:…/migration.sql \| sha256sum` مقدار `…4411751169` می‌دهد** (دو رقم آخر فرق دارند). hash دستی نوشته یا رونویسی شده است و از خروجی فرمان نیامده است → Y7 |
| **ارجاع‌های خط** | ✅ شروع هر ۱۲ مدل (327…626)، FKها `403-490`، `509-511`، `696-757`، D6 `846-890`، C15 `892-929`، triggerها `760-1009` |
| **fetch ناموفق** | ⚠️ Codex شفاف گزارش داد که `origin/main` محلی‌اش پیش از `b41a172` بوده و متن این بازبینی را ندیده است. طبق GW2 باید **توقف** می‌کرد. بیشتر کمبودهای زیر نتیجه‌ی همین است: دستوری که مالک رساند خلاصه بود و فهرست کامل ۱۱ بخش فقط در متن بازبینی آمده بود → Y9 |

## ۲. یافته‌های قرمز (پیش از تصمیم مالک باید اصلاح شوند)

### R1 — قرارداد revision در Publication (`migration.sql:931-1005`, `:726-732`)

سند فقط می‌گوید «Publication در همان تراکنش». trigger اما قرارداد دقیق‌تری دارد. اگر service آن را نداند، هر publish همزمان با ویرایش شکست می‌خورد:

- **publish برای Profile و Capability:**
  - `Publication.content_revision` باید **دقیقاً برابر** `content_revision` جاری ردیف باشد.
  - انتشار دوباره‌ی ردیفی که PUBLISHED است فقط با revision **بزرگ‌تر** مجاز است.
  - در غیر این صورت ۰ ردیف تغییر می‌کند و خطای `invalid publication transition` می‌آید.
  - پس service باید ردیف را در همان تراکنش با `FOR UPDATE` بخواند و revision خوانده‌شده را بفرستد. ویرایش همزمان بعدش conflict قابل retry است.
- **withdraw برای Profile و Capability:** باید `published_content_revision` را بفرستد، **نه** revision جاری.
- **OfferVersion:**
  - `content_revision` در Publication باید NULL باشد (C10).
  - نسخه‌ی WITHDRAWN را می‌توان دوباره منتشر کرد.
- **جایگزینی نسخه‌ی منتشرشده‌ی Offer:**
  - index یکتای جزئی `offer_version_published_unique` قابل تعویق (deferrable) نیست. پس «withdraw نسخه‌ی قبلی، سپس publish نسخه‌ی تازه» باید **در یک تراکنش و به همین ترتیب** انجام شود.
  - سند می‌گوید «در تراکنش‌های سازگار»، که مبهم است. با دو تراکنش جدا یا پنجره‌ای بدون نسخه‌ی منتشرشده پیش می‌آید، یا نقض یکتایی.
  - برای رقابت دو publish همزمان، ترتیب قفل را مشخص کنید (پیشنهاد: قفل ردیف Offer).

### R2 — OfferVersion از لحظه‌ی ساخت immutable است (`migration.sql:772-789`)

- سند (بخش ۳) می‌گوید «محتوای نسخه **پس از انتشار** immutable است». این نادرست است.
- trigger هر تغییر محتوایی را، جز `publication_status` و `published_at`، **در هر وضعیتی** رد می‌کند و DELETE را همیشه.
- پس OfferService عملیاتی به نام «ویرایش پیش‌نویس نسخه» ندارد: هر اصلاح یعنی نسخه‌ی تازه با `version_number` بعدی. رقابت روی `offer_version_number_unique` هم باید در مدل خطا بیاید.
- پیوندهای Capability (`:791-826`):
  - UPDATE همیشه رد می‌شود.
  - INSERT و DELETE فقط تا پیش از نخستین انتشار نسخه مجازند. معیار این است که `published_at` تهی باشد، و پس از withdraw هم تهی نمی‌شود.

### R3 — W1 را دقیق بیان کنید: پایگاه داده چه چیزی را تضمین نمی‌کند

- **مشکل:** سند در جدول خطا می‌گوید «cross-organization reference هرگز به service نمی‌رسد». این ادعای بیش از حد است.
- **آنچه DB تضمین می‌کند:** FKهای مرکب `(id, organization_id)` و CHECKهای جفت shadow ‏(C6، `:513-584`) فقط **سازگاری درون‌ردیفی** را تضمین می‌کنند؛ یعنی هر ارجاع به همان سازمانِ ردیف اشاره می‌کند.
- **آنچه DB تضمین نمی‌کند:** اینکه `organization_id` ریشه‌ی ردیف **همان سازمانِ caller** باشد. این فقط با W1 در service تضمین می‌شود و DB از AuthContext خبر ندارد. سند این را صریح بنویسد.

سند باید این‌ها را هم بیاورد:
- **الگوی signature:** هر متد repository `organizationId` را به‌عنوان پارامتر اول و از AuthContext می‌گیرد.
- **الگوی کلید:** هیچ `findUnique({id})` بدون سازمان مجاز نیست؛ الگو `where: { id, organizationId }` است.
- **caveat در MATCH SIMPLE:** FK مرکب با یک ستون NULL بررسی نمی‌شود، و C6 همین حفره را می‌بندد.
- **استثنای خواندن عمومی:** تنها خواندن بین‌سازمانی، projection عمومی منتشرشده برای V2 است (S9)، که باید مسیر جدا و فقط‌خواندنی داشته باشد.

### R4 — bootstrap سازمان و grant مؤسس (`:674-683`, PR2)

این پرخطرترین مسیر مجوز است و در سند نیامده است:
- `Organization.id` شناسه‌ی AC-2 است (PR2) و ساختنی نیست.
- نخستین Membership هیچ grant‌دهنده‌ای ندارد.
- grant با `basis_key='founding'` بدون grantor ساخته می‌شود و زنجیره‌ی `member_grant` را دور می‌زند.

سند باید مشخص کند:
- چه کسی مجاز است Organization، Membership مؤسس و grantهای founding را بسازد (پلتفرم؟ AC-2؟).
- اینکه این سه در **یک تراکنش** ساخته می‌شوند.
- اینکه founding فقط یک‌بار برای هر سازمان رخ می‌دهد.

این باید به‌صورت یک تصمیم تازه‌ی مالک با گزینه‌ها ثبت شود.

### R5 — جدول مجوز برای هر عملیات و کنش‌های مجاز پلتفرم (بخش الزامی ۴)

**جدول مجوز:** برای هر عملیات نوشتنی، `permission_key` لازم و نوع actor را فهرست کنید: Membership یا platform ref.

**کنش‌های پلتفرم:** schema به پلتفرم اجازه‌ی این کنش‌ها را می‌دهد:
- archive سازمان (`:596-607`)
- revoke کردن Membership و Grant (`:632-656`)
- تغییر وضعیت claim
- تصمیم verification

سند فقط verification را آورده است. **مرز این کنش‌ها زیر ADR-0010 باید صریح شود:** پلتفرم می‌تواند اجرا یا لغو کند، ولی authority تازه نمی‌سازد. Publication همیشه `performed_by_membership_id` اجباری دارد، پس پلتفرم هرگز چیزی را منتشر نمی‌کند. این نکته‌ی خوبی است و در سند بیاید.

### R6 — ماشین حالت claim و verification (`:609-630`, `:658-672`, `:828-844`)

- هیچ trigger‌ای روی `business_identity_claims` نیست. CHECK فقط کامل بودن audit را برای هر وضعیت می‌سنجد، **نه گذار** بین وضعیت‌ها را. پس ماشین حالت پنج وضعیت فقط در service اجرا می‌شود.
- سند باید این‌ها را مشخص کند:
  - **جدول گذارها:** مثلاً آیا `REJECTED → VERIFIED` مجاز است؟
  - **actor هر گذار:** VERIFIED، SUSPENDED و REJECTED با platform ref؛ EXPIRED بدون actor (سیستمی).
  - **پیوند تصمیم verification با وضعیت claim:** در همان تراکنش؟ کدام تصمیم کدام گذار را می‌سازد؟
  - **شماره‌گذاری attempt:** `claim_attempt_unique`، در رقابت.

## ۳. یافته‌های زرد

| # | یافته | اصلاح |
|---|---|---|
| **Y1** | Evidence «حداکثر یک» owner دارد (بخش ۳) | C7 می‌گوید **دقیقاً یک** owner: `num_nonnulls(capability_id, offer_version_id) = 1` (`:587-589`) |
| **Y2** | بخش ۶: `published_content_revision` در OfferVersion | OfferVersion این ستون را ندارد؛ projection آن `publication_status` + `published_at` است |
| **Y3** | مدل خطا نگاشت مشخص ندارد | **همه‌ی ۱۳ trigger با `P0001` خطا می‌دهند** و فقط متن پیامشان فرق دارد. نگاشت بر اساس پیام شکننده است. هر پیام → خطای domain را فهرست کنید، همراه با CHECK ‏(23514)، unique ‏(23505، از جمله نقضی که داخل trigger انتشار رخ می‌دهد) و FK ‏(23503). راه جایگزین، SQLSTATE جدا برای هر trigger، فقط به‌عنوان **گزینه‌ی مالک برای CCR آینده** ثبت شود؛ الان تغییری داده نشود |
| **Y4** | لایه‌بندی (بخش الزامی ۲) نیامده و محل کد به S8 رفته، بدون پیشنهاد | لایه‌های repository، service و مرز caller را تعریف کنید و محل کد را **با توصیه** پیشنهاد دهید (در چارچوب ADR-0002 و ADR-0011) |
| **Y5** | بخش audit (بخش الزامی ۸) نیامده است | فیلدهای «آخرین audit» هر جدول را فهرست کنید. تاریخچه فقط برای Verification (attemptها) و Publication (رخدادها) است (F4) |
| **Y6** | S1 تا S9 فقط موضوع دارند | برای هر کدام گزینه‌ها، پیامد و **یک توصیه** بیاید. تصمیم تازه‌ی R4 هم افزوده شود |
| **Y7** | hash نادرست migration | از خروجی `git show … \| sha256sum` کپی کنید، نه با تایپ |
| **Y8** | ExternalWorkspaceLink | **اشتباه در دستور من:** آن را جزو ۱۲ مدل Core شمرده بودم. ۱۲مین مدل Evidence است و سند درست عمل کرده است. ExternalWorkspaceLink جدول V1 پیشین است (migration `20260910…`، ADR-0004، D4). سند فقط صریح بنویسد که **خارج از دامنه‌ی این لایه** است |
| **Y9** | fetch ناموفق ولی ادامه‌ی کار | اگر `REVIEW_REFERENCE` از origin/main خواندنی نیست: **توقف و گزارش** (GW2). همچنین توضیح دهید چرا fetch شکست خورد ولی push موفق شد |

## ۴. بررسی معماری

| محور | نتیجه |
|---|---|
| **ADR-0009 / ADR-0010** | ✅ جهت درست است · ⚠️ مسیر founding و مرز کنش‌های پلتفرم تعریف نشده است (R4، R5) |
| **ADR-0011 مرز Core و Module** | ✅ بدون واژگان Clinic |
| **ADR-0012** | ✅ بدون persistence برای Intent و Session |
| **ADR-0004** | ✅ پس از Y8 |
| **امنیت tenant** | ⚠️ R3 |
| **درستی انتشار** | ❌ R1، R2 |
| **بدهی فنی** | هیچ کدی نوشته نشده است. خطر فعلی «سند نادرست ← پیاده‌سازی نادرست» است و همین بازبینی آن را می‌گیرد |

---

## ۵. گام بعدی

**Next Task: G9b — اصلاح سند طراحی (فقط سند).** تصویب مالک لازم نیست. پس از بازبینی G9b، تصمیم‌های S با توصیه‌ها به مالک ارائه می‌شوند.

```
INSTRUCTION_ID: CODEX-20260913-G9B-CORE-SERVICE-LAYER-DESIGN-FIXES-001
TARGET_HANDOFF_ID: HANDOFF-20260912-CORE-PRISMA-FOUNDATION
REVIEW_REFERENCE: origin/main AI_HANDOFF/CLAUDE_REVIEWS/20260913_CLAUDE_REVIEW_G9_CORE_SERVICE_LAYER_DESIGN.md
DECISION: APPROVED_WITH_FIXES
MODE: DOCUMENT ONLY — no code, no Prisma, no Docker, no database.

PRECONDITION (GW2):
- git fetch origin
- git show origin/main:<REVIEW_REFERENCE>
- If the fetch fails or the review is unreadable, STOP and report. Do not proceed from memory or from a relayed summary.

Revise mlino2/MLINO_CORE_SERVICE_LAYER_DESIGN.md in a NEW commit (no history rewrite). Apply every item
in sections 2 and 3 of REVIEW_REFERENCE:

 R1 Publication revision contract:
    - publish equals the current content_revision, read FOR UPDATE in the same tx
    - republish of a PUBLISHED row only at a higher revision
    - withdraw carries published_content_revision
    - an OfferVersion Publication has content_revision NULL
    - replacement = withdraw old + publish new in ONE tx, in that order
    - lock order for concurrent publishes
 R2 OfferVersion content is immutable from creation; delete is always rejected. Link insert/delete is
    allowed only while published_at IS NULL. Add version_number race handling.
 R3 Precise W1:
    - the DB guarantees only intra-row tenant consistency; the root org equals the caller only through W1
    - signature pattern; composite where {id, organizationId}
    - MATCH SIMPLE caveat closed by C6
    - public V2 read path as the only cross-tenant read (S9)
 R4 Bootstrap: Organization (id = AC-2 identifier), founding Membership and founding grants in one tx,
    once per organization. Add it as a new owner decision with options and a recommendation.
 R5 Per-operation permission table (permission_key + actor type). Bound the schema-allowed platform
    actions under ADR-0010: archive, revoke, claim status, verification decision. Note that Publication
    always requires a Membership.
 R6 Claim state machine:
    - five statuses, allowed transitions and the actor for each
    - verification decision → claim transition, and in which tx
    - attempt_number race handling
 Y1 Evidence has exactly one owner (C7). Y2 The OfferVersion projection is publication_status + published_at.
 Y3 Concrete error table:
    - each trigger message (all P0001) → domain error
    - 23514 / 23505 / 23503
    - distinct SQLSTATEs recorded only as a future-CCR owner option
 Y4 Layering section with a location proposal and recommendation (ADR-0002, ADR-0011).
 Y5 Audit section.
 Y6 Every S item: options, consequences, one recommendation.
 Y7 Correct the migration SHA-256 (paste it from command output).
 Y8 State that ExternalWorkspaceLink is out of scope for this layer.
 Y9 Explain the fetch-vs-push discrepancy in the report.

Cite every schema fact with origin/main file:line. Every SHA-256 is computed over git show bytes and pasted
from command output.

Report: AI_HANDOFF/CODEX_REPORTS/20260913_CODEX_G9B_CORE_SERVICE_LAYER_DESIGN_FIXES_REPORT.md
- The report includes a table: fix ID → section changed → applied / not applied (with reason).
- Append only to mlino2/HANDOFF/HANDOFF_STATE.md. Then STOP.

ALLOWED FILES (Core branch only):
  mlino2/MLINO_CORE_SERVICE_LAYER_DESIGN.md
  AI_HANDOFF/CODEX_REPORTS/20260913_CODEX_G9B_CORE_SERVICE_LAYER_DESIGN_FIXES_REPORT.md (new)
  mlino2/HANDOFF/HANDOFF_STATE.md (append only)

FORBIDDEN:
- any code, test, script or config; implementation/**; schema.prisma; migrations; types.ts
- prisma, Docker or any database connection
- changes to main, V2, _PUSH_STAGING, the root AI_HANDOFF files, ADRs or mlino_book/**
- editing the G9 report (keep it immutable; corrections go in the G9b report)
- deciding any S item yourself (recommend only)
- starting implementation
```

## ۶. وضعیت دروازه‌ها

| دروازه | موضوع | وضعیت |
|---|---|---|
| G1 تا G8 | پایه‌ی Core و runtime | ✅ بسته |
| **G9** | **طراحی لایه‌ی service** | ⚠️ **APPROVED_WITH_FIXES** |
| G9b | اصلاح طراحی | ▶️ صادر شد |
| تصمیم مالک | S1 تا Sn، به‌علاوه‌ی bootstrap | ⏳ پس از بازبینی G9b |
| G10 | پیاده‌سازی | ⏳ پس از تصویب طراحی |

من کلاد هستم
