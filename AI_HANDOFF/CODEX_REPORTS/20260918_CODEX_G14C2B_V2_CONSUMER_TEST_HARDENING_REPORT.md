# گزارش G14c-2b — تکمیل شاهد آزمون مصرف‌کنندهٔ V2

تاریخ: ۲۰۲۶-۰۹-۱۸
INSTRUCTION_ID: CODEX-20260918-G14C2B-V2-CONSUMER-TEST-HARDENING-001
TARGET_HANDOFF_ID: HANDOFF-20260918-GUARDIAN-G14C2-REVIEW
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260917-V2-PUBLIC-CONSUMER
REVIEW_REFERENCE: `ee34297f9b08bb9d58144c8c0a58b19e69816ced:AI_HANDOFF/CLAUDE_REVIEWS/20260918_CLAUDE_REVIEW_G14C2_V2_CONSUMER_IMPLEMENTATION.md`
BASE: `ee4e70d53c8eb0ffafaf8fcd4a9bb478d98481dc`
BRANCH: `codex/v2-public-consumer`
وضعیت: `TEST_EVIDENCE_COMPLETE_LOCALLY_AWAITING_GUARDIAN_REVIEW`؛ Push انجام نشده است.

## ۱. کار اجراشده

فقط آزمون `publicExport.test.ts` برای F1–F3 سخت‌تر شد. helper آزمون اکنون مقدار الگوریتم را پیش از امضاکردن در بایت‌ها می‌گذارد؛ بنابراین نمونهٔ `Ed448` امضای Ed25519 **معتبر بر همان بایت‌های اعلام‌شده** دارد و فقط باید به‌سبب الگوریتم رد شود. سه صورت مقدار امضای نادرست نیز جداگانه با کد دقیق رد آزموده می‌شوند. همهٔ `rejects.toThrow()` بدون کد در این فایل با کد مورد انتظار جایگزین شدند. سه mutation فقط در کپی موقت برنامه اجرا شدند و هیچ کد محصولی تغییر نکرد.

| یافته | آزمون تازه یا تغییرکرده | نتیجه |
|---|---|---|
| F1 | `rejects a non-Ed25519 algorithm even when its declared bytes have a valid Ed25519 signature` | `PUBLIC_EXPORT_SIGNATURE_SHAPE`؛ حذف شرط الگوریتم آزمون را قرمز کرد |
| F2a | `rejects a signature value with non-base64url character` | `PUBLIC_EXPORT_SIGNATURE_VALUE` |
| F2b | `rejects a signature value with wrong decoded length` | `PUBLIC_EXPORT_SIGNATURE_VALUE`؛ حذف شرط طول آزمون را قرمز کرد |
| F2c | `rejects a signature value with non-canonical trailing bits` | `PUBLIC_EXPORT_SIGNATURE_VALUE`؛ حذف شرط round-trip آزمون را قرمز کرد |
| F3، کلید ناشناس/لغوشده | `rejects unknown and revoked key ids with their exact error code` | `PUBLIC_EXPORT_UNKNOWN_OR_REVOKED_KEY`؛ حذف شرط لغو آزمون را قرمز کرد |
| F3، دست‌کاری محتوا | `rejects a one-byte content tamper and keeps the prior valid cache` | `PUBLIC_EXPORT_BAD_SIGNATURE` |
| F3، تاریخ نامعتبر | `C8-2 and N1 use the supplied device clock for TTL, skew and ordering` | `PUBLIC_EXPORT_EXPIRED_OR_FUTURE` |
| F3، mock قدیمی | `starts empty and never accepts draft-1 mock as a real fallback` | `PUBLIC_EXPORT_VERSION` |
| F3، تزریق کلید | `N2 does not accept trust keys injected by the artifact itself` | `PUBLIC_EXPORT_SIGNATURE_SHAPE` و `TRUST_BUNDLE_SHAPE` |

هیچ کد خطای واقعی با انتظار دستور اختلاف نداشت.

## ۲. اسناد و پیش‌شرط

- بازبینی Guardian در commit پین‌شدهٔ بالا؛ `git fetch origin` با `SEC_E_NO_CREDENTIALS` ناموفق بود.
- GW2-P: `git cat-file -e ee34297f9b08bb9d58144c8c0a58b19e69816ced^{commit}` خروجی خالی و exit 0؛ `git merge-base --is-ancestor ee34297f9b08bb9d58144c8c0a58b19e69816ced origin/main` خروجی خالی و exit 0؛ SHA-256 خروجی `git show` برابر `eecd51908559ccc87d93fa6a7f8e5eee7031a4e9e7fe424b97537d55ad9dda3f` و مطابق مقدار پین‌شده بود.
- HEAD محلی پیش از کار دقیقاً `ee4e70d53c8eb0ffafaf8fcd4a9bb478d98481dc` و worktree پاک بود. Credential یا git config تغییر نکرد.

## ۳. فایل‌های تغییریافته

- `mlino2/app/src/publicExport/publicExport.test.ts`: فقط helper و assertionهای آزمون.
- `mlino2/validation/g14c-2b/`: دو اسکریپت، سه لاگ mutation تفصیلی، خلاصهٔ mutation، سه لاگ build، سه لاگ test و خلاصهٔ اعتبارسنجی.
- همین گزارش و ورودی افزوده‌شده به `mlino2/HANDOFF/HANDOFF_STATE.md`.

## ۴. فایل‌های تغییریافته‌نشده

`canonical.ts`، `verify.ts`، `trustBundle.ts` و سایر کدهای محصول، V1 (`implementation/**`)، قرارداد FINAL، وابستگی‌ها، `package.json`، lockfile، `main` و شاخهٔ طراحی تغییر نکردند. هیچ Docker، پایگاه‌داده، شبکه در آزمون‌ها، کلید واقعی یا Push استفاده نشد.

## ۵. آزمون‌های اجراشده و mutation proof

ابتدا آزمون متمرکز با کد اصلی: ۲۴/۲۴ موفق. سه mutation با جایگزینی متن دقیق فقط در کپی موقت زیر `%TEMP%` انجام شدند و پس از اجرا کپی پاک شد. خروجی‌های کامل در سه فایل `mutation-*.log` و خلاصه در `mutation.log` هستند:

| mutation موقت | نتیجهٔ آزمون متمرکز | آزمون شکست‌خورده |
|---|---|---|
| حذف `signature.algorithm !== 'Ed25519'` | ۱ شکست، ۲۳ موفق | `rejects a non-Ed25519 algorithm even when its declared bytes have a valid Ed25519 signature`؛ Promise به‌جای ردشدن resolve شد |
| حذف بررسی طول/round-trip در `decodeBase64Url` | ۲ شکست، ۲۲ موفق | `rejects a signature value with wrong decoded length` و `rejects a signature value with non-canonical trailing bits`؛ کد به `PUBLIC_EXPORT_BAD_SIGNATURE` تغییر کرد |
| حذف بررسی revocation در `TrustBundle.publicKey` | ۱ شکست، ۲۳ موفق | `rejects unknown and revoked key ids with their exact error code`؛ Promise به‌جای ردشدن resolve شد |

نخستین تلاش ساخت کپی موقت با گزینهٔ عام `/XD dist`، پوشهٔ `vitest/dist` را هم حذف کرد و پیش از اجرای آزمون متوقف شد؛ این تلاش شاهد mutation حساب نشده است. اسکریپت به حذف فقط `app/dist` اصلاح و هر سه mutation از نو اجرا شد. کپی موقت پاک شد.

سپس در `mlino2/app` سه نوبت متوالی `npm run build` و `npm test` اجرا شدند؛ logها برای `git diff --check` فقط از نظر فاصلهٔ انتهای خط و خط‌های خالی پایانی عادی‌سازی شده‌اند.

## ۶. نتایج سه اجرای نهایی

| نوبت | build | test |
|---|---|---|
| ۱ | PASS | ۱۴ فایل، ۲۲۵/۲۲۵ آزمون PASS |
| ۲ | PASS | ۱۴ فایل، ۲۲۵/۲۲۵ آزمون PASS |
| ۳ | PASS | ۱۴ فایل، ۲۲۵/۲۲۵ آزمون PASS |

`git diff --cached --check` پس از ثبت شواهد بدون خطا بود. اجرای مستقیم sandbox به `vite.config.ts` دسترسی نداشت؛ برای Vitest/esbuild همان فرمان‌های مجاز با دسترسی اجرایی تأییدشده اجرا شدند. هیچ اتصال شبکه‌ای در آزمون‌ها برقرار نشد.

## ۷. Commit و SHA-256 شواهد

Commit جدید فقط محلی روی `codex/v2-public-consumer` ساخته می‌شود و شناسهٔ نهایی در پیام تحویل اعلام خواهد شد. SHA-256های زیر از بایت‌های staged Git (`git show :<path>`) محاسبه شدند:

| فایل | SHA-256 |
|---|---|
| `mlino2/app/src/publicExport/publicExport.test.ts` | `5a20dc0241f8ac6d75dcdb9ce9987661560991cb9ec06c264f05bd09c740fa00` |
| `mlino2/validation/g14c-2b/run-mutations.ps1` | `03ece5300ed2fd8d6d79c69b0212548f2c338e94b67fc418bc9a6f7e1c01ab3d` |
| `mlino2/validation/g14c-2b/run-validation.ps1` | `cb6b6a312457d148b2007f43c211c92ee514fb6f30f9e7af94b1e44ce0f9b954` |
| `mlino2/validation/g14c-2b/mutation.log` | `819b5d379424600866c8176513b2c2d4ee10bf7fab1dc222b1e957830a1f7c09` |
| `mlino2/validation/g14c-2b/mutation-algorithm.log` | `dfdad92cf5a213f0d357b4c4b25b4e1383a2f87e5391bcf2c7c775320740080a` |
| `mlino2/validation/g14c-2b/mutation-signature-value.log` | `fadef7e2023155d886b189c16b485bb905b9af57626636ed55563651ccca5b23` |
| `mlino2/validation/g14c-2b/mutation-revocation.log` | `14d45e37fa8b6fba18b23248b7fe69daffded6bf4165d2d9e80f734fa6335c06` |
| `mlino2/validation/g14c-2b/build-1.log` | `6311b1654c3059948f5fb17dd14bcda31d96441b12982c49779fea2000cb3444` |
| `mlino2/validation/g14c-2b/build-2.log` | `8caf592240f1bf3996501c3639e526507968fb7883210f620cd042ea6d5cda9e` |
| `mlino2/validation/g14c-2b/build-3.log` | `4ee9c5c9ba8220538fb0658e301a891fd29696f19151c8c04bd76473b31ed998` |
| `mlino2/validation/g14c-2b/test-1.log` | `f820249596f529d8c1f08f59de566315b295c1bde6270bb17889cb2db073a306` |
| `mlino2/validation/g14c-2b/test-2.log` | `2506c616cfa9473fe44e9c324a9528cb88329347e00784f9a3ee9ee2fc68d295` |
| `mlino2/validation/g14c-2b/test-3.log` | `9d5ed3b31966d8f626ed0cd34cfc38372af3fe358447668fab0dde5f6216cfae` |
| `mlino2/validation/g14c-2b/validation-summary.log` | `2edc7442bff675a6dff5aa2ce7b76485dc634999cef1effd868ebbb6b0aaf594` |

## ۸. ریسک‌های باقی‌مانده

این مرحله فقط شاهد آزمون را کامل می‌کند؛ راه‌اندازی واقعی export، کلید عملیاتی و روش لغو فوری کلید همچنان مرحلهٔ جداگانه است. محدودیت‌های ساعت دستگاه و منشأ آلودهٔ V2 در گزارش G14c-2 و یادداشت تهدید آن ثبت شده‌اند.

## ۹. پرسش‌های باز

برای F1–F3 پرسش یا اختلاف کد خطای حل‌نشده‌ای وجود ندارد. ادغام در شاخهٔ V2 و راه‌اندازی عملیاتی با تصمیم بعدی مالک است.

## ۱۰. گام بعدی پیشنهادی

Guardian این commit محلی، assertionهای دقیق، سه لاگ mutation و سه اجرای کامل build/test را بازبینی کند. تا آن زمان Codex کار را متوقف می‌کند و Push یا ادغام انجام نمی‌دهد.

من کدکس هستم
