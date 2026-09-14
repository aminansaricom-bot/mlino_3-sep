# بازبینی نگهبان و ثبت ادغام — G13e و سند نهایی قرارداد خواندن V2 در main

**تاریخ:** ۱۴ سپتامبر ۲۰۲۶
**بازبین و مجری ادغام:** Claude Opus 5 — MLINO Architecture Guardian

## حکم G13e: `APPROVED_NEXT_STEP`؛ ادغام انجام شد

| مورد | مقدار |
|---|---|
| commitهای G13e (محلی؛ push Codex به‌دلیل سهمیه رد شد) | `9ad6a1e` (سند) و `1dbf677` (اصلاحیه‌ی گزارش و Handoff) |
| سند نهایی | `mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md`، LF sha256 ‏`90c5753efe11c1b2b2ac1f3f8a9e75c0ad1a1fd8d6a105c225f8bcd71281fe18` |
| **merge commit** | **`fd6d1b15ed3ae1b6e60284171eccdee920d64f43`** · tree ‏`ee1f622` · والدها `81004f0` و `1dbf677` |
| مجوز مالک | «ادغام سند نهایی قرارداد خواندن V2 در main، پس از تأیید G13e توسط نگهبان، مجاز است» (در گفت‌وگو، ۱۴ سپتامبر ۲۰۲۶) |

## ۱. بازبینی G13e

| مورد | نتیجه |
|---|---|
| **دامنه** | ✅ `f39f3ee..1dbf677`: فقط سه فایل مجاز · در سند فقط شش خط: ردیف‌های `category`، `floor_level`، `building_id`، `products` و `discount_percent`، و زیرعنوان خط ۲۵۵ · گزارش و Handoff فقط الحاقی (۰ حذف) · worktree ‏Codex تمیز · commitهای قبلی بازنویسی نشده‌اند |
| **محتوا** | ✅ هر ردیف به S25 یا S26 ارجاع می‌دهد یا صریحاً می‌گوید «در v1 نیست» · category فقط از واژگان ماژول (ADR-0011)، نه از `categoryKey` · ارجاع‌ها حفظ شده‌اند · ارجاع تازه‌ی `contract.ts:24-32` واقعاً `V2BusinessProduct` است |
| **اصلاحیه‌ی گزارش** | ✅ ادعای بیش از واقعیت F9 صادقانه تصحیح شد (بخش ۸ گزارش G13d) |
| **hash** | ✅ `90c5753e…` برابر گزارش است |

G13d به‌همراه G13e **بسته است.** F1 تا F9 همه اعمال شده‌اند.

## ۲. اجرای ادغام

Codex push نکرده بود. پس commitها را از object store مشترک محلی و فقط خواندنی به `_PUSH_STAGING` آوردم. هیچ git config نوشته نشد.

| گام | نتیجه |
|---|---|
| merge-base | `b53489a` |
| **merge-tree آزمایشی** | ✅ tree ‏`ee1f622`، بدون تعارض |
| **دامنه‌ی ادغام** | ✅ فقط ۶ فایل و فقط افزودنی (+۶۸۲ خط، ۰ حذف): سند طراحی، چهار گزارش G13a تا G13d، و `mlino2/HANDOFF/HANDOFF_STATE.md` |
| merge `--no-ff` | ✅ `fd6d1b1`، tree برابر آزمایش |
| push | با قید `--force-with-lease` روی `81004f0` |
| شاخه‌ی Codex | ref سرور `codex/v2-read-contract-design` به‌صورت fast-forward از `053197e` به `1dbf677` برده شد، با همان commitهای خود Codex. **push معلق Codex دیگر لازم نیست.** |
| **runtime** | ✅ بدون تغییر: read-api ‏`sha256:a07858b3…`، DB StartedAt ‏`2026-09-12T21:34:05.613Z`، ۰ restart، ۶ migration، `domain_signal_producer_registry`=4، جدول‌های Core خالی. ادغام فقط سند است؛ نه build انجام شد و نه compose |

**وضعیت:** قرارداد خواندن V2 (`mlino.v2.public-business.v1`، S16 تا S26، S19-A1) حالا **سند FINAL روی main** است. این یک قرارداد طراحی است، نه پیاده‌سازی.

---

## ۳. تصمیم بعدی مالک: G14a-1 (سند CCR، فقط سند)

طبق برنامه‌ی بخش ۱۳ سند، گام اول **CCR ستون `publications.published_content`** است. پیشنهاد نگهبان این است که مثل G3، ابتدا **فقط سند CCR** نوشته شود و هیچ migration و کدی نوشته نشود.

**محتوای CCR:**
1. DDL دقیق شامل ستون و CHECK برای PUBLISHED در برابر WITHDRAWN.
2. تأیید دوباره‌ی خالی بودن جدول‌ها و در نتیجه بی‌نیازی از backfill.
3. allowlist فیلدهای snapshot برای هر هدف (Profile، Capability، OfferVersion)، هم‌خوان با DTO ‏`public-business.v1`.
4. تغییر `PublicationService`: نوشتن در همان تراکنش، از ردیف قفل‌شده.
5. پیامد روی triggerهای موجود C12 و C15 و روی تست‌ها.
6. rollback و ریسک اعمال روی DB زنده. اعمال بعداً مثل G7 انجام می‌شود: با backup و تصویب جدا.

**زنجیره‌ی بعدی (هر حلقه تصویب جدا می‌خواهد):**
1. **G14a-1:** سند CCR
2. تصویب CCR
3. **G14a-2:** پیاده‌سازی migration و service با DB آزمایشی روی 5499
4. ادغام
5. **G14a-3:** اعمال migration روی DB محلی، با backup

**پاسخ پیشنهادی مالک:**
> «G14a-1 (سند CCR ستون published_content) مجاز است.»

پس از این پاسخ، دستور کامل را صادر می‌کنم. شاخه‌ی تازه از main است و TARGET آن `HANDOFF-20260914-GUARDIAN-G13-MERGE` است.

## ۴. وضعیت دروازه‌ها

| دروازه | موضوع | وضعیت |
|---|---|---|
| G13a تا G13e | قرارداد خواندن V2 | ✅ **در main ادغام شد (`fd6d1b1`)** |
| S16 تا S26 | | ✅ DECIDED |
| **G14a-1** | **سند CCR ستون `published_content`** | ⏳ **تصویب مالک** |
| G14a-2، G14a-3، G14b، G14c | | ⏳ تصویب جدا |

من کلاد هستم
