# گزارش اجرای Codex — G14a-1: CCR محتوای منتشرشده

**وضعیت:** DELIVERED_AWAITING_GUARDIAN_REVIEW  
**تاریخ:** ۲۰۲۶-۰۹-۱۴  
**INSTRUCTION_ID:** `CODEX-20260914-G14A1-PUBLISHED-CONTENT-CCR-001`  
**TARGET_HANDOFF_ID:** `HANDOFF-20260914-OWNER-APPROVAL-G14A1`  
**WORKSTREAM_HANDOFF_ID:** `HANDOFF-20260914-CORE-G14A`  
**شاخه:** `codex/core-g14a-published-content`  
**مبنای شاخه:** `f57849903b28a414646fed4f16367ddf71d89363`  
**commit سند CCR:** `31f3c22bc74d860ddbb2e491449bccff276b1a66`

## ۱. Task اجراشده

پیش‌نویس CCR برای افزودن `publications.published_content` بر اساس تصمیم مصوب S19-A1 تهیه شد. این تحویل فقط مستندات است و هیچ schema، migration، کد، تست، config، Docker یا دیتابیسی را تغییر یا اجرا نکرد.

## ۲. اسناد مبنا

- `AI_HANDOFF/CLAUDE_REVIEWS/20260914_OWNER_APPROVAL_G14A1_PUBLISHED_CONTENT_CCR.md` در commit قفل‌شدهٔ `f57849903b28a414646fed4f16367ddf71d89363`.
- `mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md` روی مبنای `origin/main`، به‌ویژه بخش‌های ۳، ۵، ۷، ۱۰، ۱۲ و ۱۳.
- `AI_HANDOFF/CLAUDE_REVIEWS/20260914_OWNER_APPROVAL_V2_READ_CONTRACT_DECISIONS.md`، به‌ویژه تصمیم‌های S16 تا S26 و تعریف S19-A1.
- `implementation/prisma/schema.prisma`، migration Core Foundation، `implementation/core/publication-service.ts`، Dockerfile و tsconfig فقط به‌صورت read-only.
- `AI_HANDOFF/CLAUDE_REVIEWS/20260913_CLAUDE_REVIEW_G7B_LOCAL_MIGRATION.md` فقط به‌عنوان شاهد تاریخی خالی‌بودن جدول‌های Core.

## ۳. فایل‌های تغییرکرده

| مسیر | نوع تغییر | توضیح |
|---|---|---|
| `implementation/remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_PUBLICATION_PUBLISHED_CONTENT.md` | جدید | CCR با وضعیت DRAFT، DDL پیشنهادی، allowlist snapshot، eligibility، تغییر طراحی‌شدهٔ service، آزمون‌ها، rollback و OQ-1 تا OQ-5 |
| `AI_HANDOFF/CODEX_REPORTS/20260914_CODEX_G14A1_PUBLISHED_CONTENT_CCR_REPORT.md` | جدید | همین گزارش |
| `mlino2/HANDOFF/HANDOFF_STATE.md` | append-only | ثبت تحویل workstream G14A |

## ۴. فایل‌های تغییرنکرده

- `implementation/prisma/schema.prisma` و همهٔ migrationها.
- همهٔ فایل‌های کد، تست و config.
- سند FINAL قرارداد خواندن V2 و همهٔ تصمیم‌های S16 تا S26.
- شاخهٔ V2، `main`، `_PUSH_STAGING` و فایل‌های credentials/git config.
- Docker، containerها، volumeها و هر پایگاه داده.

## ۵. پوشش C1 تا C9

| شناسه | بخش CCR | وضعیت | نتیجه |
|---|---|---|---|
| C1 | ۱ | انجام شد | انگیزه، شکاف fidelity و S19-A1 ثبت شد |
| C2 | ۲ | انجام شد | DDL دقیق migration تازه، CHECK مستقیم، preflight refusal، تغییر Prisma و بی‌نیازی triggerها از تغییر ثبت شد |
| C3 | ۳ | انجام شد | union نسخه‌دار و allowlist تایپ‌شده برای Profile، Capability و OfferVersion تعریف شد |
| C4 | ۴ | انجام شد | محتوای منجمد از eligibility زنده و fail-closed جدا شد و گزینهٔ بدیل باز ماند |
| C5 | ۵ | انجام شد | تغییر آیندهٔ PublicationService برای lock، INSERT، REPLACED و ALREADY_PUBLISHED طراحی شد |
| C6 | ۶ | انجام شد | قاعدهٔ latest PUBLISHED without later WITHDRAWN و ترتیب `occurred_at` سپس `id` ثبت شد |
| C7 | ۷ | انجام شد | فهرست آزمون‌های G14a-2، از جمله DB خالی و DB دارای ردیف، ثبت شد |
| C8 | ۸ | انجام شد | شاهد تاریخی G7b، preflight آیندهٔ G14a-3، refusal backfill، rollback و اثر runtime ثبت شد |
| C9 | ۹ | انجام شد | OQ-1 تا OQ-5 هر کدام با گزینه‌ها، پیامد و یک توصیه ثبت شدند؛ هیچ‌کدام تصمیم نشدند |

## ۶. اعتبارسنجی اجراشده

این مرحله فقط مستندات بود. اعتبارسنجی‌های اجراشده:

- کنترل دامنهٔ تغییر با `git status --short` و `git diff --name-only`.
- کنترل قالب patch با `git diff --check`.
- خواندن line-numbered منابع از branch مبتنی بر `origin/main`.
- محاسبهٔ SHA-256 سند CCR از بایت‌های `git show`، نه از working-tree ویندوزی.

هیچ Prisma، npm، Jest، Docker، query یا تست کدی اجرا نشد.

## ۷. نتیجهٔ اعتبارسنجی و شواهد GW2-P

`git fetch origin` با exit code 1 شکست خورد:

```text
fatal: unable to access 'https://github.com/aminansaricom-bot/mlino_3-sep.git/': Failed to connect to github.com:443 after 152 ms: Could not connect to server
```

طبق پیش‌شرط، GW2-P روی مرجع قفل‌شده اجرا شد:

```text
git cat-file -e f57849903b28a414646fed4f16367ddf71d89363^{commit}
CAT_FILE_EXIT=0

git merge-base --is-ancestor f57849903b28a414646fed4f16367ddf71d89363 origin/main
ANCESTOR_EXIT=0

git show f57849903b28a414646fed4f16367ddf71d89363:AI_HANDOFF/CLAUDE_REVIEWS/20260914_OWNER_APPROVAL_G14A1_PUBLISHED_CONTENT_CCR.md | SHA-256
25dcdae455bf3e7ffc78434651ed05df6d2b93a5cd19ca90e71eb106a224991a
```

هر سه شرط GW2-P موفق‌اند و SHA-256 با مقدار قفل‌شده برابر است. هیچ credential، token، git config یا credential helper خوانده یا تغییر داده نشد.

SHA-256 سند CCR روی بایت‌های commit‌شدهٔ Git:

```text
44539a3e2136803dcae7c166ab1f173066db45b881d22a3ccbdd14a119c714b4  implementation/remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_PUBLICATION_PUBLISHED_CONTENT.md
```

## ۸. Commit

- CCR: `31f3c22bc74d860ddbb2e491449bccff276b1a66` — `docs: draft published content snapshot CCR`
- گزارش و Handoff در commit تحویل بعدی همین شاخه ثبت می‌شوند.
- مقصد مجاز push فقط `origin/codex/core-g14a-published-content` است.

## ۹. ریسک‌های باقی‌مانده و سؤال‌های باز

- CCR هنوز DRAFT است و OQ-1 تا OQ-5 نیازمند تصمیم مالک‌اند.
- خالی‌بودن جدول `publications` فقط شاهد تاریخی G7b دارد؛ G14a-3 باید آن را دوباره، پیش از backup/migration، بررسی کند.
- schemaهای نسخه‌دار `business_hours` و `terms` و جزئیات privacy allowlist در G14b نهایی می‌شوند؛ تا آن زمان اجرای G14a-2 به تصویب CCR و تعیین مرز دقیق JSON وابسته است.
- این سند برای ردیف‌های تاریخی backfill حدسی نمی‌سازد؛ migration پیشنهادی در حضور هر Publication متوقف می‌شود.
- هیچ آزمون PostgreSQL یا Prisma در این مرحله اجرا نشده است؛ آن شواهد متعلق به G14a-2 خواهد بود.

## ۱۰. گام بعدی پیشنهادی

Guardian این CCR را مستقل بازبینی کند. سپس مالک OQ-1 تا OQ-5 و متن CCR را تصویب یا برای اصلاح برگرداند. فقط پس از تصویب جداگانه، G14a-2 می‌تواند schema، migration، PublicationService و تست‌های disposable را پیاده کند. G14a-3، G14b و G14c همچنان مجوز جدا می‌خواهند.

من کدکس هستم.
