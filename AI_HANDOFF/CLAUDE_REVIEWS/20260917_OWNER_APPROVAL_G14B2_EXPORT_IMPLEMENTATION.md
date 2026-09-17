# ثبت تصویب مالک — Q1 تا Q10 و مجوز G14b-2 (ساخت تولیدکننده‌ی export امضاشده)

**تاریخ:** ۱۷ سپتامبر ۲۰۲۶
**ثبت‌کننده:** Claude Opus 5 — MLINO Architecture Guardian
**مبنا:** `AI_HANDOFF/CLAUDE_REVIEWS/20260917_CLAUDE_REVIEW_G14B1_EXPORT_DESIGN.md` (commit `0837884`) · سند طراحی `5eebd9ff` در `codex/v1-public-export` @ `9430c22`

## ۱. متن تصویب مالک

> «توصیه‌های نگهبان برای Q1 تا Q10 تصویب شد؛ G14b-2 مجاز است.»

## ۲. تصمیم‌های ثبت‌شده

| # | تصمیم |
|---|---|
| **Q1** | **Ed25519** با امضای detached · `algorithm` برابر `Ed25519` · `value` به‌صورت base64url بدون padding |
| **Q2** | کلید خصوصی در **secret store سیستم‌عامل** · `key_id` شناسه‌ی نسخه‌دار کلید عمومی · در توسعه و آزمون فقط کلید یک‌بارمصرف · دوره‌ی چرخش پیش از تولید تصویب می‌شود |
| **Q3** | **کار زمان‌بندی‌شده‌ی ۶۰ ثانیه‌ای** که همان CLI را اجرا می‌کند · دو artifact موفق قبلی نگه داشته می‌شوند · مسیر خروجی بیرون از مخزن |
| **Q4** | **polling به‌همراه TTL و رفتار fail-closed** در مصرف‌کننده · سیگنال invalidation فوری، در صورت نیاز، بعداً و جداگانه |
| **Q5** | `business_hours` نامعتبر: **همان فیلد null شود** و فقط کد خطا ثبت شود |
| **Q6** | `terms` نامعتبر: **همان Offer حذف شود** · مقدار null اصیل مجاز است |
| **Q7** | **`fresh_until` metadata شایستگی است و در زمان ساخت خروجی از وضعیت جاری خوانده می‌شود.** نه از snapshot، و بدون CCR. این با قاعده‌ی «محتوا فقط از snapshot» سازگار است، چون تازگی محتوا نیست |
| **Q8** | **حداکثر یک Profile منتشرشده برای هر سازمان.** تا تصویب CCR ایندکس یکتای جزئی، تولیدکننده سازمان دارای بیش از یک Profile منتشرشده را **fail-closed حذف می‌کند** و رویداد را لاگ می‌کند |
| **Q9** | **policy نسخه‌ی اول: فقط تأیید انسانی و تازگی قابلیت.** هیچ الزام مدرک دیگری در v1 نیست |
| **Q10** | **`as_of` جزو ورودی است.** «بایت یکسان» یعنی داده‌ی یکسان به‌علاوه‌ی همان `as_of`، همان policy و همان `key_id` |
| **G14b-2** | **مجاز:** ساخت تولیدکننده و آزمون‌ها، فقط روی DB یک‌بارمصرف |

**خارج از دامنه و نیازمند تصویب جدا:** CCR ایندکس یکتای جزئی برای Q8 · G14c (مصرف‌کننده‌ی V2) · هر اجرای واقعی زمان‌بندی‌شده در محیط مالک.

---

## ۳. دستور Codex — G14b-2

```
INSTRUCTION_ID: CODEX-20260917-G14B2-PUBLIC-EXPORT-IMPLEMENTATION-001
TARGET_HANDOFF_ID: HANDOFF-20260917-OWNER-APPROVAL-G14B2
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260917-V1-PUBLIC-EXPORT
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260917_OWNER_APPROVAL_G14B2_EXPORT_IMPLEMENTATION.md (PINNED_COMMIT/SHA256 relayed)
DECISION: the owner approved Q1-Q10 as recorded in section 2 and authorized G14b-2.
MODE: IMPLEMENTATION on codex/v1-public-export on top of 9430c22. LOCAL commits only; do NOT push.

PRECONDITION: GW2 or GW2-P on the pinned record; record the outputs; any failure -> STOP. Never touch credentials
or any real key.

1 DESIGN DOC: status DRAFT -> APPROVED; record Q1-Q10 exactly as in section 2 of the pinned record. No other change
  to that document, and NO change to MLINO_V2_READ_CONTRACT_DESIGN.md.
2 NEW module implementation/public-export/ (a new top-level folder; add ONLY its include entry to
  implementation/tsconfig.json). Use ONLY the existing dependencies and node:crypto; do NOT change package.json
  dependencies or the lockfile.
  a canonical.ts: the E4 byte rules - key ordering by Unicode scalar, NFC strings, no BOM or whitespace, integers
    without leading zeros, coordinates at most 6 decimals with -0 normalized, price_amount kept as the snapshot
    decimal string, timestamps as YYYY-MM-DDTHH:mm:ss.SSSZ in UTC, explicit null distinct from omission, and no
    trailing newline
  b signing.ts: a SigningKeyProvider port plus an Ed25519 implementation over node:crypto. Signed bytes are
    "MLINO-PUBLIC-BUSINESS-V1\n" followed by the canonical bytes of the envelope whose signature holds only
    algorithm and key_id. Also export a verify function for tests and for G14c. NEVER read, log or embed a real
    key; tests generate ephemeral key pairs.
  c builder.ts: assemble PublicBusinessExportV1 exactly per the FINAL contract using ONLY
    publications.published_content for content, with the E1 selection rule, plus live gates that can only hide:
      - Organization / BusinessProfile / Offer lifecycleStatus = ACTIVE
      - the profile's linked claim VERIFIED and unexpired (S16-A)
      - capability audience CUSTOMER_FACING, capabilityStatus ACTIVE, confirmationStatus HUMAN_CONFIRMED (S18-A)
      - policy v1 freshness (Q9): the capability's LIVE fresh_until must be absent or in the future at as_of; that
        same live value fills the DTO fresh_until as eligibility metadata (Q7)
      - offers valid at as_of (valid_from <= as_of < valid_until, an open end when null)
      - Q8: if an organization has more than one PUBLISHED business profile, SKIP that organization entirely and
        log organization_id plus a reason code
      - Q5 invalid business_hours -> that field becomes null; Q6 invalid terms -> drop that offer
      - offer capability_links resolved only from selected, S18-A-passing capability snapshots of the same tenant
    All queries run inside ONE read-only transaction snapshot. The producer NEVER writes to the database.
  d cli.ts plus an npm script (a scripts entry only): reads as_of (default now, UTC), the output directory and the
    key id from environment variables; writes a temp file in the same directory, fsyncs, then renames it over the
    current artifact; keeps the two previous artifacts; on any validation or signing failure it exits non-zero and
    leaves the current artifact untouched.
3 TESTS in implementation/test/public-export/ (a new folder; add its tsconfig include entry if required; the DB
  guard applies; 5499 only), covering E8 and the decisions:
  - selection: published, withdrawn, replaced, tie on occurred_at broken by id
  - hidden: unconfirmed capability, internal audience, retired capability, past fresh_until, archived organization
    or profile, retired offer, an offer outside its validity window, an unverified or suspended claim
  - Q8: an organization with two published profiles is skipped entirely
  - Q5 and Q6 behaviors; capability_links filtered by S18-A
  - byte identity: two builds with the same data and the same as_of produce identical bytes; a different as_of
    changes only generated_at and the signature
  - signature verifies; any single-byte tamper fails verification; signature value is excluded from the signed
    bytes while key_id is included
  - no secret, key or connection string appears in any log line the producer emits
4 VALIDATION: tsc --noEmit; the focused spec; then the FULL V1 + Core + public-export suite on a FRESH disposable
  tmpfs container on 127.0.0.1:5499, run THREE times consecutively, all green, with committed logs.
REPORT (new file): AI_HANDOFF/CODEX_REPORTS/20260917_CODEX_G14B2_PUBLIC_EXPORT_IMPLEMENTATION_REPORT.md
- the files changed; a table Q1-Q10 -> where implemented -> the test name proving it (every name must exist)
- the three run totals, the tsc result, CPU load, container cleanup, the before/after container and volume lists
- the LF sha256 of every new source file, the spec and the logs; the GW2/GW2-P outputs
Evidence in mlino2/validation/g14b-2/ (redacted; record the real worktree HEAD).
Append only to mlino2/HANDOFF/HANDOFF_STATE.md. Commit locally and STOP (the Guardian publishes).
ALLOWED FILES:
- mlino2/MLINO_V1_PUBLIC_EXPORT_DESIGN.md (status and decisions only)
- implementation/public-export/** (new), implementation/test/public-export/** (new)
- implementation/tsconfig.json (include entries only), implementation/package.json (a scripts entry ONLY; no
  dependency change and no lockfile change)
- mlino2/validation/g14b-2/** (new), the report (new), mlino2/HANDOFF/HANDOFF_STATE.md (append only)
FORBIDDEN:
- schema.prisma, any migration (the Q8 unique index is a SEPARATE CCR), Dockerfile, existing services, core/**,
  the FINAL read contract, the V2 branch
- any real key or secret; any new dependency; writing to any database
- mlino-v1-local-db, port 5435, docker compose, other containers, _PUSH_STAGING, any push, git config
```

**پس از G14b-2:** بازبینی نگهبان، سپس ادغام با تصویب مالک، سپس CCR ایندکس یکتا (Q8) و در نهایت G14c.

## ۴. وضعیت دروازه‌ها

| دروازه | موضوع | وضعیت |
|---|---|---|
| G14b-1 | سند طراحی | ✅ پذیرفته · Q1 تا Q10 DECIDED |
| **G14b-2** | **ساخت تولیدکننده و آزمون‌ها** | ▶️ **صادر شد** |
| CCR ایندکس یکتای Profile (Q8) | | ⏳ تصویب جدا |
| G14c | مصرف‌کننده‌ی V2 | ⏳ تصویب جدا |

من کلاد هستم
