# گزارش اجرای M2-2b — adapter کلید خروجی عمومی

**وضعیت: تحویل محلی برای بازبینی Guardian؛ آزمون واقعی DPAPI در نشست Codex با دلیل آشکار skip شد.** این گزارش ادعای آزمون موفق DPAPI در حساب producer ندارد.

## ۱. کار اجراشده

پیش‌نویس M2-2 در شاخهٔ `codex/public-export-key-adapter` تکمیل شد: descriptor حداکثر دو کلیدی، شناسهٔ مشتق‌شده از کلید عمومی، محافظ DPAPI از طریق stdin/stdout، provider فعال/یدکی، بستهٔ عمومی V2، تابع تولید کلید و الگوی shim. کلیدهای تولیدی فقط در آزمون‌ها و حافظه بودند. هنگام وارسی، خطای نحوی واقعیِ عبور `mode` بعد از `-Command` در Windows PowerShell پیدا و اصلاح شد؛ `mode` اکنون ثابتِ درون فرمان است و بایت‌های داده همچنان فقط از stdin می‌گذرند.

## ۲. منابع و پیش‌شرط‌ها

- دستور پایهٔ M2-2 و تصویب O1–O5: `eff6a7fb53b4f4f82aa40ca26e0595f31865dac3:AI_HANDOFF/CLAUDE_REVIEWS/20260918_OWNER_APPROVAL_O1_O5_AND_M2_2.md`.
- بازبینی توقف و دستور ادامه: `3e1547581eef590db6e59d2488193247a0ca7e44:AI_HANDOFF/CLAUDE_REVIEWS/20260918_CLAUDE_REVIEW_M2_2_DPAPI_STOP.md`.
- `git fetch origin` به‌علت `SEC_E_NO_CREDENTIALS` شکست خورد. GW2-P موفق بود: `git cat-file -e 3e1547581eef590db6e59d2488193247a0ca7e44^{commit}` خروجیِ موفق/کد ۰؛ `git merge-base --is-ancestor 3e1547581eef590db6e59d2488193247a0ca7e44 origin/main` کد ۰؛ SHA-256 بایت‌های `git show` برابر مقدار پین‌شدهٔ `a0415967e54fbd1cc72f309d90c430309c9f3472820b37eb10a9f47eea9193fa` بود. HEAD آغازین دقیقاً `b6d07f7c68b7c658bd1fd8dd76cbc7e102195598` بود.
- CLI، adapter را از مسیر مطلق بیرون مخزن بار می‌کند و `createKeyProvider()` می‌خواهد (`implementation/public-export/cli.ts:80-89`). قراردادهای امضا/تأیید، `KeyObject` می‌خواهند (`implementation/public-export/signing.ts:5-11`). تصمیم‌های O1، O4 و O5 در `mlino2/MLINO_PUBLIC_EXPORT_OPERATIONS_DESIGN.md:16-36,52-79` آمده‌اند.

## ۳. فایل‌های تغییرکرده

فقط ۸ فایل تازه در `implementation/public-export/key-providers/`، سه spec تازه در `implementation/test/public-export/key-providers/` و شش فایل شواهد در `implementation/validation/m2-2/` افزوده شدند. این گزارش تازه است و `mlino2/HANDOFF/HANDOFF_STATE.md` فقط الحاق می‌شود. `blocker.log` و گزارش توقف قبلی دست نخورده‌اند.

## ۴. فایل‌های دست‌نخورده

`cli.ts`، `signing.ts`، `builder.ts`، `canonical.ts`، schema، migrationها، `package.json`، lockfile، V2، Docker، `.env`، فایل‌های کلید و git config تغییر نکردند. CLI اجرا نشد، دیتابیس و کلید واقعی استفاده نشد، Push انجام نشد. برای build/test از یک junction محلی به وابستگی‌های ازپیش‌نصب‌شده استفاده شد؛ چیزی در مقصد junction نصب یا تغییر داده نشد.

## ۵. آزمون‌ها و پوشش نیازمندی

| نیازمندی | فایل | نام دقیق آزمون |
|---|---|---|
| round trip و رد ساختار/فیلد/شناسهٔ تکراری/active ناموجود/بیش از دو کلید | `key-providers.spec.ts` | `descriptor round trip and strict shape rejection codes` |
| مشتق‌شدن و عدم‌تطابق `key_id` | `key-providers.spec.ts` | `key_id derivation is bound to its 32-byte public key` |
| کلید خصوصی فقط فعال؛ عمومی فعال و یدکی؛ ناشناس null | `key-providers.spec.ts` | `privateKey only active; publicKey active and standby; unknown returns null` |
| امضای adapter، جفت‌کلید نامنطبق و الگوریتم غیر Ed25519 | `key-providers.spec.ts` | `signEnvelope via adapter verifies; public/private mismatch and non-Ed25519 reject` |
| بستهٔ V2 فقط عمومی و کلید خام ۳۲ بایتی | `key-providers.spec.ts` | `trust bundle is public-only and matches V2 raw-key shape` |
| مسیر نسبی یا درون مخزن | `key-providers.spec.ts` | `relative and in-repository descriptor paths reject` |
| `spawn` بدون shell و بدون داده در آرگومان/env؛ داده فقط stdin | `protector.spec.ts` | `plaintext travels only by stdin; powershell.exe, shell:false, no secret in args/options/env` |
| خطای ثابت برای خروج ناموفق/خروجی خالی | `protector.spec.ts` | `non-zero exit and empty output map to DPAPI_OPERATION_FAILED` |
| DPAPI واقعی | `dpapi.integration.spec.ts` | `DPAPI_PROFILE_UNAVAILABLE: real CurrentUser round trip skipped` در حساب sandbox؛ زیر حساب دارای پروفایل عنوان `DpapiProtector CurrentUser round trip on random TEST bytes` اجرا می‌شود. |

## ۶. نتایج و شواهد

| اجرا | build | specهای متمرکز | دلیل skip |
|---|---|---|---|
| ۱ | موفق | ۸ موفق، ۱ skip؛ ۲ suite موفق، ۱ suite skip | `DPAPI_PROFILE_UNAVAILABLE` |
| ۲ | موفق | ۸ موفق، ۱ skip؛ ۲ suite موفق، ۱ suite skip | `DPAPI_PROFILE_UNAVAILABLE` |
| ۳ | موفق | ۸ موفق، ۱ skip؛ ۲ suite موفق، ۱ suite skip | `DPAPI_PROFILE_UNAVAILABLE` |

چهار mutation در کپی موقتِ بیرون مخزن انجام شد؛ هر کدام **آزمون مربوط به خود** را شکست داد: `ACTIVE_ONLY` → آزمون `privateKey only active...`، `PUBLIC_PRIVATE_MATCH` → `signEnvelope via adapter verifies...`، `KEY_ID_BINDING` → `key_id derivation...` و `PLAINTEXT_ARGUMENT` → `plaintext travels only by stdin...`. خروجی در `mutation.log` است؛ کپی موقت پاک شد (`MUTATION_COPIES_REMAINING=0`). اسکن ۱۶ فایل کد/آزمون/شواهد برای نشانگر `PRIVATE KEY`، پیشوند `MC4CAQAw` و مسیر مشخص descriptor آزمایشی، صفر تطابق داشت (`leak-check.log`). اجرای واقعی DPAPI به‌علت پروفایلِ بارگذاری‌نشدهٔ حساب sandbox انجام نشد؛ Guardian قبلاً probe مستقل با حساب مالک را تأیید کرده است، ولی هنوز باید **همین spec** را زیر آن حساب اجرا کند.

## ۷. Commit و SHA-256

Commit کد، آزمون و شواهد: `cb48b006793ce36a037ab62e11c466a5a9364c1f`. Hashهای زیر از **بایت‌های `git show cb48b00:<path>`** محاسبه شده‌اند، نه فایل CRLF ویندوزی:

| مسیر زیر `implementation/` | SHA-256 |
|---|---|
| `public-export/key-providers/README.md` | `cfda7e28bb1fb3f2bc0bcfcc8d039d0454a4f57d1e5cf99eacd1621c2fc4817f` |
| `public-export/key-providers/adapter-shim.template.cjs` | `078a656169420c91b0c2d5122a06e92f56506f9bb107b880c54f1affa2eea12f` |
| `public-export/key-providers/descriptor.ts` | `72177f503e380a3b54d2b916fbea6284725fb3150fa7007ab0fa08d58ae429a5` |
| `public-export/key-providers/dpapiKeyProvider.ts` | `43ab21ba6309828db4a52015d395635e780d4a0f4b664761db6ac71b12b47c06` |
| `public-export/key-providers/keyId.ts` | `0b6803d883709888bdd5d7b81630b0c07d43139e62b3da9bf81c519c1864f01c` |
| `public-export/key-providers/keygen.ts` | `f001137e6e6b4ff815bd5c7aac809a7c63a4023cfa9ca149f44352e44e3e65ca` |
| `public-export/key-providers/protector.ts` | `b114c68432f67da36df0ff71556bf1f77cfb9291a27e1666dbe0b9f47410e935` |
| `public-export/key-providers/trustBundle.ts` | `909d4231d33572c44911f12f7f56d995d71710474460304ea94fac3b73547ad7` |
| `test/public-export/key-providers/dpapi.integration.spec.ts` | `d6d5e98e1e85c62ef1740b69165c0db4e7cfaf69081428891744d7bf91634d73` |
| `test/public-export/key-providers/key-providers.spec.ts` | `ed5ef7ed69fb39bff68dd4a4aad5d2c96ab19e8f396b14d096a0a59f9e2aeb0c` |
| `test/public-export/key-providers/protector.spec.ts` | `f58ef5dc4b1952ca3c32807c15c3cdf8ffec5cb08d684bc39508b7b23072c0f9` |
| `validation/m2-2/leak-check.log` | `3f7293fe32dc4f1b99b88bda42002d9c3e29a4c75234ec9dbdb7471558ef7beb` |
| `validation/m2-2/mutation.cjs` | `422d7565eefaa8657ef8ad91c25d8c077ed97903da435e43877c2ee1b10e599d` |
| `validation/m2-2/mutation.log` | `7e660c04a9720b5771deeb12c546a148ead5cda2754ea0f93f8d54ffb63071fe` |
| `validation/m2-2/run-1.log` | `8f3d7fe9c3f19cc5ab49262853859857d033050fe5668fc16c19c87705f716bf` |
| `validation/m2-2/run-2.log` | `b20233949f15fecfa97a5b283e4d55d80300bf34b49303884491c267fb8c6d03` |
| `validation/m2-2/run-3.log` | `e27cd5feda3c21dbaee4ef52e4052a377a8d27eb22973987f3a6e9f4c913832d` |

## ۸. ریسک‌های باقی‌مانده

یک دوررفت واقعی DPAPI باید زیر حساب دارای پروفایل، با همین فایل `dpapi.integration.spec.ts` انجام شود. اجرای producer و keygen واقعی زیر **همان** حساب لازم است. ساخت کلید واقعی، تنظیم ACL میزبان و تازه‌سازی تب‌های V2 هنوز خارج از این برش‌اند. skip آزمون واقعی جای موفقیت آن نیست.

## ۹. پرسش‌های باز

Guardian باید اجرای مستقل spec واقعی DPAPI و سازگاری shim با محیط مقصد را بررسی کند. هیچ تصمیم O1–O5 در این اجرا تغییر نکرد.

## ۱۰. گام بعد

پس از commit محلی گزارش و Handoff، کار متوقف می‌شود. Guardian بازبینی کد و اجرای آزمون واقعی DPAPI را زیر حساب مالک انجام دهد؛ M2-3، M2-4، کلید واقعی و Push بدون دستور بعدی آغاز نمی‌شوند.

من کدکس هستم
