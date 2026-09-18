# بازبینی نگهبان — M2-2b: adapter گاوصندوق کلید

**تاریخ:** ۱۸ سپتامبر ۲۰۲۶
**بازبین:** Claude Opus 5 — MLINO Architecture Guardian
**commitها:** `cb48b00` (کد و آزمون) و `fda7803` (گزارش) روی `b6d07f7`. Codex آن‌ها را محلی ساخت و **نگهبان شاخه را با lease پیشروی از `b6d07f7` به `fda7803` روی سرور برد.**

## حکم: `APPROVED_WITH_FIXES`؛ آزمون واقعی DPAPI زیر حساب مالک یک خطای جدی را آشکار کرد

## ۱. راستی‌آزمایی

| مورد | نتیجه |
|---|---|
| **دامنه** | ✅ فقط فایل‌های مجاز · ۰ تغییر در `cli.ts`، `signing.ts`، `builder.ts`، `canonical.ts`، `package.json` و lockfile · worktree تمیز |
| **نشت** | ✅ تنها تطابق grep، جمله‌ی خود گزارش درباره‌ی الگوی جست‌وجوست · هیچ کلید یا پیشوند pkcs8 در کد یا لاگ نیست |
| **mutation** | ✅ هر چهار مورد (active-only، تطابق عمومی و خصوصی، key_id، و plaintext در آرگومان) آزمون خود را شکستند |
| **طراحی** | ✅ فقط کلید فعال امضا می‌کند · تطابق نیمه‌ی عمومی و خصوصی بررسی می‌شود · key_id به کلید عمومی گره خورده · مسیر descriptor مطلق و بیرون مخزن است، با `realpath` · داده فقط از stdin می‌رود · بافرهای متن باز صفر می‌شوند |
| **اجرای مستقل نگهبان** | ⚠️ زیر حساب مالک (`galexy`، پروفایل بارگذاری‌شده) روی کپی جدا از `git archive`، بدون `.env` و بدون `DATABASE_URL`: **۸ موفق، ۱ شکست** |

## ۲. یافته‌ها

| # | شدت | یافته |
|---|---|---|
| **F1** | **جدی** | **`DpapiProtector` هرگز کار نمی‌کند.** در حساب مالک، probe آزمون موفق شد (DPAPI در دسترس است)، ولی خود protector شکست خورد: `DPAPI_OPERATION_FAILED`. علت را با اجرای مستقیم همان اسکریپت یافتم: خطای PowerShell `The term 'else' is not recognized`. خطوط اسکریپت با `'; '` به هم وصل شده‌اند، پس `if {...}; else {...}` ساخته می‌شود و در PowerShell، `else` پس از `;` غیرمجاز است. **هم protect و هم unprotect شکست می‌خورند.** آزمون stub این را نمی‌دید چون spawn را شبیه‌سازی می‌کند، و آزمون واقعی در sandbox رد (skip) شده بود. **این دقیقاً همان دلیلی است که اجرای واقعی زیر حساب مالک لازم بود** |
| **F2** | **جدی** | **trust bundle با نسخه‌ی دوم ناسازگار است.** `buildV2TrustBundle`، `version` را **عدد** می‌سازد، ولی `trustBundleFromBuildJson` در نسخه‌ی دوم (`540ad2d:mlino2/app/src/publicExport/trustBundle.ts:35`) فقط **رشته** می‌پذیرد و خطای `TRUST_BUNDLE_SHAPE` می‌دهد. نتیجه: نسخه‌ی دوم هیچ کلیدی را قبول نمی‌کرد و همیشه «در دسترس نیست» نشان می‌داد. آزمون «matches V2 shape» نوع `version` را نمی‌سنجید |
| F3 | کوچک | اگر `MLINO_EXPORT_KEYSTORE_PATH` تنظیم نشده باشد، shim به‌جای کد ثابت، `TypeError` می‌دهد. `checkedDescriptorPath` باید ورودی غیررشته را با `KEY_DESCRIPTOR_PATH_INVALID` رد کند |

**درس برای روند کار:** آزمونی که در محیط Codex رد (skip) می‌شود، **تا نگهبان اجرایش نکند شاهد نیست.** این قاعده از این پس ثابت است.

## ۳. دستور Codex — M2-2c

```
INSTRUCTION_ID: CODEX-20260918-M2-2C-DPAPI-KEY-ADAPTER-FIXES-001
TARGET_HANDOFF_ID: HANDOFF-20260918-GUARDIAN-M2-2B-REVIEW
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260918-PUBLIC-EXPORT-OPERATIONS
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260918_CLAUDE_REVIEW_M2_2B_DPAPI_KEY_ADAPTER.md (PINNED_COMMIT/SHA256 relayed)
MODE: FIXES on the EXISTING branch codex/public-export-key-adapter in the EXISTING worktree
      C:/Users/galexy/mlino code/public-export-key-adapter. The branch is on origin at
      fda7803b72f4aa8bfc684d322d48601008e6b62e; your HEAD must equal it (else STOP). LOCAL commits on top only;
      do NOT push, rebase, amend or force.
PRECONDITION: GW2 or GW2-P on the pinned record; record the outputs; any failure -> STOP.
All rules, allowed files and forbidden items of CODEX-20260918-M2-2-DPAPI-KEY-ADAPTER-001 still apply.

1 F1 - protector.ts: the PowerShell script is invalid (joining lines with '; ' produces "}; else {", and PowerShell
  rejects else after ';' -> "The term 'else' is not recognized"). Rebuild the script so it is syntactically valid:
  join with "\n" (newlines) or avoid if/else (for example select the method before the try block). Keep the
  mode strictly one of the two literals, data only via stdin, shell:false.
  ADD a test that needs NO DPAPI and runs in the sandbox: for BOTH modes, pass the exact generated script to
  PowerShell's parser ([System.Management.Automation.Language.Parser]::ParseInput via powershell.exe with the
  script supplied on STDIN, never on the command line) and assert ZERO parse errors. Expose the script builder as
  a function so the test uses the real text. MUTATION (v): reintroducing "; " joining must make this test FAIL.
2 F2 - trustBundle.ts: version must be a non-empty STRING (the V2 parser at
  540ad2d:mlino2/app/src/publicExport/trustBundle.ts:30-47 requires typeof version === 'string'). Change the input
  type and validation accordingly. ADD a test that re-implements the V2 acceptance rules exactly as a local helper
  (top-level keys exactly {version, keys, revokedIds}; version a string; each key exactly {keyId,
  rawPublicKeyBase64Url}; the url-safe base64 decodes to 32 bytes; revokedIds all strings) and asserts the
  builder's JSON passes; cite the V2 file:line in a comment. MUTATION (vi): a numeric version must make it FAIL.
3 F3 - checkedDescriptorPath: a non-string or empty descriptorPath -> KEY_DESCRIPTOR_PATH_INVALID (no TypeError);
  add a test with undefined.
4 VALIDATION: npm run build and the key-provider specs THREE times, green (the real DPAPI integration test may
  skip with DPAPI_PROFILE_UNAVAILABLE in the sandbox); mutation log for (v) and (vi); leak grep; logs in
  implementation/validation/m2-2/ with a "c" suffix (for example run-c-1.log).
REPORT (new file): AI_HANDOFF/CODEX_REPORTS/20260918_CODEX_M2_2C_DPAPI_KEY_ADAPTER_FIXES_REPORT.md
- the fixes, test names, mutation outcomes, run totals with skip reason, LF sha256, GW2/GW2-P outputs.
  Append only to mlino2/HANDOFF/HANDOFF_STATE.md. Commit locally and STOP.
The Guardian will again run dpapi.integration.spec.ts under the owner's account; M2-2 is accepted only when it
PASSES there (not skipped).
```

## ۴. وضعیت دروازه‌ها

| دروازه | موضوع | وضعیت |
|---|---|---|
| **M2-2** | **adapter گاوصندوق کلید** | ⚠️ طراحی پذیرفته · دو خطای جدی · ▶️ **M2-2c صادر شد** |
| آزمون DPAPI واقعی | زیر حساب مالک | ⏳ نگهبان، پس از M2-2c · شرط پذیرش: **PASS، نه skip** |
| کلید واقعی · M2-3 · M2-4 | | ⏳ تصویب جدا |

من کلاد هستم
