# گزارش تحویل اجرای G1 PostgreSQL

تاریخ: ۲۰۲۶-۰۹-۱۲
INSTRUCTION_ID: CODEX-20260912-POSTGRES-VALIDATION-EXECUTION-001
TARGET_HANDOFF_ID: HANDOFF-20260911-V2-INTENT-FLOW-FOUNDATION
سند نتیجه: mlino2/PRISMA_POSTGRESQL_CONSTRAINT_VALIDATION.md
وضعیت: G1_PARTIAL — NOT_CLOSED
commit سند: ce28f3290b8c7896972f72fa7101c4200e007060

## نتیجه

G1 در PostgreSQL 16.14 ایزوله اجرا شد. FK مرکب، ON DELETE/UPDATE RESTRICT، uniqueness فعال Claim، publication consistency، rollback، immutability، append-only و رقابت هم‌زمان publish با موفقیت آزموده شدند.

## محدودیت‌های ثبت‌شده

- C7 تا C11 به‌صورت کامل با مدل نهایی Core اجرا نشدند، چون schema.prisma تولیدی هنوز وجود ندارد.
- Prisma Migrate واقعی اجرا نشد؛ node_modules مربوط به V1 نصب نیست و lockfile نسخهٔ 5.22.0 دارد، در حالی که مبنای مستنداتی 5.20.0 است.
- ExternalWorkspaceLink در HEAD شاخه وجود ندارد و آزمون کامل آن به G2 وابسته است.
- fixture موقت خارج از مخزن بود و پس از آزمون حذف شد.

## کنترل‌های ایمنی

- schema.prisma، migration، backend و ADRها تغییر نکردند.
- merge، rebase، cherry-pick و انتقال artefact انجام نشد.
- هیچ P1 تا P12 اعمال نشد.
- G1 بسته یا validated اعلام نشد.

گزارش اصلی نتیجه و کدهای خطا را ثبت می‌کند. گام بعدی، تعیین تکلیف G2 و سپس اجرای مجدد بخش‌های ناقص با schema واقعی و Prisma Migrate واقعی است.

من کدکس هستم.

