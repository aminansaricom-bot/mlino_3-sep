# ثبت تصویب مالک — ساخت ابزار وارد کردن داده‌ی آزمایشی (S1)

**تاریخ:** ۱۸ سپتامبر ۲۰۲۶
**ثبت‌کننده:** Claude Opus 5 — نگهبان معماری MLINO

## ۱. متن تصویب مالک

> «ساخت ابزار وارد کردن داده‌ی آزمایشی مجاز است.»

**دامنه:** فقط ساختن ابزار و آزمودن آن روی **دیتابیس آزمایشیِ دور‌ریختنی**. اجرا روی دیتابیس محلی مالک (درگاه 5435) **اجازه‌ی جداگانه** می‌خواهد و همان روش پشتیبان‌گیری مرحله‌ی G7b را دنبال می‌کند.

## ۲. داده‌ی ورودی

`C:\mlino code\_TEST_DATA\vanak_businesses.json`، بیرون از هر مخزن، که «محمد» از بلد جمع کرد و نگهبان بررسی کرد:

| مورد | مقدار |
|---|---|
| تعداد | ۱۵ کسب‌وکار در ۱۰ دسته |
| مختصات | ۱۲ مورد، همه در شعاع ۴۸ تا ۶۳۷ متر از میدان ونک |
| ساعت کاری | ۷ مورد، همه معتبر |
| اطلاعات شخصی | هیچ شماره‌ی موبایل شخصی در فایل نیست |

**قاعده:** داده‌ی کسب‌وکار واقعی و بدون رضایت خود آن‌ها، **فقط برای آزمایش محلی** است. هرگز نباید به نسخه‌ی عمومی برسد و پیش از راه‌اندازی واقعی باید برداشته شود.

## ۳. تصمیم‌های نگهبان

| # | تصمیم |
|---|---|
| **S1-D1** | **شماره‌گذاری روزها** در `mlino.business-hours.v1` طبق ISO 8601: ‏۱ دوشنبه، ۲ سه‌شنبه، ۳ چهارشنبه، ۴ پنجشنبه، ۵ جمعه، ۶ شنبه، ۷ یکشنبه، با منطقه‌ی زمانی `Asia/Tehran`. نسخه‌ی دوم هم هنگام نمایش ساعت‌ها باید همین را به کار ببرد |
| **S1-D2** | **برچسب آزمایشی:** شناسه‌ی سازمان به شکل `test-vanak-NN`، و پایان توضیح هر نمایه « — داده‌ی آزمایشی (منبع: بلد)». نام کسب‌وکار دست نمی‌خورد تا آزمایش واقعی بماند |
| **S1-D3** | **فقط از راه رسمی Core:** ساخت سازمان، ثبت و تأیید هویت، نمایه، توانمندی‌ها و انتشار. هیچ نوشتن مستقیمی در جدول‌ها مجاز نیست |
| **S1-D4** | تأیید هویت در این ابزار، یک **تأییدکننده‌ی آزمایشی** است که فقط با یک پرچم صریح و فقط روی دیتابیس `localhost` فعال می‌شود. دلیل ثبت‌شده در هر تأیید: «TEST DATA — not business-consented» |
| **S1-D5** | **پاک‌سازی** فقط با «پس گرفتن انتشار» (withdraw) از راه رسمی. هیچ DELETE یا TRUNCATE مجاز نیست |

## ۴. دستور کدکس — S1

به خواست مالک، متن دستور کدکس انگلیسی است.

```
INSTRUCTION_ID: CODEX-20260918-S1-TEST-SEED-TOOL-001
TARGET_HANDOFF_ID: HANDOFF-20260918-GUARDIAN-SIGNATURE-FIX-MERGED
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260918-TEST-SEED
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260918_OWNER_APPROVAL_TEST_SEED_TOOL.md (PINNED_COMMIT/SHA256 relayed)
MODEL: SOL.
MODE: IMPLEMENTATION in V1 - a NEW branch codex/test-seed-vanak from origin/main at the pinned commit, in a NEW
      worktree C:/Users/galexy/mlino code/test-seed-vanak. LOCAL commits only; do NOT push.
      May run IN PARALLEL with the Astra round M2-3R (different files).
PRECONDITION: GW2 or GW2-P on the pinned record; record the outputs; any failure -> STOP. Never touch credentials,
  .env files, GITHUB_TOKEN.txt, git config, or any real key.

INPUT FILE (read-only, outside the repository): C:\mlino code\_TEST_DATA\vanak_businesses.json - a JSON array of 15
objects with EXACTLY these keys: test_id, name, category_fa, description, latitude, longitude, address_text,
public_phone, website, instagram, hours, services, source_url, checked_at. hours is null or an object keyed by the
Persian weekday names شنبه..جمعه, each an array of ["HH:MM","HH:MM"] intervals ([] = closed). You MAY read this file;
copy it into test fixtures ONLY as a reduced synthetic sample (2-3 made-up businesses), never the real 15.

1 NEW implementation/tools/test-seed/ (Node built-ins + existing deps only, NO new dependency):
  a parse.ts - strict parser for the input format: exact keys, test_id /^vanak-\d{2}$/, unique; latitude/longitude
    both null or both finite and within 1500 m of (35.7574, 51.4096); public_phone null or /^0[1-8]\d{9}$/ (reject any
    09xxxxxxxxx anywhere in the record); source_url must start with https://balad.ir/p/; hours intervals valid 24h
    with open < close; services at most 3 non-empty strings. Fixed error codes, never echoing field values.
  b map.ts - conversion to Core inputs:
    - organizationId 'test-vanak-NN'; displayName = name;
    - profile fields: name, description + ' — داده‌ی آزمایشی (منبع: بلد)', latitude, longitude, addressText,
      contactInformation {public_phone} (omit when null), links {website, public_social:[instagram URL]} (omit nulls),
      businessHours in mlino.business-hours.v1 with timezone Asia/Tehran and ISO days (Guardian S1-D1):
      دوشنبه=1 سه‌شنبه=2 چهارشنبه=3 پنجشنبه=4 جمعه=5 شنبه=6 یکشنبه=7; days with [] are omitted; the result MUST pass
      validBusinessHours from public-export/builder.ts;
    - each service -> a capability (capability_key 'svc-1'..'svc-3', name = the service text) for a customer-facing
      audience, then confirmed.
  c seed.ts - runs ONLY through the official Core services (BootstrapService, IdentityClaimService,
    IdentityVerificationService, BusinessProfileService, CapabilityService, PublicationService; read their real
    signatures and permission rules first and cite file:line in the report): bootstrap the org, submit an identity
    claim, start verification, mark under review, decide APPROVED, create the profile, link the claim, create and
    confirm capabilities, publish the profile and each capability. No direct table writes, no raw SQL.
    Identity approval uses a SeedPlatformVerifier (Guardian S1-D4) that is constructed ONLY when
    MLINO_TEST_SEED_CONFIRM=LOCAL_TEST_DATA_ONLY is set AND the database host is localhost/127.0.0.1; every
    reason/decision text is 'TEST DATA - not business-consented (source: balad.ir)'.
    Idempotent: re-running skips organizations that already exist and reports them; it never duplicates.
  d withdraw.ts - withdraws the publications of every 'test-vanak-' organization through PublicationService only
    (Guardian S1-D5). No DELETE, TRUNCATE or DROP anywhere in the tool.
  e cli.ts - `seed` and `withdraw` commands; input path must be absolute and outside the repository; output only
    fixed codes and counts (seeded, skipped, failed) - never names, phones, addresses or ids beyond test_id.
2 TESTS (jest) on the DISPOSABLE test database only (the existing guard: localhost port 5499); never port 5435:
  - parser: each rejection with its exact code; a mobile number anywhere is rejected;
  - mapping: Persian weekdays -> ISO days exactly as S1-D1; closed days omitted; output passes validBusinessHours;
  - seed on the test DB with a 3-business synthetic fixture: all profiles and capabilities PUBLISHED; then
    buildPublicExport (TEST key) contains exactly those 3 records with the right fields and the test marker; a
    record without coordinates is exported with null coordinates; re-run is idempotent (no duplicates);
  - the SeedPlatformVerifier refuses without the confirm variable and for a non-localhost host;
  - withdraw removes them from the next export; no table rows are deleted (counts unchanged except publications);
  - MUTATION PROOF (throwaway copy): (i) drop the localhost check, (ii) map شنبه to 1, (iii) remove the mobile
    rejection; each must make a test FAIL.
3 VALIDATION: npm run build and the new specs THREE times against the disposable DB; logs in
  implementation/validation/s1/; leak grep over the diff and logs for 09\d{9}, real business names from the input
  file, PRIVATE KEY and DATABASE_URL values.
REPORT (new file): AI_HANDOFF/CODEX_REPORTS/20260918_CODEX_S1_TEST_SEED_TOOL_REPORT.md
- files; the exact Core call sequence with file:line; requirement -> file -> test name; mutation outcomes; run
  totals; LF sha256; GW2/GW2-P outputs. Append only to mlino2/HANDOFF/HANDOFF_STATE.md. Commit locally and STOP.
ALLOWED FILES:
- implementation/tools/test-seed/** (new), implementation/test/tools/test-seed/** (new),
  implementation/validation/s1/** (new), the report (new), mlino2/HANDOFF/HANDOFF_STATE.md (append only)
FORBIDDEN:
- any change to existing files (core/**, public-export/**, schema, migrations, package.json, lockfile)
- running anything against port 5435 or the owner's local database; committing the real 15-business data;
  any real key; Docker; any network; _PUSH_STAGING; push; git config
```

## ۵. پس از S1

بازبینی نگهبان. سپس با **اجازه‌ی جداگانه‌ی مالک**، اجرا روی دیتابیس محلی با این قدم‌ها:
- پشتیبان‌گیری پیش از اجرا؛
- اجازه‌ی خواندن نشانی دیتابیس فقط در حافظه؛
- بررسی فقط‌خواندنی پس از اجرا.

بعد نوبت راه‌اندازی آزمایشی روی میزبان و گوشی است.

## ۶. وضعیت دروازه‌ها

| دروازه | موضوع | وضعیت |
|---|---|---|
| M2-3r | دور استرا (۰۰۳) | ▶️ در حال اجرا |
| **S1** | **ابزار وارد کردن داده‌ی آزمایشی** | ▶️ **صادر شد**، موازی |
| اجرای S1 روی دیتابیس محلی · اعمال روی میزبان · گوشی | | ⏳ اجازه‌ی جداگانه |

من کلاد هستم
