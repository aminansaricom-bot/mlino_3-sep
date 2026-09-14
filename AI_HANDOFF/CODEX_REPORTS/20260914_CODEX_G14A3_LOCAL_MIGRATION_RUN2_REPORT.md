# گزارش اجرای دور دوم G14a3 — migration محلی

## ۱. وضعیت نهایی

**BLOCKED_PREFLIGHT / HARD_STOP_BEFORE_MIGRATION**

C0 موفق بود و مقدار اتصال فقط در حافظه‌ی فرایند برای ابزار Prisma قرار گرفت. اما preflight خواندنی gate را رد کرد: خروجی ثبت‌شده با شرط‌های مالک سازگار نبود. طبق دستور، قبل از backup و قبل از migration متوقف شدم.

هیچ backup ساخته نشد، `prisma migrate deploy` اجرا نشد، `prisma migrate resolve` اجرا نشد و هیچ فایل محصولی تغییر نکرد.

## ۲. پیش‌شرط و منبع

- دستور: `CODEX-20260914-G14A3-LOCAL-MIGRATION-002`
- branch: `codex/core-g14a-published-content`
- مبنای محلی: `0af93e5b4dcecaab80fbcb5931f4920cbe77bec2`
- migration هدف: `20260914010000_add_publication_published_content`
- Prisma CLI: `5.22.0`
- worktree: `C:\Users\galexy\mlino code\core-g14a-published-content`

`git fetch origin` با خطای شبکه و exit code 128 شکست خورد. GW2-P برای review مالک موفق بود: commit موجود بود، جد آن در `origin/main` بود، review خوانده شد، اندازه‌ی blob برابر `6965` بایت و SHA-256 برابر مقدار pin شده بود:

`0c4eaacbfb958e15bcca4540959c10eeea35b2da09df75486c44529b0a181f5d`

خروجی‌های GW2-P:

| مرجع | fetch | cat-file | ancestor | show | bytes | SHA-256 |
|---|---:|---:|---:|---:|---:|---|
| `20260914_OWNER_APPROVAL_G14A3_DB_CONNECTION.md` | 128 | 0 | 0 | 0 | 6965 | `0c4eaacbfb958e15bcca4540959c10eeea35b2da09df75486c44529b0a181f5d` |
| `20260914_CLAUDE_REVIEW_G14A_MERGE_G14A3_RELEASE.md` | 128 | 0 | 0 | 0 | 7678 | `fb99b8b238bd86e207dee1c12822a6cc0a0776b0f2e5dd8a23f5208369414f44` |

جزئیات مرجع دوم در [precondition.log دور اول](../../mlino2/validation/g14a3/precondition.log) ثبت شده است.

## ۳. نتیجه‌ی C0

فقط این نتیجه ثبت شد:

`C0_LINES=1 HOST_LOCAL=true PORT=5435 DB=mlino_v1`

مقدار اتصال، نام کاربر، رمز عبور و URL کامل در هیچ فایل، گزارش، commit یا خروجی ثبت نشد. فایل استثناشده فقط برای خواندن همان کلید استفاده شد؛ هیچ فرمانی در آن مسیر اجرا نشد و هیچ فایل دیگری از آن پوشه خوانده نشد. مقدار از محیط فرایند پس از پایان اجرا حذف شد.

## ۴. source check

- درخت Prisma مربوط به `97b37f8...` و `a68c599...` یکسان بود.
- وضعیت `implementation/` تمیز بود.
- تغییر uncommitted در `mlino2/validation/g14a2c/run-cleanup.log` دست‌نخورده ماند و وارد این تحویل نشد.
- Prisma CLI نسخه‌ی `5.22.0` بود.

## ۵. نتایج مراحل

| مرحله | نتیجه | شاهد |
|---|---|---|
| ۱. Source check | PASS | `run2/source-check.log` |
| ۲. Pre-state | خوانده شد | `pre-containers.log`, `pre-migrations.log`, `pre-table-counts.log`, `preflight.log` |
| ۳. Preflight | **FAIL / HARD STOP** | خروجی preflight با gate مالک تطبیق نداشت |
| ۴. Backup B1–B6 | NOT RUN | به علت hard stop مرحله‌ی ۳ |
| ۵. `prisma migrate status` | NOT RUN | به علت hard stop مرحله‌ی ۳ |
| ۶. `prisma migrate deploy` | NOT RUN | migration هرگز شروع نشد |
| ۷. Verification a–g | NOT RUN | migration اجرا نشد |

## ۶. شواهد pre-state

شش migration موجود همگی `FINISHED` و `NOT_ROLLED_BACK` ثبت شدند:

- `20260814065924_init`
- `20260815033018_add_situation_key`
- `20260815113714_rename_actor_core_entity_id_to_actor_id`
- `20260906001500_add_ownership_type`
- `20260910020000_add_external_workspace_link`
- `20260913010000_add_core_foundation`

metadata containerها:

- `mlino-v1-local-db`: `postgres:16-alpine`, restart count `0`, سلامت `healthy`
- `mlino-v1-read-api`: `implementation-v1-read-api`, restart count `0`, سلامت `none`

خروجی ثبت‌شده‌ی preflight:

```text
publications=48
published_content_columns=48
non_internal_triggers=49
check_constraints=50
```

این خروجی با gate مورد انتظار (`publications=0`، نبود ستون، `13` trigger) سازگار نبود؛ بنابراین هیچ تلاش دیگری برای تفسیر، اصلاح یا ادامه‌ی عملیات انجام نشد.

## ۷. backup و migration

- نام فایل backup: ندارد.
- اندازه و SHA-256 دو طرف: ندارد.
- B1 تا B6: اجرا نشد.
- migration هدف: اجرا نشد.
- وضعیت پس از توقف: `MIGRATION_ATTEMPTED=False`.

## ۸. حوادث اجرایی

سه توقف فنی پیش از migration رخ داد و هیچ‌کدام به تغییر DB منجر نشدند:

1. اجرای نخست به علت نام‌گذاری تابع کمکی و بازگشت بازگشتی متوقف شد.
2. اجرای بعدی به علت parse کردن metadata container متوقف شد.
3. پس از اصلاح این موارد، query شمارش با identifier mixed-case بدون quote متوقف شد؛ پس از اصلاح quote، اجرای نهایی به preflight رسید و به دلیل عدم تطابق gate متوقف شد.

تمام این توقف‌ها پیش از backup و `migrate deploy` بودند.

## ۹. redaction و manifest

اسکن logهای دور دوم موفق بود:

`REDACTION_CHECK=PASS`

هیچ log شامل URL یا عبارت ممنوع نبود. هش LF همه‌ی فایل‌های شواهد در [LF-MANIFEST.txt](../../mlino2/validation/g14a3/run2/LF-MANIFEST.txt) ثبت شده است:

| فایل | SHA-256 LF |
|---|---|
| `g14a3/run2/c0.log` | `a1e117861d065b746aee9a75f9d13085dfef10c471dd397dea9cbf862cf090ef` |
| `g14a3/run2/execution-error.log` | `e7c027bb617d497732b419430f8aa319846427d28a125deba2057f891908dcdc` |
| `g14a3/run2/execution-summary.log` | `52b26142963a1424172a611cbc8f0a7724521bc1c08807b9efae1985007566da` |
| `g14a3/run2/execution.log` | `fbe8a69cb07f105390107b7eb8056ba7a32a25cb334be87519d2ed4416170287` |
| `g14a3/run2/g14a3-local-migration-run2.ps1` | `863fae328acceb7d798faed1507b78b2f7a98483d19fcf48e217ac069b184915` |
| `g14a3/run2/pre-containers.log` | `bdd39d8ea29269ace3c17ded5befd955abf897faa3eb42588fcdab417ef54997` |
| `g14a3/run2/pre-migrations.log` | `bc23c396ab0ad6558b0448784d91a07a887bc54f561f0802f269a42001136918` |
| `g14a3/run2/pre-table-counts.log` | `ee53777c7d61f5acfb4db695bc54e2600b11ec2411b7041bf79d187f5c9862e4` |
| `g14a3/run2/preflight.log` | `6d36b4a0f27b06b77f7869c784e64b0c31d033047d588f5773ed1861850ce78b` |
| `g14a3/run2/redaction-check.log` | `3352bf86f9b38d35e790cdf60a973eb23a82bf742112ecb3fe0108b7932fa0f6` |
| `g14a3/run2/source-check.log` | `9af1d76cb4521e506dbab2c4e142892363e46b8fdce7d32227a5679ae9ed7933` |

## ۱۰. توقف نهایی و گام بعد

وضعیت نهایی: **BLOCKED_PREFLIGHT**.

هیچ retry خودکاری انجام نمی‌شود. ابتدا Guardian باید علت تفاوت preflight را بررسی و دستور بعدی را صادر کند. این commit فقط شواهد و گزارش را ثبت می‌کند و push انجام نمی‌شود.

من کدکس هستم.
