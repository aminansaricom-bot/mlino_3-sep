# بازبینی نگهبان معماری — G14c-2: پیاده‌سازی مصرف‌کننده‌ی V2

**تاریخ:** ۱۸ سپتامبر ۲۰۲۶
**بازبین:** Claude Opus 5 — MLINO Architecture Guardian
**commitها:** `f4f22cd`، `3e05b3f`، `e3e7cc2` و `ee4e70d` روی `f4d326f`. Codex آن‌ها را محلی ساخت و **نگهبان شاخه‌ی `codex/v2-public-consumer` را روی سرور منتشر کرد** (`ee4e70d`، شاخه‌ی تازه با lease خالی).

## حکم: `APPROVED_WITH_FIXES`؛ کد درست است، ولی دو آزمون درستی آن را ثابت نمی‌کنند

## ۱. راستی‌آزمایی مستقل

| مورد | نتیجه |
|---|---|
| **دامنه** | ✅ ۲۳ فایل، همه در محدوده‌ی مجاز · **۰ فایل در `implementation/`** · `package.json` و lockfile بدون تغییر · main در شاخه نیست · worktree تمیز |
| **نشت** | ✅ grep برای کلید خصوصی و secret در diff: **هیچ** |
| **آزمون‌ها** | ✅ **خودم اجرا کردم** روی یک کپی جدا از `git archive`، نه در worktree کدکس و نه در `_PUSH_STAGING`: **۱۴ فایل، ۲۲۱/۲۲۱** · سه لاگ build و سه لاگ test ثبت‌شده، همه سبز |
| **N3 هم‌ارزی بایت** | ✅ **خودم دوباره از V1 روی main ساختم.** `canonical.ts` ‏main (blob `772dddbb`) را جدا transpile کردم و ورودی هر هشت fixture را از آن گذراندم: **۸/۸ برابر**، هم hex و هم sha256 · ورودی NFC واقعاً به‌شکل تجزیه‌شده ذخیره شده (`65 cc 81`) و خروجی شکل ترکیبی است (`c3 a9`) |
| **سازگاری با تولیدکننده** | ✅ V1 فایل را با `canonicalBytes(artifact)` می‌نویسد، بدون خط پایانی، و `snapshot_id` را با همان فرمول `sha256(canonical{contract_version, records})` می‌سازد. شرط «فقط بایت canonical» در V2 با خروجی واقعی V1 می‌خواند |
| **نام آزمون‌ها** | ✅ همه‌ی نام‌های جدول گزارش در فایل آزمون وجود دارند |

## ۲. ارزیابی کد

**درست پیاده شده:**
- **امضا:** جداکننده‌ی دامنه `"MLINO-PUBLIC-BUSINESS-V1\n"` · `signature.value` از بایت امضاشده حذف و `key_id` حفظ می‌شود · کلید ناشناس یا لغوشده رد می‌شود · بایت ورودی باید **دقیقاً canonical** باشد، که کلید تکراری و فاصله‌ی اضافه را هم می‌بندد.
- **cache:** همه‌ی بررسی‌ها پیش از تعویض انجام می‌شوند · **یک تعویض reference** روی شیء تماماً freeze‌شده · ردشدن هرگز cache را دست نمی‌زند · قدیمی‌تر یا هم‌زمانِ متفاوت رد می‌شود · هنگام خواندن، TTL و لغو کلید **دوباره** سنجیده می‌شوند.
- **نگاشت:** هر فیلد ناشناخته رد می‌شود · پنج فیلد بی‌منبع هرگز ساخته نمی‌شوند · مختصات null از «نزدیک من» حذف می‌شود · لینک توانمندی فقط به همان رکورد · `fresh_until` و `valid_until` در لحظه‌ی خواندن.
- **جدایی Mock:** حالت پیش‌فرض **واقعی** است؛ Mock فقط با `VITE_PUBLIC_EXPORT_MODE=demo` · بنر و لاگ برچسب‌دار · بدون artifact معتبر، پیام «در دسترس نیست» و **هیچ داده‌ی آزمایشی.**
- **N1 و N2:** در کد و در `THREAT_MODEL.md` صادقانه نوشته شده‌اند.

## ۳. یافته‌ها

| # | شدت | یافته |
|---|---|---|
| **F1** | **باید اصلاح شود** | **آزمون الگوریتم چیزی را ثابت نمی‌کند.** بررسی `algorithm !== 'Ed25519'` را از کد برداشتم و **هر ۲۰ آزمون باز هم سبز ماندند.** دلیل: آزمون فقط متن `Ed25519` را در فایل امضاشده عوض می‌کند، پس امضا خراب می‌شود و فایل **به دلیل دیگری** رد می‌شود |
| **F2** | **باید اصلاح شود** | **بررسی قالب امضا آزمون ندارد.** بررسی طول ۶۴ بایت و رفت‌وبرگشت base64url را برداشتم و **باز هر ۲۰ آزمون سبز ماندند.** دستور صریحاً رد «مقدار base64url نادرست» را خواسته بود |
| **F3** | باید اصلاح شود | آزمون‌های رد با `rejects.toThrow()` بدون کد خطا نوشته شده‌اند. این همان الگوی G14a-2 است که به G14a-2b انجامید: آزمون باید **دلیل** رد را بسنجد، نه فقط رخ‌دادن آن |
| N4 | یادداشت، بدون اقدام | ترتیب بررسی کمی با طرح C2 فرق دارد (TTL پیش از محاسبه‌ی دوباره‌ی `snapshot_id`). چون هر دو پیش از تعویض cache انجام می‌شوند، **پذیرفتنی است** |
| N5 | یادداشت برای مرحله‌ی عملیاتی | V1 فایل را با دسترسی `0o600` می‌نویسد. در راه‌اندازی مسیر انتشار (C8-1) باید دسترسی خواندن سرویس‌دهنده‌ی وب جداگانه تنظیم شود. **کار این مرحله نیست** |

**چرا مسدود نیست:** خود کد درست است و من این را با مطالعه‌ی کد و مسدود کردن مسیرها تأیید کردم. فقط **شاهد** ناقص است. اصلاح، کار کوچکی فقط در فایل آزمون است.

## ۴. دستور Codex — G14c-2b

```
INSTRUCTION_ID: CODEX-20260918-G14C2B-V2-CONSUMER-TEST-HARDENING-001
TARGET_HANDOFF_ID: HANDOFF-20260918-GUARDIAN-G14C2-REVIEW
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260917-V2-PUBLIC-CONSUMER
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260918_CLAUDE_REVIEW_G14C2_V2_CONSUMER_IMPLEMENTATION.md (PINNED_COMMIT/SHA256 relayed)
MODE: TEST HARDENING on the EXISTING branch codex/v2-public-consumer in the EXISTING worktree
      C:/Users/galexy/mlino code/v2-public-consumer-impl. The branch is now on origin at
      ee4e70d53c8eb0ffafaf8fcd4a9bb478d98481dc; your local HEAD must equal it (check; if not -> STOP).
      Add LOCAL commits on top only; do NOT push, rebase, amend or force.
PRECONDITION: GW2 or GW2-P on the pinned record; record the outputs; any failure -> STOP.

1 F1 - make the algorithm test prove the algorithm check: build an artifact whose signature object says
  algorithm "Ed448" (or any non-Ed25519 value) AND whose Ed25519 signature is VALID over the bytes that contain
  that algorithm value (sign after setting it). Assert the rejection code 'PUBLIC_EXPORT_SIGNATURE_SHAPE'.
  This test must FAIL if the algorithm condition in verify.ts is removed.
2 F2 - add a test for a malformed signature.value, each asserting 'PUBLIC_EXPORT_SIGNATURE_VALUE':
  a a character outside base64url (for example '+' or '=');
  b a valid base64url string that decodes to a length other than 64 bytes;
  c a non-canonical base64url spelling (trailing bits set so it does not round-trip).
  This test must FAIL if the length/round-trip condition in decodeBase64Url is removed.
3 F3 - replace every bare rejects.toThrow() in publicExport.test.ts with the exact expected code:
  unknown key and revoked key -> PUBLIC_EXPORT_UNKNOWN_OR_REVOKED_KEY; one-byte tamper -> PUBLIC_EXPORT_BAD_SIGNATURE;
  expired and future -> PUBLIC_EXPORT_EXPIRED_OR_FUTURE; draft-1 -> PUBLIC_EXPORT_VERSION;
  injected public_key -> PUBLIC_EXPORT_SIGNATURE_SHAPE; trust bundle with privateKey -> TRUST_BUNDLE_SHAPE.
  If an actual code differs, STOP and report it rather than changing product code.
4 MUTATION PROOF: in a throwaway copy (NOT committed, NOT the worktree's product files), remove in turn
  (i) the algorithm condition, (ii) the decodeBase64Url length/round-trip condition, (iii) the revocation check in
  TrustBundle.publicKey; run the publicExport tests for each and record that at least one test FAILS each time.
  Log the three outcomes in mlino2/validation/g14c-2b/mutation.log.
5 VALIDATION: npm run build and npm test in mlino2/app, THREE consecutive times, committed logs in
  mlino2/validation/g14c-2b/. No network, Docker or database.
REPORT (new file): AI_HANDOFF/CODEX_REPORTS/20260918_CODEX_G14C2B_V2_CONSUMER_TEST_HARDENING_REPORT.md
- each new or changed test name, the three mutation outcomes, the three run totals, LF sha256 of changed files
  and logs, the GW2/GW2-P outputs. Append only to mlino2/HANDOFF/HANDOFF_STATE.md. Commit locally and STOP.
ALLOWED FILES:
- mlino2/app/src/publicExport/publicExport.test.ts (tests only)
- mlino2/validation/g14c-2b/** (new), the report (new), mlino2/HANDOFF/HANDOFF_STATE.md (append only)
FORBIDDEN:
- ANY change to product code (canonical, verify, trustBundle, transport, consumer, mapping, RealPublicApp, App)
- implementation/ (V1), origin/main, the FINAL contract, any new dependency, any real key
- Docker, any database, port 5435, _PUSH_STAGING, any push, git config
```

## ۵. بسته‌ی تصمیم مالک

**فعلاً تصمیمی لازم نیست.** G14c-2b فقط در محدوده‌ی مجوز G14c-2 آزمون‌ها را کامل می‌کند و **کد محصول را تغییر نمی‌دهد**.

**پس از بازبینی G14c-2b، مالک تصمیم می‌گیرد:**

| # | موضوع | توصیه‌ی نگهبان |
|---|---|---|
| **M1** | ادغام `codex/v2-public-consumer` در شاخه‌ی V2 (`codex/v2-intent-flow-foundation`) | **مجاز شود**، پس از سبز شدن G14c-2b · ادغام را خودم با `--no-ff` و lease محافظت‌شده انجام می‌دهم |
| **M2** | راه‌اندازی عملیاتی: کلید واقعی، مسیر انتشار و زمان‌بندی | **جدا و بعد از M1**، با یک سند CCR عملیاتی شامل N5 و روش لغو فوری کلید |

## ۶. وضعیت دروازه‌ها

| دروازه | موضوع | وضعیت |
|---|---|---|
| G14a، G15، G14b و Q8 | | ✅ در main |
| G14c-1 | سند طراحی | ✅ پذیرفته |
| **G14c-2** | **پیاده‌سازی مصرف‌کننده‌ی V2** | ✅ **کد پذیرفته** · شاخه روی `ee4e70d` روی سرور |
| **G14c-2b** | **تکمیل شاهد آزمون (F1 تا F3)** | ▶️ **صادر شد** |
| ادغام در V2 · کلید و زمان‌بندی | | ⏳ تصویب مالک پس از G14c-2b |

من کلاد هستم
