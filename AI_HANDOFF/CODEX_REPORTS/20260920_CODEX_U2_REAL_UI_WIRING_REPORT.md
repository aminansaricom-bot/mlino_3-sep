# گزارش اجرای U2 — اتصال رابط واقعی V2

- **Instruction:** `CODEX-20260920-U2-REAL-UI-WIRING-001`
- **Target handoff:** `HANDOFF-20260920-OWNER-APPROVAL-U2`
- **Workstream:** `HANDOFF-20260920-V2-REAL-UI`
- **Branch:** `codex/v2-real-ui-wiring`
- **Base:** `e26c52568811af5c6669b3458c5ce38d5b3e04a7`
- **Code commit:** `f42ca24ec596359cda57359559949b06887c8045`
- **Evidence commit:** `424053f022a9b8f984524113ce8dad85c0eb9183`
- **Status:** `DELIVERED_LOCALLY_AWAITING_ARCHITECTURE_GUARDIAN_REVIEW`

## 1. Task executed

رابط واقعی V2 روی رکوردهای پذیرفته‌شده‌ی `PublicRecord` سیم‌کشی شد. یک view model صرفاً نمایشی، دسته‌بندی قطعی و آفلاین، ارزیاب نسخه‌دار ساعات کاری، فیلترهای باز/دسته/نزدیک، نمایش نقشه و کارت و جزئیات، تجربه‌های محلی، اشتراک‌گذاری و AR به مسیر واقعی افزوده شدند. مسیر واقعی هیچ fallback به داده‌ی mock یا قرارداد draft-1 ندارد. U3 و U4 اجرا نشدند.

## 2. Source documents used

- رکورد تصویب و دستور مالک: `e7a99be7f8ba8d61170b4e0b3984d06fafad8d0c:AI_HANDOFF/CLAUDE_REVIEWS/20260920_OWNER_APPROVAL_U1_DECISIONS_AND_U2.md`
- طراحی U1: `6f2c8a58f1cbbb441ff09a10d9b3e6f094e2aa19:mlino2/MLINO_V2_REAL_UI_AND_ASSISTANT_DESIGN.md`، بخش‌های 3، 4، 5 و بخش U2 از 9
- کد مبنا: `origin/codex/v2-intent-flow-foundation` در `e26c52568811af5c6669b3458c5ce38d5b3e04a7`

`git fetch origin` به علت محدودیت شبکه ناموفق بود. GW2-P کامل شد: pinned commit موجود بود، ancestor آن نسبت به `origin/main` تأیید شد و SHA-256 بایت‌های `git show` دقیقاً `0d1fb1a26a1442e6042462be535a5a01c9126583fbc5e358b880cfe78ed64001` بود. خروجی‌ها در `mlino2/validation/u2/precondition.log` ثبت شده‌اند.

## 3. Files changed

هجده فایل مجاز کد و آزمون در commit کد تغییر کردند:

- `mlino2/app/src/publicExport/`: `uiAdapter.ts/.test.ts`، `category.ts/.test.ts`، `businessHours.ts/.test.ts`، `RealPublicApp.tsx`، `realUiBoundary.test.ts` و `u2Fixtures.ts`
- `mlino2/app/src/components/`: `PublicBusinessDetails.tsx`، `businessView.ts`، `BusinessCard.tsx` و `MapView.tsx`
- `mlino2/app/src/ar/`: `ArOverlayService.ts` و `ArVitrineView.tsx`
- `mlino2/app/src/experience/`: `ExperiencePanel.tsx`، `ShareBusinessAction.tsx` و `shareBusiness.ts`
- شواهد جدید: `mlino2/validation/u2/**`
- این گزارش و ورودی append-only Handoff

## 4. Files not changed

فایل‌های پذیرش و اعتماد `canonical.ts`، `verify.ts`، `trustBundle.ts`، `consumer.ts`، `mapping.ts` و `transport.ts` نسبت به base بدون تغییرند. `App.tsx`، قرارداد عمومی، `package.json`، lockfile، nginx، Dockerfile و docker-compose نیز تغییر نکردند. هیچ فایل V1، main، `_PUSH_STAGING`، gateway/assistant، داده‌ی sample offer، schema یا migration تغییر نکرد.

## 5. Requirement and test traceability

| الزام | پیاده‌سازی | آزمون دقیق |
|---|---|---|
| Adapter صرفاً بعد از رکورد پذیرفته‌شده و بدون اختراع مقدار | `uiAdapter.ts:21-66` | `u2-adapter maps every approved display field without draft-1 inventions`؛ `u2-adapter preserves the accepted public contact, links, hours, capabilities and offers by value` |
| مختصات null در list/detail باقی بماند و از map/nearby/AR حذف شود | `uiAdapter.ts:50-66`، `ArOverlayService.ts` | `u2-adapter keeps null-coordinate records in the list but excludes them from map and nearby inputs`؛ `u2-map-ar keeps a coordinate-free record in UI while excluding it from AR` |
| دسته‌بندی آفلاین، قطعی، capability-first و fallback صادقانه | `category.ts:19-68`؛ نمایش نشان «حدسی» در `RealPublicApp.tsx:115-116` و `PublicBusinessDetails.tsx:21-23` | پنج آزمون با پیشوند `u2-category` در `category.test.ts:16-36`، از جمله tie-break، normalization و fallback |
| ساعات کاری v1 با ساعت تزریقی، ISO day، timezone، exception و fail-closed | `businessHours.ts:41-109` | پانزده آزمون جدول‌محور با پیشوند `u2-hours`؛ از جمله `u2-hours uses the artifact timezone and ISO weekday numbering` و `u2-hours open-only filter never treats unknown as open` |
| تجربهٔ کامل مسیر واقعی | `RealPublicApp.tsx:29-141`؛ Map در خط 101، BottomSheet در 126، Card در 128، Detail در 133، Experience در 134 و AR در 140 | آزمون‌های adapter/boundary و build کامل؛ componentها از `RichUiRecord`/`PublicUiRecord` از طریق props استفاده می‌کنند |
| مسیر واقعی بدون mock/draft loader/validator/BusinessDirectoryService | `RealPublicApp.tsx` | `u2-boundary RealPublicApp has no mock, draft loader, validator or BusinessDirectoryService import`؛ `u2-boundary rejects a draft-1 payload at the real public-record mapper` |

## 6. Tests executed

- `npm run build -- --configLoader runner`
- `npm test -- --configLoader runner`
- هر دو فرمان سه بار پیاپی در `mlino2/app`
- سه mutation مستقل در یک کپی throwaway: تغییر fallback دسته به cafe، عبور دادن unknown از open-only، و وارد کردن mock loader در مسیر واقعی
- اسکن نشت روی شواهد برای کلید خصوصی، `DATABASE_URL`، token، password و connection string

اجرای اولیه با config loader عادی به‌دلیل محدودیت اجرای esbuild از مسیر junction شکست خورد؛ `--configLoader runner` بدون تغییر dependency یا config استفاده شد. یک اجرای اولیه با گزینه‌ی نامعتبر Jest یعنی `--runInBand` نیز کنار گذاشته شد، زیرا runner پروژه Vitest است. هیچ‌کدام شاهد پذیرش محسوب نشده‌اند.

## 7. Test results

| دور | Build | Test files | Tests |
|---|---:|---:|---:|
| 1 | PASS | 21/21 | 272/272 |
| 2 | PASS | 21/21 | 272/272 |
| 3 | PASS | 21/21 | 272/272 |

Mutationها همگی آزمون نام‌دار مناسب را شکست دادند:

- M1: fallback جعلی cafe → `u2-category falls back to uncategorized and visibly guessed metadata` شکست خورد.
- M2: تلقی unknown به‌عنوان open → `u2-hours open-only filter never treats unknown as open` شکست خورد.
- M3: import کردن mock loader → `u2-boundary RealPublicApp has no mock, draft loader, validator or BusinessDirectoryService import` شکست خورد.

اسکن نشت: PASS. هیچ شبکه، Docker یا پایگاه داده‌ای استفاده نشد.

## 8. Evidence and hashes

Manifest شامل ۱۸ فایل کد و ۶ فایل log در `mlino2/validation/u2/LF-MANIFEST.txt` است. SHA-256ها روی بایت‌های `git show` برای کد و روی نسخه‌ی LF-normalized برای logها محاسبه شده‌اند. شواهد شامل `precondition.log`، `scope.log`، `mutation.log` و `run-1.log` تا `run-3.log` است.

در زمان ساخت اولیهٔ شواهد، `mutation.log` به‌اشتباه در پوشهٔ ریشه‌ای `validation/u2` ایجاد شد. پیش از stage/commit به مسیر مجاز `mlino2/validation/u2/mutation.log` منتقل و پوشهٔ اشتباه حذف شد؛ این رخداد و نتیجهٔ پاک‌سازی در گردش کار ثبت شد. کپی throwaway mutation نیز حذف شد.

## 9. Remaining risks and open questions

- آزمون browser-level یا بازبینی بصری دستی در این مرحله اجرا نشد؛ Guardian باید ظاهر و تعامل‌های واقعی را در مرورگر بازبینی کند.
- U3 (sample offers) و U4 (assistant gateway) عمداً خارج از scope باقی مانده‌اند؛ دکمهٔ assistant در مسیر واقعی فعال نشده است.
- رابط واقعی همچنان به artifact پذیرفته‌شده و trust bundle تنظیم‌شده وابسته است؛ این مرحله منطق پذیرش یا transport را تغییر نداده است.

## 10. Recommended next step

Architecture Guardian commitهای محلی، Manifest، سه اجرای سبز و Mutation proof را بازبینی کند. پس از تصمیم Guardian، فقط مرحله‌ای که Handoff تازه مجاز می‌کند آغاز شود. Push یا مرحلهٔ بعدی خودکار انجام نشد.

من کدکس هستم
