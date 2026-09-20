# ثبت تصمیم مالک — اول وب، و مجوز U3 (پیشنهادهای نمونه)

**تاریخ:** ۲۰ سپتامبر ۲۰۲۶
**ثبت‌کننده:** Claude Opus 5 — نگهبان معماری MLINO

## ۱. متن تصمیم مالک

> «اول رو همین تحت وب بزار جلو بریم تا به یک نسخه ی قابل قبول برسیم بعد نسخه های ایفون اندرویدشو تولید میکنیم»

## ۲. چشم‌انداز تازه‌ی مالک، ثبت‌شده برای مراحل بعد

مالک بر پایه‌ی یک نمونه‌ی اینستاگرامی خواست: دیدن محصولات کسب‌وکار به‌صورت کارت نیمه‌شفاف روی تصویر دوربین با کشیدن انگشت؛ منو و بخش‌های مختلف برای کافه و رستوران؛ فرستادن پیشنهاد به مشتریانی که در فاصله‌ی مشخصی هستند؛ و سقف رایگان ماهانه برای این پیشنهادها و پولی شدن مازاد.

**ارزیابی نگهبان و ترتیب پیشنهادی:**

| مرحله | موضوع | وضعیت |
|---|---|---|
| **۱** | **پیشنهادهای نمونه (U3)** | ▶️ همین حالا |
| ۲ | کاتالوگ با تصویر: افزودن قلم کالا و تصویر به قرارداد، با **اثرانگشت تصویر داخل فایل مُهرشده** | سند طرح جدا و CCR قرارداد |
| ۳ | ویترین دوربین با کشیدن انگشت | پس از مرحله‌ی ۲ |
| ۴ | برنامه‌ی نصبی و اعلان | **معوق به تصمیم مالک؛ روی وب شدنی نیست** |
| ۵ | سقف رایگان و پرداخت | پس از مرحله‌ی ۴ · بیرون از هسته |

**D-WEB1:** تا اطلاع بعدی فقط وب. سنجش موقعیت در پس‌زمینه و اعلان با برنامه بسته، **خارج از توان وب** است و در طراحی‌ها به‌عنوان شدنی فرض نمی‌شود.
**D-WEB2:** هر کاری که به «محصول» یا «تصویر» نیاز دارد، **پیش‌نیازش گسترش قرارداد است** و بدون آن انجام نمی‌شود. حدس زدن یا ساختن محصول ممنوع است.

## ۳. دستور کدکس — U3

به خواست مالک، متن دستور کدکس انگلیسی است.

```
INSTRUCTION_ID: CODEX-20260920-U3-SAMPLE-OFFERS-TOOL-001
TARGET_HANDOFF_ID: HANDOFF-20260920-OWNER-DECISION-WEB-FIRST-U3
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260918-TEST-SEED
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260920_OWNER_DECISION_WEB_FIRST_AND_U3.md (PINNED_COMMIT/SHA256 relayed)
MODEL: SOL.
MODE: IMPLEMENTATION in V1 - continue on the EXISTING branch codex/test-seed-vanak in the EXISTING worktree
      C:/Users/galexy/mlino code/test-seed-vanak. HEAD must be 3ecf7f5e428e87d33ef1cff77a61316ede514373 (your P1
      run commit); if it differs, report the actual HEAD and STOP. LOCAL commits only; do NOT push.
PRECONDITION: GW2 or GW2-P on the pinned record; record the outputs; any failure -> STOP. Never open any .env,
  GITHUB_TOKEN.txt or key file; never run anything against port 5435 in THIS step.
DESIGN BASIS: mlino2/MLINO_V2_REAL_UI_AND_ASSISTANT_DESIGN.md section 6 (R4) on origin/codex/v2-real-ui-design at
  6f2c8a58f1cbbb441ff09a10d9b3e6f094e2aa19; owner decision U1-O4; Guardian S1-D5 (cleanup by withdraw only).

0 First merge origin/main at e7a99be7f8ba8d61170b4e0b3984d06fafad8d0c into the branch (git merge --no-ff; NO rebase). If the ONLY conflict is
  in mlino2/HANDOFF/HANDOFF_STATE.md and it comes from appended entries, resolve it by the standing Guardian rule
  (keep both entries, oldest first, remove markers). Any other conflict -> STOP.
1 NEW implementation/tools/test-seed/offers.ts + a CLI subcommand `offers`:
  - input: a small JSON file OUTSIDE the repository (the Guardian will supply it), array of
    { test_id: "vanak-NN", offer_key, name, short_description, offer_shape, price_amount?, price_currency?,
      on_request?, valid_from, valid_until?, capability_index? } - strict parsing with fixed error codes, no field
    echoing;
  - every offer_key MUST start with 'test-ui-vanak-' and every terms object MUST carry
    test_marker = "MLINO_TEST_UI_OFFER_V1" (design R4); the name and short description must contain «آزمایشی»;
  - execution ONLY through the official Core services, in this order, citing file:line in the report:
    OfferService.create -> OfferService.createVersion -> (optional) OfferService.linkCapability to a capability of
    the SAME organization -> PublicationService.publish('OFFER_VERSION', versionId, reason);
  - the same SeedPlatformVerifier guard as the seed command (MLINO_TEST_SEED_CONFIRM plus a localhost database);
  - idempotent: an existing offer_key is skipped and counted, never duplicated;
  - the existing `withdraw` command must also withdraw these offer versions (and keep the --archive behaviour for
    profiles); no DELETE, TRUNCATE, DROP or raw SQL anywhere.
2 TESTS (jest) on the DISPOSABLE database only (localhost:5499 guard; never 5435):
  - parser rejections with exact codes, including a missing marker, a wrong prefix and a bad validity window;
  - seeding 3 synthetic businesses, then 4 offers across them (one on_request, one priced, one linked to a
    capability, one expiring in the past) -> buildPublicExport (TEST key) shows exactly the ACTIVE ones with the
    right fields, and the expired one is absent from the visible result;
  - a second run changes nothing (idempotent);
  - withdraw removes the offers from the next export while row counts never decrease;
  - MUTATION PROOF (throwaway copy): (i) drop the marker requirement, (ii) allow an offer_key without the prefix,
    (iii) publish without the version step; each must make a named test FAIL.
3 VALIDATION: npm run build plus the seed/offer specs THREE times against the disposable database; logs in
  implementation/validation/u3/; leak grep for 09\d{9}, DATABASE_URL values and real business names.
REPORT (new file): AI_HANDOFF/CODEX_REPORTS/20260920_CODEX_U3_SAMPLE_OFFERS_REPORT.md - files; the exact Core call
  sequence with file:line; requirement -> test name; mutation outcomes; run totals; LF sha256; GW2/GW2-P outputs.
  Append only to mlino2/HANDOFF/HANDOFF_STATE.md. Commit locally and STOP.
ALLOWED FILES: implementation/tools/test-seed/**, implementation/test/tools/test-seed/**,
  implementation/validation/u3/** (new), the report (new), mlino2/HANDOFF/HANDOFF_STATE.md (append only), plus the
  merge commit of main.
FORBIDDEN: core/**, public-export/** (product code), schema, migrations, package.json, lockfile; the V2 app; any
  run against 5435 or the owner's database in this step; Docker; any real key; network; _PUSH_STAGING; push;
  git config.
```

## ۴. اجرای U3 روی دیتابیس مالک

پس از بازبینی نگهبان، اجرای ابزار روی دیتابیس محلی **اجازه‌ی تازه‌ی مالک** می‌خواهد، چون اجازه‌ی پیشین با پایان P2 منقضی شد. روش، همان روش اثبات‌شده است: پشتیبان‌گیری کامل، یک اجرا، و بررسی فقط‌خواندنی پس از آن.

من کلاد هستم
