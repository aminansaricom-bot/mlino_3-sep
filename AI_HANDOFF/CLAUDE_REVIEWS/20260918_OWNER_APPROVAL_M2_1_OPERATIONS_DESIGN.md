# ثبت تصویب مالک — نوشتن سند طرح راه‌اندازی واقعی (M2-1)

**تاریخ:** ۱۸ سپتامبر ۲۰۲۶
**ثبت‌کننده:** Claude Opus 5 — MLINO Architecture Guardian
**مبنا:** ادغام مصرف‌کننده در شاخه‌ی V2 (`540ad2d`)، ثبت‌شده در `20260918_CLAUDE_MERGE_G14C2_INTO_V2.md` روی main در `ffc829e`

## ۱. متن تصویب مالک

> «نوشتن سند طرح راه‌اندازی واقعی (M2) مجاز است.»

## ۲. دامنه

**فقط سند.** هیچ کلید واقعی ساخته نمی‌شود · هیچ فایلی روی میزبان گذاشته نمی‌شود · هیچ زمان‌بندی‌ای فعال نمی‌شود · هیچ کدی تغییر نمی‌کند. سند پنج تصمیم را با گزینه‌ها و توصیه آماده می‌کند تا مالک انتخاب کند.

## ۳. دستور Codex — M2-1

```
INSTRUCTION_ID: CODEX-20260918-M2-1-PUBLIC-EXPORT-OPERATIONS-DESIGN-001
TARGET_HANDOFF_ID: HANDOFF-20260918-OWNER-APPROVAL-M2-1
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260918-PUBLIC-EXPORT-OPERATIONS
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260918_OWNER_APPROVAL_M2_1_OPERATIONS_DESIGN.md (PINNED_COMMIT/SHA256 relayed)
DECISION: the owner authorized writing the operational design (M2) for the signed public export:
  «نوشتن سند طرح راه‌اندازی واقعی (M2) مجاز است.»
MODE: DOCUMENT ONLY - a NEW branch codex/public-export-operations-design from origin/main at the pinned commit,
      in a NEW worktree C:/Users/galexy/mlino code/public-export-operations. LOCAL commits only; do NOT push.
PRECONDITION: GW2 or GW2-P on the pinned record; record the outputs; any failure -> STOP. Never touch credentials,
  .env files, GITHUB_TOKEN.txt, git config, or any real key.

READ (sources; cite file:line for every factual claim about current behaviour):
- origin/main: implementation/public-export/{cli,signing,builder,canonical}.ts, implementation/package.json,
  mlino2/MLINO_V1_PUBLIC_EXPORT_DESIGN.md, the docker-compose file(s) and V1 local-run docs
- origin/codex/v2-intent-flow-foundation @ 540ad2d45f245a1bc5960bfdb15dc21b85f00947:
  mlino2/app/src/publicExport/** (RealPublicApp env: VITE_PUBLIC_EXPORT_URL, VITE_PUBLIC_EXPORT_TRUST_BUNDLE,
  VITE_PUBLIC_EXPORT_MODE), mlino2/app/vite config and any existing V2 hosting notes
- the design mlino2/MLINO_V2_PUBLIC_CONSUMER_DESIGN.md on origin/codex/v2-public-consumer-design @ 0bd14bb and the
  Guardian reviews for G14b, G14c-1, G14c-2 and G14c-2b (notes N1, N2, N5)

WRITE (new file): mlino2/MLINO_PUBLIC_EXPORT_OPERATIONS_DESIGN.md, status DRAFT, covering:
 O1 KEY - how the real Ed25519 key pair is generated, where the PRIVATE key lives (an OS secret store or an
    equivalent behind the existing MLINO_EXPORT_KEY_PROVIDER_MODULE adapter, outside the repository), who can
    read it, how its PUBLIC half and key_id enter the V2 build trust bundle, and a key_id naming rule.
    Options with trade-offs, and a recommendation.
 O2 PUBLISHING PATH (C8-1 as decided: a read-only path on the deployment host) - the concrete flow from the
    MLINO_EXPORT_OUTPUT_DIR file to the URL V2 reads (VITE_PUBLIC_EXPORT_URL); same-origin versus a separate
    origin and the CORS/cache headers needed (the consumer uses cache:'no-store'); where this runs locally today
    versus in a future deployment. Options, and a recommendation.
 O3 SCHEDULE - how the export runs about every 60s (C8-2: fetch <=60s, TTL 300s from generated_at): the runner
    (a Windows scheduled task, a compose service, or a loop), overlap protection (the CLI's lock file), failure
    behaviour, logging (booleans/codes only, never data or keys) and how a stuck producer shows up in V2
    (the "not available" message after TTL). Options, and a recommendation.
 O4 REVOCATION - the procedure when a key is lost or leaked: steps, who acts, how fast V2 stops trusting it
    (the trust bundle ships with the build, so revocation needs a V2 rebuild and redeploy), a rotation drill,
    and whether a pre-published second key is advisable. Options, and a recommendation.
 O5 FILE ACCESS (Guardian note N5) - V1 writes the artifact and the previous-1/-2 files with mode 0o600 inside a
    0o700 directory; state exactly which process must read them and the least-privilege way to allow it
    WITHOUT loosening the private key's protection. Options, and a recommendation.
 Plus:
 - a threat table tying O1-O5 to N1 (the device clock), N2 (a compromised V2 origin) and the producer limits;
 - a numbered list of OPEN DECISIONS for the owner (O1-O5), each with the recommended choice in plain words;
 - a proposed later execution split (for example M2-2 key adapter, M2-3 host wiring, M2-4 schedule and drill),
   each marked as needing its own approval;
 - an explicit "not in scope" list.
REPORT (new file): AI_HANDOFF/CODEX_REPORTS/20260918_CODEX_M2_1_OPERATIONS_DESIGN_REPORT.md
- the file created, its LF sha256, the GW2/GW2-P outputs, the list of sources read, and any fact you could NOT
  verify (say so; do not guess host details). Append only to mlino2/HANDOFF/HANDOFF_STATE.md. Commit locally and STOP.
ALLOWED FILES:
- mlino2/MLINO_PUBLIC_EXPORT_OPERATIONS_DESIGN.md (new), the report (new),
  mlino2/HANDOFF/HANDOFF_STATE.md (append only)
FORBIDDEN:
- any code change; any change under implementation/; any change to the V2 branch, main or the FINAL contract
- generating, reading or storing any real key; opening any .env or secret file; running the export CLI
- Docker actions, any database, port 5435, _PUSH_STAGING, scheduling anything, any push, git config
```

## ۴. پس از M2-1

بازبینی نگهبان، سپس تصمیم مالک درباره‌ی O1 تا O5. اجرای هر بخش جداگانه تصویب می‌شود.

## ۵. وضعیت دروازه‌ها

| دروازه | موضوع | وضعیت |
|---|---|---|
| G14a، G15، G14b و Q8 | | ✅ در main |
| G14c | مصرف‌کننده‌ی V2 | ✅ در شاخه‌ی V2 (`540ad2d`) |
| **M2-1** | **سند طرح راه‌اندازی واقعی** | ▶️ **صادر شد** |
| M2-2 به بعد | اجرای کلید، مسیر و زمان‌بندی | ⏳ تصویب جدا |

من کلاد هستم
