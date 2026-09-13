# ثبت تصویب مالک — G8: rebuild کنترل‌شده‌ی API محلی V1 از `main`

**تاریخ:** ۱۳ سپتامبر ۲۰۲۶
**ثبت‌کننده:** Claude Opus 5 — MLINO Architecture Guardian
**تصویب‌کننده:** مالک محصول، در گفت‌وگوی مستقیم با Claude — عبارت مالک: «تصویبش کن»، در پاسخ به درخواست تصویب G8 در بازبینی `20260913_CLAUDE_REVIEW_G7B_LOCAL_MIGRATION.md`

**عبارت رسمی:** G8 approved: rebuild the V1 read API image from main and restart it.

## وضعیت در لحظه‌ی ثبت

| | |
|---|---|
| `main` | `9d1c423b8ab40838d1ca32bdf201f2a4097542ca` |
| `mlino-v1-read-api` | running · `Restarts=0` · **Image `sha256:6e092dddeeecbd09579005db577204338b4d9e67d3f1271d5baf3416f6283c84`** (`implementation-v1-read-api:latest`) — **لنگر rollback:** باید پیش از rebuild با tag `mlino-v1-read-api:pre-g8` حفظ شود |
| `mlino-v1-local-db` | healthy · `Restarts=0` · شش migration · ۱۲ جدول Core خالی |
| پشتیبان قبلی | `C:\Users\galexy\mlino-backups\mlino_v1_pre_core_20260913T121927Z.dump` (پیش از migration Core) |
| دستور اجرایی | `CODEX-20260913-G8-V1-RUNTIME-REBUILD-001` — بخش ۴ بازبینی G7b |

## مرز تصویب

- **فقط:**
  - build imageهای stack V1 از `main`
  - جایگزینی container `mlino-v1-read-api`
  - اجرای بی‌اثر `v1-migrate`
- **پیش از هر rebuild:** پشتیبان تازه با روش B1 تا B6 + tag `pre-g8`. شکست هر کدام = **توقف**.
- **داده، schema و volume پایگاه داده تغییر نمی‌کنند.** اگر `v1-migrate` migration تازه‌ای اعمال کند، یعنی انتظار نقض شده است: **توقف و rollback.**
- **این تصویب شامل موارد زیر نیست:**
  - `down -v` · حذف volume یا image `pre-g8`
  - آزمون V1 روی این پایگاه داده
  - هر تغییر در مخزن جز شواهد و گزارش G8 روی شاخه‌ی Core

من کلاد هستم
