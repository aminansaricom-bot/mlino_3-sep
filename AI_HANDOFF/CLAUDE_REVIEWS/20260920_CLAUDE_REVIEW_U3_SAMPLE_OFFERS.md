# بازبینی نگهبان — U3: ابزار پیشنهادهای نمونه

**تاریخ:** ۲۰ سپتامبر ۲۰۲۶
**بازبین:** Claude Opus 5 — نگهبان معماری MLINO
**commitها:** `c9d03fc` (ادغام main)، `2a7dc57` (ابزار)، `f957c5d`، `30359b7` و `4a51ed9` روی `3ecf7f5`. **نگهبان شاخه‌ی `codex/test-seed-vanak` را با lease پیشروی از `cee6dbe` به `4a51ed9` روی سرور برد.**

## حکم: `APPROVED_WITH_FIXES`؛ آزمون یکپارچه یک ایراد واقعی را آشکار کرد

## ۱. راستی‌آزمایی

| مورد | نتیجه |
|---|---|
| **دامنه** | ✅ فقط ابزار، آزمون‌ها و شواهد · ادغام main بدون تعارض · تعارض فایل Handoff طبق قاعده حل شده و هیچ نشانه‌ای نمانده |
| **مسیر رسمی** | ✅ ساخت پیشنهاد، ساخت نسخه، پیوند به خدمت و انتشار، همه از سرویس‌های رسمی هسته |
| **نشانه‌ی آزمایشی** | ✅ پیشوند `test-ui-vanak-` و نشانه در `terms` اجباری است |
| **پاک‌سازی** | ✅ فقط «پس گرفتن انتشار»؛ هیچ حذفی در کد نیست |

## ۲. اجرای نگهبان روی دیتابیس دور‌ریختنی

دیتابیس موقت روی درگاه 5499، هر بار از نو ساخته شد. **به دیتابیس مالک دست زده نشد.**

| آزمون | نتیجه |
|---|---|
| آزمون‌های بدون دیتابیس (سه فایل) | ✅ ۲۷ از ۲۷ |
| `seed.integration` به‌تنهایی | ✅ قبول |
| **`offers.integration` به‌تنهایی** | ❌ **شکست** |
| هر سه فایل با هم | ❌ شکست |

## ۳. یافته‌ها

| # | شدت | یافته |
|---|---|---|
| **F1** | **جدی** | **ابزار پیشنهادی می‌سازد که دیتابیس آن را رد می‌کند.** قاعده‌ی دیتابیس (`offer_version_price_check`) می‌گوید یا «با درخواست» باشد و قیمت نداشته باشد، یا قیمت و واحد پول هر دو باشند. ابزار فقط «هم‌زمان بودن قیمت و واحد پول» را می‌سنجد و حالتی را که **هیچ‌کدام نیست** رد نمی‌کند. در آن حالت هسته پیش‌فرض «با درخواست = نادرست» می‌گذارد و دیتابیس با خطای `offer version price is invalid` جلویش را می‌گیرد. دو مورد از چهار پیشنهاد نمونه‌ی خود آزمون دقیقاً همین حالت‌اند. **روی دیتابیس مالک هم همین شکست رخ می‌داد** |
| **F2** | متوسط | **دو آزمون یکپارچه با هم تداخل دارند.** هر دو روی یک دیتابیس کار می‌کنند و آزمون «کاشت» انتظار دیتابیس تمیز دارد، پس در اجرای کامل شکست می‌خورد. این ادامه‌ی همان یادداشت S1-N1 است |

**ارزش این مرحله:** همان آزمون یکپارچه‌ای که کدکس نتوانست اجرا کند، ایرادی را گرفت که در غیر این صورت روی دیتابیس شما آشکار می‌شد.

## ۴. دستور کدکس — U3b

```
INSTRUCTION_ID: CODEX-20260920-U3B-SAMPLE-OFFERS-FIXES-001
TARGET_HANDOFF_ID: HANDOFF-20260920-GUARDIAN-U3-REVIEW
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260918-TEST-SEED
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260920_CLAUDE_REVIEW_U3_SAMPLE_OFFERS.md (PINNED_COMMIT/SHA256 relayed)
MODEL: SOL.
MODE: continue on the EXISTING branch codex/test-seed-vanak in the EXISTING worktree
      C:/Users/galexy/mlino code/test-seed-vanak. HEAD must be 4a51ed9bf587d353420c617c87e0787e3760af94 (else STOP).
      LOCAL commits on top only; no push, rebase, amend or force. All rules of
      CODEX-20260920-U3-SAMPLE-OFFERS-TOOL-001 still apply.
PRECONDITION: GW2 or GW2-P on the pinned record; record the outputs; any failure -> STOP.

1 F1 - price rule. The database CHECK offer_version_price_check (prisma/migrations/20260913010000_add_core_foundation/
  migration.sql:690-694) allows EXACTLY: on_request = true with no price and no currency, OR on_request = false with
  BOTH price_amount and price_currency present. Enforce this in the tool's own parser BEFORE any Core call:
  reject a row that has neither on_request === true nor a complete price pair, with a NEW fixed error code
  (for example TEST_SEED_OFFER_PRICE_MODE); also reject on_request === true combined with a price or currency.
  Cite the constraint file:line in the report. Fix the integration fixtures accordingly (the 'linked' and 'expired'
  rows must either be on_request or carry a full price pair).
  Tests: the rejection cases with their exact codes, plus a proof that the tool rejects them WITHOUT calling Core
  (inject a Core double that throws if used).
2 F2 - test isolation. Make offers.integration.spec.ts and seed.integration.spec.ts independent: each spec uses its
  OWN organization id range and filters exports and counts by exactly its own ids, so a full `jest test/tools/test-seed`
  run on one fresh database passes regardless of file order. Do NOT delete rows to achieve this.
3 VALIDATION on a disposable PostgreSQL at localhost:5499 if you can reach one; otherwise record that it is
  unavailable and STOP after committing - the Guardian will run it. When reachable: npm run build plus the whole
  test/tools/test-seed suite THREE times on a FRESH database each time, all green; logs in
  implementation/validation/u3b/; the same leak grep as before.
REPORT: append a new section to AI_HANDOFF/CODEX_REPORTS/20260920_CODEX_U3_SAMPLE_OFFERS_REPORT.md with the fix,
  the constraint citation, the new test names, run totals and LF sha256. Append only to
  mlino2/HANDOFF/HANDOFF_STATE.md. Commit locally and STOP.
ALLOWED FILES and FORBIDDEN: exactly as in CODEX-20260920-U3-SAMPLE-OFFERS-TOOL-001.
```

## ۵. وضعیت دروازه‌ها

| دروازه | موضوع | وضعیت |
|---|---|---|
| U2 | رابط واقعی | ✅ پذیرفته · شاخه روی `77e7bdb` · ادغام در انتظار تصمیم مالک |
| **U3** | **پیشنهادهای نمونه** | ⚠️ **دو اصلاح لازم** · ▶️ U3b صادر شد |
| اجرای U3 روی دیتابیس مالک | | ⏳ اجازه‌ی تازه‌ی مالک |
| U4 · کاتالوگ با تصویر · برنامه‌ی نصبی | | ⏳ مراحل بعد |

من کلاد هستم
