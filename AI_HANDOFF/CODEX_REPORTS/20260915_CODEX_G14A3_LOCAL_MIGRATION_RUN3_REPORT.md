# گزارش اجرای G14a3 — run3

## ۱. وضعیت نهایی

**PASS — migration با موفقیت و فقط یک‌بار اعمال شد؛ post-verify نهایی با بررسی خواندنی مستقل تأیید شد.**

اسکریپت در اولین post-check به‌اشتباه `_prisma_migrations` را نیز باید برابر pre-state می‌دانست و با تفاوت مورد انتظار ۶ به ۷ متوقف شد. این خطا هیچ write یا retry ایجاد نکرد. بررسی خواندنی بعدی ثابت کرد که همه‌ی شروط a–g موفق‌اند. اسکریپت run3 برای مقایسه‌ی صحیح این جدول اصلاح شد، اما برای جلوگیری از هر deploy دوم دوباره اجرا نشد.

## ۲. شناسه و پیش‌شرط

- دستور: `CODEX-20260915-G14A3-LOCAL-MIGRATION-003`
- branch: `codex/core-g14a-published-content`
- پایه: `394badae2084668e1d5957df90c680c3c58a2591`
- migration: `20260914010000_add_publication_published_content`
- worktree: `C:\Users\galexy\mlino code\core-g14a-published-content`
- Prisma CLI: `5.22.0`

`git fetch origin` با exit code `128` شکست خورد. GW2-P برای هر دو مرجع موفق بود:

| مرجع | cat-file | merge-base ancestor | git show | bytes | SHA-256 |
|---|---:|---:|---:|---:|---|
| review run3 preflight bug | 0 | 0 | 0 | 6972 | `1a82379d268b52d05924ac55445b2125ba256a3d506d661ddcf76146cdb258da` |
| owner approval DB connection | 0 | 0 | 0 | 6965 | `0c4eaacbfb958e15bcca4540959c10eeea35b2da09df75486c44529b0a181f5d` |

خروجی‌های کامل precondition و source check در شواهد run3 ثبت شده‌اند. هیچ credential، git config یا credential helper لمس نشد.

## ۳. C0

نتیجه‌ی مجاز و تنها ثبت‌شده:

`C0_LINES=1 HOST_LOCAL=true PORT=5435 DB=mlino_v1`

مقدار اتصال فقط در حافظه‌ی فرایند استفاده شد، در هیچ فایل یا خروجی قرار نگرفت و پس از پایان از محیط حذف شد. هیچ بخش دیگری از `_PUSH_STAGING` خوانده یا اجرا نشد.

## ۴. خلاصه‌ی F1 و F2/F3

در کپی run3 از اسکریپت run2:

- `PsqlScalarInt` و `PsqlScalarString` اضافه شدند.
- تمام خواندن‌های scalar مربوط به count، preflight، failure state و post-verify به helperهای single-row منتقل شدند.
- identifierهای mixed-case برای count با quote امن ساخته شدند.
- نام تابع Docker از نام فرمان جدا شد.
- parser وضعیت migration به خط مستقل و trim‌شده تغییر کرد.
- timestamp با `InvariantCulture` تولید شد تا UTC میلادی مطابق regex باشد.
- مقایسه‌ی post-table-counts، افزایش مورد انتظار `_prisma_migrations` از ۶ به ۷ را جداگانه لحاظ می‌کند.
- F2 پیش از backup دقیقاً این مقادیر را کنترل کرد و موفق شد:

```text
_prisma_migrations=6
all migrations FINISHED and NOT_ROLLED_BACK
publications=0
published_content_columns=0
non_internal_triggers=13
check_constraints=29
domain_signal_producer_registry=4
```

F3 در اسکریپت به ۷ migration، ستون `jsonb`، constraint معتبر، ۱۳ trigger، ۳۰ CHECK و برابر بودن count جدول‌ها به‌جز افزایش متوقع `_prisma_migrations` تنظیم شد.

## ۵. نتایج مراحل اجرایی

| مرحله | نتیجه | جزئیات |
|---|---|---|
| ۱. source check | PASS | درخت Prisma یکسان، implementation تمیز، Prisma 5.22.0؛ تغییر uncommitted قبلی دست‌نخورده ماند. |
| ۲. pre-state و F2 | PASS | preflight دقیقاً مقادیر بخش ۴ را داشت. |
| ۳. backup B1–B6 | PASS | dump داخل container، hash دوطرفه برابر، restore-list مثبت، فایل موقت حذف شد. |
| ۴. `prisma migrate status` | PASS | فقط migration هدف pending بود. |
| ۵. `prisma migrate deploy` | PASS | exit code 0 و migration هدف یک‌بار اعمال شد. |
| ۶. verification a–g | PASS | با بررسی مستقل خواندنی تأیید شد. |
| ۷. failure resolve | NOT APPLICABLE | deploy موفق بود؛ `resolve` اجرا نشد. |

## ۶. backup

- نام: `mlino_v1_pre_g14a_20260914T214243Z.dump`
- اندازه: `103407` بایت
- SHA-256 داخل container: `0116d2c1db38421b76791a9f153fac2ceb4cad4fb294f03211e423db62d3bcac`
- SHA-256 روی host: `0116d2c1db38421b76791a9f153fac2ceb4cad4fb294f03211e423db62d3bcac`
- restore-list count: `215`

Backup خارج از repository باقی ماند.

## ۷. verification a–g

- **a PASS:** `_prisma_migrations` برابر ۷، همه `FINISHED` و `NOT_ROLLED_BACK`.
- **b PASS:** `publications.published_content` از نوع `jsonb` وجود دارد.
- **c PASS:** constraint `publication_published_content_event_kind_check` با `validated=true` وجود دارد.
- **d PASS:** همه‌ی countهای جدول‌های public به‌جز افزایش مورد انتظار `_prisma_migrations` برابر pre-state هستند؛ `publications=0` باقی مانده است.
- **e PASS:** triggerها `13` و بدون تغییر؛ CHECKها از `29` به `30` رسیده‌اند.
- **f PASS:** image، `StartedAt` و `RestartCount` هر دو container با pre-state برابر مانده‌اند.
- **g PASS:** درخواست بدون احراز هویت به read-api مقدار `HTTP_STATUS=401` داد.

شواهد خام پالایش‌شده در `mlino2/validation/g14a3/run3/` قرار دارند؛ هیچ row data یا مقدار محرمانه‌ای در آن‌ها نیست.

## ۸. حوادث و انحراف‌ها

سه خطای ابزار پیش از اجرای موفق backup رخ دادند: تداخل نام تابع Docker، parse metadata و quote نشدن identifierهای mixed-case. هر سه فقط در اسکریپت run3 اصلاح شدند و هیچ تغییر DB ایجاد نکردند.

پس از deploy موفق، تنها خطای post-check اسکریپت، مقایسه‌ی نادرست `_prisma_migrations=6` با `7` بود. verification مستقل این مورد را با قاعده‌ی مورد انتظار اصلاح کرد. هیچ deploy دوم یا rollback اجرا نشد.

## ۹. redaction و LF manifest

اسکن logها موفق بود:

`REDACTION_CHECK=PASS`

هش LF همه‌ی فایل‌های run3 در [LF-MANIFEST.txt](../../mlino2/validation/g14a3/run3/LF-MANIFEST.txt) ثبت شده است:

| فایل | SHA-256 LF |
|---|---|
| `g14a3/run3/backup-b3.log` | `1ca4a13146b2891c0e462123ac0cb848f92e6221f18b870a1b78c232d1956c35` |
| `g14a3/run3/backup-b4.log` | `e2a970934d3b2e141ec9457fb0e5466e2cd550c05e662b448a2f6b7de8c55c30` |
| `g14a3/run3/backup-b5.log` | `1ca4a13146b2891c0e462123ac0cb848f92e6221f18b870a1b78c232d1956c35` |
| `g14a3/run3/backup-b6.log` | `1ca4a13146b2891c0e462123ac0cb848f92e6221f18b870a1b78c232d1956c35` |
| `g14a3/run3/backup-summary.log` | `881e1905006eba18e446dd8dc10bbed83a02eaa41bbaf30e16ced3123e53a642` |
| `g14a3/run3/c0.log` | `a1e117861d065b746aee9a75f9d13085dfef10c471dd397dea9cbf862cf090ef` |
| `g14a3/run3/execution-error.log` | `30c1566371b1b87a1c81b72c246880e3e973fcab51b7e28c754472b0b541c816` |
| `g14a3/run3/execution-summary.log` | `27444880214ae93b875b321b83de1e14e0b905f415559436e665727b8458df99` |
| `g14a3/run3/execution.log` | `fbe8a69cb07f105390107b7eb8056ba7a32a25cb334be87519d2ed4416170287` |
| `g14a3/run3/g14a3-local-migration-run3.ps1` | `35e36610283aba87367f8b1353d7b6c69a72ea0f0c15a2a7cb7d971c0b86cdfb` |
| `g14a3/run3/migrate-deploy.log` | `ba6c610a557c072d74fd0c512ce197960f06ae18af040e718825dd44ce0af199` |
| `g14a3/run3/migrate-status.log` | `e6e5240ee151c3c6f60d67525cdcc355e34599d85be3e02b2a58df08947e6d9a` |
| `g14a3/run3/post-containers.log` | `bdd39d8ea29269ace3c17ded5befd955abf897faa3eb42588fcdab417ef54997` |
| `g14a3/run3/post-migrations.log` | `f203e4b2b3684189f408f31de915d6bc922144610ca6d0ab3d58a8e60b0039e6` |
| `g14a3/run3/post-table-counts.log` | `b6842bdd38dc4fb344426d7eb6490784baa887f9f10933586c250634b3083818` |
| `g14a3/run3/post-verify-manual.log` | `090ee3766f1a4b08dcb9f5c1843b82b73e43d1856f53392a841809ceee27e20f` |
| `g14a3/run3/pre-containers.log` | `bdd39d8ea29269ace3c17ded5befd955abf897faa3eb42588fcdab417ef54997` |
| `g14a3/run3/pre-migrations.log` | `bc23c396ab0ad6558b0448784d91a07a887bc54f561f0802f269a42001136918` |
| `g14a3/run3/pre-table-counts.log` | `ee53777c7d61f5acfb4db695bc54e2600b11ec2411b7041bf79d187f5c9862e4` |
| `g14a3/run3/preflight.log` | `a728d7b1debf1fcee209aabad3ebad559cfa2e110e0b9b1205909a6003d9c12b` |
| `g14a3/run3/redaction-check.log` | `4748f5ebcd06969707f257f86880a446f64d5ea3e20cd3edc3ae049d77ec3466` |
| `g14a3/run3/source-check.log` | `a1dc6a4b06474f5f14a1fd4679416f3f84c52870cd5a6a04578e176fc859535c` |

## ۱۰. commit و توقف

این گزارش و شواهد در یک commit محلی ثبت می‌شوند. push انجام نمی‌شود و پس از تحویل، منتظر Guardian review می‌مانم.

من کدکس هستم.
