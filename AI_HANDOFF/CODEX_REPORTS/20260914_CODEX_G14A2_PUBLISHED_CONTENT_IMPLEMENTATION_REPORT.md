# گزارش اجرای Codex — G14a-2: پیاده‌سازی محتوای منتشرشده

**وضعیت:** DELIVERED_AWAITING_GUARDIAN_REVIEW
**تاریخ:** ۲۰۲۶-۰۹-۱۴
**INSTRUCTION_ID:** `CODEX-20260914-G14A2-PUBLISHED-CONTENT-IMPLEMENTATION-001`
**TARGET_HANDOFF_ID:** `HANDOFF-20260914-OWNER-APPROVAL-G14A2`
**WORKSTREAM_HANDOFF_ID:** `HANDOFF-20260914-CORE-G14A`
**شاخه:** `codex/core-g14a-published-content`
**مبنای اجرا:** `ee25ead`
**Commit پیاده‌سازی:** `39d91841587911d6caf28810251ea8944d7deac5`

## ۱. Task اجراشده

CCR مصوب S19-A1 اجرا شد: ستون JSONB محتوای منتشرشده به Publication افزوده شد، migration محافظت‌شده ساخته شد و `PublicationService` هنگام انتشار snapshot نسخه‌دار و allowlisted می‌سازد. برداشت انتشار، از جمله ردیف برداشت در REPLACED، مقدار SQL NULL می‌نویسد. مسیر ALREADY_PUBLISHED هیچ ردیف تازه‌ای درج نمی‌کند و D6 تغییر نکرده است.

## ۲. اسناد مبنا

- `AI_HANDOFF/CLAUDE_REVIEWS/20260914_OWNER_APPROVAL_G14A2_PUBLISHED_CONTENT.md` در commit قفل‌شدهٔ `0110a164968a00076d52dfa74249a7f8ca03704d` با SHA-256 برابر `e739628267084d5262ba2065f461fdf3745fb20a70e436648e47b13e6472daaa`.
- `implementation/remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_PUBLICATION_PUBLISHED_CONTENT.md` در مبنای `ee25ead` با SHA-256 مصوب `95f4a3a1...`.
- تصمیم‌های مالک OQ-1 تا OQ-5، شامل OQ-4=A-prime، مطابق مرجع تصویب.
- `implementation/prisma/schema.prisma` و `implementation/core/publication-service.ts` موجود.

پیش‌شرط: `git fetch origin` به علت نبود اتصال به `github.com:443` شکست خورد. GW2-P اجرا شد: commit قفل‌شده موجود بود، ancestor بودن آن نسبت به `origin/main` تأیید شد و SHA-256 بایت‌های `git show` دقیقاً با `e739628267084d5262ba2065f461fdf3745fb20a70e436648e47b13e6472daaa` برابر بود. هیچ credential، token، git config یا credential helper خوانده یا تغییر داده نشد.

## ۳. فایل‌های تغییرکرده

| مسیر | تغییر |
|---|---|
| `implementation/remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_PUBLICATION_PUBLISHED_CONTENT.md` | وضعیت APPROVED، ثبت OQ-1 تا OQ-5 و اصلاح Z2 |
| `implementation/prisma/migrations/20260914010000_add_publication_published_content/migration.sql` | migration تازه مطابق C2 |
| `implementation/prisma/schema.prisma` | فقط افزودن `publishedContent` به مدل Publication |
| `implementation/core/publication-service.ts` | ساخت snapshotهای allowlisted و درج محتوای منتشرشده |
| `implementation/test/core/g14a2-published-content.spec.ts` | ۱۴ آزمون متمرکز C7 و OQ-4 |
| `AI_HANDOFF/CODEX_REPORTS/20260914_CODEX_G14A2_PUBLISHED_CONTENT_IMPLEMENTATION_REPORT.md` | این گزارش |
| `mlino2/HANDOFF/HANDOFF_STATE.md` | ورودی append-only تحویل |

## ۴. فایل‌های تغییرنکرده

- همهٔ migrationهای موجود، از جمله `20260913010000_add_core_foundation`.
- همهٔ مدل‌های Prisma جز افزودن یک فیلد در Publication.
- سایر serviceها، HTTP، Dockerfile، tsconfig، V2 و export producer مربوط به G14b.
- `_PUSH_STAGING`، دیتابیس محلی V1، پورت 5435، credentials و git config.

## ۵. آزمون‌های اجراشده

| مورد | نام آزمون | نتیجه |
|---|---|---|
| C7-1 | `g14a2-c7-01 PUBLISHED accepts an object and rejects SQL NULL or a non-object` | PASS |
| C7-2 | `g14a2-c7-02 WITHDRAWN accepts SQL NULL and rejects an object` | PASS |
| C7-3 | `g14a2-c7-03 snapshots for all targets equal the publish-time allowlists` | PASS |
| C7-4 | `g14a2-c7-04 post-publish edits do not change stored profile or capability snapshots` | PASS |
| C7-5 | `g14a2-c7-05 REPLACED writes a NULL withdrawal before the new version snapshot` | PASS |
| C7-6 | `g14a2-c7-06 ALREADY_PUBLISHED inserts no publication or snapshot` | PASS |
| C7-7 | `g14a2-c7-07 publication immutability rejects published_content UPDATE` | PASS |
| C7-8 | `g14a2-c7-08 allowlists exclude internal and whole-row fields` | PASS |
| C7-9 | `g14a2-c7-09 empty-database migration is recorded and the CHECK is validated` | PASS |
| C7-10 | `g14a2-c7-10 preflight rejects existing publications before any DDL continuation` | PASS |
| C7-11 | `g14a2-c7-11 serialization is deterministic for decimals timestamps JSON and link ids` | PASS |
| C7-12 | `g14a2-c7-12 JSON null is rejected for both PUBLISHED and WITHDRAWN` | PASS |
| C7-13 | `g14a2-c7-13 snapshot envelope has no redundant target id or revision keys` | PASS |
| OQ-4 | `g14a2-oq4-a-prime sanitizes contact and links but preserves business_hours and terms as-is` | PASS |

فرمان‌های اعتبارسنجی در worktree مجاز اجرا شدند: تولید Prisma Client با 5.22.0، `prisma migrate deploy`، build، spec متمرکز و کل مجموعهٔ Jest. همهٔ اجراهای پایگاه داده فقط با `DATABASE_URL` روی `localhost:5499` و container یک‌بارمصرف tmpfs انجام شدند.

## ۶. نتایج آزمون و شواهد

- migration هر هفت migration را روی PostgreSQL 16 یک‌بارمصرف اعمال کرد.
- N1: Prisma 5.22.0 فایل migration دارای `BEGIN`، `LOCK TABLE` و `COMMIT` صریح را پذیرفت؛ حذف آن‌ها لازم نشد.
- آزمون متمرکز نهایی: ۱ suite و ۱۴ آزمون موفق، صفر شکست.
- build نهایی: موفق.
- مجموعهٔ کامل V1 + Core: ۲۸ suite و ۳۶۰ آزمون موفق، صفر شکست.
- اجرای نخست spec متمرکز ۳ شکست fixture داشت: fixtureهای قیمت با قاعدهٔ موجود `onRequest` سازگار نبودند. فقط fixture اصلاح شد؛ کد محصول برای این شکست‌ها تغییر نکرد.
- آزمون migration روی دیتابیس دومِ دارای یک Publication معتبر، migration تازه را رد کرد. تلاش نخست seed به علت نبود `updated_at` در fixture خام شکست خورد و migration اجرا نشد؛ seed اصلاح و سناریو از ابتدا تکرار شد.
- در اجرای رد migration، Prisma پیام عمومی transaction-aborted را نمایش داد؛ با این حال ردیف ناموفق در `_prisma_migrations` ثبت شد و شمار ستون `published_content` صفر ماند، پس preflight مانع ادامهٔ DDL شد و تغییر ناقص ایجاد نشد.
- container `mlino-g14a2-testdb` با `docker rm -f` حذف شد؛ جست‌وجوی پس از حذف خالی بود و فهرست volumeهای قبل و بعد یکسان ماند.

SHA-256 بایت‌های LF ذخیره‌شده در Git:

```text
7b424e9cedc6cc2162765253148d4b047e834e63b4d82f8f4e3d20f9dac910b6  implementation/prisma/migrations/20260914010000_add_publication_published_content/migration.sql
9a4dd47cb3b0d8274fe858ef55998969574aea18451bd88926830808e7fce53d  implementation/prisma/schema.prisma
03250e13eb7f27c083c5b15ba4d2834d3661e0feda31944e45f18ddef623fe24  implementation/core/publication-service.ts
ff1db15d22746107e26f7605240a4acddd559d535fc999ddc65e7a0329389876  implementation/test/core/g14a2-published-content.spec.ts
```

## ۷. Commit

- `39d91841587911d6caf28810251ea8944d7deac5` — `feat(core): persist publication content snapshots`
- گزارش و Handoff در یک Commit محلی تحویل بعدی ثبت می‌شوند.
- مطابق دستور هیچ Push انجام نمی‌شود.

## ۸. ریسک‌های باقی‌مانده

- پیام سطح Prisma در شکست preflight، متن سفارشی P0001 را مستقیماً نشان نداد؛ رفتار fail-closed و نبود DDL ناقص ثابت شده است، اما Guardian باید قابل‌قبول بودن visibility این پیام را بازبینی کند.
- `business_hours` و `terms` طبق OQ-4=A-prime بدون تغییر snapshot می‌شوند؛ validation/removal آن‌ها عمداً به G14b واگذار شده است.
- هیچ migrationی روی دیتابیس محلی V1 اعمال نشده و runtime هنوز این تغییر را مصرف نمی‌کند.

## ۹. سؤال‌های باز

- تصمیم تازه‌ای توسط Codex گرفته نشد.
- پذیرش evidence مربوط به پیام preflight و آزادسازی مرحلهٔ بعد فقط با Guardian است.

## ۱۰. گام بعدی پیشنهادی

Architecture Guardian این Commit، migration، شواهد و گزارش را بازبینی کند. تا اعلام تصمیم Guardian، هیچ Push، merge، اجرای migration محلی، G14a-3، G14b یا G14c آغاز نشود.

من کدکس هستم.
