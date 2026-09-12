# سند حل موانع پیش از Prisma برای MLINO Core

**تاریخ:** ۲۰۲۶-۰۹-۱۲  
**نقش:** MLINO Core Data Model Engineer  
**INSTRUCTION_ID:** `CODEX-20260912-CORE-PRISMA-BLOCKER-RESOLUTION-001`  
**TARGET_HANDOFF_ID:** `HANDOFF-20260911-V2-INTENT-FLOW-FOUNDATION`  
**وضعیت:** تصمیم مستنداتی؛ بدون `schema.prisma`، Migration یا کد

## ۱. هدف و محدوده

این سند سه مانع ثبت‌شده در `MLINO_CORE_PRISMA_SCHEMA_INDEPENDENT_REVIEW.md` را به تصمیم و Gate اجرایی تبدیل می‌کند. این کار هنوز اجرای Prisma نیست.

در این مرحله هیچ‌کدام از موارد زیر تغییر نمی‌کند:

- `implementation/prisma/schema.prisma`؛
- Migrationهای موجود یا جدید؛
- کد Backend یا Repository؛
- ADR-0001 تا ADR-0012؛
- Content Studio، V2 یا API.

## ۲. راستی‌آزمایی پایهٔ شاخه و `ExternalWorkspaceLink`

### ۲.۱ وضعیت واقعی بررسی‌شده

| مورد | مقدار |
|---|---|
| شاخهٔ کاری | `codex/v2-intent-flow-foundation` |
| HEAD شاخه | `17759bee9a1cccd0825484d608572bd028263404` |
| `origin/main` پس از Fetch | `f23e297454236d468da8ed58858eda9e1cb5b8d5` |
| Merge-base | `95d7c26d8a8271a5ad55f1964a251d101f7184ef` |
| فاصله نسبت به `origin/main` | `55` commit عقب، `45` commit جلو |
| `ExternalWorkspaceLink` در HEAD شاخه | وجود ندارد |
| `ExternalWorkspaceLink` در `origin/main` | وجود دارد |
| Migration پیوند خارجی در HEAD شاخه | وجود ندارد |
| Migration پیوند خارجی در `origin/main` | `20260910020000_add_external_workspace_link` وجود دارد |

### ۲.۲ تصمیم حل مانع

پیاده‌سازی Prisma نباید روی HEAD فعلی این شاخه آغاز شود. پایهٔ مجاز پیاده‌سازی باید یک شاخهٔ مستقل از `origin/main` فعلی باشد یا یک Merge بازبینی‌شده که هر دو تاریخچه را بدون بازنویسی نگه دارد.

شرط عبور از این Gate:

1. `implementation/prisma/schema.prisma` در پایهٔ اجرا با `origin/main` برابر باشد؛
2. Migration `20260910020000_add_external_workspace_link` حفظ شده باشد؛
3. جدول و Unique جزئی `ExternalWorkspaceLink` بدون تغییر معنایی باقی بماند؛
4. هیچ Rebase مخرب روی تاریخچهٔ Push‌شده انجام نشود؛
5. برابری فایل‌ها و نتیجهٔ Merge پیش از اولین مدل جدید ثبت شود.

در این مرحله شاخه جابه‌جا یا همگام نشد؛ فقط الزام آن تعیین و راستی‌آزمایی شد. `ExternalWorkspaceLink` بخشی از مدل‌های جدید این سند نیست، اما بخشی از پایهٔ واقعی Core است و حذف یا نادیده‌گرفتن آن مجاز نیست.

## ۳. سیاست Foreign Key برای حذف و به‌روزرسانی

### ۳.۱ قاعدهٔ عمومی

برای همهٔ Foreign Keyهای Core:

- `ON DELETE RESTRICT`؛
- `ON UPDATE RESTRICT`؛
- هیچ `CASCADE`، `SET NULL` یا حذف آبشاری ضمنی؛
- شناسه‌های Organization و رکوردهای مرجع تغییرناپذیرند؛
- حذف منطقی با تغییر وضعیت انجام می‌شود؛
- بازکردن رابطهٔ اختیاری فقط با عملیات دامنه‌ای صریح و ممیزی‌شده ممکن است، نه با Cascade خودکار.

`RESTRICT` در این سند به‌معنای رفتار محدودکننده در سطح PostgreSQL است. نام دقیق `onDelete` و `onUpdate` در Prisma باید همین معنا را حفظ کند؛ تکیه بر Default ابزار مجاز نیست.

### ۳.۲ سیاست هر رابطه

| رابطه | حذف والد | به‌روزرسانی کلید والد | رفتار دامنه‌ای |
|---|---|---|---|
| Organization → Claim | `RESTRICT` | `RESTRICT` | سازمان آرشیو می‌شود؛ Claim حذف نمی‌شود |
| Organization → Verification | `RESTRICT` | `RESTRICT` | تاریخچهٔ Verification باقی می‌ماند |
| Organization → Membership | `RESTRICT` | `RESTRICT` | Membership لغو می‌شود |
| Organization → PermissionGrant | `RESTRICT` | `RESTRICT` | Grant لغو می‌شود |
| Organization → BusinessProfile | `RESTRICT` | `RESTRICT` | Profile آرشیو یا از انتشار خارج می‌شود |
| Organization → Capability | `RESTRICT` | `RESTRICT` | Capability بازنشسته می‌شود |
| Organization → Offer | `RESTRICT` | `RESTRICT` | Offer بازنشسته می‌شود |
| Organization → Publication | `RESTRICT` | `RESTRICT` | تاریخچهٔ Publication هرگز حذف نمی‌شود |
| Claim → IdentityVerification | `RESTRICT` | `RESTRICT` | Claim و تلاش‌ها تاریخی می‌مانند |
| Claim → BusinessProfile | `RESTRICT` | `RESTRICT` | Claim قدیمی حذف نمی‌شود؛ پیوند تازه رکورد/عملیات صریح می‌خواهد |
| Membership → PermissionGrant | `RESTRICT` | `RESTRICT` | Membership لغوشده سابقهٔ Grant را نگه می‌دارد |
| Membership → Claim.submitter | `RESTRICT` | `RESTRICT` | ثبت‌کنندهٔ تاریخی حذف نمی‌شود |
| Membership → Grant actor/revoker | `RESTRICT` | `RESTRICT` | ممیزی اعطا و لغو باقی می‌ماند |
| Membership → confirmer/archiver/Publication performer | `RESTRICT` | `RESTRICT` | لغو عضویت سابقهٔ اقدام را از بین نمی‌برد |
| Offer → OfferVersion | `RESTRICT` | `RESTRICT` | Offer بازنشسته می‌شود؛ Version تاریخی باقی می‌ماند |
| Capability → OfferVersionCapability | `RESTRICT` | `RESTRICT` | رابطهٔ نسخه‌ای حذف آبشاری ندارد |
| OfferVersion → OfferVersionCapability | `RESTRICT` | `RESTRICT` | پیوند نسخه Immutable می‌ماند |
| Capability/OfferVersion → Evidence | `RESTRICT` | `RESTRICT` | Evidence منقضی یا Withdrawn می‌شود |
| Profile/Capability/OfferVersion → Publication | `RESTRICT` | `RESTRICT` | موضوع از انتشار خارج می‌شود؛ رخداد باقی می‌ماند |
| ExternalWorkspaceLink → Organization | `RESTRICT` | `RESTRICT` | لینک Revoked می‌شود و تاریخچه حفظ می‌شود |

در روابط اختیاری، `SET NULL` فقط به‌عنوان نتیجهٔ یک عملیات دامنه‌ای صریح قابل‌قبول است؛ FK نباید خودکار پیوند را تهی کند. این عملیات باید پیش از unlink، اثر آن بر Publication و تاریخچه را بررسی کند.

### ۳.۳ قواعد حفظ تاریخچه

این رکوردها پس از ایجاد، در MVP حذف فیزیکی نمی‌شوند:

- BusinessIdentityClaim؛
- IdentityVerification؛
- Membership؛
- PermissionGrant؛
- BusinessProfile دارای هرگونه Publication؛
- Capability دارای Evidence، OfferVersion یا Publication؛
- Offer و OfferVersion؛
- Evidence؛
- OfferVersionCapability؛
- Publication؛
- ExternalWorkspaceLink.

جایگزین حذف:

- Organization: `ARCHIVED`؛
- Claim: `REJECTED` یا `EXPIRED`، و در وضعیت‌های مصوب `SUSPENDED`؛
- Membership و Grant: `REVOKED`؛
- Profile: `ARCHIVED` یا `WITHDRAWN`؛
- Capability: `RETIRED` یا `WITHDRAWN`؛
- Offer: `RETIRED`؛
- OfferVersion: `WITHDRAWN`؛
- Evidence: `EXPIRED` یا `WITHDRAWN`؛
- ExternalWorkspaceLink: `REVOKED`.

هیچ وضعیت جدیدی برای دورزدن این سیاست اضافه نمی‌شود. هر تغییر وضعیت حساس باید فیلدهای ممیزی مصوب همان مدل را پر کند.

## ۴. تصمیم منبع حقیقت Publication و `publication_status`

### ۴.۱ تصمیم

`Publication` منبع حقیقت **رخدادهای تغییر انتشار** است. `publication_status` روی BusinessProfile، Capability و OfferVersion یک Projection جاری است و منبع رخداد مستقل نیست.

قواعد:

- هر تغییر انتشار با یک Publication Event ثبت می‌شود؛
- Projection فقط در همان تراکنش رخداد تغییر می‌کند؛
- مقدار `PUBLISHED` فقط از رخداد `PUBLISHED` و مقدار `WITHDRAWN` فقط از رخداد `WITHDRAWN` می‌آید؛
- `UNPUBLISHED` مقدار اولیهٔ پیش از نخستین رخداد است؛
- تغییر مستقیم Projection بدون رخداد ممنوع است؛
- Publication فقط‌افزودنی است و Update/Delete ندارد؛
- Grant مصرف‌شده در MVP به‌صورت `grant_id` در Publication ذخیره نمی‌شود؛ `permission_key` و Membership اجراکننده ثبت می‌شوند.

### ۴.۲ ترتیب جایگزینی نسخهٔ Offer

جایگزینی نسخه در یک تراکنش و با این ترتیب انجام می‌شود:

1. ثبت رخداد `WITHDRAWN` برای Publication نسخهٔ قدیمی؛
2. Projection نسخهٔ قدیمی به `WITHDRAWN`؛
3. ثبت رخداد `PUBLISHED` برای نسخهٔ تازه؛
4. Projection نسخهٔ تازه به `PUBLISHED`؛
5. Unique جزئی Database تضمین می‌کند بیش از یک نسخهٔ Published برای Offer وجود نداشته باشد.

Version قدیمی Immutable می‌ماند؛ محتوای آن بازنویسی نمی‌شود. انتشار دوبارهٔ محتوا با Version تازه انجام می‌شود.

### ۴.۳ خواندن و انقضا

`publication_status = PUBLISHED` شرط لازم است، اما کافی نیست. Published Read Port باید در لحظهٔ خواندن وضعیت Organization، Claim، freshness، بازهٔ اعتبار Offer و شرط‌های Evidence را دوباره بررسی کند.

انقضای Claim، Evidence یا Offer و آرشیو Organization بدون رخداد جعلی Publication اثر خواندن را می‌بندد. این کنترل ایمنی به نام Platform انتشار یا Withdrawal کسب‌وکاری ثبت نمی‌کند.

برای Profile و Capability که درجا ویرایش می‌شوند:

- `content_revision` با هر تغییر محتوای عمومی افزایش می‌یابد؛
- Publication مقدار منتشرشده را در `published_content_revision` ثبت می‌کند؛
- نابرابری این دو مقدار، رکورد را از Published Read Port خارج می‌کند؛
- تغییر عمومی بدون افزایش Revision باید در سطح Database یا تنها مسیر نوشتن معتبر رد شود.

## ۵. راهکار PostgreSQL برای C15

### ۵.۱ انتخاب طراحی

راهکار پیشنهادی و مبنای CCR: **Triggerهای محدود و صریح PostgreSQL**، همراه با تست تراکنشی. این انتخاب برای C15 از یک بررسی صرفاً Application-level قوی‌تر است، چون تغییر مستقیم Projection و رقابت تراکنش‌ها را در همان مرز Database کنترل می‌کند.

### ۵.۲ اجزای لازم

1. Trigger درج روی `publications`:
   - XOR هدف را بررسی کند؛
   - هم‌سازمانی هدف، Membership اجراکننده و نوع رخداد را بررسی کند؛
   - برای رخداد `PUBLISHED` یا `WITHDRAWN`، Projection هدف را در همان تراکنش به‌روزرسانی کند؛
   - برای Profile و Capability، Revision منتشرشده را از Event به Projection منتقل کند؛
   - برای OfferVersion، `published_at` را فقط از Event تغییر دهد.

2. Trigger محافظ روی هر Target:
   - تغییر مستقیم `publication_status`، `published_content_revision` یا `published_at` را رد کند؛
   - فقط تغییر نشانه‌گذاری‌شده‌ای را بپذیرد که از مسیر Publication Trigger در همان تراکنش آمده است.

3. Unique جزئی PostgreSQL:
   - روی `(offer_id)` با شرط `publication_status = 'PUBLISHED'`؛
   - روی شناسهٔ Claim با شرط‌های وضعیت مصوب؛
   - روی Membership و PermissionGrant مطابق مدل.

4. Checkهای PostgreSQL:
   - XOR زوج‌های Shadow؛
   - یکسانی `organization_id` در دو سر رابطه؛
   - بازهٔ `valid_from`/`valid_until`؛
   - سازگاری قیمت و `on_request`؛
   - بازهٔ confidence؛
   - هماهنگی Revision و Confirmation.

جزئیات نام Function، Trigger و نشانهٔ تراکنش در CCR/آزمون PostgreSQL نهایی می‌شود؛ این سند روش و رفتار الزام‌آور را تعیین کرده و Migration تولید نمی‌کند.

### ۵.۳ رفتار لازم C15

آزمون PostgreSQL باید ثابت کند:

- Update مستقیم `publication_status` بدون Event رد می‌شود؛
- درج Event Projection درست را در همان تراکنش تغییر می‌دهد؛
- Rollback، Event و Projection را هر دو برمی‌گرداند؛
- ترتیب Withdrawal قدیمی پیش از Publish تازه برقرار است؛
- دو Publish هم‌زمان برای یک Offer بیش از یک Version Published ایجاد نمی‌کنند؛
- تغییر محتوای Profile/Capability بدون Revision معتبر یا بدون Publication مجدد به خروج از Read Port منجر می‌شود؛
- Update/Delete Publication رد می‌شود؛
- Triggerهای دستی در Migration بعدی Prisma ناخواسته حذف نمی‌شوند.

## ۶. وضعیت حل سه مانع

| مانع | نتیجهٔ این سند | وضعیت اجرایی |
|---|---|---|
| RR1: پایه و ExternalWorkspaceLink | پایهٔ مجاز، `origin/main` فعلی با حفظ Migration موجود تعیین شد | **Gate باز تا همگام‌سازی واقعی** |
| RR2: حفظ Tenant در روابط | کلیدهای مرکب و سیاست Restrict برای همهٔ روابط الزام‌آور شد | **حل طراحی؛ نیازمند CCR/DDL** |
| C15: Publication Projection | Publication به‌عنوان رخداد و Trigger تراکنشی به‌عنوان راهکار مبنا انتخاب شد | **حل طراحی؛ نیازمند آزمون PostgreSQL** |

بنابراین ابهام معماری سه مانع رفع شده است، اما تا اجرای دو راستی‌آزمایی فیزیکی زیر اجازهٔ ساخت `schema.prisma` صادر نمی‌شود:

1. همگام‌سازی واقعی شاخه با `origin/main` و ثبت برابری پایه؛
2. اجرای `PRISMA_POSTGRESQL_CONSTRAINT_VALIDATION.md` برای FK، Check، Unique جزئی و C15.

## ۷. خارج از دامنه

این سند هیچ‌کدام از موارد زیر را ایجاد یا تغییر نمی‌دهد:

- `schema.prisma`؛
- Migration؛
- Backend یا API؛
- Clinic tables؛
- Action، Intent، Session persistence یا Consent persistence؛
- Customer Data؛
- ADR یا تصمیم معماری جدید.

**من کدکس هستم.**
