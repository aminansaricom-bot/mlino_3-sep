# طراحی لایهٔ سرویس Core برای MLINO V1

**مرحله:** G9 — طراحی مستنداتی، بدون پیاده‌سازی
**وضعیت:** DRAFT — نیازمند بازبینی Guardian و تصمیم مالک برای موارد باز
**شاخهٔ مبنا:** `codex/core-prisma-foundation`
**اصل کلیدی:** این سند زبان و مرز سرویس را تعریف می‌کند؛ هیچ API، Repository، Prisma Client یا migration در این مرحله ساخته نمی‌شود.

## ۱. هدف، دامنه و قواعد تغییرناپذیر

لایهٔ سرویس Core باید عملیات معتبر روی هویت کسب‌وکار، عضویت، مجوز، قابلیت، پیشنهاد، نسخهٔ پیشنهاد، شواهد و انتشار را به شکل تراکنشی و tenant-safe در اختیار V1 قرار دهد. این لایه مالک business truth است و دادهٔ عمودی مثل پزشک، درمان، نوبت و ظرفیت را به ماژول Clinic واگذار می‌کند.

در این مرحله موارد زیر خارج از دامنه‌اند:

- پیاده‌سازی کد یا API
- تغییر `schema.prisma`، migration یا قراردادهای منجمد
- اتصال Content Studio یا V2
- persistence برای Intent، Session یا Consent
- تصمیم‌گیری دربارهٔ گزینه‌های باز S1 تا Sn

## ۲. مرز سرویس و زمینهٔ احراز هویت

هر فرمان سرویس با یک `AuthContext` مفهومی وارد می‌شود که حداقل شامل این موارد است: شناسهٔ هویت خارجی، سازمان انتخاب‌شده، عضویت سازمانی، مجوزهای معتبر و مرجع هویت پلتفرم در صورت عملیات پلتفرمی.

قاعدهٔ tenant اجباری W1 است:

> `organizationId` فقط از زمینهٔ احراز هویت می‌آید و به‌صورت scalar مستقیم در هر فرمان استفاده می‌شود.

سرویس نباید `organizationId` را از body، شناسهٔ موجودیت، relation nested، نام کسب‌وکار یا lookup قابل‌کنترل توسط کاربر بگیرد. هر query و mutation سازمان‌محور باید این scalar را در شرط اصلی خود داشته باشد.

W2 فقط یک گزینهٔ طراحی آینده است: حذف یا کاهش relationهای تکراری tenant در لایهٔ سرویس. W2 در این سند انتخاب نشده و نباید به‌عنوان پیش‌شرط پیاده‌سازی فرض شود؛ تا تصمیم مالک، W1 قاعدهٔ اجرایی است.

## ۳. مدل سرویس‌ها و عملیات اصلی

سرویس‌ها در این سند به‌عنوان boundaryهای مفهومی تعریف می‌شوند. نام متدها نمونهٔ قراردادی‌اند و هنوز API محسوب نمی‌شوند.

| سرویس | عملیات حداقلی | مالکیت و نتیجه |
|---|---|---|
| OrganizationService | ایجاد، مشاهده، archive | ایجاد/تغییر هویت سازمانی؛ archive دارای actor و reason است |
| IdentityClaimService | ثبت claim، مشاهدهٔ تاریخچه، تغییر وضعیت مجاز | claim از Organization جداست؛ verification مالکیت سازمان را اثبات نمی‌کند |
| IdentityVerificationService | شروع attempt، ثبت تصمیم پلتفرمی | reviewer با platform identity reference ثبت می‌شود، نه Membership |
| MembershipService | ایجاد، revoke، مشاهده | عضویت به external identity provider subject متصل است |
| PermissionGrantService | اعطا، revoke، بررسی | مجوز فقط از Membership + Grant می‌آید؛ Role منبع مجوز نیست |
| BusinessProfileService | ایجاد، ویرایش draft، مشاهدهٔ public projection | اطلاعات عمومی Core-owned برای مصرف آیندهٔ V2 |
| CapabilityService | ایجاد، ویرایش، تأیید، مشاهده | Capability عمومی Core است و به Clinic vocabulary وابسته نیست |
| OfferService | ایجاد Offer، ایجاد نسخه، مشاهدهٔ نسخه‌ها | Offer ظرف lifecycle است؛ محتوای نسخه پس از انتشار immutable است |
| EvidenceService | ثبت و اتصال evidence، تأیید | evidence به سازمان و حداکثر یکی از ownerهای typed متصل است |
| PublicationService | publish/withdraw از مسیر Publication | Publication رخداد append-only و منبع تغییر projection است |

تمام عملیات نوشتنی باید actor، سازمان، permission key و reason لازم را در زمینهٔ فرمان داشته باشند. نبودن permission یا ناسازگاری tenant قبل از نوشتن رد می‌شود.

## ۴. مالکیت موجودیت‌ها و مرز Core/Module

موجودیت‌های Core عبارت‌اند از Organization، BusinessIdentityClaim، IdentityVerification، Membership، PermissionGrant، BusinessProfile، Capability، Offer، OfferVersion، OfferVersionCapability، Evidence و Publication. شواهد schema برای مدل‌ها در `origin/main:implementation/prisma/schema.prisma:327-655` قرار دارد؛ شروع مدل‌ها به‌ترتیب در خطوط 327، 356، 383، 406، 437، 465، 496، 530، 547، 579، 593 و 626 است.

ماژول Clinic فقط vocabulary و workflow عمودی را نگه می‌دارد: خدمت درمانی، متخصص، appointment و capacity. Core نباید جدول یا شرطی برای clinic، doctor، treatment، patient یا appointment داشته باشد.

V2 از Core فقط از مسیر read contract آینده و دادهٔ منتشرشده استفاده می‌کند. V2 هرگز مستقیماً جدول ماژول را نمی‌خواند و V1 نیز business truth را از V2 دریافت نمی‌کند.

## ۵. مجوز، Membership و هویت

مطابق ADR-0009 و ADR-0010:

- Membership رابطهٔ سازمان با external identity provider subject است؛ مدل User/password داخلی در این لایه ایجاد نمی‌شود. Schema این دو فیلد را در `origin/main:implementation/prisma/schema.prisma:406-434` دارد.
- PermissionGrant با `organizationId`، `membershipId`، `permissionKey` و وضعیت grant کار می‌کند؛ schema در `origin/main:implementation/prisma/schema.prisma:437-462` این رابطه را نشان می‌دهد.
- Role صرفاً context یا الگوی نقش است و هیچ‌گاه منبع permission نیست.
- پلتفرم می‌تواند verification actor یا archive actor داشته باشد، اما این actor با Membership کسب‌وکار جایگزین نمی‌شود.
- Platform اجرا می‌کند؛ authorize کردن بر اساس Membership + Grant و policy مصوب انجام می‌شود.

مجوزهای publish و withdraw باید قبل از درج Publication بررسی شوند و permission key به snapshot رخداد منتقل شود. یک سرویس نمی‌تواند با دانستن role یا داشتن شناسهٔ سازمان، grant بسازد یا authority را تغییر دهد.

## ۶. تراکنش، W1 و Publication Projection

هر عملیات mutation یک واحد تراکنشی دارد:

۱. استخراج `organizationId` از AuthContext؛
۲. بررسی Membership فعال و PermissionGrant فعال؛
۳. خواندن رکورد با tenant شرط؛
۴. اعمال تغییر مجاز؛
۵. درج Publication در همان transaction برای عملیات publish/withdraw؛
۶. commit یا rollback کامل.

`publication_status` و `published_content_revision` در BusinessProfile، Capability و OfferVersion projection هستند، نه ورودی مستقل سرویس. Publication باید در همان تراکنش نوشته شود و trigger پایگاه داده projection را از رخداد معتبر اعمال کند. نوشتن مستقیم projection از لایهٔ سرویس ممنوع است.

D6=A است: تغییر فیلد عمومی Profile یا Capability باعث افزایش خودکار `content_revision` در دیتابیس می‌شود؛ تغییر مستقیم revision بدون تغییر فیلد عمومی باید رد شود. فیلدهای مرتبط در `origin/main:implementation/prisma/schema.prisma:465-527` و triggerهای D6 در `origin/main:implementation/prisma/migrations/20260913010000_add_core_foundation/migration.sql:846-890` ثبت شده‌اند.

## ۷. چرخهٔ Offer، Version و Publication

Offer ظرف سازمان‌محور lifecycle است و OfferVersion محتوای نسخه‌ای آن را نگه می‌دارد. نسخهٔ منتشرشده immutable است؛ اصلاح با ساخت نسخهٔ تازه انجام می‌شود. برای هر Offer حداکثر یک نسخهٔ published فعال است و جایگزینی باید با ترتیب امن انجام شود: withdraw نسخهٔ قبلی، سپس publish نسخهٔ جدید، هر دو در تراکنش‌های سازگار با policy انتشار.

Offer و OfferVersion در schema در `origin/main:implementation/prisma/schema.prisma:530-577` و قید یکتایی نسخهٔ منتشرشده در migration در `origin/main:implementation/prisma/migrations/20260913010000_add_core_foundation/migration.sql:509-513` آمده‌اند.

Publication رخداد immutable و append-only است. هر Publication فقط یکی از BusinessProfile، Capability یا OfferVersion را هدف می‌گیرد؛ FKهای مرکب tenant مانع cross-organization reference می‌شوند. رابطه‌های FK با `ON DELETE RESTRICT ON UPDATE RESTRICT` در migration خطوط `403-490` تعریف شده‌اند.

## ۸. نگاشت عملیات به ۱۳ Trigger و قیدهای دیتابیس

لایهٔ سرویس نباید منطق trigger را دور بزند؛ هر operation باید آن را به‌عنوان invariant پایین‌دستی در نظر بگیرد.

| operation | Trigger/قید مرتبط | انتظار سرویس |
|---|---|---|
| publish/withdraw Profile | `business_profile_publication_initial_guard` و `business_profile_publication_projection_guard` | فقط Publication معتبر؛ projection مستقیم ممنوع |
| publish/withdraw Capability | `capability_publication_initial_guard` و `capability_publication_projection_guard` | permission و Publication در همان تراکنش |
| publish/withdraw OfferVersion | `offer_version_publication_initial_guard` و `offer_version_publication_projection_guard` | رعایت نسخهٔ یکتا و ترتیب جایگزینی |
| درج Publication | `publication_apply_projection_after_insert` | درج رخداد منبع؛ projection در همان transaction |
| تغییر یا حذف Publication | `publication_immutable_before_change` | فقط insert؛ update/delete رد می‌شود |
| تغییر OfferVersion منتشرشده | `offer_version_immutable_before_change` | نسخهٔ تازه ساخته شود |
| تغییر پیوند Version/Capability | `offer_version_capability_immutable_before_change` | پیوند منتشرشده immutable بماند |
| تغییر Verification تصمیم‌گرفته | `identity_verification_decided_immutable_before_change` | history تصمیم حفظ شود |
| تغییر public Profile | `business_profile_content_revision_before_update` | D6 revision خودکار شود |
| تغییر public Capability | `capability_content_revision_before_update` | D6 revision خودکار شود |

این جدول ۱۳ Trigger غیرسیستمی را پوشش می‌دهد: ۳ Trigger Profile، ۳ Capability، ۴ Offer/Link، ۱ Verification و ۲ Publication. تعریف آن‌ها در `origin/main:implementation/prisma/migrations/20260913010000_add_core_foundation/migration.sql:760-1007` است. C15/D1 در همان migration خطوط `892-927` محافظت از projection را با سازوکار مصوب B1 انجام می‌دهد.

## ۹. مدل خطا و تبدیل مرزها

مدل خطا باید بدون افشای SQL، مسیر فایل، credential یا وجود/عدم وجود business اطلاعات لازم را منتقل کند.

| دسته | نمونه | رفتار پیشنهادی |
|---|---|---|
| Authentication | نبود یا نامعتبر بودن هویت خارجی | رد در مرز ورودی؛ بدون lookup سازمان |
| Authorization | Membership غیرفعال یا Grant کافی نیست | رد یکنواخت؛ Role به‌تنهایی کافی نیست |
| Tenant mismatch | شناسهٔ متعلق به سازمان دیگر یا زوج shadow ناسازگار | رد fail-closed؛ cross-organization reference هرگز به service نمی‌رسد |
| Lifecycle conflict | نسخهٔ منتشرشده immutable یا دو نسخهٔ active | خطای conflict قابل retry پس از refresh |
| Publication violation | projection مستقیم، target نامعتبر یا ترتیب غلط | خطای invariant؛ transaction rollback |
| Validation | فیلد لازم، تاریخ، قیمت یا owner ناقص | خطای ورودی بدون نوشتن |
| Database integrity | FK/CHECK/unique violation | mapping پایدار به خطای domain؛ جزئیات داخلی log-only |
| Unexpected | خطای ناشناخته | rollback، log داخلی و پاسخ عمومی بدون جزئیات |

کدهای transport و شکل error payload هنوز تصمیم مالک نیستند و در S6 باز هستند؛ این سند آن‌ها را انتخاب نمی‌کند.

## ۱۰. راهبرد آزمون و محیط مجاز

پیاده‌سازی آینده باید در محیط PostgreSQL disposable با storage `tmpfs` اجرا شود. اتصال به دیتابیس محلی دارای داده، volume توسعه‌دهنده یا محیط production برای تست مجاز نیست.

حداقل مجموعهٔ آزمون:

- authorization از Membership + Grant و رد Role-only
- W1: تلاش برای تزریق یا تغییر organizationId باید رد شود
- cross-organization FK و زوج‌های shadow
- publish/withdraw و projection همان transaction
- C15: رد نوشتن مستقیم projection و بررسی نبود trigger-depth leak
- D6: تغییر هر فیلد عمومی و رد تغییر مصنوعی revision
- immutability Publication، OfferVersion، پیوند Version/Capability و Verification تصمیم‌گرفته
- یکتایی یک نسخهٔ published و رقابت هم‌زمان publish
- error mapping برای P2002، P2003 و invariantهای trigger
- rollback کامل در شکست permission، validation یا DB constraint

هر آزمون منفی باید کد خطای مورد انتظار را بررسی کند؛ هر exception نامرتبط FAIL است. اجرای این آزمون‌ها هنوز انجام نشده و بخشی از implementation gate بعدی خواهد بود.

## ۱۱. تصمیم‌های باز و ماتریس انطباق ADR

### تصمیم‌های باز مالک — S1 تا Sn

این گزینه‌ها عمداً تصمیم‌گیری نشده‌اند:

| شناسه | موضوع | وضعیت |
|---|---|---|
| S1 | شکل API لایهٔ سرویس: internal application service، HTTP یا هر دو | OWNER_DECISION_REQUIRED |
| S2 | شکل نهایی AuthContext، issuer و اعتبارسنجی external subject | OWNER_DECISION_REQUIRED |
| S3 | پذیرش W2 برای حذف relationهای تکراری tenant | OWNER_DECISION_REQUIRED؛ W1 فعلاً اجباری |
| S4 | idempotency key و deduplication فرمان‌های publish/withdraw | OWNER_DECISION_REQUIRED |
| S5 | adapter و lifecycle هویت‌های پلتفرمی برای verification | OWNER_DECISION_REQUIRED |
| S6 | کدهای خطای transport و قرارداد error payload | OWNER_DECISION_REQUIRED |
| S7 | حداقل فیلدهای permission/gate snapshot در Publication | OWNER_DECISION_REQUIRED |
| S8 | محل فیزیکی Repository و service boundary در V1 | OWNER_DECISION_REQUIRED |
| S9 | read contract منتشرشده برای V2 و freshness آن | OWNER_DECISION_REQUIRED |

### ماتریس انطباق ADRهای مصوب

| ADR | قاعدهٔ مصوب | پاسخ این طراحی |
|---|---|---|
| ADR-0001 — V1 as Backbone | V1 ستون فقرات business truth است | Core Service Layer داخل V1 تعریف شده و V2 مصرف‌کنندهٔ publish است |
| ADR-0002 — Separate Repositories | مرز Content Studio مستقل بماند | این سند هیچ merge یا migration بین repositoryها تعریف نمی‌کند |
| ADR-0003 — Shared Recommendation Contract | recommendation زبان مشترک است | recommendation database یا engine در این مرحله وارد Core service نمی‌شود |
| ADR-0004 — Workspace/Organization Mapping | identity سازمان در V1 canonical است | عملیات این سند سازمان را از AuthContext و V1 می‌گیرد |
| ADR-0005 — Lifecycle Entity Separation | Recommendation/Action/Outcome/Evaluation جدا باشند | هیچ‌کدام در این service layer به یک entity واحد تبدیل نشده‌اند |
| ADR-0006 — Provenance vs Confirmation | منبع و تأیید جدا هستند | Evidence و confirmation actor جدا نگه داشته شده‌اند |
| ADR-0007 — Action Independent Entity | Action موجودیت مستقل آینده است | Action service در این مرحله ساخته نمی‌شود |
| ADR-0008 — Recommendation Lifecycle Ends at Decision | lifecycle recommendation با decision مرزبندی دارد | serviceهای recommendation در scope این سند نیستند |
| ADR-0009 — Role Is Not Permission | role منبع مجوز نیست | PermissionGrant به Membership متصل است و W1/permission check اجباری است |
| ADR-0010 — Platform Executes, Does Not Authorize | پلتفرم authority کسب‌وکار را ایجاد نمی‌کند | پلتفرم فقط verification/reference را ثبت می‌کند؛ grant از Membership/Grant می‌آید |
| ADR-0011 — Core/Module Boundary | Core عمومی و ماژول‌ها مستقل‌اند | Clinic vocabulary و workflow وارد Core Service نمی‌شود |
| ADR-0012 — Experience/Assistant/Session Boundary | Intent و Session در تجربه/Assistant می‌مانند | هیچ persistence یا service Core برای Intent/Session تعریف نشده است |

### شواهد schema و hashهای Git

تمام ارجاع‌های بالا بر مبنای bytes خوانده‌شده با `git show origin/main:<path>` هستند:

- `origin/main:implementation/prisma/schema.prisma:327-655` — SHA-256 محتوای Git: `760b25b59735c7dbb4b2ca4602f3ccf4dc353f5e3d71f2dff9ec893500222ee4`
- `origin/main:implementation/prisma/migrations/20260913010000_add_core_foundation/migration.sql:403-490` — FKهای tenant با Restrict/Restrict؛ SHA-256 محتوای Git: `99e7ae8a06e804d6fa282727ce5b5ef65e4bbea5add0e936b4d9604411751167`
- همان migration: `:509-513` برای یکتایی نسخهٔ published، `:696-755` برای projection/confirmation checks، و `:760-1007` برای Triggerهای lifecycle و publication.

این طراحی **تصمیم‌های باز را حل نمی‌کند** و تا بازبینی Guardian و تصویب مالک، مجوز ساخت service، Repository یا API ایجاد نمی‌کند.

من کدکس هستم.
