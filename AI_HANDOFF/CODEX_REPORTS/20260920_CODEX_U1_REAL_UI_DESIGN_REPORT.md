# گزارش اجرای U1 — طراحی رابط واقعی و دستیار هوشمند V2

**Instruction ID:** `CODEX-20260920-U1-REAL-UI-AND-ASSISTANT-DESIGN-001`  
**Target Handoff:** `HANDOFF-20260920-OWNER-APPROVAL-U1`  
**Workstream:** `HANDOFF-20260920-V2-REAL-UI`  
**Branch:** `codex/v2-real-ui-design`  
**Base:** `e26c52568811af5c6669b3458c5ce38d5b3e04a7`  
**Mode:** Documentation only

## ۱. Task executed

سند DRAFT طراحی اتصال رابط غنی V2 به `public-business.v1`، برنامهٔ Offerهای نمونه و طرح gateway سمت سرور برای دستیار واقعی ایجاد شد. سند R1 تا R8 دستور را پوشش می‌دهد و هیچ مرحلهٔ اجرایی U2/U3/U4 را آغاز نکرد.

## ۲. Source documents and code read

- رکورد تصویب مالک و دستور U1: `b8d8d03e8af610d0a5eb08a0e7d570b9c4f56406:AI_HANDOFF/CLAUDE_REVIEWS/20260920_OWNER_APPROVAL_REAL_UI_AND_ASSISTANT_DESIGN.md`.
- شاخهٔ V2 در `e26c52568811af5c6669b3458c5ce38d5b3e04a7`:
  - `mlino2/app/src/App.tsx`
  - `mlino2/app/src/publicExport/{consumer,mapping,RealPublicApp,verify,trustBundle,transport}.ts(x)`
  - `mlino2/app/src/components/{MapView,BusinessCard,BottomSheet}.tsx`
  - `mlino2/app/src/ar/**`
  - `mlino2/app/src/discovery/AssistantFoundation.tsx`
  - `mlino2/app/src/matching/**`
  - `mlino2/app/src/experience/**`
  - `mlino2/app/src/directory/**`
  - `mlino2/app/src/core/intent.ts`
  - `mlino2/app/src/offers.ts`
- `origin/main`:
  - `implementation/public-export/builder.ts`
  - `implementation/core/{offer-service,capability-service,business-profile-service,publication-service}.ts`
  - `mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md`
- راهنمای skill معماری `graphify` خوانده شد. در این workspace هیچ `graphify-out/graph.json` موجود نبود. ساخت graph فایل‌های اضافی خارج از فهرست مجاز ایجاد می‌کرد، بنابراین اجرا نشد و منابع الزام‌شده مستقیماً با Git و filesystem بررسی شدند.

## ۳. Files changed

| فایل | نوع | نتیجه |
|---|---|---|
| `mlino2/MLINO_V2_REAL_UI_AND_ASSISTANT_DESIGN.md` | جدید | سند ۱۳ بخشی شامل R1-R8، تصمیم‌های باز U1-O1..U1-O10 و split پیشنهادی U2/U3/U4 |
| `AI_HANDOFF/CODEX_REPORTS/20260920_CODEX_U1_REAL_UI_DESIGN_REPORT.md` | جدید | این گزارش |
| `mlino2/HANDOFF/HANDOFF_STATE.md` | append-only | ورودی توقف و تحویل U1 |

SHA-256 سند طراحی روی bytes خروجی `git show b9fa5de:mlino2/MLINO_V2_REAL_UI_AND_ASSISTANT_DESIGN.md`:

`6763aefafc4a48faf8c34abe6c3d6c8158b07afc2e3ddc5297d343cac3d4e3eb`

## ۴. Files not changed

- هیچ فایل code، test، config، schema، migration، Prisma یا V2 product تغییر نکرد.
- `origin/main`، `_PUSH_STAGING`، فایل‌های `.env`، keyها و credentialها دست‌نخورده ماندند.
- هیچ Mock، DTO، signature verification، trust bundle، consumer acceptance یا Core service تغییر نکرد.

## ۵. GW2 / GW2-P precondition

`git fetch origin` با خطای شبکه متوقف شد:

```text
fatal: unable to access 'https://github.com/...': Failed to connect to github.com
```

GW2-P روی reference pinned اجرا و PASS شد:

```text
git cat-file -e b8d8d03e8af610d0a5eb08a0e7d570b9c4f56406^{commit}
exit=0

git merge-base --is-ancestor b8d8d03e8af610d0a5eb08a0e7d570b9c4f56406 origin/main
exit=0

expected sha256=5229fcb54c4bb2b8cb04d0a7f57ceabb9c70c1dc695fdb5ebf1974626b7e0c2c
actual   sha256=5229fcb54c4bb2b8cb04d0a7f57ceabb9c70c1dc695fdb5ebf1974626b7e0c2c
result=PASS
```

Base ref نیز دقیقاً برابر مقدار دستور بود:

```text
origin/codex/v2-intent-flow-foundation=e26c52568811af5c6669b3458c5ce38d5b3e04a7
```

## ۶. Validation executed

- `git diff --check`: PASS؛ خطای whitespace ثبت نشد.
- کنترل scope با `git status --short` و `git diff --name-only`: پیش از commit فقط سند طراحی جدید بود.
- کنترل ساختار سند: R1 تا R8، جدول field map، قرارداد دقیق gateway، threat/failure table، ده تصمیم باز، سه execution slice و out-of-scope موجودند.
- کنترل citationها با خواندن منابع pinned و `origin/main` و ثبت `file:line` برای ادعاهای رفتار فعلی.
- کنترل SHA-256 با `git show ... | sha256sum` روی bytes ذخیره‌شده در Git.

هیچ code test اجرا نشد؛ mode این task مستندات صرف بود و اجرای npm، Docker، database و network ممنوع بود.

## ۷. Validation results and commit

- Documentation validation: **PASS**
- Allowed-file scope: **PASS**
- Credential/key access: **NONE**
- Network/provider call: **NONE**
- Docker/database: **NONE**
- Design commit: `b9fa5de1ed2952d28db78bd71394e97978e39f61`
- Push: **NOT ATTEMPTED**

## ۸. Remaining risks

- category مشتق‌شده ذاتاً guess است و باید در implementation با badge مشخص بماند.
- رابط غنی فعلی شدیداً به draft-1 وابسته است؛ U2 باید type seam را تغییر دهد و نباید فیلدهای غایب را جعل کند.
- Assistant gateway یک مرز امنیتی جدید است؛ provider contract، deployment، auth و retention هنوز تصویب نشده‌اند.
- کلیدی که قبلاً در گفتگو نوشته شده طبق رکورد مالک compromised است و پیش از U4 باید revoke شود.
- business-hours/terms schema و timezone policy برای `open_now` باید در implementation روشن باشند.

## ۹. Open questions and unverifiable facts

تصمیم‌های U1-O1 تا U1-O10 در سند باز مانده‌اند. موارد زیر از repository قابل اثبات نبودند و به‌عنوان واقعیت قطعی ثبت نشدند:

- endpoint/protocol دقیق واسطهٔ ۳۰ مدل مالک؛
- موجود بودن IDهای `gemini-3.8-flash`، `deepseek-v4.1-flash`، `claude-sonnet-5` و variantهای `free/` در catalog زندهٔ provider؛
- region پردازش، retention، SLA و قرارداد no-training/no-log provider؛
- تعداد و شناسهٔ businessهای TEST که باید Offer نمونه بگیرند؛
- policy نهایی timezone برای business hours؛
- ظاهر نهایی روی گوشی، چون هیچ build/preview در task مستندات اجرا نشد.

## ۱۰. Recommended next step

Architecture Guardian سند و citationها را بازبینی کند. سپس مالک تصمیم‌های U1-O1 تا U1-O10 را ثبت کند. پیشنهاد سند: ابتدا U2 (اتصال رابط واقعی)، سپس U3 (Offerهای TEST) و در پایان U4 (gateway دستیار). هر مرحله نیازمند instruction، دامنه و تصویب جداگانه است.

پس از این گزارش کار متوقف می‌شود؛ هیچ مرحلهٔ U2، U3 یا U4 خودکار شروع نمی‌شود.

من کدکس هستم
