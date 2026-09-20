# ادغام U2، اجرای پیشنهادها روی دیتابیس مالک، و صدور U3c

**تاریخ:** ۲۰ سپتامبر ۲۰۲۶
**مجری و بازبین:** Claude Opus 5 — نگهبان معماری MLINO

## ۱. تصویب مالک

> «ادغام U2 در شاخه‌ی V2 مجاز است؛ و ثبت پیشنهادهای نمونه روی دیتابیس محلی با پشتیبان و خواندن DATABASE_URL در حافظه مجاز است.»

## ۲. ادغام U2

| مورد | مقدار |
|---|---|
| شاخه | `codex/v2-real-ui-wiring` در `77e7bdb`، منتشرشده |
| **merge** | **`47b17334f724268f0004c25b37c7849d606be08a`** در `codex/v2-intent-flow-foundation`، با `--no-ff` و lease روی `e26c525` |

## ۳. اجرای پیشنهادهای نمونه روی دیتابیس مالک

### ۳.۱ پشتیبان

| مورد | مقدار |
|---|---|
| فایل | `C:\Users\galexy\mlino-backups\mlino_v1_pre_u3_20260920T200040Z.dump` |
| اندازه | ۱۲۳٬۴۳۴ بایت |
| SHA-256 | `cccf377a…c9bb` · برابر با مقدار داخل container |
| سرآیند و فهرست | `PGDMP` · ۲۱۶ شیء · فایل موقت داخل container پاک شد |

### ۳.۲ اجرا

ورودی: `C:\mlino code\_TEST_DATA\vanak_offers.json`، بیرون از مخزن، ساخته‌ی نگهبان. هشت پیشنهاد برای رستوران، دو کافه، نانوایی، سوپرمارکت، باشگاه و آرایشگاه.

نتیجه‌ی یک اجرا: `created=8 skipped=0 failed=0`. نشانی دیتابیس فقط در حافظه خوانده شد.

### ۳.۳ یافته‌ی جدی حین اجرا — F4

**پس از ثبت موفق، هیچ‌کدام از ۸ پیشنهاد در فایل عمومی نیامدند.** سازنده‌ی فایل برای هر هشت مورد کد `INVALID_OFFER_TERMS` داد و کل پیشنهاد را کنار گذاشت.

**علت:** طرح U1 در بخش R4 گفته بود نشانه‌ی آزمایشی داخل `terms` نوشته شود (`test_marker`). ولی قرارداد داده‌ی عمومی در `validTerms` (`implementation/public-export/builder.ts:140-144`) **فقط سه کلید** `schema_version`، `summary` و `conditions` را می‌پذیرد و هر کلید اضافه را رد می‌کند.

**چرا زودتر گرفته نشد:**
- **نگهبان** سند R4 را تأیید کرد و این ناسازگاری را ندید. **این کوتاهی من است.**
- **آزمون‌های کدکس** آن را نگرفتند، چون در آزمون‌های یکپارچه هیچ پیشنهادی `terms` نداشت. پس مسیر «پیشنهاد دارای شرایط» هرگز آزموده نشد.

**اقدام نگهبان برای بازگرداندن وضعیت:** برای هر ۸ پیشنهاد، یک **نسخه‌ی تازه** با شرایط مطابق قرارداد ساخته و منتشر شد، **فقط از راه سرویس‌های رسمی** `OfferService.createVersion` و `PublicationService.publish`. هیچ نوشتن مستقیمی در جدول‌ها انجام نشد. ردیابی آزمایشی بودن اکنون بر پایه‌ی پیشوند `test-ui-vanak-` در شناسه، واژه‌ی «آزمایشی» در نام و توضیح، و متن خلاصه‌ی شرایط است.

### ۳.۴ بررسی فقط‌خواندنی پس از کار

| بررسی | نتیجه |
|---|---|
| پیشنهادها | ✅ ۸ پیشنهاد، ۸ نسخه، همه منتشرشده |
| فایل عمومی | ✅ ۱۵ کسب‌وکار و **۸ پیشنهاد**، با قیمت یا حالت «با درخواست» درست |
| ردیف غیرآزمایشی | ✅ **صفر** |
| ساختار | ✅ ۸ migration، ۱۳ trigger، بدون تغییر |
| کانتینرها و سرویس داده | ✅ بدون restart · پاسخ ۴۰۱ بدون توکن |

## ۴. دستور کدکس — U3c

```
INSTRUCTION_ID: CODEX-20260920-U3C-OFFER-TERMS-CONTRACT-001
TARGET_HANDOFF_ID: HANDOFF-20260920-GUARDIAN-U2-MERGED-U3-RUN
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260918-TEST-SEED
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260920_CLAUDE_U2_MERGE_U3_RUN_AND_U3C.md (PINNED_COMMIT/SHA256 relayed)
MODEL: SOL.
MODE: continue on the EXISTING branch codex/test-seed-vanak in the EXISTING worktree
      C:/Users/galexy/mlino code/test-seed-vanak. HEAD must be 95b68103f0f299f3e48dc3567d8f60733f47080e (it contains
      a Guardian test fix); if your local HEAD is older, fetch/fast-forward the branch from origin first and report
      it. LOCAL commits on top only; no push, rebase, amend or force.
PRECONDITION: GW2 or GW2-P on the pinned record; record the outputs; any failure -> STOP.

1 F4 - offer terms must satisfy the PUBLIC CONTRACT, not only Core. validTerms in
  implementation/public-export/builder.ts:140-144 accepts ONLY the keys schema_version ('mlino.offer-terms.v1'),
  summary (non-empty, <=2000 chars, no angle brackets) and conditions (array of <=30 non-empty strings, each
  <=1000 chars, no angle brackets). Any extra key - including the test_marker proposed by design R4 - makes the
  builder drop the whole offer with INVALID_OFFER_TERMS.
  Change the tool so that:
  a the parser REJECTS terms carrying any key outside the three allowed ones, with a fixed code
    (for example TEST_SEED_OFFER_TERMS_CONTRACT), and validates schema_version, summary and conditions exactly as
    the builder does;
  b when a row has no terms, the tool BUILDS a contract-valid terms object whose summary marks the record as test
    data (for example a summary containing «آزمایشی»), so every seeded offer is traceable without breaking the
    contract;
  c the test-data marker is enforced ONLY through the offer_key prefix, the name and the short description (and the
    summary text), never through an extra terms key. Update the tool docs/comments accordingly.
2 TESTS - the gap that let this through was that no test ever exported an offer carrying terms:
  - a parser test for each rejection case (extra key, wrong schema_version, empty summary, a condition that is not
    a string, more than 30 conditions);
  - an INTEGRATION test that seeds offers WITH terms and asserts buildPublicExport actually CONTAINS them with the
    terms intact - this test must FAIL if a test_marker key is put back into terms;
  - keep the existing coverage green;
  - MUTATION PROOF (throwaway copy): (i) allow an extra terms key again, (ii) emit terms with a wrong
    schema_version; each must make a named test FAIL.
3 VALIDATION on a disposable PostgreSQL at localhost:5499 if reachable; otherwise record that it is unavailable,
  commit and STOP - the Guardian will run it. When reachable: npm run build plus the whole test/tools/test-seed
  suite THREE times on a FRESH database each time; logs in implementation/validation/u3c/; the usual leak grep.
REPORT: append a new section to AI_HANDOFF/CODEX_REPORTS/20260920_CODEX_U3_SAMPLE_OFFERS_REPORT.md with the
  contract citation (file:line), the new codes and test names, mutation outcomes, run totals and LF sha256. Append
  only to mlino2/HANDOFF/HANDOFF_STATE.md. Commit locally and STOP.
ALLOWED FILES and FORBIDDEN: exactly as in CODEX-20260920-U3-SAMPLE-OFFERS-TOOL-001. The public contract, the
  builder and every Core file stay untouched; the tool must adapt to the contract, never the other way round.
```

## ۵. درس ثبت‌شده

**هر ابزاری که داده‌ای می‌سازد که قرار است به فایل عمومی برسد، باید در آزمون، همان داده را تا داخل فایل عمومی دنبال کند.** ثبت موفق در دیتابیس به‌تنهایی هیچ چیزی را ثابت نمی‌کند.

من کلاد هستم
