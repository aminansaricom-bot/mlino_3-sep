# ثبت تصویب مالک — O1 تا O5، ادغام سند طرح و مجوز M2-2

**تاریخ:** ۱۸ سپتامبر ۲۰۲۶
**ثبت‌کننده و مجری ادغام:** Claude Opus 5 — MLINO Architecture Guardian
**مبنا:** `20260918_CLAUDE_REVIEW_M2_1_OPERATIONS_DESIGN.md` (commit `b1a922a`)

## ۱. متن تصویب مالک

> «توصیه‌های نگهبان برای O1 تا O5 تصویب شد؛ ادغام سند در main و شروع M2-2 مجاز است.»

## ۲. تصمیم‌های ثبت‌شده

| # | تصمیم |
|---|---|
| **O1 = A** | کلید خصوصی در گاوصندوق امن سیستم‌عامل (روی Windows: ‏DPAPI)، فقط در دسترس حساب producer، پشت adapter فعلی · کلید عمومی همراه build نسخه‌ی دوم · شناسه‌ی `pb-v1-YYYYMMDD-<16 hex نخست sha256 کلید عمومی خام>` |
| **O2 = A** | ارائه‌ی **هم‌مبدأ** HTTPS از پوشه‌ی عمومی جدا و فقط‌خواندنی · بدون fallback به `index.html` · `Cache-Control: no-store` |
| **O3 = A** | زمان‌بند بومی میزبان (Windows Scheduled Task) هر حدود ۶۰ ثانیه · قفل CLI · هشدار پیش از TTL · لاگ فقط کد و boolean |
| **O4 = A، مشروط** | لغو با build تازه و `revokedIds` · یک کلید یدکی · **بهره‌برداری واقعی تا اثبات تازه‌شدن صفحه‌های باز ممنوع** (راه پیشنهادی G2) |
| **O5 = B** | فقط artifact جاری به پوشه‌ی عمومی جدا کپی می‌شود · وب‌سرور هرگز به پوشه‌ی producer یا کلید دسترسی ندارد |
| **شرط G1** | در M2-3، ACL خود NTFS صریحاً تنظیم و اندازه‌گیری شود، چون `mode` روی Windows عملاً اثری ندارد |

## ۳. ادغام سند در main

| مورد | مقدار |
|---|---|
| merge commit | **`5be8c0e`** · با `--no-ff`، والدها `b1a922a` و `62f07c7` |
| دامنه | ۳ فایل، +۱۹۴ خط: سند، گزارش Codex و Handoff الحاقی · ۰ فایل کد |

## ۴. دستور Codex — M2-2

```
INSTRUCTION_ID: CODEX-20260918-M2-2-DPAPI-KEY-ADAPTER-001
TARGET_HANDOFF_ID: HANDOFF-20260918-OWNER-APPROVAL-O1-O5-M2-2
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260918-PUBLIC-EXPORT-OPERATIONS
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260918_OWNER_APPROVAL_O1_O5_AND_M2_2.md (PINNED_COMMIT/SHA256 relayed)
DECISION: the owner approved O1=A, O2=A, O3=A, O4=A (conditional), O5=B, merged the operations design into main
  (5be8c0e) and authorized M2-2: the key adapter, tested with TEST keys only.
MODE: IMPLEMENTATION in V1 - a NEW branch codex/public-export-key-adapter from origin/main at the pinned commit,
      in a NEW worktree C:/Users/galexy/mlino code/public-export-key-adapter. LOCAL commits only; do NOT push.
PRECONDITION: GW2 or GW2-P on the pinned record; record the outputs; any failure -> STOP. Never touch credentials,
  .env files, GITHUB_TOKEN.txt, git config, the Windows credential store, or any real key.

CONTEXT (read, cite file:line in the report): implementation/public-export/cli.ts:80-89 loads an adapter module by
ABSOLUTE path outside the repository and calls createKeyProvider(); signing.ts defines SigningKeyProvider and
VerificationKeyProvider (KeyObject); mlino2/MLINO_PUBLIC_EXPORT_OPERATIONS_DESIGN.md sections 2, 5 and 6.

1 NEW module implementation/public-export/key-providers/ (TypeScript, Node built-ins only, NO new dependency):
  a descriptor.ts - a key-store DESCRIPTOR format (JSON, stored OUTSIDE the repository by the operator):
    { format: "mlino.public-export.keystore.v1", active_key_id, keys: [{ key_id, public_key_raw_base64url,
      protected_private_pkcs8_base64, protection: "dpapi-current-user" }] }, at most TWO keys (active + one standby).
    Strict parsing: unknown fields, a duplicate key_id, a missing active key or more than two keys are rejected
    with fixed error codes.
  b keyId.ts - the O1 naming rule pb-v1-YYYYMMDD-<first 16 hex of sha256(raw 32-byte public key)>: a validator and
    a derivation helper. The adapter rejects any key whose key_id does not match its own public key.
  c protector.ts - a Protector port { protect(bytes): Promise<Buffer>; unprotect(bytes): Promise<Buffer> } and a
    DpapiProtector that calls Windows DPAPI (CurrentUser scope) through powershell.exe
    ([System.Security.Cryptography.ProtectedData]) using child_process with NO shell, passing data ONLY via
    stdin/stdout as base64 - never on the command line, never in an environment variable, never in a temp file.
    Non-Windows platforms -> a fixed error code. Plaintext buffers are zero-filled after use where possible.
  d dpapiKeyProvider.ts - createDpapiKeyProvider({ descriptorPath }, deps?) returning an ExportKeyProvider:
    privateKey(keyId) ONLY for active_key_id; it unprotects, builds the KeyObject (pkcs8 der), requires ed25519,
    and requires that the derived public key equals public_key_raw_base64url. publicKey(keyId) for the active and
    standby keys, else null. The descriptor path must be absolute and outside the repository (reuse the same rule
    as cli.ts). No logging of any key material, descriptor content or path.
  e trustBundle.ts - buildV2TrustBundle(descriptor, { version, revokedIds }) returning the PUBLIC-only JSON the V2
    build expects ({version, keys:[{keyId, rawPublicKeyBase64Url}], revokedIds}); it must never read or output
    protected material.
  f keygen.ts - an OPERATOR tool function generateProtectedKey(date, protector) that creates an Ed25519 pair in
    memory, derives key_id, protects the pkcs8 bytes and returns a descriptor entry. It is exported for the
    operator's later separately-approved use; in THIS step it may run ONLY inside tests with a fake protector or
    with DPAPI on a throwaway TEST key in a temp directory outside the repository that the test deletes.
  g adapter-shim.template.cjs - a TEMPLATE (not a key) the operator will copy OUTSIDE the repository; it requires
    the built dist/public-export/key-providers/dpapiKeyProvider.js by absolute path and exports
    createKeyProvider() reading MLINO_EXPORT_KEYSTORE_PATH. Document it in key-providers/README.md (Persian),
    including the rule that the descriptor and shim live outside the repository.
2 TESTS in implementation/test/public-export/key-providers/*.spec.ts, with a FAKE reversible protector for unit
  tests and generated TEST keys only:
  - a descriptor round trip; each strict-parsing rejection with its exact code
  - key_id derivation and mismatch rejection; a non-ed25519 key and a public/private mismatch rejected
  - privateKey only for the active key; publicKey for active and standby; unknown -> null
  - a signature produced through the adapter verifies with signEnvelope/verifyEnvelope from signing.ts
  - the trust bundle contains public material only (assert no 'pkcs8', 'protected' or private bytes appear) and is
    accepted by the V2 shape (keys[].keyId, rawPublicKeyBase64Url of 32 bytes)
  - a relative descriptor path or a path inside the repository is rejected
  - DpapiProtector: ONE Windows-only round-trip test on random bytes (skip with a visible reason elsewhere), which
    also asserts the plaintext never appears in the spawned process arguments
  - MUTATION PROOF (recorded, not committed as code): in a throwaway copy remove (i) the active-only check,
    (ii) the public/private match check, (iii) the key_id derivation check; each must make a test FAIL.
  The new specs must NOT need a database. Run them with the same safe test configuration you used for G14b-2;
  never point DATABASE_URL at port 5435. If the test setup blocks, STOP and report.
3 VALIDATION: `npm run build` in implementation/ and the new key-provider specs, THREE consecutive times, green,
  with committed logs in implementation/validation/m2-2/ (or the existing validation folder convention - state
  which). Leak grep over the diff and logs for PRIVATE KEY, pkcs8 base64 prefixes (MC4CAQAw) and descriptor paths.
REPORT (new file): AI_HANDOFF/CODEX_REPORTS/20260918_CODEX_M2_2_DPAPI_KEY_ADAPTER_REPORT.md
- the files, a table requirement -> file -> exact test name, the mutation outcomes, the three run totals, LF sha256
  of new files and logs, GW2/GW2-P outputs, the leak-grep result. Append only to mlino2/HANDOFF/HANDOFF_STATE.md.
  Commit locally and STOP.
ALLOWED FILES:
- implementation/public-export/key-providers/** (new)
- implementation/test/public-export/key-providers/** (new)
- the validation logs folder (new), the report (new), mlino2/HANDOFF/HANDOFF_STATE.md (append only)
FORBIDDEN:
- any change to cli.ts, signing.ts, builder.ts, canonical.ts, schema, migrations, package.json or the lockfile
- any new dependency; any REAL key; generating, storing or protecting a key outside a test's temp directory;
  writing to the Windows credential store; running the export CLI
- any V2 change; Docker; any database beyond the existing safe test setup; port 5435; _PUSH_STAGING; any push;
  git config; scheduling anything
```

## ۵. پس از M2-2

بازبینی نگهبان، سپس به تصمیم مالک: ساخت کلید واقعی به‌دست مالک یا اپراتور با ابزار keygen (مجوز جدا)، M2-3 (میزبان، ACL، مسیر هم‌مبدأ، فایل نسخه‌ی G2) و M2-4 (زمان‌بند و تمرین لغو).

## ۶. وضعیت دروازه‌ها

| دروازه | موضوع | وضعیت |
|---|---|---|
| G14a، G15، G14b، Q8 و سند M2 | | ✅ در main |
| G14c | مصرف‌کننده‌ی V2 | ✅ در شاخه‌ی V2 |
| **M2-2** | **adapter گاوصندوق کلید** | ▶️ **صادر شد** |
| کلید واقعی · M2-3 · M2-4 | | ⏳ تصویب جدا |

من کلاد هستم
