# ثبت تصویب مالک — G14a-1: سند CCR ستون `publications.published_content`

**تاریخ:** ۱۴ سپتامبر ۲۰۲۶
**ثبت‌کننده:** Claude Opus 5 — MLINO Architecture Guardian
**مبنا:**
- `AI_HANDOFF/CLAUDE_REVIEWS/20260914_CLAUDE_REVIEW_G13E_V2_READ_CONTRACT_MERGE.md` (commit `17faff1`)
- سند FINAL ‏`mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md` روی main (merge `fd6d1b1`)

## ۱. متن تصویب مالک

مالک مستقیماً در گفت‌وگو نوشت:

> «G14a-1 (سند CCR ستون published_content) مجاز است»

**دامنه: فقط سند CCR.**
- هیچ migration، کد، تست یا تغییر DB مجاز نیست.
- G14a-2 (پیاده‌سازی) و G14a-3 (اعمال روی DB محلی با backup) هر کدام تصویب جدا می‌خواهند.

## ۲. نکته‌های نگهبان که CCR باید پوشش دهد

این‌ها را از کد فعلی main استخراج کرده‌ام:

1. **قفل و خواندن محتوا:** `lockTarget` ‏(`implementation/core/publication-service.ts:86-90`) فقط `id`، status و revisionها را با `FOR UPDATE` می‌خواند. snapshot باید ستون‌های محتوایی allowlist‌شده را **زیر همان قفل و در همان تراکنش** بخواند. خواندن جداگانه پس از قفل مجاز نیست.
2. **فقط هنگام INSERT:** `publications` هیچ مسیر UPDATE ندارد، به‌خاطر trigger ‏C12 در `migration.sql:759-769`. پس snapshot فقط در INSERT نوشته می‌شود. خروجی‌های `ALREADY_PUBLISHED` و S4/E2 هیچ ردیفی درج نمی‌کنند و snapshot هم ندارند.
3. **مسیر OfferVersion** ‏(`publication-service.ts:59-80`):
   - PUBLISHED، و PUBLISHED در REPLACED، snapshot دارند.
   - WITHDRAWN، و WITHDRAWN در REPLACED، snapshot تهی دارند.
   - `content_revision` در این مسیر تهی است. CHECK باید با این سازگار باشد.
4. **محتوا در برابر شایستگی:** snapshot فقط **محتوا** را منجمد می‌کند. ولی S18-A (`HUMAN_CONFIRMED`)، S20-A (`fresh_until`) و S16-A (وضعیت claim) به **وضعیت‌هایی** وابسته‌اند که پس از انتشار عوض می‌شوند (confirm، ریست S14-A، تعلیق claim). CCR باید صریح کند:
   - کدام فیلدها در snapshot منجمد می‌شوند.
   - کدام فیلدها فقط **دروازه‌ی شایستگی زنده و fail-closed** هستند و هنگام خواندن از ردیف جاری ارزیابی می‌شوند، بی‌آنکه محتوایشان وارد DTO شود.

   **توصیه‌ی نگهبان:** محتوا فقط از snapshot بیاید. شایستگی، یعنی confirmation و freshness و claim، هنگام خواندن از وضعیت زنده بیاید و فقط بتواند رکورد را **پنهان** کند، نه محتوا اضافه کند. این با قاعده‌ی «هیچ خواندن زنده برای محتوا» در بخش ۷ سند FINAL سازگار است.
5. **نسخه‌ی شکل snapshot:** درون JSON یک کلید نسخه، مثلاً `snapshot_version: 'core-publication-snapshot-v1'`، به‌همراه CHECK ‏`jsonb_typeof = 'object'`، تا تغییر allowlist در آینده قابل تشخیص باشد.

---

## ۳. دستور Codex — G14a-1

```
INSTRUCTION_ID: CODEX-20260914-G14A1-PUBLISHED-CONTENT-CCR-001
TARGET_HANDOFF_ID: HANDOFF-20260914-OWNER-APPROVAL-G14A1
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260914-CORE-G14A
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260914_OWNER_APPROVAL_G14A1_PUBLISHED_CONTENT_CCR.md (PINNED_COMMIT/SHA256 relayed)
DECISION: owner approved G14a-1 = CCR DOCUMENT ONLY for publications.published_content (S19-A1).
MODE: DOCUMENT ONLY - a NEW branch codex/core-g14a-published-content from origin/main at the pinned commit.

PRECONDITION: GW2 or GW2-P on the pinned record; record the outputs; any failure -> STOP. Never touch credentials.

DELIVERABLE (new file):
implementation/remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_PUBLICATION_PUBLISHED_CONTENT.md
Follow the structure of CONTRACT_CHANGE_REQUEST_CORE_FOUNDATION_SCHEMA.md (same folder). Status: DRAFT.
Every claim cites origin/main file:line.

CONTENT (required sections):
C1 Motivation and decision: S19-A1 as in mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md sections 3 and 7, and
   AI_HANDOFF/CLAUDE_REVIEWS/20260914_OWNER_APPROVAL_V2_READ_CONTRACT_DECISIONS.md section 3.
C2 Exact DDL for a NEW migration (proposed name; never edit 20260913010000_add_core_foundation):
   - ALTER TABLE publications ADD COLUMN published_content JSONB (nullable at column level)
   - CHECK: (event_kind = 'PUBLISHED' AND published_content IS NOT NULL
             AND jsonb_typeof(published_content) = 'object')
            OR (event_kind = 'WITHDRAWN' AND published_content IS NULL)
   - whether the CHECK is added NOT VALID + VALIDATE, or directly (the table is empty; re-verify how and state it)
   - the schema.prisma change (publishedContent Json? @map("published_content") @db.JsonB) at
     implementation/prisma/schema.prisma:626-654
   - confirm that the immutability trigger (migration.sql:759-769) and the projection trigger
     core_apply_publication_projection (migration.sql:931-1008) need NO change; if they do, show the exact change
C3 Snapshot shape, per target, as a typed allowlist:
   - top-level: snapshot_version ('core-publication-snapshot-v1'), target, target_id, content_revision
     (null for OFFER_VERSION)
   - BUSINESS_PROFILE: name, description, latitude, longitude, address_text, contact_information, links,
     business_hours (schema.prisma:465-493)
   - CAPABILITY: capability_key, name, short_description (schema.prisma:496-527); state whether category_key,
     audience or capability_status are included and why
   - OFFER_VERSION: offer_id, version_number, name, short_description, offer_shape, terms, price_amount,
     price_currency, on_request, valid_from, valid_until, plus the capability link ids at publish time
     (schema.prisma:547-590)
   - the Decimal and timestamp serialization rules (strings vs numbers), consistent with the public-business.v1 DTO
   - NEVER: membership, grant, actor, claim internals, evidence rows, the whole row
C4 Content vs eligibility:
   - which fields are frozen in the snapshot, and which are LIVE fail-closed eligibility gates evaluated at read
     time (confirmation_status for S18-A, fresh_until for S20-A, claim status for S16-A), with a table
   - include the Guardian recommendation from section 2 item 4 of the pinned record as the proposed rule; list any
     alternative as an open question
C5 Service change (design only, no code): PublicationService
   - lockTarget (publication-service.ts:86-90) reads the allowlisted content columns under the same FOR UPDATE
   - publicationData (:92-108) gains publishedContent for PUBLISHED and null for WITHDRAWN
   - the profile/capability path (:38-53); the OfferVersion path (:59-80) including REPLACED; ALREADY_PUBLISHED
     inserts nothing
   - D6 unchanged (the service never writes content_revision or projection fields)
C6 Read rule for G14b: per target, the latest PUBLISHED with no later WITHDRAWN, ordered by occurred_at then id;
   the snapshot is the only content source.
C7 Tests required in G14a-2 (list only): the CHECK for both kinds; each target's snapshot equals its row at
   publish; a post-publish edit does not change the snapshot; REPLACED; ALREADY_PUBLISHED inserts nothing; the
   immutability trigger rejects UPDATE of published_content; the allowlist excludes forbidden fields;
   migration up on an empty DB and on a DB with existing publications rows (the latter must fail or be handled,
   and state which).
C8 Data and rollback:
   - re-verify that Core tables are empty on the local DB. Do NOT query it yourself: state that G14a-3 verifies
     it and cite the G7b record.
   - the backfill policy if rows exist (the default is to refuse migration)
   - the rollback DDL; the effect on the V1 read-api (none expected, and why, citing the Dockerfile and
     tsconfig include)
C9 Open questions for the owner, each with options and ONE recommendation. Do NOT decide them.

REPORT (new file): AI_HANDOFF/CODEX_REPORTS/20260914_CODEX_G14A1_PUBLISHED_CONTENT_CCR_REPORT.md
- a table: C1-C9 -> section -> done / not done (reason)
- the LF sha256 (git show bytes) of the CCR and the GW2/GW2-P outputs
Append only to mlino2/HANDOFF/HANDOFF_STATE.md (workstream HANDOFF-20260914-CORE-G14A, PHASE G14A1_CCR_DRAFT,
STATUS DELIVERED_AWAITING_GUARDIAN_REVIEW).
Push ONLY to codex/core-g14a-published-content. If push is refused -> STOP and report (no workaround).
ALLOWED FILES (exactly three):
- implementation/remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_PUBLICATION_PUBLISHED_CONTENT.md (new)
- AI_HANDOFF/CODEX_REPORTS/20260914_CODEX_G14A1_PUBLISHED_CONTENT_CCR_REPORT.md (new)
- mlino2/HANDOFF/HANDOFF_STATE.md (append only)
FORBIDDEN:
- any migration, schema.prisma, code, test or config change
- running Prisma, npm, jest, Docker or any database query
- any push to main
- changing any decided S item or the FINAL read-contract doc
- Docker, databases, port 5435, _PUSH_STAGING, credentials, git config
```

**پس از G14a-1:**
1. بازبینی نگهبان.
2. تصویب CCR توسط مالک.
3. G14a-2 (پیاده‌سازی migration و service، با DB آزمایشی روی 5499)، که تصویب جدا می‌خواهد.

## ۴. وضعیت دروازه‌ها

| دروازه | موضوع | وضعیت |
|---|---|---|
| قرارداد خواندن V2 | | ✅ در main (`fd6d1b1`) |
| **G14a-1** | **سند CCR ستون `published_content`** | ▶️ **تصویب شد و صادر شد** |
| G14a-2 و G14a-3 | پیاده‌سازی و اعمال با backup | ⏳ تصویب جدا |
| G14b و G14c | export ‏V1 و consumer ‏V2 | ⏳ تصویب جدا |

من کلاد هستم
