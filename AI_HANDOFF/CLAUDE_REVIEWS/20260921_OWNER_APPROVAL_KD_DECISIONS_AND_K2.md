# ثبت تصویب مالک — تصمیم‌های K-D1 تا K-D14 و مجوز K2 (CCR کاتالوگ)

**تاریخ:** ۲۱ سپتامبر ۲۰۲۶
**ثبت‌کننده:** Claude Opus 5 — نگهبان معماری MLINO
**مبنا:** `20260921_CLAUDE_REVIEW_K1_CATALOG_MEDIA.md` (commit `2adf7a3`) · سند طرح در شاخه‌ی `codex/catalog-media-design` @ `f02436f`

## ۱. متن تصویب مالک

> «توصیه‌های سند برای K-D1 تا K-D14 و یادداشت K-N1 تصویب شد؛ مرحله‌ی بعد (CCR کاتالوگ) مجاز است.»

## ۲. تصمیم‌های ثبت‌شده

همه طبق توصیه‌ی سند K1 و یادداشت نگهبان:

| # | تصمیم |
|---|---|
| **K-D1** | موجودیت عمومی تازه‌ی `CatalogItem` در هسته · نه گسترش `OfferVersion` و نه فقط در module |
| **K-D2** | چرخه‌ی DRAFT → ACTIVE → RETIRED با وضعیت انتشار جدا، هم‌راستا با الگوی Capability |
| **K-D3** | رسانه در جدول جدا با ترتیب مشخص، نه JSON روی خود قلم |
| **K-D4** | ارتباط اختیاری و چندبه‌چند میان پیشنهاد و قلم کاتالوگ، فقط پیش از انتشار نسخه · قلم هرگز از پیشنهاد مشتق نمی‌شود |
| **K-D5** | **فایل دوم جدا:** `mlino.v2.public-catalog.v1` · هیچ فیلدی به `public-business.v1` افزوده نمی‌شود |
| **K-D6** | فقط AVIF، WebP، JPEG و PNG · SVG و فرمت متحرک ممنوع |
| **K-D7** | حداکثر ۸ تصویر برای هر قلم · هر تصویر تا ۱٬۵۰۰٬۰۰۰ بایت · مجموع هر قلم تا ۸٬۰۰۰٬۰۰۰ بایت · ابعاد ۳۲۰ تا ۴۰۹۶ پیکسل |
| **K-D8** | نسبت پیشنهادی ۴:۳ با ناحیه‌ی امن مرکزی ۱:۱ · placeholder اختیاری و نسخه‌دار |
| **K-D9** | اصل فایل‌ها در پوشه‌ی خصوصی producer · فقط مشتق‌ها عمومی می‌شوند |
| **K-D10** | پاک‌سازی تصویرهای بی‌ارجاع پس از دو نسخه‌ی نگه‌داشته‌شده و مهلت هفت‌روزه · در خرابی، پاک‌سازی متوقف |
| **K-D11** | حافظه‌ی آفلاین فقط برای بایت‌های تأییدشده، با کلید اثرانگشت |
| **K-D12** | اجازه‌ی مستقل تازه برای مدیریت کاتالوگ، به‌علاوه‌ی اجازه‌ی انتشار موجود |
| **K-D13** | حداکثر ۸ تصویر و متن جایگزین اجباری |
| **K-D14 و K-N1** | **فایل کاتالوگ به شناسه‌ی snapshot فایل کسب‌وکارها گره می‌خورد** · ناسازگاری یعنی کاتالوگ همان کسب‌وکار نمایش داده نمی‌شود |

## ۳. هشدار نگهبان برای مرحله‌های اجرا

| # | هشدار |
|---|---|
| **K-W1** | این تغییر **migration دارد**. طبق قاعده‌ی IMPLICIT-G7، پس از ادغام migration، اجرای `docker compose up --build` آن را **بدون پشتیبان** اعمال می‌کند. پس از ادغام تا زمان اعمال محلیِ کنترل‌شده با پشتیبان، **هیچ ساخت دوباره‌ی کانتینر انجام نشود** |
| **K-W2** | قید فعلی جدول انتشار می‌گوید **دقیقاً یکی** از سه ستون هدف پر باشد (`publication_target_xor_check`). افزودن هدف چهارم باید این قید را به‌شکل سازگار گسترش دهد، نه دور بزند |
| **K-W3** | افزودن کلید اجازه‌ی تازه، فهرست اجازه‌های هسته را عوض می‌کند. باید بررسی شود که هیچ رفتار موجودی به طول یا ترتیب آن فهرست وابسته نباشد |

## ۴. دستور کدکس — K2

به خواست مالک، متن دستور کدکس انگلیسی است.

```
INSTRUCTION_ID: CODEX-20260921-K2-CATALOG-CCR-001
TARGET_HANDOFF_ID: HANDOFF-20260921-OWNER-APPROVAL-K2
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260921-CATALOG-MEDIA
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260921_OWNER_APPROVAL_KD_DECISIONS_AND_K2.md (PINNED_COMMIT/SHA256 relayed)
MODEL: SOL.
MODE: DOCUMENT ONLY - a NEW branch codex/catalog-ccr from origin/main at the pinned commit, in a NEW worktree
      C:/Users/galexy/mlino code/catalog-ccr. LOCAL commits only; do NOT push.
      No schema file change, no migration file, no code, no image, no database, no Docker, no network.
PRECONDITION: GW2 or GW2-P on the pinned record; record the outputs; any failure -> STOP. Never open any .env,
  GITHUB_TOKEN.txt or key file.
BASIS: the K1 design on origin/codex/catalog-media-design at f02436f9ac0c48e6df42cf879b5d187ab7d31efc and the
  owner decisions K-D1..K-D14 plus K-N1 as recorded in section 2 of the pinned record. Follow the existing CCR
  style in implementation/remediation/CONTRACT_CHANGE_REQUESTS/.

WRITE (new file): implementation/remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_CATALOG_ITEM_AND_MEDIA.md
covering, with file:line citations for every claim about today's code:
 C1 PHYSICAL MODEL: the exact proposed Prisma models for CatalogItem and CatalogItemMedia - every column, type,
   nullability, default, enum, index and composite relation - written as a DIFF PROPOSAL, not applied. Follow the
   organization-scoped composite-FK pattern already used by Capability and OfferVersion so a cross-organization
   reference is impossible. Include the optional many-to-many Offer link (K-D4) with its own tenant-safe table.
 C2 CONSTRAINTS: the CHECK constraints, mirroring the existing style: the price-mode rule exactly like
   offer_version_price_check (migration.sql:690-694), media ordering uniqueness per item, byte/dimension caps that
   belong in the database versus the service layer, the publication projection rule, and the lifecycle audit rule.
   Guardian K-W2: publications today enforce publication_target_xor_check with num_nonnulls(business_profile_id,
   capability_id, offer_version_id) = 1 (migration.sql:591-593). State EXACTLY how a fourth target column is added
   and how that constraint is rewritten so it still means 'exactly one target'.
 C3 SERVICES AND PERMISSIONS: the service surface (create, updatePublicFields, activate, retire, media add/reorder/
   remove) in the style of capability-service.ts, the new permission key (K-D12) and where it is registered
   (core/permission-registry.ts), and Guardian K-W3: prove nothing depends on the current length or order of
   CORE_PERMISSION_KEYS - cite what you checked.
 C4 PUBLICATION SNAPSHOT: the allowlisted snapshot written into published_content for a catalog item, including
   the media metadata (path, sha256, media_type, byte_size, width, height, alt_text, placeholder), mirroring
   publication-service.ts:89-138. No live-row read at export time.
 C5 PUBLIC ARTIFACT SCHEMA: the full 'mlino.v2.public-catalog.v1' envelope - contract_version, generated_at,
   snapshot_id, signature, records - where each record is organization-scoped, carries the business snapshot binding
   of K-D14/K-N1, and lists items with their media refs. Specify canonical-JSON rules identical to the existing
   artifact, the signing domain separator question (same or a distinct separator - recommend and justify), and the
   artifact size budget against the 2,000,000-byte distribution cap.
 C6 MIGRATION AND ROLLBACK: the forward migration steps in order, the rollback path, what happens to existing rows,
   and why the change is additive and safe. Guardian K-W1: state explicitly that after this migration is merged,
   `docker compose up --build` would apply it WITHOUT a backup, so container rebuilds are held until the controlled
   local apply with a backup.
 C7 ROLLOUT: the exact order (CCR, Core, export/distribution, consumer/AR, sample data) and why an old phone build
   never breaks, restating the K1 rollout with the artifact-before-media rule corrected to media-before-artifact.
 C8 TEST PLAN per slice: unit, integration on the disposable database, mutation proofs, and the end-to-end proof
   that a catalog item with media reaches the signed artifact and verifies in the consumer.
 C9 OPEN QUESTIONS that remain for the owner, if any, each with a recommendation; if none, say so explicitly.
REPORT (new file): AI_HANDOFF/CODEX_REPORTS/20260921_CODEX_K2_CATALOG_CCR_REPORT.md - the file, its LF sha256, the
  GW2/GW2-P outputs, the sources read, and anything you could NOT verify. Append only to
  mlino2/HANDOFF/HANDOFF_STATE.md. Commit locally and STOP.
ALLOWED FILES: the CCR file (new), the report (new), mlino2/HANDOFF/HANDOFF_STATE.md (append only).
FORBIDDEN: prisma/schema.prisma, any migration file, any code, the V2 app, any image; Docker; any database;
  network; main; _PUSH_STAGING; push; git config.
```

## ۵. پس از K2

بازبینی نگهبان، سپس تصویب مالک برای شروع ساخت در هسته. اجرای migration روی دیتابیس محلی، مثل همیشه، با پشتیبان و اجازه‌ی جداگانه انجام می‌شود.

من کلاد هستم
