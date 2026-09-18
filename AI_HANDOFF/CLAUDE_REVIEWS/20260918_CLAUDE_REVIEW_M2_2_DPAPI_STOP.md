# بازبینی نگهبان — توقف M2-2 در آزمون DPAPI

**تاریخ:** ۱۸ سپتامبر ۲۰۲۶
**بازبین:** Claude Opus 5 — MLINO Architecture Guardian
**commit:** `b6d07f7` روی `eff6a7f`، شامل گزارش توقف، `blocker.log` و Handoff. **نگهبان شاخه‌ی `codex/public-export-key-adapter` را روی سرور منتشر کرد** (شاخه‌ی تازه، lease خالی).

## حکم: `APPROVED_NEXT_STEP`؛ توقف درست بود و مانع فقط به محیط Codex مربوط است

## ۱. تشخیص

| مورد | یافته |
|---|---|
| **رفتار Codex** | ✅ درست: پس از شکست DPAPI متوقف شد، ادعای موفقیت نکرد، و کد تأییدنشده را commit نکرد |
| **علت** | Codex زیر حساب sandbox ‏(`CodexSandboxOffline`) اجرا می‌شود که **پروفایل کاربری بارگذاری‌شده ندارد**. DPAPI در حوزه‌ی CurrentUser به همین پروفایل نیاز دارد |
| **آزمون مستقل نگهبان** | ✅ زیر حساب عادی Windows مالک (`galexy`، با پروفایل بارگذاری‌شده) یک رفت‌وبرگشت DPAPI روی **۳۲ بایت تصادفی، نه یک کلید** اجرا کردم: **موفق** (`DPAPI_ROUNDTRIP_OK=True`) |
| **نتیجه** | طرح O1 و کد، هیچ‌کدام مشکل ندارند. فقط آزمون DPAPI باید در حسابی اجرا شود که پروفایل دارد |
| **پیش‌نویس** | نگاهی کوتاه به `protector.ts`: `spawn` بدون shell است و داده **فقط از stdin** می‌رود، مطابق دستور. بازبینی کامل پس از commit انجام می‌شود |

## ۲. یادداشت عملیاتی مهم

| # | یادداشت |
|---|---|
| **G5** | **DPAPI در حوزه‌ی CurrentUser به حساب گره خورده است.** کلیدی که زیر حساب X محافظت شود، فقط زیر همان X باز می‌شود. پس در مرحله‌ی کلید واقعی، **ابزار keygen باید زیر همان حساب producer اجرا شود** که زمان‌بند با آن کار می‌کند، و زمان‌بند (M2-4) باید آن حساب را **با پروفایل بارگذاری‌شده** اجرا کند. این در drill ‏M2-4 آزموده می‌شود |

## ۳. تقسیم کار ادامه

- **Codex:** پیش‌نویس را کامل و commit می‌کند. آزمون DPAPI فقط وقتی DPAPI در دسترس باشد اجرا می‌شود و در غیر این صورت **با دلیل آشکار رد (skip) می‌شود، نه این‌که بی‌صدا قبول شود.** بقیه‌ی آزمون‌ها، mutation proof و سه اجرای کامل را انجام می‌دهد.
- **نگهبان:** آزمون DPAPI را خودم، زیر حساب مالک، روی یک کپی جدا اجرا می‌کنم و نتیجه را شاهد این مرحله قرار می‌دهم.

## ۴. دستور Codex — M2-2b

```
INSTRUCTION_ID: CODEX-20260918-M2-2B-DPAPI-KEY-ADAPTER-CONTINUE-001
TARGET_HANDOFF_ID: HANDOFF-20260918-GUARDIAN-M2-2-DPAPI-STOP
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260918-PUBLIC-EXPORT-OPERATIONS
SUPERSEDES: the remaining steps of CODEX-20260918-M2-2-DPAPI-KEY-ADAPTER-001 (its design, file list and rules
  still apply UNCHANGED, except the DPAPI-test handling below)
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260918_CLAUDE_REVIEW_M2_2_DPAPI_STOP.md (PINNED_COMMIT/SHA256 relayed)
DIAGNOSIS: the DPAPI failure is an environment limit of the Codex sandbox account (no loaded user profile). The
  Guardian verified a DPAPI CurrentUser round trip on random bytes succeeds under the owner's normal account.
MODE: continue on the EXISTING branch codex/public-export-key-adapter in the EXISTING worktree
      C:/Users/galexy/mlino code/public-export-key-adapter. The branch is on origin at
      b6d07f7c68b7c658bd1fd8dd76cbc7e102195598; your HEAD must equal it (else STOP). LOCAL commits on top only;
      do NOT push, rebase, amend or force.
PRECONDITION: GW2 or GW2-P on the pinned record; record the outputs; any failure -> STOP.

1 Finish the draft exactly as specified in M2-2 items 1a-1g and 2 (the full test list: EVERY strict-parsing
  rejection with its exact code, key_id derivation and mismatch, non-ed25519 and public/private mismatch,
  active-only privateKey, active+standby publicKey, a signature through the adapter verified by
  signEnvelope/verifyEnvelope, public-only trust bundle in the V2 shape, relative and in-repository descriptor
  paths rejected).
2 DPAPI TEST HANDLING (the only change):
  a Split the DpapiProtector tests into
     - a NON-DPAPI unit test that stubs child_process.spawn and asserts: shell:false, the executable is
       powershell.exe, the input bytes travel ONLY through stdin, and neither the plaintext nor its base64 appears
       in the argument list or in the spawn options/env; a non-zero exit or empty output maps to a fixed error code;
     - a REAL DPAPI round-trip test on random TEST bytes.
  b The real test runs only when a probe (a tiny protect/unprotect of random bytes) succeeds; otherwise it is
     SKIPPED with the visible reason 'DPAPI_PROFILE_UNAVAILABLE' (test.skip / a describe title carrying the
     reason). It must NEVER pass silently when DPAPI is unavailable. Record in the logs which case occurred.
  c Put the real round trip in its OWN spec file
     implementation/test/public-export/key-providers/dpapi.integration.spec.ts so the Guardian can run it alone.
3 MUTATION PROOF as specified: remove in turn (i) the active-only check, (ii) the public/private match check,
  (iii) the key_id derivation check, and add (iv) routing the plaintext through a command-line argument instead
  of stdin; each must make at least one test FAIL. Throwaway copy only; log in implementation/validation/m2-2/.
4 VALIDATION: `npm run build` and the key-provider specs THREE consecutive times, green (the DPAPI integration
  test may show as skipped with the reason), committed logs in implementation/validation/m2-2/. Leak grep over the
  diff and logs for PRIVATE KEY, the pkcs8 prefix MC4CAQAw and descriptor paths.
REPORT (new file): AI_HANDOFF/CODEX_REPORTS/20260918_CODEX_M2_2B_DPAPI_KEY_ADAPTER_REPORT.md
- the files, the table requirement -> file -> exact test name, the four mutation outcomes, the three run totals
  with the skip count and reason, LF sha256 of new files and logs, GW2/GW2-P outputs, the leak-grep result.
  Append only to mlino2/HANDOFF/HANDOFF_STATE.md. Commit locally and STOP.
ALLOWED FILES and FORBIDDEN: exactly as in CODEX-20260918-M2-2-DPAPI-KEY-ADAPTER-001.
```

## ۵. وضعیت دروازه‌ها

| دروازه | موضوع | وضعیت |
|---|---|---|
| سند M2 و تصمیم‌های O1 تا O5 | | ✅ در main |
| **M2-2** | **adapter گاوصندوق کلید** | ⏸️ توقف محیطی · ▶️ **ادامه با M2-2b** |
| آزمون DPAPI واقعی | زیر حساب مالک | ⏳ نگهبان پس از M2-2b |
| کلید واقعی · M2-3 · M2-4 | | ⏳ تصویب جدا |

من کلاد هستم
