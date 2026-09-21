# ثبت تصویب مالک — سند طرح «کاتالوگ با تصویر» (K1)

**تاریخ:** ۲۱ سپتامبر ۲۰۲۶
**ثبت‌کننده:** Claude Opus 5 — نگهبان معماری MLINO

## ۱. متن درخواست مالک

> «سند طرح کاتالوگ با تصویر را بده»

این مرحله، پیش‌نیاز خواسته‌ی اصلی مالک است: دیدن محصولات کسب‌وکار روی تصویر دوربین و ورق زدن آن‌ها.

**دامنه:** فقط سند. هیچ کدی، هیچ تغییری در قرارداد، هیچ تصویری و هیچ داده‌ای ساخته یا جابه‌جا نمی‌شود.

## ۲. مسئله‌ی معمارانه، به‌طور خلاصه

قرارداد داده‌ی عمومی امروز **«محصول» و «تصویر» ندارد**. فقط «خدمت» و «پیشنهاد» دارد، آن هم بدون رسانه. سه گره‌ی سخت وجود دارد که سند باید حلشان کند:

| # | گره |
|---|---|
| **K-A** | **مرز هسته.** «منو» مخصوص رستوران است و هسته باید بی‌طرف بماند. پس مفهوم باید عمومی باشد، مثل «قلم کاتالوگ»، تا رستوران از آن منو بسازد و فروشگاه فهرست کالا |
| **K-B** | **اعتماد به تصویر.** فایل ما مُهر رسمی دارد، ولی تصویر داخل آن نیست. اگر تصویر از جای دیگری بیاید، زیر مُهر نیست و قابل دست‌کاری است. راه‌حل: **اثرانگشت تصویر داخل همان فایل مُهرشده** باشد و برنامه پیش از نمایش آن را بسنجد |
| **K-C** | **سازگاری با نسخه‌ی امروز.** مصرف‌کننده‌ی فعلی نسخه‌ی دوم **هر فیلد ناشناخته را رد می‌کند** و کل فایل را کنار می‌گذارد. پس افزودن فیلد تازه، بدون برنامه‌ی نسخه‌بندی، برنامه‌ی روی گوشی را از کار می‌اندازد |

## ۳. تصمیم‌های نگهبان که در سند رعایت می‌شوند

| # | تصمیم |
|---|---|
| **K-G1** | تصویر **هرگز** بدون تطابق اثرانگشت نمایش داده نمی‌شود. اثرانگشت داخل فایل مُهرشده می‌آید |
| **K-G2** | خود تصویرها داخل فایل نمی‌روند، چون سقف اندازه‌ی فایل دو مگابایت است. فقط نشانی و اثرانگشت |
| **K-G3** | **هیچ تصویری از اینترنت یا شبکه‌های اجتماعی برداشته نمی‌شود.** تصویر آزمایشی باید ساختگی و بی‌ابهام باشد. حق تصویر کسب‌وکارها با خودشان است |
| **K-G4** | مفهوم تازه باید بی‌طرف و عمومی باشد، نه مخصوص رستوران یا کافه |
| **K-G5** | هر تغییر قرارداد، یک CCR جدا با تصویب مالک است. این سند فقط گزینه‌ها را می‌سنجد |

## ۴. دستور کدکس — K1

به خواست مالک، متن دستور کدکس انگلیسی است.

```
INSTRUCTION_ID: CODEX-20260921-K1-CATALOG-MEDIA-DESIGN-001
TARGET_HANDOFF_ID: HANDOFF-20260921-OWNER-APPROVAL-K1
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260921-CATALOG-MEDIA
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260921_OWNER_APPROVAL_CATALOG_MEDIA_DESIGN.md (PINNED_COMMIT/SHA256 relayed)
MODEL: SOL.
MODE: DOCUMENT ONLY - a NEW branch codex/catalog-media-design from origin/main at the pinned commit, in a NEW
      worktree C:/Users/galexy/mlino code/catalog-media-design. LOCAL commits only; do NOT push.
      No code, no schema, no migration, no image, no network, no Docker, no database.
PRECONDITION: GW2 or GW2-P on the pinned record; record the outputs; any failure -> STOP. Never open any .env,
  GITHUB_TOKEN.txt or key file.

READ FIRST (cite file:line for every factual claim):
- origin/main: implementation/prisma/schema.prisma (Capability, Offer, OfferVersion, Publication, published_content),
  implementation/core/{capability,offer,publication}-service.ts, implementation/public-export/{builder,canonical,
  cli,signing}.ts, implementation/public-export/distribution/distribute.ts, mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md,
  mlino2/MLINO_PUBLIC_EXPORT_OPERATIONS_DESIGN.md
- the V2 branch origin/codex/v2-intent-flow-foundation: mlino2/app/src/publicExport/{mapping,consumer,verify,
  transport}.ts (note the strict unknown-field rejection), src/ar/**, src/components/**, and the U2 adapter modules
- mlino2/MLINO_V2_REAL_UI_AND_ASSISTANT_DESIGN.md on origin/codex/v2-real-ui-design at 6f2c8a5

WRITE (new file): mlino2/MLINO_CATALOG_MEDIA_DESIGN.md, status DRAFT, covering:
 K1 DOMAIN MODEL (Guardian K-G4): options for representing a business's sellable/browsable items - (a) extend
   OfferVersion with media, (b) a NEW generic Core entity (for example CatalogItem with item_key, name, short
   description, optional price or on-request, optional grouping/section label, display order, availability window),
   (c) keep it entirely outside Core. For each: how it passes the Core/module test (business-agnostic), what it
   costs in schema and services, and how a cafe menu, a shop catalogue and a clinic service list all map onto it.
   Give a recommendation. Include the publication/lifecycle story (create, activate, publish, withdraw) mirroring
   the existing capability/offer flows.
 K2 MEDIA MODEL (Guardian K-G1, K-G2): each item may carry an ordered list of images. For each image define:
   content hash (sha256 of the exact bytes), media type allowlist, byte-size cap, pixel dimension caps, aspect
   ratio guidance for the AR card, and an optional blur/placeholder value. State explicitly that the bytes live
   OUTSIDE the signed artifact and that only the reference plus hash are inside it.
 K3 STORAGE AND DELIVERY: where the producer keeps the original files, how they reach the public folder next to
   public-business.v1.json, a content-addressed naming scheme (so a file never changes meaning), the Nginx route
   rules (exact-match or a tight prefix, correct content types, long immutable caching for content-addressed files,
   a real 404 and never the SPA page), and how unreferenced files are eventually removed. Reuse the existing
   distribution step's guarantees (signature check, atomic replace) and say what must be extended.
 K4 CONTRACT CHANGE AND COMPATIBILITY (Guardian K-C, K-G5): the V2 consumer rejects unknown fields
   (cite mapping.ts), so adding catalog_items breaks the deployed app. Compare: (a) additive field with a contract
   version bump and a coordinated consumer release, (b) a second artifact file served alongside the first,
   (c) relaxing the consumer to ignore unknown fields (and what that costs in strictness). Recommend one, and give
   the exact rollout order so a phone with the old build never breaks.
 K5 CONSUMER AND UI: how V2 verifies each image before display (hash match, size cap, type check), what happens on
   mismatch or a missing file (never show it, never fall back to an unverified source), lazy loading, offline
   behaviour, and how the AR vitrine renders a swipeable card stack from catalog items. Cite the current AR code.
 K6 TEST DATA (Guardian K-G3): how sample catalog items and images are produced for the existing test businesses
   WITHOUT taking any photo from the internet or social media - for example generated placeholder images - and how
   they carry the test marker and are withdrawn later.
 K7 THREAT AND FAILURE TABLE: swapped image bytes, hash mismatch, oversized media, wrong media type, a path that
   escapes the media folder, cache poisoning of an immutable name, artifact size growth against the 2,000,000-byte
   transport cap, and the offline case.
 K8 A NUMBERED LIST OF OPEN DECISIONS for the owner, each with a recommendation, plus a proposed execution split
   (for example K2 the CCR, K3 Core entity plus services, K4 export and distribution, K5 consumer and AR UI,
   K6 sample data), each needing its own approval.
 K9 An explicit 'not in scope' list (no push notifications, no payments, no native app, no product recommendations).
REPORT (new file): AI_HANDOFF/CODEX_REPORTS/20260921_CODEX_K1_CATALOG_MEDIA_DESIGN_REPORT.md - the file, its LF
  sha256, the GW2/GW2-P outputs, the sources read and anything you could NOT verify. Append only to
  mlino2/HANDOFF/HANDOFF_STATE.md. Commit locally and STOP.
ALLOWED FILES: mlino2/MLINO_CATALOG_MEDIA_DESIGN.md (new), the report (new), mlino2/HANDOFF/HANDOFF_STATE.md
  (append only).
FORBIDDEN: any code, schema, migration or contract change; any image file; any network call; Docker; any database;
  the V2 app; main; _PUSH_STAGING; push; git config.
```

## ۵. پس از K1

بازبینی نگهبان، سپس تصمیم مالک درباره‌ی پرسش‌های باز، و بعد اجرا در چند برش جدا. **ترتیب انتشار** مهم‌ترین نکته است: گوشی‌هایی که نسخه‌ی قدیمی دارند نباید از کار بیفتند.

من کلاد هستم
