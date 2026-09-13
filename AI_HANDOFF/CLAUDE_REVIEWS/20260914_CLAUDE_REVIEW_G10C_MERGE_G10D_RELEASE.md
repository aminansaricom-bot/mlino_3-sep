# اجرای نگهبان — ادغام G10c، ثبت S14-A و صدور G10d

**تاریخ:** ۱۴ سپتامبر ۲۰۲۶
**مجری:** Claude Opus 5 — MLINO Architecture Guardian

**تصویب مالک:** مالک در گفت‌وگوی مستقیم با Claude نوشت «تصویبش کن»، در پاسخ به بخش ۳ بازبینی `20260914_CLAUDE_REVIEW_G10C3_CAPABILITY_PUBLICATION_TESTS.md` (commit `8aa4eaf`). یعنی:

| # | تصمیم | وضعیت |
|---|---|---|
| **الف** | ادغام G10c در main | مجاز است |
| **ب** | G10d (Offer و OfferVersion و انتشارشان) | مجاز است |
| **ج** | **S14-A** | DECIDED: هر تغییر **واقعی** در فیلدهای عمومی یک Capability تأییدشده، تأیید را در همان تراکنش به `UNCONFIRMED` برمی‌گرداند. انتشار بدون تأیید مثل امروز مجاز می‌ماند |

## ۱. ادغام G10c: انجام شد

| مورد | مقدار |
|---|---|
| **merge commit** | `5c71c732c72ce4c92928baa355c65b05d22b4dfc` |
| **والدها** | `8aa4eaf` (main) و `908e956` (`codex/core-g10c-profile-capability`) |
| **درخت** | `74acffb719078fb52d04a1063f285bbaa9134022` = خروجی `merge-tree` نگهبان (پیش‌نمایش و اجرا) |
| **دامنه** | تازه: سه service ‏(profile، capability و publication)، spec ‏G10c، سه گزارش و شواهد `g10c`، `g10c2` و `g10c3` · تغییر: `error-adapter.ts` و Handoff Codex (فقط افزودنی) · **بدون حذف** |
| **push** | محافظت‌شده با `--force-with-lease=main:8aa4eaf` |
| **runtime** | read-api همان `a07858b3` · DB با StartedAt بدون تغییر و `Restarts=0` · شش migration · `dspr=4` · بدون build، restart، migration یا آزمون |

---

## ۲. دستور G10d

```
INSTRUCTION_ID: CODEX-20260914-G10D-CORE-OFFER-SLICE-001
TARGET_HANDOFF_ID: HANDOFF-20260914-GUARDIAN-G10C-MERGE-G10D
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260914-CORE-G10D
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260914_CLAUDE_REVIEW_G10C_MERGE_G10D_RELEASE.md (this file; PINNED_COMMIT/SHA256 relayed)
DESIGN_REFERENCE: origin/main mlino2/MLINO_CORE_SERVICE_LAYER_DESIGN.md (FINAL) — sections 3, 5, 7, 8, 9
OWNER_DECISIONS: S1–S14 (S12-A, S13-A, S14-A), R4; E1–E4 per the G9c review, section 3
MODE: CODE — additive Core, on a NEW branch codex/core-g10d-offer from origin/main (the head containing merge 5c71c73).

PRECONDITION: GW2 or GW2-P for REVIEW_REFERENCE; record the outputs; any failure → STOP. Never touch credentials.

PATTERNS (mandatory, as in G10a–G10c):
- validateAuthContext before the transaction; lockOrganization(memberOrganizationMissingError) first
- requireMembershipPermission BEFORE any state check; the org only from AuthContext (W1)
- EXPLICIT FIELD ALLOWLIST on every create/update: unknown keys → VALIDATION_FAILED (the G10c lesson)
- every error through mapCoreDatabaseError; one statement per line

SCOPE:
1. OfferService (implementation/core/offer-service.ts), permission offer.manage:
   - createOffer: offer_key unique per org (offer_organization_key_unique → CONFLICT "offer key already
     exists"). lifecycle_status and retired_at are NOT settable (lifecycle is out of scope).
   - createVersion(offerId, fields):
     - allowlist: name, shortDescription, offerShape, terms, priceAmount, priceCurrency, onRequest,
       validFrom, validUntil
     - lock the Offer row (SELECT … FOR UPDATE, parameterized); version_number = max+1 under that lock;
       offer_version_number_unique → CONFLICT
     - CHECK violations (validity :686-688, price :690-694) → VALIDATION_FAILED
     - never set publication_status or published_at
   - R2: there are NO update or delete methods for OfferVersion (immutable from creation; the trigger at
     :772-789 enforces it). A "change" = createVersion.
   - linkCapability / unlinkCapability(versionId, capabilityId):
     - the capability must be in the same org
     - allowed only while the version's published_at IS NULL (trigger :791-826; published → mapped
       CONFLICT)
     - UPDATE of links never happens
2. PublicationService extension for target OFFER_VERSION (publication.manage):
   - lock order: organization → the OFFER row (FOR UPDATE) → the target version row (FOR UPDATE)
   - the Publication has content_revision NULL (CHECK :726-732) and offer_version_id + org
   - gate_snapshot as in S7
   - publish:
     - target already PUBLISHED → { outcome: 'ALREADY_PUBLISHED' } (no insert; S4/E2)
     - no other version of the same offer PUBLISHED → insert PUBLISHED → { outcome: 'PUBLISHED', publication }
       (allowed from UNPUBLISHED or WITHDRAWN)
     - another version of the same offer PUBLISHED → in the SAME transaction and in THIS order: insert
       WITHDRAWN for the old version, then PUBLISHED for the target →
       { outcome: 'REPLACED', withdrawn, publication }
       (offer_version_published_unique :509-511 is not deferrable)
   - withdraw: requires PUBLISHED → { outcome: 'WITHDRAWN', publication }; otherwise CONFLICT
   - The profile and capability behavior is unchanged.
3. S14-A in CapabilityService.updatePublicFields:
   - compare each provided field with the current row
   - if at least one value actually differs AND confirmation_status = HUMAN_CONFIRMED → in the SAME
     update set confirmation_status UNCONFIRMED and confirmed_by_membership_id,
     confirmed_by_organization_id and confirmed_at to NULL (CHECK :735-745)
   - if no value differs → no reset (D6 does not bump either)
4. error-adapter.ts: offer_organization_key_unique mapping (index name OR the field set organization_id +
   offer_key).
5. Tests (implementation/test/core/g10d-offer.spec.ts; unique prefix; in-spec guard):
   - offer key conflict; unknown keys rejected (offer, version, link); lifecycle/published fields are not
     settable
   - createVersion numbering 1,2,3; concurrent createVersion → distinct numbers, no raw 23505
   - price and validity CHECK → VALIDATION_FAILED
   - a direct prisma update or delete of an OfferVersion → mapped immutability error
   - link before publish ok; link/unlink after the first publish → CONFLICT (also after withdraw)
   - publish → PUBLISHED; publish again → ALREADY_PUBLISHED with no new row; withdraw → WITHDRAWN; withdraw
     again → CONFLICT; publish from WITHDRAWN → PUBLISHED
   - REPLACED: v1 PUBLISHED, publish v2 → exactly one PUBLISHED version; two new Publication rows in
     order WITHDRAWN(v1) then PUBLISHED(v2); v1 is WITHDRAWN
   - concurrent publish of v2 and v3 of the same offer → exactly one PUBLISHED at the end, no raw error
   - gate_snapshot on every inserted row; Publication.content_revision NULL
   - W1 cross-org; missing offer.manage / publication.manage → AUTHORIZATION_DENIED
   - S14-A: confirm, then change a public field → UNCONFIRMED with confirmer fields null and revision +1;
     confirm, then "update" with identical values → stays HUMAN_CONFIRMED with an unchanged revision
   - the full existing Core suite still passes

VALIDATION / DATABASE SAFETY:
- a disposable tmpfs postgres on 5499; the global and Core guards; no .env; volume before/after; rm -f
- migrate deploy, build, the Core specs, the FULL V1 suite
- evidence + LF manifest (path  sha256) in mlino2/validation/g10d/
- every test the report claims must exist and be named in the report (the Guardian greps them)
REPORT: AI_HANDOFF/CODEX_REPORTS/20260914_CODEX_G10D_CORE_OFFER_SLICE_REPORT.md
Append only to mlino2/HANDOFF/HANDOFF_STATE.md (under HANDOFF-20260914-CORE-G10D).
Push ONLY to codex/core-g10d-offer (if blocked, ask the owner). Then STOP.
ALLOWED: implementation/core/** · implementation/test/core/** · mlino2/validation/g10d/** · the report · the handoff (append only)
FORBIDDEN:
- schema, migrations, types.ts, tsconfig; test/setup-env.ts and test/test-db-guard*; other V1 files;
  new dependencies
- Evidence service, HTTP, real platform/AC-2 adapters, Offer lifecycle/retire transitions
- ANY push to main or other branches
- port 5435 or mlino-v1-local-db; running anything in _PUSH_STAGING; credentials
```

## ۳. وضعیت دروازه‌ها

| دروازه | موضوع | وضعیت |
|---|---|---|
| **G10c** | **Profile، Capability و انتشار** | ✅ **در main ادغام شد** (`5c71c73`) |
| S14 | تأیید پس از ویرایش | ✅ **S14-A** (در G10d پیاده می‌شود) |
| **G10d** | **Offer و OfferVersion و انتشارشان** | ▶️ صادر شد |
| ادغام G10d | | ⏳ پس از بازبینی، با تأیید کوتاه مالک |
| G10e | Evidence | ⏳ |

من کلاد هستم
