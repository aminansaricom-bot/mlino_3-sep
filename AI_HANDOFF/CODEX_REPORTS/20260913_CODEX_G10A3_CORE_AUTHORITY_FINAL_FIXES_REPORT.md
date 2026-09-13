# گزارش اجرای G10A3 — اصلاحات نهایی authority Core

## ۱. Task executed

اصلاحات اجباری B1 تا B7 از بازبینی G10A2 اجرا شد. دامنه فقط `implementation/core/**`، `implementation/test/core/**`، شواهد G10A3، این گزارش و ورودی append-only در Handoff بود.

## ۲. Source documents and precondition

مرجع pinned:

- `AI_HANDOFF/CLAUDE_REVIEWS/20260913_CLAUDE_REVIEW_G10A2_CORE_AUTHORITY_FIXES.md`
- commit: `54adf86214424bf0229c437ca734f7ff45a3a872`
- SHA-256 اعلام‌شده: `98aa43aac85b8671bddbc2c32cda257c072ed7e4faf8c157b1019fc20a6f4f27`

`git fetch origin` با exit code صفر موفق شد. متن مرجع مستقیماً از `origin/main` خوانده و در `mlino2/validation/g10a3/review-source.txt` ثبت شد. در این مرحله نیازی به GW2-P نبود. هیچ credential، token، git config یا credential helper تغییر نکرد.

## ۳. Files changed

فایل‌های کد و آزمون تغییرکرده:

- `implementation/core/bootstrap-service.ts`
- `implementation/core/membership-service.ts`
- `implementation/core/permission-grant-service.ts`
- `implementation/core/repositories.ts`
- `implementation/test/core/core-authority.spec.ts`
- `implementation/test/core/db-guard.ts`
- `implementation/test/core/db-guard.spec.ts`

شواهد در `mlino2/validation/g10a3/` ذخیره شد. manifest نهایی شامل مسیر و SHA-256 بایت‌های LF خروجی `git show` برای تمام فایل‌های کد و آزمون تغییرکرده است.

## ۴. Files not changed

این موارد دست‌نخورده ماندند:

- `implementation/prisma/schema.prisma`
- تمام migrationها
- `implementation/shared-contracts/types.ts`
- `implementation/tsconfig.json`
- API و سایر فایل‌های V1 خارج از Core
- V2، `main` و `_PUSH_STAGING`
- ADRها و گزارش G10A2

## ۵. B1–B7 implementation evidence

- **B1 — grant race:** آزمون `serializes concurrent revocation of two different admin grants` دقیقاً دو مدیر فعال دارد؛ بنیان‌گذار و یک عضو، با دو grant متفاوت. دو revoke هم‌زمان اجرا شد؛ دقیقاً یکی موفق شد و دیگری با پیام `revoking the last grant administrator is forbidden` رد شد. شمارش نهایی grant مدیر فعال روی membership فعال برابر یک بود.
- **B1 — membership race:** آزمون `serializes concurrent revocation of the two admin memberships` همان رقابت را از مسیر revoke membership اجرا کرد؛ دقیقاً یکی موفق شد، دیگری به‌دلیل آخرین مدیر رد شد و یک مدیر فعال باقی ماند.
- **B1 — idempotency:** آزمون `rejects re-revoke and preserves the first revocation audit` revoke تکراری membership و grant را اجرا و audit نخست را حفظ‌شده بررسی کرد.
- **B2:** آزمون `maps duplicate active membership and duplicate active grant to CONFLICT` ایجاد membership فعال تکراری و صدور grant فعال تکراری را اجرا کرد؛ هر دو خطای دامنه‌ای `CONFLICT` شدند.
- **B3:** `validateAuthContext` پیش از transaction در مسیرهای member اجرا می‌شود؛ `lockOrganization` اکنون `CoreDomainError` می‌دهد. آزمون `returns the same authorization code and message for unknown and unauthorized organizations` برای هر دو حالت دقیقاً `AUTHORIZATION_DENIED` و پیام `active organization membership required` را بررسی کرد. permission check پیش از بررسی state در مسیرهای revoke قرار گرفت.
- **B4:** مسیر `.env` با `resolve(__dirname, '../../.env')` محاسبه می‌شود. `clearCoreRows` قبل از هر delete guard را اجرا می‌کند. آزمون‌های guard حالت unset، پورت ۵۴۳۵، میزبان `db`، پورت دیگر و localhost:5499 را پوشش می‌دهند.
- **B5:** `mlino2/validation/g10a3/manifest.txt` مسیر و SHA-256 بایت LF خروجی `git show` برای تمام فایل‌های کد و آزمون این مرحله را ثبت می‌کند.
- **B6:** آزمون trigger واقعی علاوه بر code، پیام دقیق `initial publication state is invalid` را بررسی می‌کند. bootstrap دیگر متن خام Prisma را جست‌وجو نمی‌کند؛ ابتدا `mapCoreDatabaseError` را اجرا و سپس بر اساس code تصمیم می‌گیرد.
- **B7:** این گزارش برای هر اصلاح نام آزمون یا خروجی فرمان مشخص ارائه می‌کند و ادعای نادرست رقابت G10A2 را تکرار نمی‌کند؛ گزارش G10A2 تغییر نکرده است.

## ۶. Database safety

یک PostgreSQL 16 یک‌بارمصرف با `tmpfs` روی پورت ۵۴۹۹ اجرا شد. guard خارجی و guard داخل spec استفاده شدند. هیچ `implementation/.env`، پورت ۵۴۳۵، `mlino-v1-local-db` یا `_PUSH_STAGING` استفاده نشد.

شش migration روی همین محیط موقت اعمال شد. build، آزمون Core و کل آزمون V1 در همان محیط اجرا شدند. container با `docker rm -f` حذف شد. فهرست volumeهای قبل و بعد برابر و `volume-diff.txt` شامل `NO_VOLUME_CHANGE` است.

## ۷. Tests executed and results

- `npm run prisma:migrate:deploy` — ۶ migration موفق.
- `npm run build` — موفق.
- `npm test -- --runInBand implementation/test/core` — ۳ مجموعه و ۲۸ آزمون موفق.
- `npm test -- --runInBand` — ۲۲ مجموعه و ۲۷۷ آزمون موفق.
- `git diff --check` — موفق.

در اجرای اولیهٔ G10A3، فقط سناریوی idempotency به‌علت استفادهٔ اشتباه از self-grant شکست خورد؛ دادهٔ آزمون به عضو دوم منتقل شد. پس از اصلاح، اجرای نهایی Core و کل V1 موفق بود.

## ۸. Commits

- کد و آزمون و شواهد: `462d8b90d37708d82400aaf39f27a5b057943679`
- manifest LF: `4513c77d698b3923b98f863e3d5ae3b088a2a3e7`
- گزارش و Handoff در commit بعدی ثبت می‌شوند.

## ۹. Remaining risks and open questions

- اتصال واقعی `PlatformIdentityVerifier` به سامانهٔ هویت پلتفرم هنوز در دامنهٔ این برش نیست.
- G10B، API، تغییر schema، migration جدید و اتصال V1/V2 اجرا نشده و نیازمند Handoff جداگانه است.
- وضعیت احراز هویت Git در این اجرا سالم بود، اما هیچ تنظیم credential تغییر نکرد.

## ۱۰. Recommended next step

تحویل پس از Push متوقف می‌شود و منتظر بازبینی Architecture Guardian می‌ماند. بدون دستور جدید، G10B یا هیچ تغییر دیگری در schema، migration، API یا V2 آغاز نمی‌شود.

من کدکس هستم.
