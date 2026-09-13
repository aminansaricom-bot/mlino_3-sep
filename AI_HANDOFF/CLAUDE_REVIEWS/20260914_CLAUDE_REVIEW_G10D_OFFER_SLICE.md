# بازبینی نگهبان معماری — G10d: برش Offer و OfferVersion و انتشارشان

**تاریخ:** ۱۴ سپتامبر ۲۰۲۶
**بازبین:** Claude Opus 5 — MLINO Architecture Guardian
**گزارش بررسی‌شده:** `origin/codex/core-g10d-offer:AI_HANDOFF/CODEX_REPORTS/20260914_CODEX_G10D_CORE_OFFER_SLICE_REPORT.md` (LF sha256 `d0432b40…889d`)
**شاخه:** `codex/core-g10d-offer`، پایه = `main` در `cf1da02`
**commitها:** `b07f543` (پیاده‌سازی و شواهد) و `f962e12` (گزارش، manifest و Handoff)

پیش از push، commitهای محلی را بازبینی کرده بودم: دامنه‌ی مجاز، بدون secret، پایگاه داده‌ی زنده دست‌نخورده.

## حکم: `APPROVED_NEXT_STEP`

**برش G10d بسته شد.**
- **قفل‌ها:** ترتیب قفل درست است.
- **جایگزینی نسخه:** در یک تراکنش و به ترتیب «withdraw، سپس publish» انجام می‌شود.
- **idempotency:** انتشار تکراری بدون درج رخداد، و revision تهی برای OfferVersion.
- **تغییرناپذیری:** OfferVersion از لحظه‌ی ساخت تغییرناپذیر است (R2).
- **allowlist:** در همه‌ی مسیرها برقرار است.
- **S14-A:** فقط با تغییر **واقعی** اعمال می‌شود.

**برای اولین بار در این مسیر، هر ۱۰ آزمونی که گزارش ادعا کرده با همان نام در spec و log وجود دارد.**

دو مورد جزئی به G10e منتقل می‌شوند. **برای ادغام، تأیید کوتاه مالک لازم است.** همراه آن، مجوز G10e و تصمیم S15 هم درخواست می‌شود (بخش ۴).

---

## ۱. راستی‌آزمایی

| مورد | نتیجه |
|---|---|
| **دامنه** | ✅ `cf1da02..f962e12`: `offer-service.ts` (تازه)، `publication-service.ts`، `capability-service.ts`، `error-adapter.ts`، `g10d-offer.spec.ts` (تازه)، یک تغییر در spec ‏G10c، شواهد، گزارش و Handoff (بدون حذف) · بدون تغییر در schema، migration، پیکربندی، محافظ‌ها، `.env` یا فایل‌های V1 · بدون secret |
| **main** | ✅ `cf1da02`، بدون تغییر |
| **GW2-P** | ✅ ثبت شده است؛ fetch خطای شبکه داد |
| **پایگاه داده‌ی زنده‌ی V1** | ✅ شش migration · `dspr=4` · `offers` و `publications` = ۰ · `StartedAt` بدون تغییر · `Restarts=0` · read-api همان `a07858b3` |
| **پایگاه یک‌بارمصرف** | ✅ حذف شده · volume قبل و بعد یکسان · بدون volume بی‌نام تازه |
| **آزمون** | ✅ build · شش migration · ۱۰ آزمون G10d · **کل V1: ۲۶ suite و ۳۳۷ آزمون** · شکست‌های اجرای نخست (fixtureهای بدون `onRequest`، نگاشت CHECK، و انتظار قدیمی spec ‏G10c) شفاف گزارش و اصلاح شده‌اند |
| **ادعاهای آزمون** | ✅ هر ۱۰ نام بند ۵ گزارش با `g10d-tests-rerun2.txt` و فایل spec برابرند |
| **manifest و hash گزارش** | ✅ ‏۶ از ۶ · `d0432b40…` |
| **merge-tree** | ✅ `3e2d438`، بدون تعارض |

## ۲. بررسی کد

| محور | شاهد |
|---|---|
| **OfferService** | `create`: allowlist و `offer_key` یکتا ← CONFLICT · `createVersion`: قفل سازمان، سپس مجوز، سپس `SELECT … FROM offers … FOR UPDATE` (فقط Offer فعال)، سپس `max+1`. آزمون همزمان ← شماره‌های متمایز · **هیچ متد update یا delete برای OfferVersion وجود ندارد** (R2) · update و delete مستقیم با prisma ← `offer version is immutable` |
| **پیوند Capability** | فقط وقتی `publication_status = UNPUBLISHED` است. این معادل `published_at IS NULL` در trigger است، طبق CHECK ‏`:696-700` · پس از انتشار **و پس از withdraw** ← CONFLICT · Capability فقط از همان سازمان |
| **انتشار OfferVersion** | در `change()`: قفل سازمان، سپس مجوز، **پیش از** هر جست‌وجوی target · سپس قفل Offer و نسخه (`FOR UPDATE`) · `content_revision` برابر NULL (CHECK ‏`:726-732`) |
| **نتیجه‌ها** | `PUBLISHED` · `ALREADY_PUBLISHED` بدون درج (شمار = ۱) · `WITHDRAWN` · withdraw دوباره ← CONFLICT · publish از WITHDRAWN |
| **REPLACED** | در همان تراکنش، **ابتدا** `WITHDRAWN` برای نسخه‌ی قبلی و **سپس** `PUBLISHED` برای نسخه‌ی تازه. ترتیب با خود index جزئی غیرقابل‌تعویق `offer_version_published_unique` تضمین می‌شود، چون ترتیب معکوس نقض یکتایی می‌داد · آزمون: یک نسخه‌ی PUBLISHED و نسخه‌ی قبلی WITHDRAWN |
| **رقابت** | انتشار همزمان v2 و v3 ← هر دو fulfilled و دقیقاً یک نسخه‌ی PUBLISHED. قفل سازمان عملیات را سریالی می‌کند و دومی REPLACED می‌شود |
| **S14-A** | `samePublicValue` هر فیلد ارسالی را با ردیف فعلی مقایسه می‌کند · تغییر واقعی روی `HUMAN_CONFIRMED` ← در **همان update** مقدار `UNCONFIRMED` و تهی شدن فیلدهای تأییدکننده (CHECK ‏`:735-745`) · مقدار یکسان ← بدون reset و بدون افزایش revision · هر دو حالت آزمون دارند |
| **spec ‏G10c** | آزمون «OfferVersion رد می‌شود» به «OfferVersion پشتیبانی می‌شود» تغییر کرد، که پیامد دامنه‌ی مصوب G10d است · آزمون target ناشناخته حفظ شده · **هیچ آزمونی ضعیف نشده** |

## ۳. موارد جزئی (به G10e منتقل می‌شوند)

| # | یافته |
|---|---|
| **Y1** | `unlinkCapability` برای پیوندی که وجود ندارد به `offerVersionCapability.delete` می‌رسد و Prisma ‏P2025 می‌دهد، که adapter آن را `INTERNAL_ERROR` می‌کند. باید `VALIDATION_FAILED "capability link not found"` باشد |
| **Y2** | آزمون‌های OfferVersion فقط `policyVersion` را در `gate_snapshot` می‌سنجند. `grantId`، از جمله در ردیف WITHDRAWN حالت REPLACED، سنجیده نمی‌شود |
| یادداشت | `createVersion` برای Offer بازنشسته پیام «offer not found» می‌دهد. پذیرفتنی است، چون چرخه‌ی عمر Offer بیرون از دامنه است |

---

## ۴. تصمیم‌های لازم از مالک (یکجا)

### الف) تأیید ادغام G10d
> «ادغام G10d در main مجاز است.»

### ب) مجوز G10e: برش Evidence (آخرین برش Core)

**دامنه:** کد افزودنی Core، روی شاخه‌ی تازه از main پس از ادغام G10d.

- **EvidenceService:**
  - **ثبت** (`evidence.manage`): **دقیقاً یک** owner (Capability یا OfferVersion، طبق C7 ‏`:587-589`)، و owner از همان سازمان (CHECK جفتی)
  - `source_kind` ∈ {HUMAN، SYSTEM، AI_INFERRED، INTEGRATION} · `confidence` در [0، 1] ‏(CHECK) · allowlist
  - **تأیید انسانی** (`evidence.confirm`): `UNCONFIRMED` ← `HUMAN_CONFIRMED` با Membership (ADR-0006: منبع جدا از تأیید است؛ `AI_INFERRED` هرگز خودکار تأیید نمی‌شود)
  - **وضعیت** (`evidence.manage`): `ACTIVE` ← `EXPIRED` یا `WITHDRAWN`، هر دو پایانی
- **به‌علاوه‌ی Y1 و Y2 از بخش ۳**
- **بیرون از دامنه:** HTTP، adapter واقعی، خواندن عمومی V2 (S9)

### ج) تصمیم S15: آیا Evidence پس از ثبت ویرایش‌پذیر است؟

| گزینه | توضیح |
|---|---|
| **S15-A (توصیه)** | Evidence **فقط افزودنی** است. پس از ثبت، محتوا (owner، `source_kind`، `source_ref`، `method_key`، زمان‌ها، `confidence`) تغییر نمی‌کند. فقط تأیید انسانی و وضعیت پایانی (EXPIRED یا WITHDRAWN) مجازند. **اصلاح یعنی Evidence تازه و withdraw نسخه‌ی قبلی**، همان الگوی OfferVersion و Publication، تا سابقه‌ی شاهد جعل نشود |
| S15-B | ویرایش مجاز، با بازگشت تأیید، مثل S14-A |

**پاسخ پیشنهادی مالک (یکجا):**
> «ادغام G10d مجاز است؛ G10e مجاز است؛ S15-A.»

## ۵. وضعیت دروازه‌ها

| دروازه | موضوع | وضعیت |
|---|---|---|
| **G10d** | **Offer و OfferVersion و انتشار** | ✅ **بسته**؛ ادغام ← ⏳ تأیید مالک |
| G10e | Evidence (آخرین برش Core) | ⏳ مجوز مالک |
| S15 | ویرایش‌پذیری Evidence | ⏳ تصمیم مالک |

من کلاد هستم
