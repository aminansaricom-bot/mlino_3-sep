# ثبت تصویب مالک — C8-1 تا C8-5 و مجوز G14c-2

**تاریخ:** ۱۸ سپتامبر ۲۰۲۶
**ثبت‌کننده:** Claude Opus 5 — MLINO Architecture Guardian
**مبنا:** `AI_HANDOFF/CLAUDE_REVIEWS/20260918_CLAUDE_REVIEW_G14C1_V2_CONSUMER_DESIGN.md` (commit `b56329e`) · سند طراحی `9222ebd1` در `codex/v2-public-consumer-design` @ `0bd14bb`

## ۱. متن تصویب مالک

> «توصیه‌های نگهبان برای C8-1 تا C8-5 تصویب شد؛ G14c-2 مجاز است.»

## ۲. تصمیم‌های ثبت‌شده

| # | تصمیم |
|---|---|
| **C8-1** | artifact از یک **مسیر خواندنی روی میزبان استقرار** به V2 می‌رسد · **کد باید لایه‌ی انتقال جداشدنی داشته باشد** تا انتخاب میزبانی، ساخت را متوقف نکند |
| **C8-2** | چرخه‌ی دریافت **حداکثر ۶۰ ثانیه** · TTL ‏**۳۰۰ ثانیه** از `generated_at` · انحراف ساعت مجاز **۳۰ ثانیه** |
| **C8-3** | **کلیدهای عمومی همراه نسخه‌ی V2** منتشر می‌شوند · کلید خصوصی هرگز وارد V2 نمی‌شود · روش لغو فوری پیش از بهره‌برداری واقعی تأیید می‌شود |
| **C8-4** | فیلترهای دسته، طبقه، ساختمان، محصولات و درصد تخفیف **برای رکورد واقعی حذف می‌شوند** · هیچ مقدار حدسی ساخته نمی‌شود |
| **C8-5** | حذف پس از تعلیق claim **فقط از راه چرخه‌ی معمول** · تأخیر یک چرخه‌ای صریحاً پذیرفته شده |
| **G14c-2** | **مجاز**، مشروط به سه شرط N1 تا N3 بازبینی نگهبان |

**خارج از دامنه و تصمیم عملیاتی جدا:** راه‌اندازی واقعی مسیر انتشار، کلید واقعی، و زمان‌بندی تولید فایل.

---

## ۳. دستور Codex — G14c-2

```
INSTRUCTION_ID: CODEX-20260918-G14C2-V2-CONSUMER-IMPLEMENTATION-001
TARGET_HANDOFF_ID: HANDOFF-20260918-OWNER-APPROVAL-G14C2
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260917-V2-PUBLIC-CONSUMER
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260918_OWNER_APPROVAL_G14C2_IMPLEMENTATION.md (PINNED_COMMIT/SHA256 relayed)
DECISION: the owner approved C8-1..C8-5 as recorded in section 2 and authorized G14c-2 with the Guardian conditions N1-N3.
MODE: IMPLEMENTATION in the V2 app. A NEW branch codex/v2-public-consumer from
      origin/codex/v2-intent-flow-foundation at f4d326f7d2046eee997dba4198f662c6e5d1e84e, in a NEW worktree
      C:/Users/galexy/mlino code/v2-public-consumer-impl. LOCAL commits only; do NOT push.
      Do NOT modify origin/main, the V1 implementation, or the design branch.

PRECONDITION: GW2 or GW2-P on the pinned record; record the outputs; any failure -> STOP. Never touch credentials
or any real key. No network access is required or permitted in tests.

1 NEW module mlino2/app/src/publicExport/ (TypeScript, browser-safe, no Node-only APIs):
  a canonical.ts - the byte rules mirroring origin/main:implementation/public-export/canonical.ts exactly: key
    ordering by Unicode scalar, NFC strings, rejection of lone surrogates, integers without leading zeros, at most
    six decimals with -0 normalised to 0, explicit null distinct from an absent key, no BOM, no whitespace, no
    trailing newline
  b verify.ts - Ed25519 verification via WebCrypto (globalThis.crypto.subtle). The signed bytes are
    "MLINO-PUBLIC-BUSINESS-V1\n" followed by the canonical bytes of the envelope whose signature holds only
    algorithm and key_id; signature.value is excluded. Reject a non-Ed25519 algorithm, a malformed base64url value,
    an unknown or revoked key_id, and any verification failure.
  c trustBundle.ts - a versioned allowlist of PUBLIC keys supplied by build configuration, plus a revocation list.
    An artifact may NEVER add or modify a key. No private key anywhere.
  d transport.ts - a PLUGGABLE port (C8-1): an interface plus a FetchTransport (a URL from configuration) and a
    FileTransport used by tests. The consumer must not depend on which one is used.
  e consumer.ts - fetch, then verify in the order of the design C2, then TTL and ordering checks (C8-2: TTL 300s,
    clock skew 30s, reject an artifact older than or equal-but-different to the accepted one), then build an
    immutable snapshot and swap ONE reference atomically. A rejection must leave the previous cache untouched.
  f mapping.ts - map public-business.v1 to the types the UI needs, per design C4. Do NOT reuse or relax the draft-1
    validator. category, floor_level, building_id, products and discount_percent are ABSENT and must never be
    invented. Coordinates may be null: such records are excluded from proximity results rather than defaulted.
    Re-evaluate capabilities[].fresh_until and offers[].valid_from/valid_until at READ time.
2 MOCK ISOLATION (design C5): the existing loadMockSnapshotRaw path stays reachable only in an explicit demo mode,
  clearly labelled in the UI and in logs. The real path must never call it, and there is no fallback, merge or
  conversion between draft-1 and public-business.v1.
3 GUARDIAN CONDITIONS:
  N1 Document in code comments and in the report that TTL is evaluated against the DEVICE clock, so it is a
     correctness and UX guard, not a security control; real freshness comes from the producer cycle.
  N2 Add a short threat-model note: the signature protects the artifact in transit and at rest; it does not protect
     against a compromised V2 origin, because the public key ships with the app.
  N3 BYTE PARITY must be PROVEN, not assumed. Generate parity fixtures ONCE using the V1 implementation on
     origin/main (run it in a V1 worktree, write the outputs into the V2 fixtures folder) and commit both the input
     objects and the expected canonical bytes or their sha256. Cover at least: non-Latin text needing NFC, a
     six-decimal number, -0, an explicit null versus an absent key, an empty string, and a nested array order.
     Explain in the report exactly how the fixtures were produced.
4 TESTS with vitest in the V2 app (the app already uses vitest; no new dependency), covering design C7 and the
  decisions:
  - a valid artifact is accepted and exposed; the mock never enters the same cache
  - a one-byte change anywhere in the signed content is rejected
  - an unknown key_id, a revoked key_id and a non-Ed25519 algorithm are rejected
  - an expired artifact, one dated too far in the future, and one older than the accepted cache are rejected
  - an invalid new artifact leaves the previous valid cache serving until its TTL expires, and nothing after that
  - with no valid artifact ever accepted, the real result is empty and no mock appears
  - every field of the C4 table maps correctly, including null coordinates, the price as a string, versioned terms
    and hours, capability_links limited to capabilities present in the same record, and the absent fields
  - an atomic swap under concurrent reads never exposes a mix of two snapshots
  - fresh_until and valid_until expiring between two fetches disappear at the next read
  - the canonical parity fixtures of N3 all match
5 VALIDATION: `npm run build` (tsc -b plus vite build) and `npm test` (vitest run) inside mlino2/app, THREE times
  consecutively, all green, with committed logs. No network, no Docker, no database.
REPORT (new file): AI_HANDOFF/CODEX_REPORTS/20260918_CODEX_G14C2_V2_CONSUMER_IMPLEMENTATION_REPORT.md
- the files added or changed; a table of every decision and condition (C8-1..C8-5, N1..N3) -> where implemented ->
  the test name proving it (every name must exist)
- how the N3 fixtures were generated; the three run totals; the build result
- the LF sha256 of every new source file, the tests, the fixtures and the logs; the GW2/GW2-P outputs
Evidence in mlino2/validation/g14c-2/. Append only to mlino2/HANDOFF/HANDOFF_STATE.md. Commit locally and STOP.
ALLOWED FILES:
- mlino2/app/src/publicExport/** (new), tests beside it or under mlino2/app/src/**
- the minimum change to the V2 app needed to keep the mock behind demo mode and to wire the real path
- mlino2/validation/g14c-2/** (new), the report (new), mlino2/HANDOFF/HANDOFF_STATE.md (append only)
FORBIDDEN:
- any change under implementation/ (V1), to origin/main, or to the FINAL read contract
- any new dependency; any network call in tests; any real key or secret
- Docker, any database, port 5435, _PUSH_STAGING, any push, git config
- inventing category, floor_level, building_id, products or discount_percent values
```

**پس از G14c-2:** بازبینی نگهبان، سپس تصمیم مالک درباره‌ی ادغام در شاخه‌ی V2، و در نهایت راه‌اندازی عملیاتی (کلید، مسیر انتشار و زمان‌بندی).

## ۴. وضعیت دروازه‌ها

| دروازه | موضوع | وضعیت |
|---|---|---|
| G14a، G15، G14b و Q8 | | ✅ در main |
| G14c-1 | سند طراحی | ✅ پذیرفته · C8-1 تا C8-5 DECIDED |
| **G14c-2** | **پیاده‌سازی مصرف‌کننده در V2** | ▶️ **صادر شد** |
| ادغام در شاخه‌ی V2 · کلید و زمان‌بندی | | ⏳ تصویب جدا |

من کلاد هستم
