# فرمان‌های بازتولید G1c

مقادیر واقعی متغیرهای اتصال عمداً در این فایل و logها ثبت نشده‌اند. هر سه متغیر اتصال باید فقط به PostgreSQL disposable اشاره کنند.

## دریافت منابع

- git fetch origin
- git show origin/main:AI_HANDOFF/CLAUDE_REVIEWS/20260912_CLAUDE_REVIEW_G1B_CLOSURE_VALIDATION.md
- git show origin/main:AI_HANDOFF/CLAUDE_REVIEWS/20260912_CLAUDE_REVIEW_CODEX_GOVERNANCE_WORKFLOW_FIXES.md
- git show origin/main:implementation/prisma/migrations/<migration>/migration.sql

## ابزار موقت

- npm install --prefix <TEMP> --save-exact prisma@5.22.0 @prisma/client@5.22.0
- <TEMP>/node_modules/.bin/prisma version
- prisma validate --schema <TEMP>/standalone/core.prisma
- prisma generate --schema <TEMP>/standalone/core.prisma
- prisma validate --schema <TEMP>/standalone/w2.prisma
- prisma generate --schema <TEMP>/standalone/w2.prisma

برای جلوگیری از auto-install، generate از پوشهٔ موقت دارای package.json اجرا شد و PRISMA_GENERATE_SKIP_AUTOINSTALL=1 بود.

## PostgreSQL disposable

- docker volume ls --format {{.Name}}
- docker volume rm 9097eb284ec42faec2ac41fb49e7f6dcbf8a4c44543e10a27432977b311159c1
- docker run --name mlino-g1c-postgres --rm -e POSTGRES_HOST_AUTH_METHOD=trust -p 127.0.0.1:<DISPOSABLE_PORT>:5432 -d postgres:16-alpine
- docker exec mlino-g1c-postgres createdb -U postgres <DISPOSABLE_DATABASE>
- docker exec -i mlino-g1c-postgres psql -X -U postgres -d <DISPOSABLE_DATABASE>

## migration و schema

- scripts/prepare-temp.ps1 -TempRoot <TEMP_FIXTURE>
- prisma migrate deploy --schema <TEMP_FIXTURE>/prisma/schema.prisma
- prisma migrate diff --from-migrations <TEMP_FIXTURE>/prisma/migrations --to-schema-datamodel <TEMP_FIXTURE>/prisma/schema.prisma --shadow-database-url $env:G1C_SHADOW_DATABASE_URL --script
- prisma migrate diff --from-migrations <TEMP_FIXTURE>/prisma/migrations --to-schema-datamodel <TEMP_FIXTURE>/prisma/schema-followup.prisma --shadow-database-url $env:G1C_SHADOW_DATABASE_URL --script
- prisma migrate deploy --schema <TEMP_FIXTURE>/prisma/schema.prisma

فرمان نخست deploy پنج migration شاخه main و migration موقت Core را اعمال کرد. فرمان دوم deploy همان تاریخچه را همراه migration follow-up از صفر بازسازی کرد.

## آزمون‌ها

- psql < sql/02_assertions.sql
- node prisma-write-path.cjs
- node concurrency-run.cjs
- psql < sql/03_inventory.sql
- psql < sql/04_migration_verify.sql

آزمون concurrency با G1C_RUN_TAG=replacement، مانع advisory و ۲۰ اجرای READ COMMITTED و ۲۰ اجرای SERIALIZABLE اجرا شد.

## پاک‌سازی

- docker inspect mlino-g1c-postgres
- docker stop mlino-g1c-postgres
- docker ps -a --filter name=^mlino-g1c-postgres$
- docker volume ls --format {{.Name}}
- حذف پوشهٔ tooling موقت پس از تأیید قرارداشتن آن زیر مسیر Temp سیستم

من کدکس هستم.

