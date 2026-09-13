# CONTRACT_CHANGE_REQUEST — شِمای Core Foundation

**وضعیت:** APPROVED — مصوب مالک، ۲۰۲۶-۰۹-۱۳
**تصویب مالک:** `CCR Core Foundation Schema at fcddfc2 is APPROVED`
**تاریخ:** ۲۰۲۶-۰۹-۱۲
**INSTRUCTION_ID:** `CODEX-20260912-G3-CCR-DRAFT-001`
**TARGET_HANDOFF_ID:** `HANDOFF-20260912-CORE-PRISMA-FOUNDATION`
**مبنای شاخه:** `ee7fb95372b7ca1805f14dec8fee0a5e6a5fb1ec`
**بازبینی مجوزدهنده:** `origin/main:AI_HANDOFF/CLAUDE_REVIEWS/20260912_CLAUDE_REVIEW_G2_CORE_BRANCH.md@89aef7ab70573283621f1396efade87d7e5d21db`

> این سند پیش‌نویس اجرایی است. ایجاد `schema.prisma` یا migration محصول فقط پس از بازبینی Guardian و تصویب صریح مالک مجاز است.

## ۱. مسئله

شِمای فعلی V1 هسته‌ی Event/Opportunity و نگاشت `ExternalWorkspaceLink` را دارد، اما هنوز مدل فیزیکی مصوب Core برای هویت سازمانی، عضویت و Permission Grant، نمای عمومی کسب‌وکار، Capability، Offer، Evidence و Publication را ندارد. بدون یک قرارداد واحد، implementation می‌تواند مرز Tenant، منبع حقیقت Publication یا استقلال Core از Moduleها را تضعیف کند.

## ۲. انگیزه

این CCR طراحی v3 مصوب و شواهد G1 را به متن دقیق Prisma و SQL تبدیل می‌کند تا نخستین migration Core:

- مستقل از Vertical و بدون واژگان Clinic باشد؛
- Organization را از Business Identity Claim جدا نگه دارد؛
- Permission را فقط از Membership + PermissionGrant بگیرد؛
- داده‌ی قابل‌انتشار V2 را در Core نگه دارد؛
- ارجاع میان دو Organization را در Database رد کند؛
- Publication را منبع حقیقت و `publication_status` را projection هم‌تراکنشی نگه دارد؛
- تاریخچه‌ی Verification، OfferVersion و Publication را حفظ کند.

## ۳. بدیل‌های بررسی‌شده

### ۳.۱. افزودن مدل‌های عمودی Clinic به Core — رد شد

Core باید برای Restaurant، Retail و Verticalهای آینده بدون بازطراحی قابل استفاده باشد. Doctor، Treatment، Appointment و Capacity در Module باقی می‌مانند.

### ۳.۲. Permission مبتنی بر Role — رد شد

Role منبع Permission نیست. مجوز فقط از Membership معتبر و PermissionGrant فعال به‌دست می‌آید.

### ۳.۳. Publication فقط در Application Service — رد شد

این روش تغییر مستقیم projection و رقابت تراکنش‌ها را در Database نمی‌بندد. D1 سازوکار B1 را تصویب کرده است.

### ۳.۴. FK از `ExternalWorkspaceLink` به Organization در CCR نخست — رد شد برای این مرحله

D4 مالک «خیر» است. داده و migration موجود بدون تغییر می‌مانند؛ افزودن FK به CCR جداگانه و بررسی داده‌ی موجود نیاز دارد.

### ۳.۵. Constraintهای Tenant فقط در Application — رد شد

FKهای مرکب و W1 در Database الزامی‌اند. فیلتر Query و Authorization همچنان لازم‌اند، اما جایگزین قید فیزیکی نیستند.

## ۴. تصمیم‌های مالک D1 تا D6

| تصمیم | وضعیت | مقدار مصوب |
|---|---|---|
| D1 — C15 | DECIDED | B1: محافظ `pg_trigger_depth() > 1` و فهرست بسته‌ی Trigger مجاز |
| D2 — نوشتن امن | DECIDED | W1 الزامی؛ `organization_id` فقط از context معتبر و با scalar مستقیم. W2 اختیاری و مبنای امنیت نیست |
| D3 — Prisma | DECIDED | `prisma` و `@prisma/client` دقیقاً `5.22.0` |
| D4 — FK نگاشت بیرونی | DECIDED | در CCR نخست اضافه نشود |
| D5 — قواعد migration | DECIDED | هر جدول ساخته‌شده در migration در `schema.prisma` مدل شود؛ نام قید دستی با Prisma یکی باشد یا با `map:` اعلام شود |
| D6 — افزایش بازبینی محتوا | DECIDED | گزینه A: Database با تغییر هر فیلد عمومی BusinessProfile یا Capability، `content_revision` را دقیقاً یک واحد افزایش می‌دهد؛ تغییر مستقیم revision بدون تغییر فیلد عمومی رد می‌شود |

سازوکار D1 اعتبارسنجی گذار را نیز شامل می‌شود: `WITHDRAWN` فقط از `PUBLISHED` پذیرفته است؛ `PUBLISHED` برای Profile و Capability از `UNPUBLISHED`، `WITHDRAWN` یا از `PUBLISHED` با revision بزرگ‌تر پذیرفته است؛ `PUBLISHED` برای OfferVersion فقط از `UNPUBLISHED` یا `WITHDRAWN` پذیرفته است. هر گذار دیگر با `P0001` رد می‌شود.

## ۵. مدل داده‌ی پیشنهادی

### ۵.۱. قواعد فیزیکی

- همه‌ی IDها `TEXT` هستند. `Organization.id` بدون default و از مرجع canonical AC-2 می‌آید؛ ID مدل‌های دیگر `uuid()` دارند.
- همه‌ی زمان‌های مدل‌های تازه `timestamptz(3)` هستند.
- مدل Prisma از PascalCase، فیلد از camelCase + `@map` و جدول/ستون Database از snake_case استفاده می‌کند.
- تمام FKها `ON DELETE RESTRICT` و `ON UPDATE RESTRICT` هستند.
- تمام Entityهای Tenant دارای `organization_id` و `@@unique([id, organizationId])` هستند؛ رابطه‌های درون Tenant از زوج `(id, organization_id)` استفاده می‌کنند.
- `OfferVersionCapability` جدول رابطه‌ی Core و مدل دوازدهم این CCR است؛ Entity دامنه‌ای مستقل نیست.

### ۵.۲. متن دقیق Prisma پیشنهادی

متن بین نشانگرهای زیر باید بدون بازنویسی به شِمای موقت اعتبارسنجی افزوده شود.

```prisma
// BEGIN CCR_CORE_MODELS
enum OrganizationLifecycle {
  ACTIVE
  ARCHIVED
}

enum ClaimStatus {
  PENDING
  VERIFIED
  SUSPENDED
  REJECTED
  EXPIRED
}

enum VerificationAttemptStatus {
  PENDING
  UNDER_REVIEW
  VERIFIED
  REJECTED
  EXPIRED
}

enum MembershipStatus {
  ACTIVE
  REVOKED
}

enum GrantStatus {
  ACTIVE
  REVOKED
}

enum BusinessProfileLifecycle {
  DRAFT
  ACTIVE
  ARCHIVED
}

enum PublicationStatus {
  UNPUBLISHED
  PUBLISHED
  WITHDRAWN
}

enum CapabilityStatus {
  PLANNED
  ACTIVE
  RETIRED
}

enum CapabilityAudience {
  INTERNAL
  CUSTOMER_FACING
}

enum ConfirmationStatus {
  UNCONFIRMED
  HUMAN_CONFIRMED
}

enum OfferLifecycle {
  ACTIVE
  RETIRED
}

enum OfferShape {
  ITEM
  BUNDLE
  CAMPAIGN
}

enum EvidenceSourceKind {
  HUMAN
  SYSTEM
  AI_INFERRED
  INTEGRATION
}

enum EvidenceStatus {
  ACTIVE
  EXPIRED
  WITHDRAWN
}

enum PublicationEventKind {
  PUBLISHED
  WITHDRAWN
}

model Organization {
  id                            String                @id @db.Text
  displayName                   String                @map("display_name") @db.VarChar(200)
  lifecycleStatus               OrganizationLifecycle @default(ACTIVE) @map("lifecycle_status")
  createdAt                     DateTime              @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt                     DateTime              @updatedAt @map("updated_at") @db.Timestamptz(3)
  archivedAt                    DateTime?             @map("archived_at") @db.Timestamptz(3)
  archivedByMembershipId        String?               @map("archived_by_membership_id") @db.Text
  archivedByOrganizationId      String?               @map("archived_by_organization_id") @db.Text
  archivedByPlatformIdentityRef String?               @map("archived_by_platform_identity_ref") @db.VarChar(255)
  archiveReason                 String?               @map("archive_reason") @db.Text

  archivedByMembership Membership? @relation("OrganizationArchivedByMembership", fields: [archivedByMembershipId, archivedByOrganizationId], references: [id, organizationId], onDelete: Restrict, onUpdate: Restrict, map: "organization_archived_by_membership_fk")
  identityClaims       BusinessIdentityClaim[]   @relation("OrganizationIdentityClaims")
  identityVerifications IdentityVerification[]   @relation("OrganizationIdentityVerifications")
  memberships          Membership[]  @relation("Memberships")
  permissionGrants     PermissionGrant[]         @relation("OrganizationPermissionGrants")
  businessProfiles     BusinessProfile[]         @relation("OrganizationBusinessProfiles")
  capabilities         Capability[]              @relation("OrganizationCapabilities")
  offers               Offer[]                   @relation("OrganizationOffers")
  offerVersions        OfferVersion[]            @relation("OrganizationOfferVersions")
  offerCapabilityLinks OfferVersionCapability[]  @relation("OrganizationOfferCapabilityLinks")
  evidenceItems        Evidence[]                @relation("OrganizationEvidence")
  publications         Publication[]             @relation("OrganizationPublications")

  @@index([lifecycleStatus, createdAt], map: "organization_lifecycle_created_idx")
  @@map("organizations")
}

model BusinessIdentityClaim {
  id                                         String      @id @default(uuid()) @db.Text
  organizationId                             String      @map("organization_id") @db.Text
  identifierType                             String      @map("identifier_type") @db.VarChar(80)
  identifierValue                            String      @map("identifier_value") @db.VarChar(300)
  claimStatus                                ClaimStatus @default(PENDING) @map("claim_status")
  submittedByMembershipId                    String      @map("submitted_by_membership_id") @db.Text
  submittedAt                                DateTime    @default(now()) @map("submitted_at") @db.Timestamptz(3)
  verifiedAt                                 DateTime?   @map("verified_at") @db.Timestamptz(3)
  validUntil                                 DateTime?   @map("valid_until") @db.Timestamptz(3)
  statusChangedByPlatformIdentityRef          String?     @map("status_changed_by_platform_identity_ref") @db.VarChar(255)
  statusChangeReason                          String?     @map("status_change_reason") @db.Text
  statusChangedAt                             DateTime?   @map("status_changed_at") @db.Timestamptz(3)
  createdAt                                   DateTime    @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt                                   DateTime    @updatedAt @map("updated_at") @db.Timestamptz(3)

  organization          Organization             @relation("OrganizationIdentityClaims", fields: [organizationId], references: [id], onDelete: Restrict, onUpdate: Restrict, map: "business_identity_claim_organization_fk")
  submittedByMembership Membership   @relation("ClaimSubmittedByMembership", fields: [submittedByMembershipId, organizationId], references: [id, organizationId], onDelete: Restrict, onUpdate: Restrict, map: "claim_submitted_by_membership_fk")
  verifications         IdentityVerification[]   @relation("ClaimVerifications")
  businessProfiles      BusinessProfile[]        @relation("BusinessProfileIdentityClaim")

  @@unique([id, organizationId], map: "business_identity_claim_id_organization_unique")
  @@index([organizationId, claimStatus], map: "business_identity_claim_organization_status_idx")
  @@index([identifierType, identifierValue], map: "business_identity_claim_identifier_idx")
  @@map("business_identity_claims")
}

model IdentityVerification {
  id                            String                    @id @default(uuid()) @db.Text
  organizationId                String                    @map("organization_id") @db.Text
  claimId                       String                    @map("claim_id") @db.Text
  attemptNumber                 Int                       @map("attempt_number")
  methodKey                     String                    @map("method_key") @db.VarChar(160)
  status                        VerificationAttemptStatus @default(PENDING)
  evidenceLocator               Json?                     @map("evidence_locator") @db.JsonB
  reviewedByPlatformIdentityRef String?                   @map("reviewed_by_platform_identity_ref") @db.VarChar(255)
  decisionReason                String?                   @map("decision_reason") @db.Text
  startedAt                     DateTime                  @default(now()) @map("started_at") @db.Timestamptz(3)
  decidedAt                     DateTime?                 @map("decided_at") @db.Timestamptz(3)
  createdAt                     DateTime                  @default(now()) @map("created_at") @db.Timestamptz(3)

  organization Organization          @relation("OrganizationIdentityVerifications", fields: [organizationId], references: [id], onDelete: Restrict, onUpdate: Restrict, map: "identity_verification_organization_fk")
  claim        BusinessIdentityClaim @relation("ClaimVerifications", fields: [claimId, organizationId], references: [id, organizationId], onDelete: Restrict, onUpdate: Restrict, map: "identity_verification_claim_fk")

  @@unique([id, organizationId], map: "identity_verification_id_organization_unique")
  @@unique([claimId, attemptNumber], map: "identity_verification_claim_attempt_unique")
  @@index([organizationId, status, startedAt], map: "identity_verification_organization_status_idx")
  @@map("identity_verifications")
}

model Membership {
  id                                    String           @id @default(uuid()) @db.Text
  organizationId                        String           @map("organization_id") @db.Text
  identityProvider                      String           @map("identity_provider") @db.VarChar(100)
  externalSubject                       String           @map("external_subject") @db.VarChar(255)
  membershipStatus                      MembershipStatus @default(ACTIVE) @map("membership_status")
  createdAt                             DateTime         @default(now()) @map("created_at") @db.Timestamptz(3)
  revokedAt                             DateTime?        @map("revoked_at") @db.Timestamptz(3)
  revokedByMembershipId                 String?          @map("revoked_by_membership_id") @db.Text
  revokedByOrganizationId               String?          @map("revoked_by_organization_id") @db.Text
  revokedByPlatformIdentityRef          String?          @map("revoked_by_platform_identity_ref") @db.VarChar(255)
  revocationReason                      String?          @map("revocation_reason") @db.Text

  organization               Organization             @relation("Memberships", fields: [organizationId], references: [id], onDelete: Restrict, onUpdate: Restrict, map: "membership_organization_fk")
  revokedByMembership        Membership?  @relation("MembershipRevokedByMembership", fields: [revokedByMembershipId, revokedByOrganizationId], references: [id, organizationId], onDelete: Restrict, onUpdate: Restrict, map: "membership_revoked_by_membership_fk")
  revokedMemberships         Membership[] @relation("MembershipRevokedByMembership")
  archivedOrganizations      Organization[]           @relation("OrganizationArchivedByMembership")
  submittedIdentityClaims    BusinessIdentityClaim[]  @relation("ClaimSubmittedByMembership")
  receivedPermissionGrants   PermissionGrant[]        @relation("PermissionGrantRecipient")
  issuedPermissionGrants     PermissionGrant[]        @relation("PermissionGrantGrantedBy")
  revokedPermissionGrants    PermissionGrant[]        @relation("PermissionGrantRevokedBy")
  confirmedCapabilities      Capability[]             @relation("CapabilityConfirmedByMembership")
  confirmedEvidenceItems     Evidence[]               @relation("EvidenceConfirmedByMembership")
  performedPublications      Publication[]            @relation("PublicationPerformedByMembership")

  @@unique([id, organizationId], map: "membership_id_organization_unique")
  @@index([organizationId, membershipStatus], map: "membership_organization_status_idx")
  @@index([identityProvider, externalSubject], map: "membership_external_subject_idx")
  @@map("memberships")
}

model PermissionGrant {
  id                                    String      @id @default(uuid()) @db.Text
  organizationId                        String      @map("organization_id") @db.Text
  membershipId                          String      @map("membership_id") @db.Text
  permissionKey                         String      @map("permission_key") @db.VarChar(160)
  grantStatus                           GrantStatus @default(ACTIVE) @map("grant_status")
  basisKey                              String      @map("basis_key") @db.VarChar(40)
  grantedByMembershipId                 String?     @map("granted_by_membership_id") @db.Text
  grantedByOrganizationId               String?     @map("granted_by_organization_id") @db.Text
  reason                                String?     @db.Text
  grantedAt                             DateTime    @default(now()) @map("granted_at") @db.Timestamptz(3)
  revokedAt                             DateTime?   @map("revoked_at") @db.Timestamptz(3)
  revokedByMembershipId                 String?     @map("revoked_by_membership_id") @db.Text
  revokedByOrganizationId               String?     @map("revoked_by_organization_id") @db.Text
  revokedByPlatformIdentityRef          String?     @map("revoked_by_platform_identity_ref") @db.VarChar(255)
  revocationReason                      String?     @map("revocation_reason") @db.Text

  organization        Organization            @relation("OrganizationPermissionGrants", fields: [organizationId], references: [id], onDelete: Restrict, onUpdate: Restrict, map: "permission_grant_organization_fk")
  membership          Membership  @relation("PermissionGrantRecipient", fields: [membershipId, organizationId], references: [id, organizationId], onDelete: Restrict, onUpdate: Restrict, map: "permission_grant_membership_fk")
  grantedByMembership Membership? @relation("PermissionGrantGrantedBy", fields: [grantedByMembershipId, grantedByOrganizationId], references: [id, organizationId], onDelete: Restrict, onUpdate: Restrict, map: "permission_grant_granted_by_membership_fk")
  revokedByMembership Membership? @relation("PermissionGrantRevokedBy", fields: [revokedByMembershipId, revokedByOrganizationId], references: [id, organizationId], onDelete: Restrict, onUpdate: Restrict, map: "permission_grant_revoked_by_membership_fk")

  @@unique([id, organizationId], map: "permission_grant_id_organization_unique")
  @@index([organizationId, membershipId, grantStatus], map: "permission_grant_member_status_idx")
  @@index([organizationId, permissionKey, grantStatus], map: "permission_grant_key_status_idx")
  @@map("permission_grants")
}

model BusinessProfile {
  id                                  String                   @id @default(uuid()) @db.Text
  organizationId                      String                   @map("organization_id") @db.Text
  businessIdentityClaimId             String?                  @map("business_identity_claim_id") @db.Text
  businessIdentityClaimOrganizationId String?                  @map("business_identity_claim_organization_id") @db.Text
  name                                String                   @db.VarChar(200)
  description                         String?                  @db.Text
  latitude                            Decimal?                 @db.Decimal(9, 6)
  longitude                           Decimal?                 @db.Decimal(9, 6)
  addressText                         String?                  @map("address_text") @db.Text
  contactInformation                  Json?                    @map("contact_information") @db.JsonB
  links                               Json?                    @db.JsonB
  businessHours                       Json?                    @map("business_hours") @db.JsonB
  lifecycleStatus                     BusinessProfileLifecycle @default(DRAFT) @map("lifecycle_status")
  publicationStatus                   PublicationStatus        @default(UNPUBLISHED) @map("publication_status")
  contentRevision                     Int                      @default(1) @map("content_revision")
  publishedContentRevision            Int?                     @map("published_content_revision")
  createdAt                           DateTime                 @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt                           DateTime                 @updatedAt @map("updated_at") @db.Timestamptz(3)

  organization          Organization           @relation("OrganizationBusinessProfiles", fields: [organizationId], references: [id], onDelete: Restrict, onUpdate: Restrict, map: "business_profile_organization_fk")
  businessIdentityClaim BusinessIdentityClaim? @relation("BusinessProfileIdentityClaim", fields: [businessIdentityClaimId, businessIdentityClaimOrganizationId], references: [id, organizationId], onDelete: Restrict, onUpdate: Restrict, map: "business_profile_identity_claim_fk")
  publicationEvents     Publication[]          @relation("PublicationBusinessProfile")

  @@unique([id, organizationId], map: "business_profile_id_organization_unique")
  @@index([organizationId, lifecycleStatus], map: "business_profile_organization_lifecycle_idx")
  @@index([organizationId, publicationStatus, updatedAt], map: "business_profile_publication_updated_idx")
  @@index([publicationStatus, latitude, longitude], map: "business_profile_publication_location_idx")
  @@map("business_profiles")
}

model Capability {
  id                            String              @id @default(uuid()) @db.Text
  organizationId                String              @map("organization_id") @db.Text
  capabilityKey                 String              @map("capability_key") @db.VarChar(160)
  name                          String              @db.VarChar(200)
  shortDescription              String?             @map("short_description") @db.Text
  categoryKey                   String              @map("category_key") @db.VarChar(160)
  capabilityStatus              CapabilityStatus    @default(PLANNED) @map("capability_status")
  audience                      CapabilityAudience  @default(INTERNAL)
  confirmationStatus            ConfirmationStatus  @default(UNCONFIRMED) @map("confirmation_status")
  confirmedByMembershipId       String?             @map("confirmed_by_membership_id") @db.Text
  confirmedByOrganizationId     String?             @map("confirmed_by_organization_id") @db.Text
  confirmedAt                   DateTime?           @map("confirmed_at") @db.Timestamptz(3)
  publicationStatus             PublicationStatus   @default(UNPUBLISHED) @map("publication_status")
  contentRevision               Int                 @default(1) @map("content_revision")
  publishedContentRevision      Int?                @map("published_content_revision")
  freshUntil                    DateTime?           @map("fresh_until") @db.Timestamptz(3)
  createdAt                     DateTime            @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt                     DateTime            @updatedAt @map("updated_at") @db.Timestamptz(3)

  organization          Organization            @relation("OrganizationCapabilities", fields: [organizationId], references: [id], onDelete: Restrict, onUpdate: Restrict, map: "capability_organization_fk")
  confirmedByMembership Membership? @relation("CapabilityConfirmedByMembership", fields: [confirmedByMembershipId, confirmedByOrganizationId], references: [id, organizationId], onDelete: Restrict, onUpdate: Restrict, map: "capability_confirmed_by_membership_fk")
  offerVersionLinks     OfferVersionCapability[] @relation("CapabilityOfferVersionLinks")
  evidenceItems         Evidence[]               @relation("EvidenceCapability")
  publicationEvents     Publication[]            @relation("PublicationCapability")

  @@unique([id, organizationId], map: "capability_id_organization_unique")
  @@unique([organizationId, capabilityKey], map: "capability_organization_key_unique")
  @@index([organizationId, capabilityStatus, audience], map: "capability_organization_status_audience_idx")
  @@index([organizationId, publicationStatus, categoryKey], map: "capability_publication_category_idx")
  @@index([organizationId, freshUntil], map: "capability_freshness_idx")
  @@map("capabilities")
}

model Offer {
  id              String         @id @default(uuid()) @db.Text
  organizationId  String         @map("organization_id") @db.Text
  offerKey        String         @map("offer_key") @db.VarChar(160)
  lifecycleStatus OfferLifecycle @default(ACTIVE) @map("lifecycle_status")
  createdAt       DateTime       @default(now()) @map("created_at") @db.Timestamptz(3)
  retiredAt       DateTime?      @map("retired_at") @db.Timestamptz(3)

  organization Organization  @relation("OrganizationOffers", fields: [organizationId], references: [id], onDelete: Restrict, onUpdate: Restrict, map: "offer_organization_fk")
  versions     OfferVersion[] @relation("OfferVersions")

  @@unique([id, organizationId], map: "offer_id_organization_unique")
  @@unique([organizationId, offerKey], map: "offer_organization_key_unique")
  @@index([organizationId, lifecycleStatus], map: "offer_organization_lifecycle_idx")
  @@map("offers")
}

model OfferVersion {
  id                   String            @id @default(uuid()) @db.Text
  organizationId       String            @map("organization_id") @db.Text
  offerId               String            @map("offer_id") @db.Text
  versionNumber         Int               @map("version_number")
  name                  String            @db.VarChar(200)
  shortDescription      String?           @map("short_description") @db.Text
  offerShape            OfferShape        @map("offer_shape")
  terms                 Json?             @db.JsonB
  priceAmount           Decimal?          @map("price_amount") @db.Decimal(12, 2)
  priceCurrency         String?           @map("price_currency") @db.VarChar(3)
  onRequest             Boolean           @default(false) @map("on_request")
  validFrom             DateTime          @map("valid_from") @db.Timestamptz(3)
  validUntil            DateTime?         @map("valid_until") @db.Timestamptz(3)
  publicationStatus     PublicationStatus @default(UNPUBLISHED) @map("publication_status")
  createdAt             DateTime          @default(now()) @map("created_at") @db.Timestamptz(3)
  publishedAt           DateTime?         @map("published_at") @db.Timestamptz(3)

  organization      Organization             @relation("OrganizationOfferVersions", fields: [organizationId], references: [id], onDelete: Restrict, onUpdate: Restrict, map: "offer_version_organization_fk")
  offer             Offer                    @relation("OfferVersions", fields: [offerId, organizationId], references: [id, organizationId], onDelete: Restrict, onUpdate: Restrict, map: "offer_version_offer_fk")
  capabilityLinks   OfferVersionCapability[] @relation("OfferVersionCapabilityLinks")
  evidenceItems     Evidence[]               @relation("EvidenceOfferVersion")
  publicationEvents Publication[]            @relation("PublicationOfferVersion")

  @@unique([id, organizationId], map: "offer_version_id_organization_unique")
  @@unique([offerId, versionNumber], map: "offer_version_number_unique")
  @@index([organizationId, offerId, publicationStatus], map: "offer_version_offer_publication_idx")
  @@index([organizationId, validFrom, validUntil], map: "offer_version_validity_idx")
  @@index([organizationId, publicationStatus, publishedAt], map: "offer_version_publication_time_idx")
  @@map("offer_versions")
}

model OfferVersionCapability {
  organizationId String @map("organization_id") @db.Text
  offerVersionId String @map("offer_version_id") @db.Text
  capabilityId   String @map("capability_id") @db.Text

  organization Organization @relation("OrganizationOfferCapabilityLinks", fields: [organizationId], references: [id], onDelete: Restrict, onUpdate: Restrict, map: "offer_version_capability_organization_fk")
  offerVersion OfferVersion @relation("OfferVersionCapabilityLinks", fields: [offerVersionId, organizationId], references: [id, organizationId], onDelete: Restrict, onUpdate: Restrict, map: "offer_version_capability_offer_version_fk")
  capability   Capability   @relation("CapabilityOfferVersionLinks", fields: [capabilityId, organizationId], references: [id, organizationId], onDelete: Restrict, onUpdate: Restrict, map: "offer_version_capability_capability_fk")

  @@id([offerVersionId, capabilityId], map: "offer_version_capability_pk")
  @@index([capabilityId, offerVersionId], map: "offer_version_capability_reverse_idx")
  @@map("offer_version_capabilities")
}

model Evidence {
  id                         String             @id @default(uuid()) @db.Text
  organizationId             String             @map("organization_id") @db.Text
  capabilityId               String?            @map("capability_id") @db.Text
  capabilityOrganizationId   String?            @map("capability_organization_id") @db.Text
  offerVersionId             String?            @map("offer_version_id") @db.Text
  offerVersionOrganizationId String?            @map("offer_version_organization_id") @db.Text
  sourceKind                 EvidenceSourceKind @map("source_kind")
  sourceRef                  String?            @map("source_ref") @db.VarChar(255)
  methodKey                  String?            @map("method_key") @db.VarChar(160)
  capturedAt                 DateTime?          @map("captured_at") @db.Timestamptz(3)
  observedAt                 DateTime?          @map("observed_at") @db.Timestamptz(3)
  freshUntil                 DateTime?          @map("fresh_until") @db.Timestamptz(3)
  confidence                 Decimal?           @db.Decimal(5, 4)
  confirmationStatus         ConfirmationStatus @default(UNCONFIRMED) @map("confirmation_status")
  confirmedByMembershipId    String?            @map("confirmed_by_membership_id") @db.Text
  confirmedByOrganizationId  String?            @map("confirmed_by_organization_id") @db.Text
  confirmedAt                DateTime?          @map("confirmed_at") @db.Timestamptz(3)
  evidenceStatus             EvidenceStatus     @default(ACTIVE) @map("evidence_status")
  createdAt                  DateTime            @default(now()) @map("created_at") @db.Timestamptz(3)

  organization          Organization            @relation("OrganizationEvidence", fields: [organizationId], references: [id], onDelete: Restrict, onUpdate: Restrict, map: "evidence_organization_fk")
  capability            Capability?             @relation("EvidenceCapability", fields: [capabilityId, capabilityOrganizationId], references: [id, organizationId], onDelete: Restrict, onUpdate: Restrict, map: "evidence_capability_fk")
  offerVersion          OfferVersion?           @relation("EvidenceOfferVersion", fields: [offerVersionId, offerVersionOrganizationId], references: [id, organizationId], onDelete: Restrict, onUpdate: Restrict, map: "evidence_offer_version_fk")
  confirmedByMembership Membership? @relation("EvidenceConfirmedByMembership", fields: [confirmedByMembershipId, confirmedByOrganizationId], references: [id, organizationId], onDelete: Restrict, onUpdate: Restrict, map: "evidence_confirmed_by_membership_fk")

  @@unique([id, organizationId], map: "evidence_id_organization_unique")
  @@index([organizationId, capabilityId, evidenceStatus, freshUntil], map: "evidence_capability_status_fresh_idx")
  @@index([organizationId, offerVersionId, evidenceStatus, freshUntil], map: "evidence_offer_version_status_fresh_idx")
  @@index([organizationId, sourceKind, confirmationStatus], map: "evidence_source_confirmation_idx")
  @@map("evidence")
}

model Publication {
  id                                    String               @id @default(uuid()) @db.Text
  organizationId                        String               @map("organization_id") @db.Text
  businessProfileId                     String?              @map("business_profile_id") @db.Text
  businessProfileOrganizationId         String?              @map("business_profile_organization_id") @db.Text
  capabilityId                          String?              @map("capability_id") @db.Text
  capabilityOrganizationId              String?              @map("capability_organization_id") @db.Text
  offerVersionId                        String?              @map("offer_version_id") @db.Text
  offerVersionOrganizationId            String?              @map("offer_version_organization_id") @db.Text
  eventKind                              PublicationEventKind @map("event_kind")
  contentRevision                        Int?                 @map("content_revision")
  performedByMembershipId                String               @map("performed_by_membership_id") @db.Text
  permissionKey                          String               @map("permission_key") @db.VarChar(160)
  gateSnapshot                           Json                 @map("gate_snapshot") @db.JsonB
  reason                                 String               @db.Text
  occurredAt                             DateTime             @default(now()) @map("occurred_at") @db.Timestamptz(3)

  organization        Organization           @relation("OrganizationPublications", fields: [organizationId], references: [id], onDelete: Restrict, onUpdate: Restrict, map: "publication_organization_fk")
  businessProfile     BusinessProfile?       @relation("PublicationBusinessProfile", fields: [businessProfileId, businessProfileOrganizationId], references: [id, organizationId], onDelete: Restrict, onUpdate: Restrict, map: "publication_business_profile_fk")
  capability          Capability?            @relation("PublicationCapability", fields: [capabilityId, capabilityOrganizationId], references: [id, organizationId], onDelete: Restrict, onUpdate: Restrict, map: "publication_capability_fk")
  offerVersion        OfferVersion?          @relation("PublicationOfferVersion", fields: [offerVersionId, offerVersionOrganizationId], references: [id, organizationId], onDelete: Restrict, onUpdate: Restrict, map: "publication_offer_version_fk")
  performedByMembership Membership @relation("PublicationPerformedByMembership", fields: [performedByMembershipId, organizationId], references: [id, organizationId], onDelete: Restrict, onUpdate: Restrict, map: "publication_performed_by_membership_fk")

  @@unique([id, organizationId], map: "publication_id_organization_unique")
  @@index([organizationId, businessProfileId, occurredAt], map: "publication_business_profile_time_idx")
  @@index([organizationId, capabilityId, occurredAt], map: "publication_capability_time_idx")
  @@index([organizationId, offerVersionId, occurredAt], map: "publication_offer_version_time_idx")
  @@index([organizationId, performedByMembershipId, occurredAt], map: "publication_actor_time_idx")
  @@map("publications")
}
// END CCR_CORE_MODELS
```

## ۶. SQL دستی دقیق C1 تا C15

نام همه‌ی objectهای دستی ثابت و snake_case است. این بلوک پس از SQL تولیدشده توسط Prisma به همان migration افزوده می‌شود.

```sql
-- BEGIN CCR_CORE_MANUAL_SQL
-- C1..C5: partial uniqueness
CREATE UNIQUE INDEX business_identity_claim_active_identifier_unique
  ON business_identity_claims (identifier_type, identifier_value)
  WHERE claim_status IN ('VERIFIED', 'SUSPENDED');

CREATE UNIQUE INDEX membership_active_subject_unique
  ON memberships (organization_id, identity_provider, external_subject)
  WHERE membership_status = 'ACTIVE';

CREATE UNIQUE INDEX permission_grant_active_unique
  ON permission_grants (organization_id, membership_id, permission_key)
  WHERE grant_status = 'ACTIVE';

CREATE UNIQUE INDEX business_profile_claim_unique
  ON business_profiles (business_identity_claim_id)
  WHERE business_identity_claim_id IS NOT NULL;

CREATE UNIQUE INDEX offer_version_published_unique
  ON offer_versions (offer_id)
  WHERE publication_status = 'PUBLISHED';

-- C6: optional composite relation shadow pairs
ALTER TABLE organizations ADD CONSTRAINT organization_archive_actor_pair_check CHECK (
  (archived_by_membership_id IS NULL AND archived_by_organization_id IS NULL)
  OR (archived_by_membership_id IS NOT NULL AND archived_by_organization_id IS NOT NULL
      AND archived_by_organization_id = id)
);

ALTER TABLE memberships ADD CONSTRAINT membership_revocation_actor_pair_check CHECK (
  (revoked_by_membership_id IS NULL AND revoked_by_organization_id IS NULL)
  OR (revoked_by_membership_id IS NOT NULL AND revoked_by_organization_id IS NOT NULL
      AND revoked_by_organization_id = organization_id)
);

ALTER TABLE permission_grants ADD CONSTRAINT permission_grant_grantor_pair_check CHECK (
  (granted_by_membership_id IS NULL AND granted_by_organization_id IS NULL)
  OR (granted_by_membership_id IS NOT NULL AND granted_by_organization_id IS NOT NULL
      AND granted_by_organization_id = organization_id)
);

ALTER TABLE permission_grants ADD CONSTRAINT permission_grant_revoker_pair_check CHECK (
  (revoked_by_membership_id IS NULL AND revoked_by_organization_id IS NULL)
  OR (revoked_by_membership_id IS NOT NULL AND revoked_by_organization_id IS NOT NULL
      AND revoked_by_organization_id = organization_id)
);

ALTER TABLE business_profiles ADD CONSTRAINT business_profile_claim_pair_check CHECK (
  (business_identity_claim_id IS NULL AND business_identity_claim_organization_id IS NULL)
  OR (business_identity_claim_id IS NOT NULL AND business_identity_claim_organization_id IS NOT NULL
      AND business_identity_claim_organization_id = organization_id)
);

ALTER TABLE capabilities ADD CONSTRAINT capability_confirmer_pair_check CHECK (
  (confirmed_by_membership_id IS NULL AND confirmed_by_organization_id IS NULL)
  OR (confirmed_by_membership_id IS NOT NULL AND confirmed_by_organization_id IS NOT NULL
      AND confirmed_by_organization_id = organization_id)
);

ALTER TABLE evidence ADD CONSTRAINT evidence_capability_pair_check CHECK (
  (capability_id IS NULL AND capability_organization_id IS NULL)
  OR (capability_id IS NOT NULL AND capability_organization_id IS NOT NULL
      AND capability_organization_id = organization_id)
);

ALTER TABLE evidence ADD CONSTRAINT evidence_offer_version_pair_check CHECK (
  (offer_version_id IS NULL AND offer_version_organization_id IS NULL)
  OR (offer_version_id IS NOT NULL AND offer_version_organization_id IS NOT NULL
      AND offer_version_organization_id = organization_id)
);

ALTER TABLE evidence ADD CONSTRAINT evidence_confirmer_pair_check CHECK (
  (confirmed_by_membership_id IS NULL AND confirmed_by_organization_id IS NULL)
  OR (confirmed_by_membership_id IS NOT NULL AND confirmed_by_organization_id IS NOT NULL
      AND confirmed_by_organization_id = organization_id)
);

ALTER TABLE publications ADD CONSTRAINT publication_business_profile_pair_check CHECK (
  (business_profile_id IS NULL AND business_profile_organization_id IS NULL)
  OR (business_profile_id IS NOT NULL AND business_profile_organization_id IS NOT NULL
      AND business_profile_organization_id = organization_id)
);

ALTER TABLE publications ADD CONSTRAINT publication_capability_pair_check CHECK (
  (capability_id IS NULL AND capability_organization_id IS NULL)
  OR (capability_id IS NOT NULL AND capability_organization_id IS NOT NULL
      AND capability_organization_id = organization_id)
);

ALTER TABLE publications ADD CONSTRAINT publication_offer_version_pair_check CHECK (
  (offer_version_id IS NULL AND offer_version_organization_id IS NULL)
  OR (offer_version_id IS NOT NULL AND offer_version_organization_id IS NOT NULL
      AND offer_version_organization_id = organization_id)
);

-- C7: typed-owner/target XOR
ALTER TABLE evidence ADD CONSTRAINT evidence_owner_xor_check CHECK (
  num_nonnulls(capability_id, offer_version_id) = 1
);

ALTER TABLE publications ADD CONSTRAINT publication_target_xor_check CHECK (
  num_nonnulls(business_profile_id, capability_id, offer_version_id) = 1
);

-- C8: lifecycle audit completeness
ALTER TABLE organizations ADD CONSTRAINT organization_archive_audit_check CHECK (
  (lifecycle_status = 'ACTIVE'
    AND archived_at IS NULL
    AND archived_by_membership_id IS NULL
    AND archived_by_platform_identity_ref IS NULL
    AND archive_reason IS NULL)
  OR
  (lifecycle_status = 'ARCHIVED'
    AND archived_at IS NOT NULL
    AND archive_reason IS NOT NULL
    AND num_nonnulls(archived_by_membership_id, archived_by_platform_identity_ref) = 1)
);

ALTER TABLE business_identity_claims ADD CONSTRAINT business_identity_claim_status_audit_check CHECK (
  (claim_status = 'PENDING'
    AND status_changed_by_platform_identity_ref IS NULL
    AND status_change_reason IS NULL
    AND status_changed_at IS NULL
    AND verified_at IS NULL)
  OR
  (claim_status IN ('VERIFIED', 'SUSPENDED')
    AND status_changed_by_platform_identity_ref IS NOT NULL
    AND status_change_reason IS NOT NULL
    AND status_changed_at IS NOT NULL
    AND verified_at IS NOT NULL)
  OR
  (claim_status = 'REJECTED'
    AND status_changed_by_platform_identity_ref IS NOT NULL
    AND status_change_reason IS NOT NULL
    AND status_changed_at IS NOT NULL)
  OR
  (claim_status = 'EXPIRED'
    AND status_change_reason IS NOT NULL
    AND status_changed_at IS NOT NULL)
);

ALTER TABLE memberships ADD CONSTRAINT membership_revocation_audit_check CHECK (
  (membership_status = 'ACTIVE'
    AND revoked_at IS NULL
    AND revoked_by_membership_id IS NULL
    AND revoked_by_platform_identity_ref IS NULL
    AND revocation_reason IS NULL)
  OR
  (membership_status = 'REVOKED'
    AND revoked_at IS NOT NULL
    AND revocation_reason IS NOT NULL
    AND num_nonnulls(revoked_by_membership_id, revoked_by_platform_identity_ref) = 1)
);

ALTER TABLE permission_grants ADD CONSTRAINT permission_grant_revocation_audit_check CHECK (
  (grant_status = 'ACTIVE'
    AND revoked_at IS NULL
    AND revoked_by_membership_id IS NULL
    AND revoked_by_platform_identity_ref IS NULL
    AND revocation_reason IS NULL)
  OR
  (grant_status = 'REVOKED'
    AND revoked_at IS NOT NULL
    AND revocation_reason IS NOT NULL
    AND num_nonnulls(revoked_by_membership_id, revoked_by_platform_identity_ref) = 1)
);

ALTER TABLE identity_verifications ADD CONSTRAINT identity_verification_decision_audit_check CHECK (
  (status IN ('PENDING', 'UNDER_REVIEW')
    AND reviewed_by_platform_identity_ref IS NULL
    AND decision_reason IS NULL
    AND decided_at IS NULL)
  OR
  (status IN ('VERIFIED', 'REJECTED')
    AND reviewed_by_platform_identity_ref IS NOT NULL
    AND decision_reason IS NOT NULL
    AND decided_at IS NOT NULL)
  OR
  (status = 'EXPIRED'
    AND decision_reason IS NOT NULL
    AND decided_at IS NOT NULL)
);

-- C9: grant basis
ALTER TABLE permission_grants ADD CONSTRAINT permission_grant_basis_check CHECK (
  (basis_key = 'founding'
    AND granted_by_membership_id IS NULL
    AND granted_by_organization_id IS NULL)
  OR
  (basis_key = 'member_grant'
    AND granted_by_membership_id IS NOT NULL
    AND granted_by_organization_id = organization_id)
);

-- C10: ranges, prices, confidence, revisions and projected publication state
ALTER TABLE offer_versions ADD CONSTRAINT offer_version_validity_check CHECK (
  valid_until IS NULL OR valid_until > valid_from
);

ALTER TABLE offer_versions ADD CONSTRAINT offer_version_price_check CHECK (
  (on_request = true AND price_amount IS NULL AND price_currency IS NULL)
  OR
  (on_request = false AND price_amount IS NOT NULL AND price_amount >= 0 AND price_currency IS NOT NULL)
);

ALTER TABLE offer_versions ADD CONSTRAINT offer_version_publication_projection_check CHECK (
  (publication_status = 'UNPUBLISHED' AND published_at IS NULL)
  OR
  (publication_status IN ('PUBLISHED', 'WITHDRAWN') AND published_at IS NOT NULL)
);

ALTER TABLE evidence ADD CONSTRAINT evidence_confidence_check CHECK (
  confidence IS NULL OR (confidence >= 0 AND confidence <= 1)
);

ALTER TABLE business_profiles ADD CONSTRAINT business_profile_revision_check CHECK (
  content_revision >= 1
  AND (
    (publication_status = 'UNPUBLISHED' AND published_content_revision IS NULL)
    OR
    (publication_status IN ('PUBLISHED', 'WITHDRAWN')
      AND published_content_revision BETWEEN 1 AND content_revision)
  )
);

ALTER TABLE capabilities ADD CONSTRAINT capability_revision_check CHECK (
  content_revision >= 1
  AND (
    (publication_status = 'UNPUBLISHED' AND published_content_revision IS NULL)
    OR
    (publication_status IN ('PUBLISHED', 'WITHDRAWN')
      AND published_content_revision BETWEEN 1 AND content_revision)
  )
);

ALTER TABLE publications ADD CONSTRAINT publication_content_revision_check CHECK (
  ((business_profile_id IS NOT NULL OR capability_id IS NOT NULL)
    AND content_revision IS NOT NULL
    AND content_revision >= 1)
  OR
  (offer_version_id IS NOT NULL AND content_revision IS NULL)
);

-- C11: human confirmation is separate from provenance/confidence
ALTER TABLE capabilities ADD CONSTRAINT capability_confirmation_check CHECK (
  (confirmation_status = 'UNCONFIRMED'
    AND confirmed_by_membership_id IS NULL
    AND confirmed_by_organization_id IS NULL
    AND confirmed_at IS NULL)
  OR
  (confirmation_status = 'HUMAN_CONFIRMED'
    AND confirmed_by_membership_id IS NOT NULL
    AND confirmed_by_organization_id = organization_id
    AND confirmed_at IS NOT NULL)
);

ALTER TABLE evidence ADD CONSTRAINT evidence_confirmation_check CHECK (
  (confirmation_status = 'UNCONFIRMED'
    AND confirmed_by_membership_id IS NULL
    AND confirmed_by_organization_id IS NULL
    AND confirmed_at IS NULL)
  OR
  (confirmation_status = 'HUMAN_CONFIRMED'
    AND confirmed_by_membership_id IS NOT NULL
    AND confirmed_by_organization_id = organization_id
    AND confirmed_at IS NOT NULL)
);

-- C12: Publication is append-only
CREATE FUNCTION core_reject_publication_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'publications are append-only';
END;
$$;

CREATE TRIGGER publication_immutable_before_change
BEFORE UPDATE OR DELETE ON publications
FOR EACH ROW EXECUTE FUNCTION core_reject_publication_mutation();

-- C13: OfferVersion content and its capability links are immutable
CREATE FUNCTION core_enforce_offer_version_immutability() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'offer versions cannot be deleted';
  END IF;
  IF (to_jsonb(NEW) - 'publication_status' - 'published_at')
       IS DISTINCT FROM
     (to_jsonb(OLD) - 'publication_status' - 'published_at') THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'offer version content is immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER offer_version_immutable_before_change
BEFORE UPDATE OR DELETE ON offer_versions
FOR EACH ROW EXECUTE FUNCTION core_enforce_offer_version_immutability();

CREATE FUNCTION core_enforce_offer_version_capability_immutability() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  parent_published_at timestamptz;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'offer version capability links cannot be updated';
  END IF;

  IF TG_OP = 'INSERT' THEN
    SELECT published_at INTO parent_published_at
      FROM offer_versions
     WHERE id = NEW.offer_version_id
       AND organization_id = NEW.organization_id
     FOR UPDATE;
    IF parent_published_at IS NOT NULL THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'published offer version capability links are immutable';
    END IF;
    RETURN NEW;
  END IF;

  SELECT published_at INTO parent_published_at
    FROM offer_versions
   WHERE id = OLD.offer_version_id
     AND organization_id = OLD.organization_id
   FOR UPDATE;
  IF parent_published_at IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'published offer version capability links are immutable';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER offer_version_capability_immutable_before_change
BEFORE INSERT OR UPDATE OR DELETE ON offer_version_capabilities
FOR EACH ROW EXECUTE FUNCTION core_enforce_offer_version_capability_immutability();

-- C14: decided verification history is read-only
CREATE FUNCTION core_enforce_verification_immutability() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IN ('VERIFIED', 'REJECTED', 'EXPIRED') THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'decided identity verification is immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER identity_verification_decided_immutable_before_change
BEFORE UPDATE OR DELETE ON identity_verifications
FOR EACH ROW EXECUTE FUNCTION core_enforce_verification_immutability();

-- D6 = A: public-field changes increment content_revision in the database.
CREATE FUNCTION core_bump_business_profile_content_revision() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF ROW(
       NEW.name, NEW.description, NEW.latitude, NEW.longitude, NEW.address_text,
       NEW.contact_information, NEW.links, NEW.business_hours,
       NEW.business_identity_claim_id
     ) IS DISTINCT FROM ROW(
       OLD.name, OLD.description, OLD.latitude, OLD.longitude, OLD.address_text,
       OLD.contact_information, OLD.links, OLD.business_hours,
       OLD.business_identity_claim_id
     ) THEN
    NEW.content_revision := OLD.content_revision + 1;
  ELSIF NEW.content_revision IS DISTINCT FROM OLD.content_revision THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'content revision requires a public field change';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER business_profile_content_revision_before_update
BEFORE UPDATE OF name, description, latitude, longitude, address_text,
  contact_information, links, business_hours, business_identity_claim_id,
  content_revision ON business_profiles
FOR EACH ROW EXECUTE FUNCTION core_bump_business_profile_content_revision();

CREATE FUNCTION core_bump_capability_content_revision() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF ROW(NEW.name, NEW.short_description, NEW.category_key, NEW.audience)
       IS DISTINCT FROM
     ROW(OLD.name, OLD.short_description, OLD.category_key, OLD.audience) THEN
    NEW.content_revision := OLD.content_revision + 1;
  ELSIF NEW.content_revision IS DISTINCT FROM OLD.content_revision THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'content revision requires a public field change';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER capability_content_revision_before_update
BEFORE UPDATE OF name, short_description, category_key, audience,
  content_revision ON capabilities
FOR EACH ROW EXECUTE FUNCTION core_bump_capability_content_revision();

-- C15 / D1 = B1: direct projection writes are forbidden.
-- Closed projection-writer allow-list: publication_apply_projection_after_insert only.
CREATE FUNCTION core_require_nested_publication_projection() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.publication_status <> 'UNPUBLISHED' THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'initial publication status must be UNPUBLISHED';
    END IF;
    RETURN NEW;
  END IF;
  IF pg_trigger_depth() <= 1 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'publication projection requires Publication event';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER business_profile_publication_initial_guard
BEFORE INSERT ON business_profiles
FOR EACH ROW EXECUTE FUNCTION core_require_nested_publication_projection();
CREATE TRIGGER business_profile_publication_projection_guard
BEFORE UPDATE OF publication_status, published_content_revision ON business_profiles
FOR EACH ROW EXECUTE FUNCTION core_require_nested_publication_projection();

CREATE TRIGGER capability_publication_initial_guard
BEFORE INSERT ON capabilities
FOR EACH ROW EXECUTE FUNCTION core_require_nested_publication_projection();
CREATE TRIGGER capability_publication_projection_guard
BEFORE UPDATE OF publication_status, published_content_revision ON capabilities
FOR EACH ROW EXECUTE FUNCTION core_require_nested_publication_projection();

CREATE TRIGGER offer_version_publication_initial_guard
BEFORE INSERT ON offer_versions
FOR EACH ROW EXECUTE FUNCTION core_require_nested_publication_projection();
CREATE TRIGGER offer_version_publication_projection_guard
BEFORE UPDATE OF publication_status, published_at ON offer_versions
FOR EACH ROW EXECUTE FUNCTION core_require_nested_publication_projection();

CREATE FUNCTION core_apply_publication_projection() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  affected_rows integer;
BEGIN
  IF NEW.business_profile_id IS NOT NULL THEN
    IF NEW.event_kind = 'PUBLISHED' THEN
      UPDATE business_profiles
         SET publication_status = 'PUBLISHED',
             published_content_revision = NEW.content_revision,
             updated_at = NEW.occurred_at
       WHERE id = NEW.business_profile_id
         AND organization_id = NEW.organization_id
         AND content_revision = NEW.content_revision
         AND (
           publication_status IN ('UNPUBLISHED', 'WITHDRAWN')
           OR (publication_status = 'PUBLISHED'
               AND NEW.content_revision > published_content_revision)
         );
    ELSE
      UPDATE business_profiles
         SET publication_status = 'WITHDRAWN',
             updated_at = NEW.occurred_at
       WHERE id = NEW.business_profile_id
         AND organization_id = NEW.organization_id
         AND publication_status = 'PUBLISHED'
         AND published_content_revision = NEW.content_revision;
    END IF;
  ELSIF NEW.capability_id IS NOT NULL THEN
    IF NEW.event_kind = 'PUBLISHED' THEN
      UPDATE capabilities
         SET publication_status = 'PUBLISHED',
             published_content_revision = NEW.content_revision,
             updated_at = NEW.occurred_at
       WHERE id = NEW.capability_id
         AND organization_id = NEW.organization_id
         AND content_revision = NEW.content_revision
         AND (
           publication_status IN ('UNPUBLISHED', 'WITHDRAWN')
           OR (publication_status = 'PUBLISHED'
               AND NEW.content_revision > published_content_revision)
         );
    ELSE
      UPDATE capabilities
         SET publication_status = 'WITHDRAWN',
             updated_at = NEW.occurred_at
       WHERE id = NEW.capability_id
         AND organization_id = NEW.organization_id
         AND publication_status = 'PUBLISHED'
         AND published_content_revision = NEW.content_revision;
    END IF;
  ELSE
    IF NEW.event_kind = 'PUBLISHED' THEN
      UPDATE offer_versions
         SET publication_status = 'PUBLISHED',
             published_at = NEW.occurred_at
       WHERE id = NEW.offer_version_id
         AND organization_id = NEW.organization_id
         AND publication_status IN ('UNPUBLISHED', 'WITHDRAWN');
    ELSE
      UPDATE offer_versions
         SET publication_status = 'WITHDRAWN'
       WHERE id = NEW.offer_version_id
         AND organization_id = NEW.organization_id
         AND publication_status = 'PUBLISHED';
    END IF;
  END IF;

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 1 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid publication transition';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER publication_apply_projection_after_insert
AFTER INSERT ON publications
FOR EACH ROW EXECUTE FUNCTION core_apply_publication_projection();
-- END CCR_CORE_MANUAL_SQL
```

### ۶.۱. فهرست بسته Triggerهای مجاز برای D1/B1 و D6/A

مجموعه‌ی دقیق Triggerهای غیرداخلی روی پنج جدول حساس به شرح زیر است:

- `publications`: `publication_apply_projection_after_insert`، `publication_immutable_before_change`
- `business_profiles`: `business_profile_content_revision_before_update`، `business_profile_publication_initial_guard`، `business_profile_publication_projection_guard`
- `capabilities`: `capability_content_revision_before_update`، `capability_publication_initial_guard`، `capability_publication_projection_guard`
- `offer_versions`: `offer_version_immutable_before_change`، `offer_version_publication_initial_guard`، `offer_version_publication_projection_guard`
- `offer_version_capabilities`: `offer_version_capability_immutable_before_change`

تنها Trigger مجاز به ایجاد update تو‌در‌تو روی projectionهای انتشار، `publication_apply_projection_after_insert` است. دو Trigger مربوط به D6 فقط `content_revision` را می‌نویسند و هرگز `publication_status`، `published_content_revision` یا `published_at` را تغییر نمی‌دهند. افزودن Trigger دیگری روی این پنج جدول، تغییر قرارداد و نیازمند CCR است. آزمون inventory باید مجموعه‌ی کامل بالا را با برابری دقیق کنترل کند. `pg_trigger_depth() > 1` فقط nested بودن را اثبات می‌کند؛ allow-list با بازبینی اجباری migration و inventory خودکار تثبیت می‌شود.

## ۷. مالکیت، کاردینالیتی و مرز Module

- V1/Core مالک هر ۱۲ مدل است.
- Organization ریشه Tenant و Business Identity Claim ادعای هویت بیرونی است؛ این دو یکی نیستند.
- Membership فقط subject بیرونی Identity Provider را نگه می‌دارد؛ User/Password داخلی ساخته نمی‌شود.
- BusinessProfile، Capability، Offer، Evidence و Publication نمای عمومی و عمومی‌دامنه‌اند؛ Core هیچ جدول Module را نمی‌خواند.
- Moduleها واژگان و workflow تخصصی خود را نگه می‌دارند و فقط از قراردادهای Core استفاده می‌کنند.
- V2 فقط داده‌ی منتشرشده Core را از Port/API آینده مصرف می‌کند و به storage Module دسترسی مستقیم ندارد.

## ۸. Permission و قواعد نوشتن

- Role هرگز منبع Permission نیست.
- Publication یک Membership فعال و PermissionGrant فعال متناظر با `permission_key` می‌خواهد. کنترل این gate در service/repository مرحله بعد انجام می‌شود؛ schema actor و permission مصرف‌شده را ثبت می‌کند.
- W1 الزامی است: `organizationId` از context معتبر گرفته و همراه تمام FKهای مستقیم نوشته می‌شود. payload کاربر منبع Tenant نیست.
- W2 اختیاری است: nested `connect` می‌تواند برای ergonomics استفاده شود، ولی جای W1 و FK مرکب را نمی‌گیرد.
- پلتفرم Verification را اجرا می‌کند و ممکن است لغو ایمنی انجام دهد، اما Permission کسب‌وکاری ایجاد نمی‌کند.

## ۹. چرخه‌های عمر و تاریخچه

- Organization: `ACTIVE → ARCHIVED`.
- Claim: `PENDING → VERIFIED|REJECTED`، `VERIFIED ⇄ SUSPENDED`، `VERIFIED|SUSPENDED → EXPIRED`. وضعیت پایانی دوباره فعال نمی‌شود.
- Membership و PermissionGrant: `ACTIVE → REVOKED`; بازفعال‌سازی وجود ندارد و رکورد جدید لازم است.
- Capability چهار بُعد مستقل lifecycle، audience، confirmation و publication دارد.
- Offer: `ACTIVE → RETIRED`; نسخه‌ها باقی می‌مانند.
- OfferVersion پس از ساخت تغییرناپذیر است؛ فقط projection انتشار و زمان انتشار با Publication Event تغییر می‌کند.
- Publication فقط‌افزودنی است.
- IdentityVerification پس از تصمیم تغییرناپذیر است.
- جایگزینی OfferVersion در یک تراکنش و با ترتیب اجباری انجام می‌شود: `WITHDRAWN` نسخه قبلی، سپس `PUBLISHED` نسخه جدید.

## ۱۰. رفتار حذف، FK و ممیزی

- تمام FKهای Core `RESTRICT/RESTRICT` هستند؛ حذف یا تغییر کلیدی که تاریخچه به آن ارجاع دارد رد می‌شود.
- حذف فیزیکی تاریخچه‌ی Verification، Publication و OfferVersion مجاز نیست.
- این CCR به جدول‌های موجود V1 و `ExternalWorkspaceLink` هیچ FK تازه‌ای اضافه نمی‌کند.
- actor پلتفرم opaque و بدون FK Membership می‌ماند؛ actor کسب‌وکار همیشه Membership همان Organization است.

## ۱۱. طرح migration

1. `prisma` و `@prisma/client` در مرحله implementation دقیقاً روی `5.22.0` pin شوند.
2. همه‌ی ۱۲ مدل و enumهای این سند به `schema.prisma` افزوده شوند؛ هیچ جدول Clinic، Session، Intent، Consent یا Customer Data افزوده نشود.
3. یک migration با Prisma تولید شود.
4. SQL تولیدشده به‌صورت اجباری بازبینی شود؛ سپس بلوک SQL دقیق §۶ به انتهای همان migration افزوده شود.
5. protected-object list شامل تمام FKها، indexهای C1..C5، CHECKهای C6..C11، function/triggerهای C12..C15 و ایندکس `external_workspace_link_active_unique` است.
6. هر migration بعدی با `migrate diff` بررسی شود؛ DROP/RENAME یک object محافظت‌شده بدون CCR ممنوع است.
7. هر جدول ساخته‌شده با migration باید در `schema.prisma` مدل متناظر داشته باشد. نام FK/Unique/Indexهای Prisma با `map:` ثابت شده است؛ objectهای دستی نام ثابت این سند را دارند.

## ۱۲. راهبرد Rollback

### پیش از ورود داده واقعی

Rollback می‌تواند migration را در محیط disposable بازگرداند و ۱۲ جدول تازه را به ترتیب وابستگی حذف کند. rollback SQL باید functions و enumهای تازه را نیز پس از جدول‌ها حذف کند. جدول‌های موجود V1 و migrationهای قبلی نباید حذف شوند.

### پس از ورود داده واقعی

Rollback تخریبی ممنوع است. ابتدا writerها متوقف، snapshot و شمارش/هش داده ثبت، مسیر خواندن به نسخه سازگار برگردانده و فقط تغییر forward-fix اعمال می‌شود. Publication، Verification و OfferVersion هرگز برای ساده‌کردن rollback حذف یا بازنویسی نمی‌شوند.

## ۱۳. ریسک‌های migration

- روابط مرکب متعدد به `organization_id` نیازمند Prisma 5.22.0 و تست write path هستند.
- Triggerهای C15 به allow-list بسته و inventory هر migration وابسته‌اند.
- Partial unique indexها و CHECK/Triggerها در Prisma schema بیان کامل ندارند و فقط با SQL دستی و بازبینی migration حفظ می‌شوند.
- قید حلقوی Organization/Membership ترتیب درج را حساس می‌کند: Organization ابتدا بدون archive actor ساخته می‌شود؛ Membership بعداً ایجاد می‌شود؛ آرشیو سپس قابل ثبت است.
- FK `ExternalWorkspaceLink` عمداً خارج از دامنه است؛ نبود آن نباید به‌عنوان tenant validation برای آن جدول تفسیر شود.
- قرارداد `terms`، registry کلیدها و permission key انتشار Profile باید پیش از استفاده‌ی واقعی آن قابلیت‌ها بسته شوند، ولی شکل این schema را تغییر نمی‌دهند.

## ۱۴. ردیابی اسناد و hash canonical Git

قاعده G2-C1: تمام SHA-256های این بخش روی بایت‌های `git show COMMIT:PATH` محاسبه شده‌اند، نه working tree ویندوز.

| سند | Commit | SHA-256 canonical |
|---|---|---|
| بازبینی G2 Guardian | `89aef7ab70573283621f1396efade87d7e5d21db` | `4d65b222a0baa39461d5124c41f0d264dd0888f54ddd9eb0e47b82fff08b3f02` |
| بازبینی G3 Guardian | `3e19b541d1db2f629ca758faaba4dbbf1b30fbda` | `753859b2087357baedf49e9a801c781fa6c98d750a5f82d95fbb083ab6098c57` |
| CCR الگوی ExternalWorkspaceLink | `28438f22d8cfb04f114834e8b164af7c65dcea11` | `7d630b24bdc49b710a836ea1320bfb1e2b105c9f43f557abe3d8764872db5162` |
| `MLINO_CORE_PRISMA_SCHEMA_DESIGN.md` v3 | `2cf6caa467a7d90a0fa4991ca5b6fad17ac07719` | `dff76aae5c7be67234998a73ee92a2716ff99b17e98f659bdf19abbf191823e6` |
| بازبینی مستقل Prisma | `2cf6caa467a7d90a0fa4991ca5b6fad17ac07719` | `b0d229751a4c141b634afe4160c72674c42bef94145891e27ab935bac237d785` |
| حل blockerهای Prisma | `2cf6caa467a7d90a0fa4991ca5b6fad17ac07719` | `92ecc10f9e136fff34808820cb39abcc37485db98d29063b3f7a1ed70db588f4` |
| اعتبارسنجی PostgreSQL | `2cf6caa467a7d90a0fa4991ca5b6fad17ac07719` | `6fdfe2ff97757f2f03e90b38f687c9c5d46355dd161249a2a918b7974b272f60` |
| گزارش G1b | `2cf6caa467a7d90a0fa4991ca5b6fad17ac07719` | `277ab119c36f2fd367fe9f74b75777bc1a36d8b5887fc8dad342e92a47db6276` |
| گزارش G1c | `2cf6caa467a7d90a0fa4991ca5b6fad17ac07719` | `9ad9bb0945f21b7d6feb696c8a8f1e4dcd46122568754f0e5600bd6de85a9b6d` |
| گردش‌کار Codex | `2cf6caa467a7d90a0fa4991ca5b6fad17ac07719` | `93ee49ac5ac6c7ac51f8edb5642e9166ab4ea9e51c2da580a098433a5d0a6e6e` |
| `G1_EVIDENCE_MANIFEST.md` | `2cf6caa467a7d90a0fa4991ca5b6fad17ac07719` | `546bc02b00c3221c381261743455e146821b95c48694170ac0ae4db61324d3b9` |

### جدول مبنای Prisma از بازبینی G2

| فایل | Commit | SHA-256 canonical |
|---|---|---|
| `implementation/prisma/schema.prisma` | `28438f22d8cfb04f114834e8b164af7c65dcea11` | `e1c79133597fcaadc2848c692e6651806df43fac6ecdade44378eeb2a86e3b8a` |
| `20260814065924_init/migration.sql` | همان Commit | `e7e2da2abd8fc2e73af3db4c97145e9e8431f904ff8b532b53e426d1e18d7efd` |
| `20260815033018_add_situation_key/migration.sql` | همان Commit | `3e3d4b30d643ef5f5b28657be34c531e69376f0523eeccf324dfee375474dc72` |
| `20260815113714_rename_actor_core_entity_id_to_actor_id/migration.sql` | همان Commit | `a4e4a57b6ca747ad383d66be4060a7e16ed6cad3a1f1e56de2e28e36898cba86` |
| `20260906001500_add_ownership_type/migration.sql` | همان Commit | `584ef0d3ff9c7d6e0640a80ca8da1ebc63e06fb5505fd78b5a663d266db93509` |
| `20260910020000_add_external_workspace_link/migration.sql` | همان Commit | `7b00129a49f4430382b2b1f8fcbde9cdd0d583ea371cc9cbd55fd173252b4ac5` |

ADR-0001 تا ADR-0012 در `28438f22d8cfb04f114834e8b164af7c65dcea11` مرجع معماری هستند. SHA-256 canonical به‌ترتیب:

| ADR | SHA-256 |
|---|---|
| ADR-0001 | `4de16d58a29a96689345a2d51d9d36daf6df29a69f1fd787a1b128d164582b38` |
| ADR-0002 | `1a536cb74012c5fd1aa6ee8e3a3bbdb487f9893814daa046d94adfebd1736d23` |
| ADR-0003 | `88df59816b7141cce9207bb15ef7d2e491f17e443c4f428fc199e63e5281a6bd` |
| ADR-0004 | `626ce2ec3a07a9244cd9754babd70f16fee190841b9230d0baa98366fe02dc33` |
| ADR-0005 | `4ba2a52cade6baa633d9b5143ff4ac9fbbcef06592da5a3156ee1e5db58703c9` |
| ADR-0006 | `ba840d4584c9c9513b876815abc283a5fa18b6e4361c0bd66a55db1bfd4e9f7d` |
| ADR-0007 | `c7ef78d69044b4b0b6d3df68f266f90ec56f45a8fba3df72075a58ca82fa05c3` |
| ADR-0008 | `83485e7eda5687d66bee7b104e4eec0982e20107b2a986873f229195a79731a3` |
| ADR-0009 | `61f259db9f301e5e9cffdf6db07a411f18fb345a6491220684cbe42c5bd977d0` |
| ADR-0010 | `0ed05afb9f83d70e9a1d976a0efd4fd401caf4941106240784522cb5ddeef0ab` |
| ADR-0011 | `853285770f3df0f6001a75f90422b8693e081b0b670726fa091ff9a9895c5831` |
| ADR-0012 | `292309466b0b31d56f1bd89bef41ef91a506f682a8bf182d78b1942c785cbb03` |

جزئیات ۸۳ فایل شاهد G1b/G1c در `mlino2/validation/G1_EVIDENCE_MANIFEST.md` ثبت شده و در این CCR تکرار نمی‌شود.

## ۱۵. تغییرات G3b

| یافته | تغییر اعمال‌شده |
|---|---|
| R-1 | محافظ C15 اکنون همه‌ی ستون‌های projection را می‌پاید: `publication_status` همراه `published_content_revision` یا `published_at` |
| R-2 | پیوند Capability برای OfferVersion منتشرشده در INSERT/DELETE قفل است؛ UPDATE همیشه رد می‌شود؛ پیش‌نویس INSERT/DELETE را می‌پذیرد |
| R-3 | تصمیم مالک D6=A ثبت و Trigger افزایش خودکار `content_revision` برای فیلدهای عمومی Profile و Capability اضافه شد |
| R-4 | بازنشر Profile و Capability منتشرشده فقط با `content_revision` بزرگ‌تر مجاز شد |
| R-5 | بسته‌ی G3b آزمون‌های T1 تا T12 را روی متن نهایی اجرا می‌کند |
| R-6 | نام مدل و جدول به طراحی مصوب `Membership` / `memberships` بازگردانده شد |
| R-7 | قواعد کامل گذار Publication به‌عنوان بخش صریح D1 ثبت شد |

## ۱۶. وضعیت این CCR

**DRAFT — pending owner approval**

این سند D1 تا D6 را به‌عنوان تصمیم‌های ثبت‌شده‌ی مالک منعکس می‌کند، اما هنوز APPROVED نیست. پس از اجرای validation دقیق §۵ و §۶ و بسته‌ی G3b، Architecture Guardian گزارش را بازبینی می‌کند و مالک تنها مرجع تصویب CCR است.

من کدکس هستم.
