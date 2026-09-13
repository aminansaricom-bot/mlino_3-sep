# بازبینی نگهبان معماری — G10e: برش Evidence (آخرین برش لایه‌ی service هسته)

**تاریخ:** ۱۴ سپتامبر ۲۰۲۶
**بازبین:** Claude Opus 5 — MLINO Architecture Guardian
**گزارش بررسی‌شده:** `origin/codex/core-g10e-evidence:AI_HANDOFF/CODEX_REPORTS/20260914_CODEX_G10E_CORE_EVIDENCE_SLICE_REPORT.md` (LF sha256 `cb31418b…0baf`)
**شاخه:** `codex/core-g10e-evidence`، پایه = `main` در `16910a6`
**commitها:** `1b2a2b6` (کد و شواهد) و `ddbea98` (گزارش و Handoff)

## حکم: `APPROVED_NEXT_STEP`

**برش G10e بسته شد.** با ادغام آن، **لایه‌ی service هسته کامل می‌شود:**
- authority
- claim و verification
- profile و capability
- offer و OfferVersion
- انتشار
- evidence

در این برش:
- **S15-A** درست پیاده شده است: هیچ مسیری برای ویرایش محتوای Evidence وجود ندارد.
- Y1 و Y2 بسته شده‌اند.
- هر ۹ آزمونی که گزارش ادعا کرده، با همان نام در spec و log وجود دارد.

**برای ادغام، تأیید کوتاه مالک لازم است.** همراه آن، انتخاب مرحله‌ی بعد از مالک خواسته می‌شود (بخش ۴).

---

## ۱. راستی‌آزمایی

| مورد | نتیجه |
|---|---|
| **دامنه** | ✅ `16910a6..ddbea98`: `evidence-service.ts` (تازه)، `offer-service.ts` (Y1)، `g10e-evidence.spec.ts` (تازه)، `g10d-offer.spec.ts` (Y2)، شواهد، گزارش و Handoff (بدون حذف) · بدون تغییر در schema، migration، پیکربندی، محافظ‌ها، package یا `.env` · بدون secret |
| **main** | ✅ `16910a6`، بدون تغییر |
| **GW2-P** | ✅ ثبت شده است |
| **پایگاه داده‌ی زنده‌ی V1** | ✅ شش migration · `dspr=4` · `evidence` و `organizations` = ۰ · `StartedAt` بدون تغییر · `Restarts=0` · read-api همان `a07858b3` |
| **پایگاه یک‌بارمصرف** | ✅ حذف شده · volume قبل و بعد یکسان · بدون volume بی‌نام تازه |
| **آزمون** | ✅ build · شش migration · ۹ آزمون G10e · **کل V1: ۲۷ suite و ۳۴۶ آزمون** · دو شکست اجرای نخست شفاف گزارش و اصلاح شده‌اند |
| **ادعاهای آزمون** | ✅ هر ۹ نام بند ۵ گزارش با `g10e-tests-rerun.txt` و spec برابرند |
| **manifest و hash گزارش** | ✅ ‏۴ از ۴ · `cb31418b…` |
| **merge-tree** | ✅ `4e4d33d`، بدون تعارض |

## ۲. بررسی کد

| محور | شاهد |
|---|---|
| **allowlist** | `record`: فقط ۹ کلید مجاز. ارسال `confirmationStatus`، `confirmedByMembershipId`، `evidenceStatus` یا `organizationId` ← `VALIDATION_FAILED` و **ردیفی ساخته نمی‌شود** (آزمون شمار ردیف‌ها را می‌سنجد) |
| **C7، دقیقاً یک owner** | `hasCapability === hasOfferVersion` ← رد، **پیش از** هر فراخوانی DB |
| **owner از همان سازمان** | جست‌وجو با کلید مرکب W1 · owner سازمان دیگر یا owner ناموجود ← `VALIDATION_FAILED` · هر دو ستون جفت با context تنظیم می‌شوند (CHECK ‏`:550-560`) |
| **`sourceKind` و `confidence`** | بررسی در زمان اجرا · مرزهای 0 و 1 مجاز · مقادیر 0.1- و 1.1 رد می‌شوند |
| **تأیید انسانی** | فقط `ACTIVE` و `UNCONFIRMED` با `evidence.confirm` ← `HUMAN_CONFIRMED` با actor (CHECK ‏`:747-757`) · **هیچ مسیر تأیید خودکار وجود ندارد**؛ `AI_INFERRED` فقط از `confirm()` تأیید می‌شود (ADR-0006) |
| **وضعیت پایانی** | `expire` و `withdraw` فقط از `ACTIVE` · گذار دوم ← CONFLICT · تأیید پس از وضعیت پایانی ← CONFLICT |
| **S15-A** | کل کلاس را خواندم: فقط `record`، `confirm`، `expire` و `withdraw`، به‌علاوه‌ی helperهای خصوصی. **هیچ متدی محتوا را به‌روز نمی‌کند** |
| **Y1** | `unlinkCapability`: وجود پیوند **پیش از** بررسی وضعیت انتشار سنجیده می‌شود · پیوند ناموجود ← `VALIDATION_FAILED "capability link not found"`، نه P2025 یا INTERNAL_ERROR · مسیر link تغییری نکرده است (بررسی انتشار همچنان پیش از `create`) |
| **Y2** | `gate_snapshot.grantId` برابر grant دقیق برای OfferVersion در PUBLISHED، WITHDRAWN و **هر دو** ردیف REPLACED |

**یادداشت جزئی (مانع نیست):** آزمون S15-A فقط نبود نامی به شکل `update` در prototype را می‌سنجد، که ضعیف است. رفتار درست با خواندن کد تأیید شد. هر گسترش آینده‌ی EvidenceService باید این آزمون را به «فقط همین چهار متد عمومی» سخت کند.

## ۳. لایه‌ی service هسته: جمع‌بندی

| برش | محتوا | وضعیت |
|---|---|---|
| G10a (a تا a3) | authority: bootstrap، Membership، Grant، port پلتفرم، قفل سازمان | ✅ در main |
| G10b (b و b2) | claim و verification: ماشین حالت، S11، S12-A، attempt | ✅ در main |
| G10c (c تا c3) | Profile، Capability و انتشار: D6، R1، S4/E2، S7، S13-A | ✅ در main |
| G10d | Offer و OfferVersion و انتشار: R2، REPLACED، S14-A | ✅ در main |
| **G10e** | **Evidence: C7، ADR-0006، S15-A · Y1 و Y2** | ✅ **پذیرفته**؛ ادغام ← ⏳ تأیید مالک |

---

## ۴. تصمیم‌های لازم از مالک

### الف) تأیید ادغام G10e
> «ادغام G10e در main مجاز است.»

### ب) انتخاب مرحله‌ی بعد

لایه‌ی service هسته اکنون **درون V1، بدون مصرف‌کننده** است. هیچ مسیر HTTP یا V2 از آن استفاده نمی‌کند. گزینه‌ها، هر کدام با تصویب جداگانه:

| گزینه | توضیح |
|---|---|
| **۱ (توصیه)** | **سند طراحی قرارداد خواندن V2 (S9):** چه داده‌ی منتشرشده‌ای، با چه شکلی و نسخه‌ای، و از چه مسیری به V2 می‌رسد. شامل تصمیم نمایش پس از تعلیق یا انقضای claim (باقیمانده‌ی S13-A)، و تازگی (`fresh_until`) Evidence و Capability. **فقط سند؛** بدون کد تا تصویب |
| ۲ | سند طراحی مرز HTTP برای Core، شامل AuthContext از JWT، transport خطا (S6) و `COPY core` در Dockerfile |
| ۳ | سند طراحی adapter واقعی AC-2 و هویت پلتفرم (R4 و S5) |

**پاسخ پیشنهادی مالک:**
> «ادغام G10e مجاز است؛ گزینه‌ی ۱.»

## ۵. وضعیت دروازه‌ها

| دروازه | موضوع | وضعیت |
|---|---|---|
| **G10e** | **Evidence** | ✅ **بسته**؛ ادغام ← ⏳ تأیید مالک |
| لایه‌ی service هسته | | ✅ پس از ادغام G10e کامل |
| مرحله‌ی بعد | S9، HTTP یا adapterها | ⏳ انتخاب مالک |

من کلاد هستم
