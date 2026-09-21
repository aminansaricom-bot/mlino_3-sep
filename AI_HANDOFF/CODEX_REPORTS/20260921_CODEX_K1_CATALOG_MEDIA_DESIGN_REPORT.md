# CODEX K1 Catalog Media Design Report

**Instruction ID:** `CODEX-20260921-K1-CATALOG-MEDIA-DESIGN-001`

**Target Handoff:** `HANDOFF-20260921-OWNER-APPROVAL-K1`

**Workstream:** `HANDOFF-20260921-CATALOG-MEDIA`

**Branch:** `codex/catalog-media-design`

**Status:** `COMPLETED_LOCALLY_AWAITING_GUARDIAN_REVIEW`

## 1. Task executed

سند DRAFT طراحی Catalog و Media در `mlino2/MLINO_CATALOG_MEDIA_DESIGN.md` ایجاد شد. سند K1 تا K9 را پوشش می‌دهد: مقایسهٔ سه مدل دامنه، metadata و policy تصویر، ذخیره‌سازی و distribution، سازگاری قرارداد، consumer و AR، test data، threat table، تصمیم‌های باز مالک، تقسیم اجرای پیشنهادی و موارد خارج از دامنه. هیچ تصمیم باز به‌جای مالک تصویب نشد.

## 2. Preconditions and governance evidence

GW2-P روی رکورد pinned اجرا شد:

| Check | Result |
|---|---|
| `git cat-file -t 7bbe75077017a4078fcd37ffe50466ed0973c0c7` | `commit` |
| `git merge-base --is-ancestor 7bbe750... origin/main` | exit `0` |
| SHA-256 بایت‌های `git show 7bbe750...:AI_HANDOFF/CLAUDE_REVIEWS/20260921_OWNER_APPROVAL_CATALOG_MEDIA_DESIGN.md` | `817cb61b41fa3219fc9bd02ce1988f61471d0486fa0f4bc149868f8fadf8fd45` — MATCH |
| `origin/main` | `7bbe75077017a4078fcd37ffe50466ed0973c0c7` |

Worktree تازه در `C:/Users/galexy/mlino code/catalog-media-design` و branch تازهٔ `codex/catalog-media-design` دقیقاً از pinned commit ساخته شد. هیچ fetch، network، push، rebase، amend یا تغییر git config انجام نشد.

## 3. Source documents and code read

منابع زیر با `git show` خوانده شدند:

- `origin/main:implementation/prisma/schema.prisma`
- `origin/main:implementation/core/capability-service.ts`
- `origin/main:implementation/core/offer-service.ts`
- `origin/main:implementation/core/publication-service.ts`
- `origin/main:implementation/public-export/builder.ts`
- `origin/main:implementation/public-export/canonical.ts`
- `origin/main:implementation/public-export/cli.ts`
- `origin/main:implementation/public-export/signing.ts`
- `origin/main:implementation/public-export/distribution/distribute.ts`
- `origin/main:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md`
- `origin/main:mlino2/MLINO_PUBLIC_EXPORT_OPERATIONS_DESIGN.md`
- `origin/codex/v2-intent-flow-foundation:mlino2/app/src/publicExport/{mapping,consumer,verify,transport}.ts`
- همهٔ فایل‌های `origin/codex/v2-intent-flow-foundation:mlino2/app/src/ar/**`
- همهٔ فایل‌های `origin/codex/v2-intent-flow-foundation:mlino2/app/src/components/**`
- `6f2c8a58f1cbbb441ff09a10d9b3e6f094e2aa19:mlino2/MLINO_V2_REAL_UI_AND_ASSISTANT_DESIGN.md`
- U2 modules در commit محلی `77e7bdbc8bf121c0c45ff88590404a5e522d0477`: `uiAdapter.ts`, `category.ts`, `businessHours.ts`, `RealPublicApp.tsx`

هر ادعای وضعیت موجود در سند با `ref:path:line` ارجاع داده شده است.

## 4. Files changed

| File | Change |
|---|---|
| `mlino2/MLINO_CATALOG_MEDIA_DESIGN.md` | new DRAFT design |
| `AI_HANDOFF/CODEX_REPORTS/20260921_CODEX_K1_CATALOG_MEDIA_DESIGN_REPORT.md` | new execution report |
| `mlino2/HANDOFF/HANDOFF_STATE.md` | append-only handoff entry، پس از ثبت report |

Design commits: `577708c6951a23c821145fe8eefea478736eee71` و اصلاح قالب Markdown در `f9342114ec254ca39096ba62a1eeabe8ce0ef988`.

## 5. Files not changed

هیچ code، test، config، schema، migration، Prisma، contract نهایی، image، V2 app، Core service، Public Export implementation یا ADR تغییر نکرد. `origin/main` و worktreeهای دیگر دست نخورده‌اند.

## 6. Validation executed

- `git diff --check`: PASS پیش از commit.
- بررسی وجود `Status: DRAFT`: PASS.
- بررسی وجود بخش‌های K1 تا K9، threat table، ۱۴ تصمیم باز مالک و execution split: PASS.
- بررسی status و scope: فقط فایل طراحی پیش از report تغییر داشت.
- hash روی بایت‌های ذخیره‌شده با `git show`: PASS.

هیچ code test لازم یا مجاز نبود. Docker، database، Prisma، npm، network و image generation اجرا نشدند.

## 7. Validation results and SHA-256

| Artifact | Commit/source | LF / git-show SHA-256 |
|---|---|---|
| `mlino2/MLINO_CATALOG_MEDIA_DESIGN.md` | `f9342114ec254ca39096ba62a1eeabe8ce0ef988` | `9d9f826e9777d14af5a8eb6e6c01465a4119137e8da42dde2f83560b7cfe679d` |

سند با وضعیت DRAFT پایان می‌یابد و هیچ implementation authorization صادر نمی‌کند.

## 8. Commit hash

- Design final: `f9342114ec254ca39096ba62a1eeabe8ce0ef988`
- Report: در commit محلی بعدی ثبت می‌شود و در Handoff درج خواهد شد.
- Push: انجام نشد.

## 9. Remaining risks and open questions

- U2 adapter modules در ref درخواستی `origin/codex/v2-intent-flow-foundation` موجود نبودند. نسخهٔ قابل‌خواندن آن‌ها در commit محلی `77e7bdbc...` بررسی و این محدودیت در خود سند ذکر شد؛ remote publication آن ref در این مرحله قابل راستی‌آزمایی نبود.
- مقادیر cap، allowlist، lifecycle، permission، artifact strategy، relation Offer و CatalogItem، GC و offline cache هنوز proposal هستند و به تصمیم مالک نیاز دارند.
- نمونهٔ Nginx طراحی است؛ `nginx -t` و live 404/cache checks به مرحلهٔ implementation آینده تعلق دارند و در K1 به‌دلیل ممنوعیت Docker/code اجرا نشدند.
- هیچ image واقعی ساخته یا inspect نشد؛ بنابراین decoder/type/dimension policy فقط طراحی شده است.

## 10. Recommended next step

Guardian سند را مستقل بازبینی کند. مالک ابتدا تصمیم‌های K-D1، K-D3، K-D5، K-D6، K-D7، K-D12 و K-D14 را تعیین کند. پس از آن، K2 فقط به‌صورت CCR مستقل برای مدل فیزیکی، constraintها، publication snapshot، media policy، artifact schema و rollout آماده شود. هیچ schema یا implementation پیش از review و owner approval شروع نشود.

من کدکس هستم
