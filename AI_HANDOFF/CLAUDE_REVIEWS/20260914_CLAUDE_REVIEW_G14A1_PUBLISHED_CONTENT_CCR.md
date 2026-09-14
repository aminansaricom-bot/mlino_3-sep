# بازبینی نگهبان معماری — G14a-1: سند CCR ستون `publications.published_content`

**تاریخ:** ۱۴ سپتامبر ۲۰۲۶
**بازبین:** Claude Opus 5 — MLINO Architecture Guardian
**commitها (محلی؛ push نشده، خطای مالکیت git):** `31f3c22` (CCR) و `9b64813` (گزارش و Handoff)، روی `f578499`
**CCR:** `implementation/remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_PUBLICATION_PUBLISHED_CONTENT.md` (۲۸۶ خط، LF sha256 ‏`44539a3e…14b4`)
**گزارش:** LF sha256 ‏`10e75563…3a90`

## حکم: `APPROVED_WITH_FIXES`

**CCR ساختار درستی دارد و هسته‌ی طراحی درست است:**
- یک migration تازه با preflight که اگر ردیفی باشد متوقف می‌شود (fail-closed).
- یک CHECK سازگار با OfferVersion و مسیر REPLACED.
- یک snapshot نسخه‌دار با allowlist تایپ‌شده برای هر هدف.
- خواندن snapshot زیر همان `FOR UPDATE`.
- جدایی محتوای منجمد از شایستگی زنده.
- پنج سؤال باز که هر کدام یک توصیه دارند.

ولی پیش از رفتن نزد مالک، **سه نقص طراحی** باید بسته شود:
1. فیلدهای تکراری envelope می‌توانند با ستون‌های خود ردیف ناسازگار شوند.
2. سه دروازه‌ی چرخه‌ی عمر در جدول شایستگی جا افتاده‌اند.
3. تله‌ی `null` در Prisma با CHECK برخورد می‌کند.

این اصلاح یک دور کوچک فقط‌-سند است (G14a-1b) و در محدوده‌ی تصویب فعلی است.

---

## ۱. راستی‌آزمایی

commitها را فقط خواندنی از object store مشترک بررسی کردم. git config نوشته نشد.

| مورد | نتیجه |
|---|---|
| **دامنه** | ✅ `f578499..9b64813`: فقط سه فایل مجاز · +۴۱۰ خط و ۰ حذف · Handoff فقط الحاقی · worktree ‏Codex تمیز · schema، migration و کد دست‌نخورده |
| **GW2-P** | ✅ ثبت شده (fetch با خطای شبکه) · hash ‏pin ‏`25dcdae4…` برابر |
| **hash** | ✅ CCR ‏`44539a3e…` برابر گزارش |
| **ارجاع‌ها** | ✅ نمونه‌ها درست‌اند: G7b ‏`:31-38` (۱۲ جدول خالی در خط ۳۵) · Dockerfile ‏`:30-37` پوشه‌ی `core` را کپی نمی‌کند · tsconfig ‏`:17` · `publication-service.ts` ‏`:38-53`، `:59-80`، `:86-90` و `:92-108` · ⚠️ `schema.prisma:318-321` برای enum ‏`PublicationEventKind` نادرست است؛ درستش `:322-325` است |
| **بدون DB** | ✅ Codex هیچ query یا Prisma اجرا نکرد. خالی بودن جدول‌ها صریحاً به preflight ‏G14a-3 سپرده شده است |

## ۲. نقاط قوت

- **C2:** preflight پیش از DDL · CHECK مستقیم با دلیل · جمله‌ی «triggerهای C12 و projection تغییر نمی‌کنند» درست است، چون `core_apply_publication_projection` فقط هدف، `event_kind` و `content_revision` را می‌خواند.
- **C3:** `category_key` با ارجاع به S25 کنار گذاشته شده · `capability_link_ids` مرتب و یکتا · Decimal به رشته (قیمت) یا عدد با ۶ رقم (مختصات) و timestamp به ISO UTC.
- **C5:** ترتیب قفل Organization → Offer → Version حفظ شده · `ALREADY_PUBLISHED` پیش از INSERT برمی‌گردد · D6 بدون تغییر.
- **C8:** refuse به‌جای backfill حدسی · rollback صادقانه («snapshotها از بین می‌روند»).
- **C9:** با توصیه‌ی هر پنج سؤال موافقم (OQ-1 تا OQ-5، همه A).

## ۳. یافته‌ها

| # | شدت | یافته | اصلاح لازم |
|---|---|---|---|
| **Y1** | 🟡 | **تکرار داده در envelope.** `target`، `target_id` و `content_revision` هم در JSON آمده‌اند و هم ستون‌های خود ردیف Publication هستند (`business_profile_id`، `capability_id`، `offer_version_id` و `content_revision`). هیچ قیدی برابری آن‌ها را تضمین نمی‌کند. یک باگ service می‌تواند snapshot هدف A را روی رخداد هدف B بنویسد، و trigger تغییرناپذیری آن را برای همیشه نگه می‌دارد | **توصیه:** این سه فیلد از JSON حذف شوند، چون منبع حقیقت ستون‌های ردیف است. envelope فقط `{snapshot_version, content}` باشد. CHECK هم افزوده شود: `published_content ? 'snapshot_version' AND published_content ? 'content'`. اگر Codex نگه داشتن آن‌ها را لازم می‌داند، باید CHECK برابری در DB برای هر سه تعریف کند. انتخاب با دلیل |
| **Y2** | 🟡 | **سه دروازه‌ی چرخه‌ی عمر در جدول C4 نیست:**<br>- `Organization.lifecycleStatus` (`ARCHIVED`، `schema.prisma:330`)<br>- `BusinessProfile.lifecycleStatus` (`DRAFT` یا `ARCHIVED`، `:478`)<br>- `Offer.lifecycleStatus` (`RETIRED`، `:534`؛ والد OfferVersion)<br>بدون این‌ها، سازمان بایگانی‌شده یا Offer بازنشسته با آخرین snapshot همچنان منتشر می‌ماند | افزودن هر سه به جدول C4 به‌عنوان **دروازه‌ی زنده‌ی fail-closed**: سازمان باید `ACTIVE`، پروفایل `ACTIVE` و Offer ‏`ACTIVE` باشد، وگرنه رکورد پنهان شود · در OQ-3 به فهرست دروازه‌ها افزوده شوند |
| **Y3** | 🟡 | **تله‌ی null در Prisma.** برای فیلد `Json?`، Prisma بین `Prisma.DbNull` (NULL در SQL) و `Prisma.JsonNull` (مقدار JSON ‏`null`) فرق می‌گذارد. در C5، بند ۲، فقط «مقدار NULL» آمده است. اگر G14a-2 ‏`JsonNull` بنویسد، `published_content IS NULL` برقرار نیست و CHECK رخداد WITHDRAWN را رد می‌کند | C5: صریحاً `Prisma.DbNull` یا حذف فیلد برای WITHDRAWN · C7: آزمون افزوده شود که JSON ‏`'null'` برای هر دو نوع رد شود |
| **Y4** | 🟢 | **رفتار عملیاتی شکست migration.** اگر preflight شکست بخورد، Prisma آن migration را در `_prisma_migrations` «failed» ثبت می‌کند و deploy بعدی تا `prisma migrate resolve` قفل می‌ماند · بین preflight و `ALTER` یک پنجره‌ی زمانی هست. پیامدش fail-closed است، چون ساخت CHECK روی ردیف تازه شکست می‌خورد | C8: یادداشت runbook ‏G14a-3 (resolve یا rollback) · اختیاری: `LOCK TABLE publications IN ACCESS EXCLUSIVE MODE` پیش از preflight |
| **Y5** | 🟢 | Prisma migration برگشتی (down) ندارد | C8: rollback یعنی یک migration رو‌به‌جلوی تازه با همان DDL، به‌همراه پیامد آن روی `_prisma_migrations` |
| **Z1** | 🟢 | ارجاع enum نادرست است | `schema.prisma:318-321` → `:322-325` |

---

## ۴. دستور Codex — G14a-1b (فقط سند؛ یک commit محلی)

```
INSTRUCTION_ID: CODEX-20260914-G14A1B-PUBLISHED-CONTENT-CCR-FIXES-001
TARGET_HANDOFF_ID: HANDOFF-20260914-GUARDIAN-G14A1-REVIEW
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260914-CORE-G14A
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260914_CLAUDE_REVIEW_G14A1_PUBLISHED_CONTENT_CCR.md (PINNED_COMMIT/SHA256 relayed)
DECISION: APPROVED_WITH_FIXES - within the owner's G14a-1 approval; no new approval needed.
MODE: DOCUMENT ONLY - ONE new LOCAL commit on codex/core-g14a-published-content on top of 9b64813
      (do not rewrite 31f3c22/9b64813).

PRECONDITION: GW2 or GW2-P on the pinned review; record the outputs; any failure -> STOP. Never touch credentials.

EDIT implementation/remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_PUBLICATION_PUBLISHED_CONTENT.md:
Y1 Envelope redundancy: remove target, target_id and content_revision from the JSON envelope (the row columns
   are the source of truth) -> envelope = { snapshot_version, content }; add to the CHECK for PUBLISHED:
   published_content ? 'snapshot_version' AND published_content ? 'content'.
   If you judge they must stay, instead define DB CHECKs enforcing equality with the row columns for all three,
   and state why. Update the C3 union, the C2 DDL, C5 and C7 accordingly.
Y2 Add to the C4 table as LIVE fail-closed gates (hide only, never add content):
   Organization.lifecycleStatus must be ACTIVE (schema.prisma:330; enum :239-242)
   BusinessProfile.lifecycleStatus must be ACTIVE (:478; enum :270-274)
   Offer.lifecycleStatus must be ACTIVE for its OfferVersion (:534; enum :298-301)
   and add them to the OQ-3 option A gate list.
Y3 C5 item 2: WITHDRAWN writes SQL NULL via Prisma.DbNull (or omits the field), NEVER Prisma.JsonNull.
   C7: add a test that JSON 'null' is rejected by the CHECK for both PUBLISHED and WITHDRAWN.
Y4 C8: the G14a-3 runbook note - a failed preflight leaves a failed row in _prisma_migrations that needs
   `prisma migrate resolve` (or a documented rollback) before any later deploy. Optionally add
   LOCK TABLE publications IN ACCESS EXCLUSIVE MODE before the preflight; state your choice.
Y5 C8: Prisma has no down migrations; rollback = a NEW forward migration with the DROP DDL, and its effect on
   _prisma_migrations.
Z1 Fix the citation schema.prisma:318-321 -> :322-325 (PublicationEventKind).
- Do NOT change any OQ recommendation except to add the Y2 gates to OQ-3; do NOT change the status (stays DRAFT).

REPORT: append a section "G14a-1b" to AI_HANDOFF/CODEX_REPORTS/20260914_CODEX_G14A1_PUBLISHED_CONTENT_CCR_REPORT.md
- a table: Y1-Y5, Z1 -> section -> applied / not applied (reason); the Y1 choice with its reason
- the new LF sha256 (git show bytes) of the CCR and the GW2/GW2-P outputs
Append only to mlino2/HANDOFF/HANDOFF_STATE.md.

PUSH: do NOT attempt to push. The repository ownership error cannot be fixed without git config, which is
forbidden. Commit locally and STOP; the Guardian reads the commit from the shared object store and publishes the
branch.
ALLOWED FILES (exactly three):
- the CCR (edit)
- the G14a-1 report (append a section)
- mlino2/HANDOFF/HANDOFF_STATE.md (append only)
FORBIDDEN:
- any migration, schema.prisma, code, test or config change
- running Prisma, npm, jest, Docker or any database query
- any push; any git config or safe.directory change
- rewriting commits
- deciding any OQ
- Docker, databases, port 5435, _PUSH_STAGING, credentials
```

**پس از G14a-1b:**
1. بررسی کوتاه نگهبان.
2. نگهبان شاخه را روی سرور منتشر می‌کند.
3. **بسته‌ی تصویب مالک:** متن CCR، OQ-1 تا OQ-5 و مجوز G14a-2 (پیاده‌سازی migration و service با DB آزمایشی روی 5499، روی همین شاخه).

## ۵. وضعیت دروازه‌ها

| دروازه | موضوع | وضعیت |
|---|---|---|
| G14a-1 | سند CCR ‏`published_content` | ⚠️ APPROVED_WITH_FIXES |
| **G14a-1b** | **Y1 تا Y5 و Z1** | ▶️ صادر شد |
| تصویب CCR، OQ-1 تا OQ-5 و G14a-2 | | ⏳ پس از G14a-1b، تصمیم مالک |
| G14a-3، G14b و G14c | | ⏳ تصویب جدا |

من کلاد هستم
