# CONTRACT_CHANGE_REQUEST — یکتایی Profile منتشرشده در هر سازمان (Q8)

**وضعیت:** APPROVED — تصویب مالک Q8-2 ثبت‌شده در `AI_HANDOFF/CLAUDE_REVIEWS/20260917_OWNER_APPROVAL_Q8_2_IMPLEMENTATION.md`.
**Instruction:** `CODEX-20260917-Q8-PROFILE-UNIQUE-INDEX-CCR-001`
**Handoff:** `HANDOFF-20260917-OWNER-APPROVAL-Q8-AND-G14C1`
**مبنای مستندات:** `origin/main` در `6514b846788ea061e7a92383521ced7a0d383e48`.

## P1 — مسئله و اثر قابل‌مشاهده

`BusinessProfile` اکنون فقط قید یکتایی `(id, organizationId)` دارد؛ ایندکس `(organizationId, publicationStatus, updatedAt)` یکتا نیست. پس چند Profile یک سازمان می‌توانند هم‌زمان `PUBLISHED` باشند (`origin/main:implementation/prisma/schema.prisma:465-493`). در مقابل، قرارداد `public-business.v1` برای هر سازمان یک رکورد کسب‌وکار با یک Profile می‌سازد و Q8 می‌گوید «حداکثر یک Profile منتشرشده» (`origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md:126-180`; `origin/main:AI_HANDOFF/CLAUDE_REVIEWS/20260917_OWNER_APPROVAL_G14B2_EXPORT_IMPLEMENTATION.md:17-29`).

تولیدکنندهٔ فعلی وقتی بیش از یک رخداد Profile منتشرشدهٔ منتخب برای سازمان بیابد، **تمام آن سازمان** را از export حذف و `MULTIPLE_PUBLISHED_PROFILES` همراه شناسهٔ سازمان ثبت می‌کند (`origin/main:implementation/public-export/builder.ts:168-178`). هزینهٔ کاربرمحور این رفتار، ناپدید شدن همان کسب‌وکار، قابلیت‌ها و Offerهایش از V2 تا رفع ابهام است. این کنترل fail-closed باید به‌عنوان دفاع ثانویه بماند؛ قید دیتابیس جلوی ایجاد وضعیت مبهم جدید را می‌گیرد.

## P2 — تغییر فیزیکی پیشنهادی و مرز Prisma

**نام migration پیشنهادی:** `20260917010000_add_business_profile_published_unique`، در پوشهٔ migration تازه. هیچ migration موجودی ویرایش نمی‌شود. نام ایندکس: `business_profile_one_published_per_organization_unique`.

```sql
BEGIN;

-- The lock closes the gap between the preflight and index creation.
-- It waits for in-flight projection updates and blocks new ones until COMMIT.
LOCK TABLE business_profiles IN ACCESS EXCLUSIVE MODE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM business_profiles
    WHERE publication_status = 'PUBLISHED'
    GROUP BY organization_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'published business profile uniqueness preflight failed';
  END IF;
END;
$$;

CREATE UNIQUE INDEX business_profile_one_published_per_organization_unique
  ON business_profiles (organization_id)
  WHERE publication_status = 'PUBLISHED';

COMMIT;
```

**Invariant دقیق:** برای هر `organization_id`، حداکثر یک ردیف `business_profiles` با `publication_status='PUBLISHED'` وجود دارد. ردیف‌های `UNPUBLISHED` و `WITHDRAWN` داخل کلید یکتا نیستند؛ وضعیت lifecycle عمداً در predicate نیست، چون قاعدهٔ Q8 دربارهٔ همهٔ Profileهای منتشرشده است. PostgreSQL این invariant را حتی در دو تراکنش هم‌زمان enforce می‌کند. ایندکس معمولیِ موجود این تضمین را نمی‌دهد (`origin/main:implementation/prisma/schema.prisma:276-280,465-493`).

قفل `ACCESS EXCLUSIVE` و `BEGIN/COMMIT` از الگوی migration قبلی `published_content` پیروی می‌کنند: preflight و DDL یک واحد اتمیک هستند و اگر preflight شکست بخورد، ایندکس نیمه‌ساخته باقی نمی‌ماند (`origin/main:implementation/prisma/migrations/20260914010000_add_publication_published_content/migration.sql:1-35`). هزینهٔ انتخاب، توقف موقت خواندن/نوشتن `business_profiles` هنگام ساخت ایندکس است؛ برای جدول بزرگ باید پیش از اجرا پنجرهٔ استقرار جدا بررسی شود. `CREATE INDEX CONCURRENTLY` در این تراکنش قابل استفاده نیست و بدون طرح تازه، فاصلهٔ preflight تا ساخت ایندکس را باز می‌گذارد.

**محدودیت Prisma 5.22:** نسخهٔ ثابت پروژه 5.22.0 است و `schema.prisma` در آن نمی‌تواند predicate یک partial unique index را در `@@unique` بیان کند (`origin/main:implementation/package.json:24-34`; `origin/main:implementation/prisma/migrations/20260910020000_add_external_workspace_link/migration.sql:45-53`). بنابراین در این CCR هیچ تغییری در `schema.prisma` پیشنهاد نمی‌شود؛ جایگزین‌کردن قید با چک صرفاً سرویس مجاز نیست. ایندکس در migration SQL دستی و تاریخچهٔ migration ثبت می‌شود، مانند ایندکس‌های جزئی Core و ExternalWorkspaceLink (`origin/main:implementation/prisma/migrations/20260913010000_add_core_foundation/migration.sql:492-505`; `origin/main:implementation/prisma/migrations/20260910020000_add_external_workspace_link/migration.sql:68-70`). برای جلوگیری از drift، در مرحلهٔ پیاده‌سازی باید migration کامل از ابتدا روی DB یک‌بارمصرف اعمال شود، `pg_indexes`/`pg_index.indisvalid` ایندکس را تأیید کنند، و `prisma migrate diff`/status نشان دهند ابزار قصد حذف آن را ندارد. اگر Prisma آن را حذف‌شدنی گزارش کند، اجرا متوقف و راهبرد سازگاری جداگانه بررسی می‌شود. `db push` برای این قید منبع حقیقت نیست.

## P3 — مسیر انتشار و نگاشت خطا

انتشار Profile اکنون بعد از قفل سازمان، مجوز `publication.manage` و قفل target، یک رویداد `Publication` درج می‌کند (`origin/main:implementation/core/publication-service.ts:33-54,89-94`). Trigger درج، projection `business_profiles.publication_status` را به `PUBLISHED` تغییر می‌دهد (`origin/main:implementation/prisma/migrations/20260913010000_add_core_foundation/migration.sql:931-958,1008-1011`). با ایندکس پیشنهادی، تلاش برای انتشار Profile دوم همان سازمان در این UPDATE با SQLSTATE **23505** و نام ایندکس بالا شکست می‌خورد؛ تراکنش انتشار rollback می‌شود و رویداد Publication آویزان نمی‌ماند.

`core/error-adapter.ts` اکنون خطاهای `P2002`/`23505` را به `CONFLICT` عمومی نگاشت می‌کند، ولی نام این ایندکس را نمی‌شناسد (`origin/main:implementation/core/error-adapter.ts:12-23,48-58`). در مرحلهٔ پیاده‌سازی باید **شکل واقعی خطای Prisma** در آزمون PostgreSQL ثبت شود؛ خطای trigger ممکن است به‌صورت wrapper متفاوتی برسد. فقط وقتی نام قید دقیقاً `business_profile_one_published_per_organization_unique` است، نگاشت پیشنهادی `CONFLICT: another business profile is already published for this organization` اعمال شود. نباید تمام خطاهای یکتایی به این پیام نگاشت شوند.

برداشتن انتشار Profile اول، وضعیت آن را به `WITHDRAWN` می‌برد و جایگاه ایندکس را آزاد می‌کند؛ سپس Profile دیگری می‌تواند منتشر شود (`origin/main:implementation/core/publication-service.ts:49-54`; `origin/main:implementation/prisma/migrations/20260913010000_add_core_foundation/migration.sql:959-966`). عملیات `REPLACED` مخصوص OfferVersion است و مسیر Profile از آن استفاده نمی‌کند (`origin/main:implementation/core/publication-service.ts:60-82`). آزمون‌های فعلیِ انتشار موفقِ یک Profile باید سبز بمانند؛ برای خطای دومین Profile و انتشار پس از withdraw آزمون تازه لازم است.

## P4 — پیش‌بررسی داده و اجرای ایمن در آینده

این مرحله **هیچ query، اتصال دیتابیس، backup یا migration اجرا نمی‌کند**. پیش از مجوز اجرای migration روی هر محیط داده‌دار، نتیجهٔ query فقط‌خواندنی زیر باید **صفر ردیف** باشد؛ خروجی غیرصفر یعنی توقف و بررسی داده با تصمیم جداگانه، نه انتخاب خودکار Profile «برنده»:

```sql
SELECT organization_id, COUNT(*) AS published_profile_count
FROM business_profiles
WHERE publication_status = 'PUBLISHED'
GROUP BY organization_id
HAVING COUNT(*) > 1
ORDER BY organization_id;
```

در runbook بعدی، وضعیت و تعداد ردیف جدول‌ها و migrationها ثبت شود؛ backup تأییدشده به روش `pg_dump -Fc -f` داخل container، `docker cp` و تطبیق SHA-256 دو طرف پیش از deploy گرفته شود؛ `migrate status` دقیقاً یک migration هدف را pending نشان دهد؛ deploy فقط یک‌بار انجام شود. این همان الگوی ایمنی G7b و G14a-3 است (`origin/main:AI_HANDOFF/CODEX_REPORTS/20260913_CODEX_G7B_APPLY_CORE_MIGRATION_REPORT.md:51-58`; `origin/main:AI_HANDOFF/CODEX_REPORTS/20260915_CODEX_G14A3_LOCAL_MIGRATION_RUN3_REPORT.md:62-98`). پس از deploy، تعریف ایندکس، معتبر بودن آن، نبود تکرار، شمار ردیف‌ها و سلامت runtime خواندنی بررسی شوند. شکست preflight ممکن است ردیف ناموفق در `_prisma_migrations` بگذارد؛ پیش از هر deploy بعدی باید مطابق runbook `migrate resolve --rolled-back` یا راهبرد مصوب اجرا شود (`origin/main:implementation/remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_PUBLICATION_PUBLISHED_CONTENT.md:227-245`). بازیابی backup فقط با مجوز جداگانه است.

## P5 — بازگشت

Prisma migration رو‌به‌عقب خودکار ندارد. بازگشتِ قید، **migration رو‌به‌جلوی تازه** با `DROP INDEX IF EXISTS business_profile_one_published_per_organization_unique;` است؛ migration اولیه از تاریخچهٔ `_prisma_migrations` حذف یا بازنویسی نمی‌شود. ردیف migration بازگشت افزوده خواهد شد. با حذف ایندکس، دیتابیس دیگر یکتایی Q8 را تضمین نمی‌کند، ولی تولیدکننده همچنان سازمان مبهم را fail-closed پنهان می‌کند. بازگشت روی محیط داده‌دار، برنامهٔ backup/restore و مجوز مستقل می‌خواهد (`origin/main:implementation/remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_PUBLICATION_PUBLISHED_CONTENT.md:227-245`; `origin/main:implementation/public-export/builder.ts:168-178`).

## P6 — آزمون‌های لازم هنگام پیاده‌سازی

همهٔ آزمون‌های DB فقط روی PostgreSQL یک‌بارمصرف انجام شوند؛ این سند آزمونی اجرا نمی‌کند.

1. پس از migration، `pg_indexes` predicate و `pg_index.indisvalid` را تأیید کند؛ migration chain از صفر و Prisma status/diff بدون حذف ایندکس باشد.
2. دو Profile یک سازمان در حالت اولیهٔ مجاز ساخته شوند؛ انتشار اول موفق و دوم با **23505** و نام همین ایندکس رد شود، حتی اگر درخواست‌ها هم‌زمان باشند. شکست دوم هیچ Publication نیمه‌ثبت‌شده‌ای باقی نگذارد.
3. withdraw اول جایگاه را آزاد کند و انتشار Profile دوم موفق شود. `REPLACED` برای Profile ظاهر نشود.
4. شکل واقعی خطای Prisma از شکست شمارهٔ ۲ ثبت و error adapter فقط همان قید را به `CONFLICT` با پیام روشن نگاشت کند؛ سایر خطاهای یکتایی رفتار قبلی را حفظ کنند.
5. تولیدکننده از وضعیت معتبرِ یک Profile خروجی بدهد. شاخهٔ دفاعی `MULTIPLE_PUBLISHED_PROFILES` در unit test با دادهٔ ساختگی نامعتبر همچنان بماند (`origin/main:implementation/test/public-export/public-export.spec.ts:127-135`)، اما پایگاه مهاجرت‌داده‌شده دیگر نتواند آن وضعیت را ایجاد کند.
6. suite کامل V1 و Core روی دیتابیس یک‌بارمصرف پاس شود؛ اجرای آزمون روی دیتابیس محلی زنده ممنوع است.

## P7 — گزینه‌ها و تصمیم‌های مالک

**تصمیم‌های مالک Q8-2:** OQ-Q8-1=A، OQ-Q8-2=A، OQ-Q8-3=A. این تصمیم‌ها فقط همین CCR و اجرای Q8-2 را پوشش می‌دهند؛ Q8-3 همچنان مرحله‌ای جداست.

| پرسش | گزینه‌ها و پیامد | یک توصیه |
|---|---|---|
| OQ-Q8-1: اگر preflight در محیطی چند Profile منتشرشده بیابد، چه شود؟ | **A:** توقف migration و بازبینی/withdraw دستی با شواهد و مجوز جدا؛ دادهٔ تاریخی حفظ می‌شود. **B:** یک workflow جداگانه با actor مجاز و رویدادهای Publication، Profile منتخب را طبق قاعدهٔ ازپیش‌مصوب تعیین و بقیه را withdraw کند؛ سریع‌تر اما تصمیم هویت کسب‌وکار را خودکار می‌کند. UPDATE مستقیم projection مجاز نیست. | **A**؛ هیچ اصلاح دادهٔ خودکار در این CCR. |
| OQ-Q8-2: ساخت ایندکس در استقرار نخست چگونه باشد؟ | **A:** تراکنش + `ACCESS EXCLUSIVE` مانند P2؛ اتمیک و ساده، با توقف کوتاه دسترسی جدول. **B:** ایندکس concurrent با runbook چندمرحله‌ای و کنترل race/ایندکس نامعتبر؛ توقف کمتر ولی پیچیدگی و ریسک بیشتر. | **A** برای اندازهٔ فعلی MVP، مشروط به بررسی زمان قفل در محیط هدف. |
| OQ-Q8-3: توالی انتشار کد error adapter و migration چیست؟ | **A:** کد نگاشتِ آزموده‌شده و migration در یک بستهٔ استقرار با دروازهٔ backup/preflight؛ فاصلهٔ خطای عمومی کوتاه می‌شود. **B:** migration پیش از کد؛ مدتی خطای عمومی `CONFLICT` دیده می‌شود. | **A**، پس از آزمون شکل واقعی خطای Prisma؛ هیچ کدی در این مرحله نوشته نمی‌شود. |

**مرز این CCR:** تصویب این سند به‌تنهایی مجوز `schema.prisma`، migration، تغییر سرویس، اتصال به دیتابیس یا استقرار نیست. آن‌ها دستور و دروازهٔ جداگانه می‌خواهند.
