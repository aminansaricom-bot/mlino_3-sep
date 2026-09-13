# گزارش اعتبارسنجی G1c — PostgreSQL و Prisma

تاریخ: ۲۰۲۶-۰۹-۱۲  
INSTRUCTION_ID: CODEX-20260912-G1C-VALIDATION-001  
TARGET_HANDOFF_ID: HANDOFF-20260911-V2-INTENT-FLOW-FOUNDATION  
REVIEW_REFERENCE: origin/main:AI_HANDOFF/CLAUDE_REVIEWS/20260912_CLAUDE_REVIEW_G1B_CLOSURE_VALIDATION.md @ 7e5c6e06bb3384b3fae9e29aea8bccded327ab5a  
RELEASED_BY: origin/main:AI_HANDOFF/CLAUDE_REVIEWS/20260912_CLAUDE_REVIEW_CODEX_GOVERNANCE_WORKFLOW_FIXES.md @ 3a6cd2ca0015b13a0cc61f8345620aa1f5aea2d4  
BASE_COMMIT: ebca26742c315b577508d5f3672ff1037bf9389a  
بسته شواهد: mlino2/validation/g1c/  
SHA256SUMS: c39b3e45c76a6520b872e9aed7e87df177c3892f5bcc5ebb25029456a555ef3a  
وضعیت اجرای فنی: PASS  
وضعیت Gate طبق معیار بند ۸: G1 NOT CLOSED — NEEDS_DECISION

## ۱. حکم

تمام موارد G1c-1 تا G1c-12 اجرا شدند. R1، R2، R3 و R4 از نظر فنی شاهد موفق دارند:

- DDL، Trigger، SQL، فرمان‌ها، logها و checksumها در مخزن ثبت شدند.
- هر دو گونه محافظ C15، یعنی خاموش‌کردن فوری پرچم و pg_trigger_depth، نشت را رد کردند.
- Prisma Migrate 5.22.0 با تاریخچه پنج migration شاخه main اجرا شد.
- migrate diff از تاریخچه برای schema همسان خالی بود.
- migration آزمایشی follow-up فقط یک ستون افزود و هیچ FK، ایندکس جزئی، CHECK یا Trigger را حذف نکرد.
- تمام آزمون‌های منفی SQLSTATE یا کد Prisma مورد انتظار را دقیق سنجیدند.
- W1 و W2 فقط در fixture آزموده شدند و هر دو رفتار مورد انتظار را نشان دادند.

Codex حق انتخاب سازوکار C15 یا تصویب W1/W2 را ندارد. چون معیار PASS بند ۸ انتخاب سازوکار C15 برای CCR را نیز لازم می‌داند، Codex خودِ Gate را نمی‌بندد. نتیجه برای تصمیم Architecture Guardian و مالک بازگردانده می‌شود.

هیچ schema، migration یا کد محصول تغییر نکرد.

## ۲. محیط و جداسازی

| مورد | نتیجه |
|---|---|
| PostgreSQL | 16.14، container با تصویر postgres:16-alpine |
| Prisma CLI | 5.22.0 |
| Prisma Client | 5.22.0 |
| Node.js | v24.18.0 |
| container | mlino-g1c-postgres، AutoRemove=true |
| ابزار Prisma | پوشه موقت خارج از مخزن؛ پس از اجرا حذف شد |
| دیتابیس‌ها | سه دیتابیس disposable برای اجرا، shadow و بازسازی تاریخچه |
| ریشه مخزن | بدون package.json، package-lock.json یا node_modules جدید |
| اتصال | هیچ رشته اتصال یا اعتبارنامه‌ای در artefactها و logها ثبت نشد |

شاهد نسخه‌ها در logs/04_environment.txt و logs/20_tooling_version.txt است. شاهد پاک‌سازی فایل‌ها در logs/27_filesystem_cleanup.txt ثبت شده است.

در اجرای اولیه generate، Prisma به‌صورت خودکار package.json، package-lock.json و node_modules موقت در ریشه ساخت. این سه مورد پیش از ادامه حذف شدند. generate نهایی از پوشه موقت دارای package.json و با PRISMA_GENERATE_SKIP_AUTOINSTALL=1 اجرا شد. log اولیه برای ممیزی حفظ شده است.

## ۳. G1c-1 — محافظ C15

### پرچم transaction-local با خاموش‌کردن فوری

پس از درج Publication برای نسخه X، تغییر مستقیم projection نسخه Y در همان تراکنش با P0001 رد شد:

PASS_G1C_C15_NO_SAME_TRANSACTION_LEAK code=P0001

پس از درج رخداد و ROLLBACK TO SAVEPOINT نیز تغییر مستقیم نسخه دیگر با P0001 رد شد و رخداد rollbackشده باقی نماند:

PASS_G1C_C15_NO_SAVEPOINT_LEAK code=P0001

تابع apply_publication_projection پرچم را پیش از خروج Trigger به off بازمی‌گرداند.

### گونه pg_trigger_depth

گونه جداگانه با guard مبتنی بر pg_trigger_depth نیز اجازه داد projection فقط در زنجیره Trigger تغییر کند و تغییر مستقیم بعدی در همان تراکنش را با P0001 رد کرد:

PASS_G1C_C15_PG_TRIGGER_DEPTH_VARIANT code=P0001

هر دو سازوکار از نظر این fixture معتبرند. انتخاب یکی از آن‌ها تصمیم CCR است و در این اجرا انجام نشد.

## ۴. G1c-2 تا G1c-4 — actor، verification و زوج سایه

Publication در fixture این فیلدها را دارد:

- performed_by_membership_id؛
- organization_id؛
- reason اجباری؛
- occurred_at اجباری.

FK مرکب انجام‌دهنده به Membership همان سازمان متصل است. عضو سازمان دیگر با 23503 رد شد. platform_actor_ref فقط در IdentityVerification باقی ماند.

IdentityVerification دارای organization_id و FK مرکب به BusinessIdentityClaim است. ارجاع cross-organization با 23503 رد شد.

برای BusinessProfile:

- دو ستون اختیاری identity_claim_id و identity_claim_organization_id تعریف شدند.
- بدون C6، PostgreSQL با MATCH SIMPLE زوج نیمه‌پر را پذیرفت.
- با C6، همان زوج با 23514 رد شد.
- prisma validate و prisma generate روی رابطه مرکب اختیاری موفق شدند.

## ۵. G1c-5 و G1c-6 — تاریخچه migration و Prisma Migrate

پنج migration زیر با git show از origin/main به پوشه موقت خارج از مخزن استخراج و به‌ترتیب اعمال شدند:

1. 20260814065924_init
2. 20260815033018_add_situation_key
3. 20260815113714_rename_actor_core_entity_id_to_actor_id
4. 20260906001500_add_ownership_type
5. 20260910020000_add_external_workspace_link

پس از آن migration موقت Core fixture اعمال شد. manifest و SHA-256 نسخه‌های استخراج‌شده در logs/21_origin_migration_manifest.txt ثبت شده است.

نتیجه migrate diff با --from-migrations و shadow database برای schema همسان:

-- This is an empty migration.

نتیجه برای schema follow-up:

ALTER TABLE "organizations" ADD COLUMN "validation_note" TEXT;

inventory قبل و بعد byte-identical بود:

- SHA-256 قبل: b0771476d694fc797bd2e52a6f40c969c473b234ff423e0b6d72cb8d97659806
- SHA-256 بعد: b0771476d694fc797bd2e52a6f40c969c473b234ff423e0b6d72cb8d97659806

تاریخچه هفت migration، شامل پنج migration main، Core fixture و follow-up، روی دیتابیس خالی دوم با migrate deploy بازسازی شد و verification نهایی موفق بود.

ایندکس external_workspace_link_active_unique در هر دو مسیر باقی ماند. هجده FK مربوط به Core و ExternalWorkspaceLink مقدار confdeltype=r و confupdtype=r داشتند.

## ۶. G1c-7 و G1c-9 — آزمون‌های schema-critical و کد خطا

نتایج مهم:

| آزمون | نتیجه |
|---|---|
| C2 عضویت با identity_provider | duplicate فعال → 23505؛ provider دیگر و سابقه غیرفعال پذیرفته شد |
| C3 PermissionGrant | duplicate فعال → 23505؛ اعطای دوباره پس از revoke پذیرفته شد |
| C4 Claim روی BusinessProfile | duplicate فعال → 23505 |
| Claim فعال بدون verified_at | 23514 |
| Claim فعال تکراری | 23505 / Prisma P2002 |
| Verification cross-organization | 23503 |
| Verification تصمیم‌شده با audit ناقص | 23514 |
| FK حلقوی Organization و Membership | مسیر معتبر PASS؛ عضو سازمان دیگر → 23514 |
| DELETE FROM publications | P0001 |
| FY2 تغییر capability نسخه منتشرشده | P0001 |
| publish جایگزین پیش از withdraw | 23505 |
| withdraw سپس publish جایگزین | PASS |
| حذف یا تغییر کلید Organization دارای وابستگی | 23503 |
| تغییر مستقیم projection از Prisma | P2010 با SQLSTATE=P0001 |

هر آزمون منفی کد مورد انتظار را صریح بررسی کرد. هر خطای دیگر باعث شکست harness می‌شد.

## ۷. G1c-8 — هم‌زمانی

سناریوی هر دور:

1. نسخه قدیمی از قبل منتشر است.
2. تراکنش جایگزینی، نسخه قدیمی را withdraw و نسخه جدید را publish می‌کند.
3. تراکنش رقیب تلاش می‌کند نسخه سوم را publish کند.
4. دو تراکنش پشت مانع advisory lock هم‌زمان آزاد می‌شوند.
5. وضعیت نهایی باید دقیقاً WITHDRAWN / PUBLISHED / UNPUBLISHED و تعداد رخدادهای جایگزینی ۲ و رخداد رقیب صفر باشد.

نتیجه ۴۰ دور:

| isolation | تعداد | کد تراکنش رقیب |
|---|---:|---|
| READ COMMITTED | ۲۰ | ۲۰ بار 23505 |
| SERIALIZABLE | ۲۰ | ۱۲ بار 40001 و ۸ بار 23505 |

همه ۴۰ دور وضعیت نهایی صحیح داشتند. هیچ pg_sleep در مانع هم‌زمانی استفاده نشد.

یک اجرای اولیه publish/publish نیز موفق بود، اما برای تطبیق دقیق با سناریوی جایگزینی، اجرای نهایی بالا جایگزین معیار شد و log اولیه حفظ شده است.

## ۸. G1c-10 — W1 و W2

### W1

نوشتن مستقیم scalar با:

- organizationId از زمینه سازمان B؛
- offerId متعلق به سازمان A؛
- capabilityId متعلق به سازمان A؛

در Prisma Client با P2003 رد شد. PostgreSQL همان مرز را با FK مرکب و 23503 اعمال می‌کند.

نتیجه:

PASS W1_direct_scalar_tenant_guard code=P2003

### W2

گونه fixture بدون رابطه تکراری OfferVersion.organization:

- مسیر معتبر scalar را پذیرفت.
- ورودی متناقض organization دیگر در API آن مدل وجود نداشت و در runtime با PrismaClientValidationError و Unknown argument organization رد شد.

نتیجه:

PASS W2_redundant_organization_input_unavailable

این نتایج فقط شاهد تصمیم آینده‌اند. W1 یا W2 در طراحی یا محصول اعمال نشدند.

## ۹. G1c-11 — پاک‌سازی

پیش از اجرا، volume یتیم زیر در docker volume ls وجود داشت:

9097eb284ec42faec2ac41fb49e7f6dcbf8a4c44543e10a27432977b311159c1

فقط همان volume حذف شد و خروجی قبل، حذف و بعد در logs/00_volume_before.txt تا logs/02_volume_after.txt ثبت شد.

container تازه با --rm اجرا شد. پیش از توقف:

- AutoRemove=true؛
- volume موقت شناسایی شد.

پس از توقف:

- ContainerPresent=False
- OrphanVolumePresent=False
- DisposableVolumePresent=False
- ProtectedV1VolumePresent=True

volume implementation_mlino_v1_local_db_data و containerهای پروژه دست‌نخورده ماندند.

## ۱۰. اصلاح صریح ادعاهای G1b

۱. ادعای «MLINO_G1_CLOSURE_REVIEW.md پیدا نشد» نادرست بود. سند پیش از G1b در origin/main:mlino_book/MLINO_G1_CLOSURE_REVIEW.md وجود داشت. در G1c پس از fetch با git show خوانده شد.

۲. ادعای «container بدون volume و پاک‌سازی کامل» نادرست بود. volume بی‌نام 9097eb28… باقی مانده بود. در G1c وجود آن قبل از حذف و نبود آن بعد از حذف ثبت شد.

۳. برچسب R2=PASS در G1b نادرست بود. آزمون واقعی نشت همان تراکنش، ROLLBACK TO SAVEPOINT و گونه pg_trigger_depth در G1b اجرا نشده بودند. هر سه در G1c اجرا و موفق شدند.

۴. ادعای «UPDATE/DELETE روی Publication رد می‌شود» در G1b فقط برای UPDATE شاهد داشت. DELETE در G1c صریحاً اجرا و با P0001 رد شد.

۵. R4 در G1b کامل نبود. C2 با identity_provider، C3، C4، C6، FK حلقوی، FY2 و ترتیب غلط جایگزینی در G1c اجرا شدند.

۶. آزمون Prisma direct projection در G1b هر خطایی را PASS می‌کرد. آزمون G1c دقیقاً Prisma P2010 و SQLSTATE=P0001 را لازم دانست.

## ۱۱. خطاهای fixture و اصلاحات

سه خطای harness بدون تغییر محصول اصلاح شدند:

- اجرای اولیه SQL به‌دلیل ناهماهنگی تعداد ستون‌های Membership با 42601 متوقف شد؛ فهرست ستون‌ها اصلاح و دیتابیس از صفر بازسازی شد.
- generate اولیه Prisma auto-install را در ریشه فعال کرد؛ فایل‌های تولیدی حذف شدند و generate نهایی از پوشه موقت اجرا شد.
- diff اولیه به‌دلیل غایب‌بودن مدل‌های کنترل آزمایش و نام‌های ضمنی FK نویز Drop/Rename داشت؛ مدل‌های کنترل فقط به schema ترکیبی موقت و map نام FKها به fixture اضافه شدند. diff نهایی خالی شد.
- سناریوی اولیه concurrency از publish/publish به publish/withdraw replacement ارتقا یافت.

لاگ‌های اولیه برای ممیزی حفظ شده‌اند و نتیجه نهایی محسوب نمی‌شوند.

## ۱۲. محدودیت‌های رعایت‌شده

- mlino2/validation/g1b/** تغییر نکرد.
- implementation/** تغییر نکرد.
- schema.prisma یا migration محصول ساخته نشد.
- Backend، ADR، طراحی و تصمیم معماری تغییر نکرد.
- هیچ W1، W2 یا P1 تا P12 در محصول اعمال نشد.
- هیچ merge، rebase، cherry-pick یا push --force انجام نشد.
- هیچ Secret یا رشته اتصال در artefactها ثبت نشد.
- سه فایل untracked قدیمی کاربر دست‌نخورده ماندند.

## ۱۳. نتیجه بر اساس معیار بند ۸

| معیار | نتیجه |
|---|---|
| R1 — DDL، Trigger و SQL | PASS |
| R2 — رد نشت C15 | PASS برای هر دو گونه |
| R3 — DR-01 تا DR-03 و FK-07 | PASS |
| R4 — آزمون‌ها با کد مورد انتظار | PASS |
| hash و commit مبنا | PASS |
| انتخاب سازوکار C15 برای CCR | NEEDS_DECISION |

نتیجه فنی G1c: PASS.

حکم Gate که Codex مجاز به بستن آن است: G1 NOT CLOSED — NEEDS_DECISION.

Architecture Guardian باید تعیین کند آیا شواهد برای بستن G1 کافی است و انتخاب سازوکار C15 را به G3 منتقل می‌کند، یا پیش از G2 تصمیم دیگری لازم است. Codex مرحله بعد را آغاز نمی‌کند.

من کدکس هستم.

