# ثبت تصویب مالک — L1 تا L5: فعال‌سازی در هسته

**تاریخ:** ۱۹ سپتامبر ۲۰۲۶
**ثبت‌کننده:** Claude Opus 5 — نگهبان معماری MLINO
**مبنا:** `20260919_CLAUDE_REVIEW_S1_LIFECYCLE_GAP.md` (commit `cf81c43`)

## ۱. متن تصویب مالک

> «توصیه‌های نگهبان برای L1 تا L5 تصویب شد.»

## ۲. تصمیم‌های ثبت‌شده

| # | تصمیم |
|---|---|
| **L1** | `BusinessProfileService.activate`: فقط از `DRAFT` به `ACTIVE` · مجوز `business_profile.manage` · ادعای هویت پیوندخورده باید `VERIFIED` باشد و `validUntil` آن یا null باشد یا در آینده |
| **L2** | `BusinessProfileService.archive`: از `DRAFT` یا `ACTIVE` به `ARCHIVED` · پایانی است و بازگشت ندارد · مجوز `business_profile.manage` |
| **L3** | `CapabilityService.activate`: از `PLANNED` به `ACTIVE`، و `retire`: از `ACTIVE` به `RETIRED`، پایانی · مجوز `capability.manage` · فعال‌سازی به «تأیید انسانی» وابسته نیست |
| **L4** | بدون migration و بدون تغییر schema · ثبت «چه کسی و کِی» در صورت نیاز، بعداً با CCR جدا |
| **L5** | پس از تأیید نگهبان، ادغام مستقیم در main به‌دست نگهبان |

## ۳. دستور کدکس — L

به خواست مالک، متن دستور کدکس انگلیسی است.

```
INSTRUCTION_ID: CODEX-20260919-L-CORE-LIFECYCLE-ACTIVATION-001
TARGET_HANDOFF_ID: HANDOFF-20260919-OWNER-APPROVAL-L1-L5
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260919-CORE-LIFECYCLE
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260919_OWNER_APPROVAL_L1_L5_LIFECYCLE.md (PINNED_COMMIT/SHA256 relayed)
MODEL: SOL.
MODE: IMPLEMENTATION in V1 Core - a NEW branch codex/core-lifecycle-activation from origin/main at the pinned commit,
      in a NEW worktree C:/Users/galexy/mlino code/core-lifecycle-activation. LOCAL commits only; do NOT push.
PRECONDITION: GW2 or GW2-P on the pinned record; record the outputs; any failure -> STOP. Never touch credentials,
  .env files, GITHUB_TOKEN.txt, git config, or any real key.
CONTEXT (cite file:line in the report): schema defaults BusinessProfile.lifecycleStatus DRAFT (prisma/schema.prisma:478)
  and Capability.capabilityStatus PLANNED (:503); the export builder requires ACTIVE (public-export/builder.ts:180,:194);
  no Core service changes either status today. Follow the exact style of the existing methods in
  core/business-profile-service.ts and core/capability-service.ts (validateAuthContext, requireNonEmpty,
  runCoreTransaction, lockOrganization, requireMembershipPermission, organization-scoped findUnique/update,
  CoreDomainError / mapCoreDatabaseError).

1 core/business-profile-service.ts:
  - activate(context, profileId): permission business_profile.manage; the profile must exist in the organization and
    be DRAFT (otherwise conflict); it must have a linked identity claim of the same organization with claimStatus
    VERIFIED and validUntil null or in the future (otherwise validationFailed); sets lifecycleStatus ACTIVE.
  - archive(context, profileId, reason): permission business_profile.manage; allowed from DRAFT or ACTIVE; ARCHIVED is
    terminal (archiving again -> conflict); reason non-empty; sets lifecycleStatus ARCHIVED (reason is validated but
    NOT stored - there is no column; L4 says no migration).
2 core/capability-service.ts:
  - activate(context, capabilityId): permission capability.manage; PLANNED -> ACTIVE only (otherwise conflict);
    does NOT require HUMAN_CONFIRMED.
  - retire(context, capabilityId, reason): permission capability.manage; ACTIVE -> RETIRED only; RETIRED is terminal.
3 NO schema change, NO migration, NO change to the export builder, publication service, or any other file outside
  the two services, their tests and the report. No new permission key (use the existing ones).
4 TESTS - new file test/core/l-lifecycle-activation.spec.ts in the existing DB-test style (the disposable test DB,
  localhost port 5499 via the existing guard; never 5435):
  - profile: activate succeeds only from DRAFT with a linked VERIFIED, unexpired claim; fails without a claim, with a
    PENDING/SUSPENDED claim, with an expired claim, from ACTIVE, from ARCHIVED, without the permission, and across
    organizations; archive from DRAFT and ACTIVE; archive twice -> conflict; ARCHIVED cannot be activated;
  - capability: activate only from PLANNED; retire only from ACTIVE; RETIRED terminal; permission and cross-org denial;
  - END TO END: bootstrap -> claim VERIFIED -> profile + link -> activate -> capability create + confirm + activate ->
    publish profile and capability -> buildPublicExport (TEST key) contains the business WITH the capability; archive
    the profile -> the next export omits it; retire the capability -> the next export omits the capability.
  If the disposable DB is not reachable in your sandbox, do NOT start Docker: run npm run build, record that the DB
  specs could not run, and STOP after committing - the Guardian will run them on a disposable database.
  Also provide implementation/validation/l/mutation.md listing, for the Guardian, three mutations to try:
  (i) drop the VERIFIED-claim check, (ii) allow activate from ARCHIVED, (iii) drop the permission check in
  capability activate - each must make a named test FAIL.
5 VALIDATION: npm run build THREE times; the new spec three times if the DB is reachable; logs in
  implementation/validation/l/.
REPORT (new file): AI_HANDOFF/CODEX_REPORTS/20260919_CODEX_L_CORE_LIFECYCLE_REPORT.md
- files; requirement (L1-L3) -> file:line -> exact test name; run totals or the recorded DB-unavailable note;
  LF sha256; GW2/GW2-P outputs. Append only to mlino2/HANDOFF/HANDOFF_STATE.md. Commit locally and STOP.
ALLOWED FILES:
- implementation/core/business-profile-service.ts, implementation/core/capability-service.ts (new methods only)
- implementation/test/core/l-lifecycle-activation.spec.ts (new), implementation/validation/l/** (new),
  the report (new), mlino2/HANDOFF/HANDOFF_STATE.md (append only)
FORBIDDEN:
- schema, migrations, the export builder, other Core files, package.json, lockfile; any new dependency
- Docker; port 5435; the owner's database; any real key; _PUSH_STAGING; push; git config
```

## ۴. پس از L

1. **بازبینی نگهبان:** اجرای آزمون‌های دیتابیسی و آزمایش‌های حذف روی دیتابیس دور‌ریختنی 5499 که خود نگهبان می‌سازد.
2. **ادغام در main** طبق L5.
3. **تکمیل S1** با `activate`.
4. **P1 و P2** طبق اجازه‌ی پیشاپیش مالک.

من کلاد هستم
