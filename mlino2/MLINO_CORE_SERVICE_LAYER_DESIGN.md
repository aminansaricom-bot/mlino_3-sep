# طراحی لایهٔ سرویس Core برای MLINO V1

**مرحله:** G9b — اصلاح طراحی مستنداتی، بدون پیاده‌سازی
**وضعیت:** DRAFT — منتظر بازبینی Guardian و تصمیم مالک برای گزینه‌های باز
**دامنه:** طراحی boundaryهای سرویس برای مدل‌های Core موجود؛ بدون API، repository، Prisma یا migration
**مرجع اصلاح:** بازبینی pin‌شدهٔ G9 در commit `e79585ba3431b662fd32819a57f92bd88b3c855d` با SHA-256 محتوای فایل `35def70586113d2a0f08c9f1155d31a09e688aed2d9a48ae5efc01fae2ff32c7`

## ۱. هدف، دامنه و قواعد تغییرناپذیر

این لایه عملیات معتبر روی Organization، Business Identity Claim، Identity Verification، Membership، Permission Grant، Business Profile، Capability، Offer، Offer Version، Evidence و Publication را به‌شکل tenant-safe و تراکنشی در اختیار V1 قرار می‌دهد. این موجودیت‌ها در schema در `origin/main:implementation/prisma/schema.prisma:327-655` تعریف شده‌اند؛ شروع مدل‌ها به‌ترتیب در خطوط 327، 356، 383، 406، 437، 465، 496، 530، 547، 579، 593 و 626 است.

موارد زیر خارج از دامنه‌اند:

- هر نوع کد، API، repository، Prisma Client یا migration
- اتصال Content Studio یا V2 در سطح write
- persistence برای Intent، Session یا Consent
- موجودیت‌های Clinic و واژگان عمودی
- ExternalWorkspaceLink؛ این مدل خارج از دامنهٔ این service layer است و در migration پیشین V1/ADR-0004 دنبال می‌شود
- تصمیم‌گیری دربارهٔ گزینه‌های S و تصمیم bootstrap؛ فقط گزینه و توصیه ثبت می‌شود

## ۲. لایه‌بندی، مرز caller و زمینهٔ احراز هویت

پیشنهاد جای‌گذاری در چارچوب ADR-0002 و ADR-0011 این است:

| لایه | مسئولیت | مجاز به چه چیزی نیست |
|---|---|---|
| Repository | خواندن/نوشتن tenant-scoped با transaction handle و شرط سازمان | استخراج سازمان از body یا اعمال business authorization بر اساس Role |
| Service | lifecycle، permission، invariantهای دامنه، ترتیب قفل و transaction | دورزدن trigger، نوشتن مستقیم projection یا ساخت authority جدید |
| Caller boundary | ساختن AuthContext معتبر و ارسال فرمان | تعیین organizationId از ورودی کنترل‌شده توسط کاربر |
| Public read boundary | خواندن projection عمومی منتشرشده برای V2، در مسیر جدا و فقط‌خواندنی | خواندن جدول ماژول یا انتشار دادهٔ داخلی |

این محل پیشنهادی است و انتخاب نهایی محل فیزیکی Repository و Service به S8 وابسته است؛ ADR-0002 مرز repositoryها را مستقل نگه می‌دارد و ADR-0011 مرز Core/Module را حفظ می‌کند.

هر فرمان با `AuthContext` مفهومی وارد می‌شود: external subject، سازمان انتخاب‌شده، Membership و Grantهای معتبر، و در صورت کنش پلتفرمی platform identity reference.

قاعدهٔ اجباری W1:

> `organizationId` فقط از AuthContext می‌آید و به‌صورت scalar مستقیم به عملیات داده می‌شود.

الگوی امضای پیشنهادی هر متد repository این است: `method(organizationId, ...)`. هیچ `findUnique({ id })` بدون سازمان مجاز نیست؛ الگوی مجاز `where: { id, organizationId }` یا معادل مرکب آن است. `organizationId` هرگز از body، شناسهٔ موجودیت، nested relation، نام کسب‌وکار یا lookup قابل‌کنترل توسط caller پذیرفته نمی‌شود.

W2 فقط گزینهٔ آینده برای کاهش relationهای تکراری tenant است و انتخاب نشده است.

W1 و Database دو نقش جدا دارند: FKهای مرکب `(id, organization_id)` و CHECKهای زوج shadow فقط سازگاری درون‌ردیفی را تضمین می‌کنند؛ DB نمی‌داند سازمان ریشه همان سازمان caller است. این بخش فقط با W1 تضمین می‌شود. FK مرکب در حالت `MATCH SIMPLE` با NULL شدن بخشی از کلید می‌تواند بررسی نشود و C6 با CHECKهای جفتی این حفره را می‌بندد؛ این قیود در `origin/main:implementation/prisma/migrations/20260913010000_add_core_foundation/migration.sql:513-584` هستند. تنها خواندن بین‌سازمانی مجاز، public projection جدا و read-only برای V2 است و جزئیات آن به S9 وابسته است.

## ۳. مدل سرویس‌ها و عملیات اصلی

| سرویس | عملیات | actor و permission موردنیاز |
|---|---|---|
| OrganizationService | archive سازمان، مشاهده | Membership با `organization.archive`؛ archive پلتفرمی طبق جدول بخش ۵ |
| IdentityClaimService | ثبت claim، مشاهدهٔ تاریخچه، گذار وضعیت | Membership با permission مربوط به claim؛ گذارهای پلتفرمی طبق بخش ۶ |
| IdentityVerificationService | شروع attempt، ثبت تصمیم | شروع با Membership؛ تصمیم با platform identity reference |
| MembershipService | ایجاد، revoke، مشاهده | Membership مجاز یا platform ref برای revoke مجاز |
| PermissionGrantService | اعطا، revoke، بررسی | actor مجاز با permission grant management؛ Role منبع permission نیست |
| BusinessProfileService | ایجاد، ویرایش public fields، خواندن | Membership + grant سازمانی |
| CapabilityService | ایجاد، ویرایش، مشاهده، publication request | Membership + grant سازمانی |
| OfferService | ایجاد Offer، ایجاد نسخه، مشاهدهٔ نسخه‌ها، جایگزینی انتشار | Membership + grant سازمانی |
| EvidenceService | ثبت و اتصال evidence، تأیید | Membership + grant سازمانی |
| PublicationService | publish/withdraw از مسیر Publication | همیشه Membership کسب‌وکار؛ platform ref به‌تنهایی مجاز نیست |

هر عملیات نوشتنی باید actor، `organizationId`، permission key و reason مناسب داشته باشد. این جدول طرح مفهومی است؛ نام permissionهای نهایی و transport در تصمیم‌های باز باقی می‌مانند.

## ۴. مالکیت موجودیت‌ها و مرز Core/Module

Core مالک تمام مدل‌های فهرست‌شده در بخش ۱ است. Clinic فقط vocabulary و workflow عمودی مانند خدمت درمانی، متخصص، appointment و capacity را نگه می‌دارد و هیچ‌کدام در Core Service وارد نمی‌شوند. V2 فقط از public read contract آینده و دادهٔ منتشرشده استفاده می‌کند و مستقیماً جدول‌های ماژول را نمی‌خواند. این مرز با مدل‌های Core در `origin/main:implementation/prisma/schema.prisma:465-655` و با قواعد FK در `origin/main:implementation/prisma/migrations/20260913010000_add_core_foundation/migration.sql:403-490` قابل ردیابی است.

ExternalWorkspaceLink در این لایه پیاده‌سازی یا مصرف نمی‌شود؛ رابطهٔ workspace و organization طبق ADR-0004 دامنهٔ جداگانهٔ خود را دارد.

## ۵. مجوز، Membership، هویت و bootstrap سازمان

Membership به external identity provider subject متصل است؛ schema آن را در `origin/main:implementation/prisma/schema.prisma:406-434` نشان می‌دهد. PermissionGrant به Membership و Organization متصل است و در `origin/main:implementation/prisma/schema.prisma:437-462` تعریف شده است.

قواعد قطعی:

- Permission فقط از Membership + Permission Grant می‌آید.
- Role هرگز منبع permission نیست.
- platform identity reference با business Membership جایگزین نمی‌شود.
- Platform طبق ADR-0010 می‌تواند عملیات مجاز را اجرا یا لغو کند، اما authority تازه ایجاد نمی‌کند.
- Publication همیشه `performed_by_membership_id` می‌خواهد؛ platform ref به‌تنهایی هرگز Publication ایجاد نمی‌کند. این الزام در schema/migration بخش Publication و قیدهای آن در `origin/main:implementation/prisma/migrations/20260913010000_add_core_foundation/migration.sql:626-695` و `:403-490` قابل ردیابی است.

### تصمیم باز R4 — bootstrap

Schema نشان می‌دهد Organization با شناسهٔ AC-2 ساخته‌شده/تخصیص‌یافته کار می‌کند و grant مؤسس می‌تواند مسیر عادی grantor را دور بزند؛ جزئیات CHECKهای grant در `origin/main:implementation/prisma/migrations/20260913010000_add_core_foundation/migration.sql:658-683` است. این سند مالک تصمیم را نمی‌گیرد:

| گزینه | پیامد | توصیهٔ اجرایی برای بررسی مالک |
|---|---|---|
| R4-A: پلتفرم bootstrap را انجام دهد | ساده‌تر، اما نیازمند مرز روشن platform identity و audit قوی | توصیه: فقط اگر actor پلتفرم و audit آن پیشاپیش تعریف شود |
| R4-B: AC-2 bootstrap را انجام دهد | با مالکیت AC-2 هم‌راستا، اما نیازمند قرارداد AC-2 | توصیه: گزینهٔ اصلی بررسی، مشروط به قرارداد رسمی AC-2 |
| R4-C: ترکیب پلتفرم و AC-2 | انعطاف بیشتر، اما مسیرهای بیشتر و ریسک ambiguity | توصیه نمی‌شود مگر نیاز عملیاتی اثبات شود |

هر گزینه باید این invariantها را حفظ کند: Organization، founding Membership و founding Grant در یک transaction ساخته شوند؛ bootstrap فقط یک‌بار برای هر organization رخ دهد؛ grant مؤسس به‌عنوان مسیر استثنایی و audit‌شده ثبت شود.

### جدول مجوز عملیات

| عملیات | permission key مفهومی | نوع actor مجاز |
|---|---|---|
| archive Organization | `organization.archive` | Membership دارای Grant؛ یا platform ref فقط طبق policy مصوب |
| ثبت/ویرایش Profile | `business_profile.manage` | Membership دارای Grant |
| ایجاد/ویرایش Capability | `capability.manage` | Membership دارای Grant |
| ایجاد Offer و Version | `offer.manage` | Membership دارای Grant |
| ثبت Evidence | `evidence.manage` | Membership دارای Grant |
| publish/withdraw | `publication.manage` | فقط Membership دارای Grant؛ platform ref به‌تنهایی نه |
| revoke Membership | `membership.revoke` | Membership دارای Grant یا platform ref طبق policy |
| revoke Permission Grant | `permission_grant.revoke` | Membership دارای Grant یا platform ref طبق policy |
| تغییر وضعیت Claim | `identity_claim.review` | platform ref برای وضعیت‌های پلتفرمی؛ Membership فقط در مسیر مجاز claim |
| تصمیم Verification | `identity_verification.decide` | platform identity reference |

این جدول نام نهایی transport یا permission registry را تثبیت نمی‌کند؛ فقط actor boundary لازم را مشخص می‌کند.

## ۶. ماشین حالت Claim و Verification

Business Identity Claim از Organization جداست و Verification مالکیت سازمان نیست؛ Claim و Verification در schema به‌ترتیب در `origin/main:implementation/prisma/schema.prisma:356-404` آمده‌اند. Trigger گذار برای Claim وجود ندارد؛ CHECKهای Claim فقط کامل بودن audit فیلدها را کنترل می‌کنند و در `origin/main:implementation/prisma/migrations/20260913010000_add_core_foundation/migration.sql:609-630` دیده می‌شوند. بنابراین ماشین حالت در Service اجرا می‌شود.

پنج وضعیت Claim باید در service با جدول زیر کنترل شوند؛ وضعیت دقیق `REJECTED → VERIFIED` تصمیم مالک است و این سند آن را مجاز فرض نمی‌کند:

| وضعیت فعلی | وضعیت بعدی پیشنهادی برای تصمیم مالک | actor | transaction |
|---|---|---|---|
| PENDING | VERIFIED یا REJECTED | platform ref | تصمیم Verification و Claim در یک transaction |
| PENDING | EXPIRED | system actor بدون actor انسانی | transaction سیستمی |
| VERIFIED | SUSPENDED | platform ref | همراه audit دلیل |
| SUSPENDED | VERIFIED یا REJECTED | platform ref | فقط اگر transition تصویب شود |
| REJECTED | PENDING یا EXPIRED | platform ref/system طبق مسیر | ایجاد attempt تازه؛ نه بازنویسی attempt قبلی |

Verification تصمیم‌گرفته‌شده immutable است؛ trigger آن با پیام `decided identity verification is immutable` در `origin/main:implementation/prisma/migrations/20260913010000_add_core_foundation/migration.sql:828-844` تعریف شده است. Verification decision و Claim transition باید در یک transaction ثبت شوند تا تصمیم و وضعیت Claim از هم جدا نشوند. `attempt_number` باید پیش از درج attempt با ترتیب قفل ثابت یا retry روی unique conflict مدیریت شود؛ قید `claim_attempt_unique` در همان بخش Claim migration ثبت شده است.

## ۷. تراکنش، revision انتشار و چرخهٔ Offer

هر mutation این ترتیب را رعایت می‌کند: استخراج W1، بررسی Membership/Grant، قفل و خواندن tenant-scoped، اعمال تغییر، ثبت Publication در همان transaction در صورت نیاز، سپس commit یا rollback.

### Profile و Capability

- برای publish، `Publication.content_revision` باید دقیقاً برابر `content_revision` جاری ردیف باشد.
- ردیف Profile یا Capability در همان transaction با `FOR UPDATE` خوانده می‌شود؛ revision خوانده‌شده همان مقداری است که به Publication می‌رود.
- اگر ردیف PUBLISHED است، republish فقط با revision بزرگ‌تر مجاز است.
- اختلاف همزمانی پس از قفل/خواندن باید به conflict قابل retry تبدیل شود.
- withdraw باید `published_content_revision` را حمل کند، نه revision جاری.

این منطق projection در `origin/main:implementation/prisma/migrations/20260913010000_add_core_foundation/migration.sql:931-1005` و فیلدهای Profile/Capability در `origin/main:implementation/prisma/schema.prisma:465-527` قابل استناد است.

D6=A برقرار است: تغییر هر public field در Profile یا Capability revision را در DB یک واحد افزایش می‌دهد و تغییر مستقیم revision بدون تغییر public field رد می‌شود؛ Triggerهای D6 در `origin/main:implementation/prisma/migrations/20260913010000_add_core_foundation/migration.sql:846-890` هستند.

### OfferVersion

OfferVersion از لحظهٔ ایجاد immutable است؛ «ویرایش draft» در این مدل وجود ندارد. هر اصلاح باید OfferVersion تازه با `version_number` بعدی بسازد. DELETE همیشه رد می‌شود و رقابت روی `offer_version_number_unique` باید به conflict قابل retry نگاشت شود. Trigger با پیام‌های `offer versions cannot be deleted` و `offer version content is immutable` در `origin/main:implementation/prisma/migrations/20260913010000_add_core_foundation/migration.sql:772-789` است.

پیوندهای OfferVersion/Capability:

- UPDATE همیشه رد می‌شود.
- INSERT و DELETE فقط تا زمانی مجازند که `OfferVersion.published_at IS NULL` باشد.
- پس از نخستین انتشار، حتی withdraw نیز `published_at` را تهی نمی‌کند؛ بنابراین پیوندها بعداً قابل تغییر نیستند.
- Trigger و قفل والد در `origin/main:implementation/prisma/migrations/20260913010000_add_core_foundation/migration.sql:791-826` است.

برای جایگزینی نسخهٔ منتشرشدهٔ Offer، ردیف Offer باید ابتدا با ترتیب قفل ثابت قفل شود؛ سپس در **یک transaction** و دقیقاً به‌ترتیب زیر عمل شود: withdraw نسخهٔ قدیمی، سپس publish نسخهٔ جدید. index یکتای جزئی `offer_version_published_unique` در `origin/main:implementation/prisma/migrations/20260913010000_add_core_foundation/migration.sql:509-513` deferrable نیست، پس دو transaction جدا یا ترتیب معکوس مجاز نیست.

Publication منبع حقیقت رخداد انتشار است و projection فقط از insert در Publication نوشته می‌شود. برای OfferVersion، Publication باید `content_revision = NULL` داشته باشد؛ projection آن فقط `publication_status` و `published_at` است، چون OfferVersion ستون `published_content_revision` ندارد. فیلدهای OfferVersion در `origin/main:implementation/prisma/schema.prisma:547-577` و projection آن در migration خطوط `931-1005` است.

## ۸. نگاشت عملیات به ۱۳ Trigger و قیدهای DB

مبنای شمارش ۱۳ Trigger در `origin/main:implementation/prisma/migrations/20260913010000_add_core_foundation/migration.sql:760-1007` است.

| Trigger | عملیات مرتبط | رفتار Service |
|---|---|---|
| `business_profile_content_revision_before_update` | تغییر public Profile | public field را تغییر دهد؛ revision را دستی تغییر ندهد؛ D6 اعمال می‌شود |
| `business_profile_publication_initial_guard` | ایجاد Profile | با `UNPUBLISHED` ایجاد شود |
| `business_profile_publication_projection_guard` | projection Profile | فقط nested Publication اجازهٔ تغییر projection دارد |
| `capability_content_revision_before_update` | تغییر public Capability | همان قرارداد D6 |
| `capability_publication_initial_guard` | ایجاد Capability | با `UNPUBLISHED` ایجاد شود |
| `capability_publication_projection_guard` | projection Capability | فقط nested Publication |
| `offer_version_immutable_before_change` | update/delete OfferVersion | نسخهٔ جدید بساز؛ update محتوایی و delete همیشه رد می‌شود |
| `offer_version_capability_immutable_before_change` | insert/update/delete link | فقط پیش از نخستین انتشار؛ update هیچ‌وقت مجاز نیست |
| `identity_verification_decided_immutable_before_change` | update/delete Verification تصمیم‌گرفته | history حفظ شود |
| `offer_version_publication_initial_guard` | ایجاد OfferVersion | projection اولیه `UNPUBLISHED` |
| `offer_version_publication_projection_guard` | projection OfferVersion | فقط Publication nested |
| `publication_apply_projection_after_insert` | insert Publication | رخداد را درج کن؛ projection در همان transaction و طبق revision اعمال می‌شود |
| `publication_immutable_before_change` | update/delete Publication | فقط insert مجاز است |

C15/D1 با B1 پیاده شده است: `pg_trigger_depth()` فقط مسیر nested Publication را برای projection باز می‌گذارد؛ قیدهای مربوط در `origin/main:implementation/prisma/migrations/20260913010000_add_core_foundation/migration.sql:892-929` هستند. هیچ عملیات Service نباید projection را مستقیم update کند.

## ۹. مدل خطا و نگاشت پایدار

همهٔ ۱۳ Trigger فوق با SQLSTATE عمومی `P0001` خطا می‌دهند و فقط متن پیام متفاوت است. نگاشت فعلی بر اساس پیام باید در adapter خطا متمرکز و log داخلی شود؛ به caller جزئیات SQL، مسیر فایل، credential یا وجود سازمان دیگر داده نمی‌شود.

| SQLSTATE/پیام | خطای دامنهٔ پیشنهادی |
|---|---|
| `P0001` / `publications are append-only` | `PublicationImmutable` |
| `P0001` / `offer versions cannot be deleted` | `OfferVersionImmutable` |
| `P0001` / `offer version content is immutable` | `OfferVersionImmutable` |
| `P0001` / `offer version capability links cannot be updated` | `OfferVersionCapabilityLinkImmutable` |
| `P0001` / `published offer version capability links are immutable` | `OfferVersionCapabilityLinkImmutable` |
| `P0001` / `decided identity verification is immutable` | `IdentityVerificationImmutable` |
| `P0001` / `content revision requires a public field change` | `ContentRevisionInvariantViolation` |
| `P0001` / `initial publication status must be UNPUBLISHED` | `InitialPublicationStateInvalid` |
| `P0001` / `publication projection requires Publication event` | `DirectProjectionWriteRejected` |
| `P0001` / `invalid publication transition` | `PublicationTransitionConflict` |
| `23514` CHECK violation | `DomainConstraintViolation` |
| `23505` unique violation، از جمله version race یا published-index race | `UniquenessConflict` |
| `23503` FK violation | `TenantReferenceOrDependencyViolation` |

SQLSTATE جدا برای هر Trigger فقط یک گزینهٔ CCR آینده برای تصمیم مالک است؛ در این مرحله هیچ SQLSTATE تغییری داده نمی‌شود. سطح transport و payload در S6 باز است.

## ۱۰. Audit، تاریخچه و راهبرد آزمون

### Audit و history

آخرین audit state هر جدول باید در همان رکورد و بدون جعل history نگه‌داری شود:

| جدول | آخرین audit مورد انتظار |
|---|---|
| Organization | `created_at`, `updated_at`, `archived_at`, actor/reason archive در مسیر سرویس |
| BusinessIdentityClaim | status، attempt شماره‌گذاری‌شده، actor/reason و زمان آخرین گذار |
| IdentityVerification | status، تصمیم‌گیرندهٔ platform reference، `decided_at` و reason |
| Membership | status، زمان و actor revoke |
| PermissionGrant | status، زمان و actor revoke |
| BusinessProfile | `updated_at`, `content_revision`, publication projection |
| Capability | `updated_at`, `content_revision`, publication projection |
| Offer | `created_at`, `updated_at` و lifecycle container |
| OfferVersion | `version_number`, `created_at`, publication projection |
| Evidence | source/provenance و owner typed |
| Publication | رخداد append-only، `occurred_at`, actor Membership، permission snapshot |

تاریخچهٔ مستقل فقط برای Verification attemptها و رخدادهای Publication است؛ F4 اجازهٔ ساخت history عمومی برای هر جدول را نمی‌دهد. ستون‌ها و audit checks در `origin/main:implementation/prisma/schema.prisma:327-655` و migration `:609-755` قابل ردیابی‌اند.

### راهبرد آزمون

آزمون آینده فقط در PostgreSQL یک‌بارمصرف با storage `tmpfs` اجرا می‌شود؛ دیتابیس دارای داده، volume توسعه‌دهنده یا production مجاز نیست.

حداقل آزمون‌ها:

- W1 و rejection برای `findUnique({ id })` بدون سازمان
- FK مرکب، C6 و caveat مربوط به MATCH SIMPLE
- permission از Membership + Grant و رد Role-only
- revision publish/withdraw و `FOR UPDATE`
- publish همزمان، ترتیب withdraw سپس publish و قفل Offer
- D6 برای هر public field و رد تغییر مصنوعی revision
- هر ۱۳ Trigger و نگاشت خطاهای آن‌ها
- immutable بودن Publication، OfferVersion، link و Verification تصمیم‌گرفته
- unique race برای `version_number` و published version
- rollback کامل در permission، validation و constraint failure
- tenant isolation و مسیر جداگانهٔ public V2 read

هیچ‌یک از این آزمون‌ها در این سند اجرا نشده‌اند؛ این بخش فقط strategy است.

## ۱۱. تصمیم‌های باز مالک و ماتریس انطباق ADR

### گزینه‌های باز

| شناسه | گزینه‌ها | پیامدها | یک توصیه برای بررسی مالک |
|---|---|---|---|
| S1 | internal service، HTTP، یا هر دو | internal ساده‌تر؛ HTTP مرز روشن‌تر؛ هر دو هزینهٔ بیشتر | ابتدا internal service و HTTP فقط با نیاز اثبات‌شده |
| S2 | AuthContext با issuer/subject استاندارد یا adapter چندissuer | استاندارد ساده‌تر؛ چندissuer انعطاف بیشتر | یک issuer قراردادشده برای MVP |
| S3 | W1 یا پذیرش W2 | W1 صریح و امن؛ W2 پیچیدگی کمتر در relationها | W1 اجباری بماند تا تصمیم جداگانه |
| S4 | idempotency در service یا transport | transport retry ساده‌تر؛ service پوشش عمیق‌تر | idempotency در مرز فرمان publish/withdraw |
| S5 | platform identity adapter مستقل یا سرویس مرکزی | adapter مستقل قابل‌آزمایش؛ مرکزی یکپارچه‌تر | adapter مستقل با audit صریح |
| S6 | خطای دامنهٔ پایدار یا payload transport استاندارد | دامنه مستقل‌تر؛ payload مصرف‌کننده‌پسندتر | domain error مستقل و adapter transport جدا |
| S7 | snapshot حداقلی یا کامل permission در Publication | حداقلی کم‌هزینه؛ کامل audit قوی‌تر | حداقل key، actor و زمان |
| S8 | جای‌گذاری repository/service در V1 | یک repository انسجام بیشتر؛ boundary جدا استقلال بیشتر | بر اساس ADR-0002 در V1 با boundary داخلی روشن |
| S9 | public read contract نسخه‌دار یا projection مستقیم | contract امن‌تر؛ projection مستقیم coupling دارد | contract نسخه‌دار و فقط‌خواندنی برای V2 |
| R4 | پلتفرم، AC-2 یا ترکیب برای bootstrap | به‌ترتیب سادگی، هم‌راستایی، یا انعطاف با پیچیدگی بیشتر | AC-2 با قرارداد رسمی و transaction اتمیک |

توصیه‌های این جدول تصمیم مالک نیستند و هیچ‌کدام اجرا نشده‌اند.

### ماتریس ADR

| ADR | انطباق |
|---|---|
| ADR-0001 | V1 مالک business truth و Core Service است؛ V2 مصرف‌کنندهٔ publish باقی می‌ماند |
| ADR-0002 | repositoryها جدا می‌مانند؛ این سند merge یا migration بین آن‌ها تعریف نمی‌کند |
| ADR-0003 | Recommendation Contract خارج از persistence این مرحله است |
| ADR-0004 | Organization در V1 canonical است؛ ExternalWorkspaceLink خارج از دامنهٔ این لایه است |
| ADR-0005 | Recommendation، Action، Outcome و Evaluation با هم ادغام نمی‌شوند |
| ADR-0006 | provenance و confirmation مستقل می‌مانند |
| ADR-0007 | Action مستقل است و در این service layer پیاده‌سازی نمی‌شود |
| ADR-0008 | lifecycle Recommendation با Decision مرزبندی دارد |
| ADR-0009 | Role هرگز permission source نیست؛ Membership + Grant مبناست |
| ADR-0010 | Platform اجرا می‌کند، authority جدید ایجاد نمی‌کند؛ Publication به Membership نیاز دارد |
| ADR-0011 | Core عمومی است و Clinic vocabulary وارد Core نمی‌شود |
| ADR-0012 | Intent و Session در Assistant/Experience می‌مانند و persistent Core entity نیستند |

### شواهد و checksumهای Git

تمام hashها از bytes خروجی Git محاسبه و از خروجی فرمان ثبت شده‌اند:

- schema: `origin/main:implementation/prisma/schema.prisma` — SHA-256: `760b25b59735c7dbb4b2ca4602f3ccf4dc353f5e3d71f2dff9ec893500222ee4`
- migration: `origin/main:implementation/prisma/migrations/20260913010000_add_core_foundation/migration.sql` — SHA-256: `99e7ae8a06e804d6fa282727ce5b5ef65e4bbea5add0e936b4d9604411751169`
- بازه‌های مدل‌ها: schema `:327-655`
- FK و محدودیت‌های tenant: migration `:403-490`
- published unique index: migration `:509-513`
- CHECKهای tenant/projection: migration `:513-584`, `:696-755`
- triggerها و C15/D6: migration `:760-1007`

این طراحی **تصمیم‌های باز را حل نمی‌کند** و تا بازبینی Guardian و تصویب مالک، مجوز ساخت service، repository، API یا تغییر دیگر را ایجاد نمی‌کند.

من کدکس هستم.
