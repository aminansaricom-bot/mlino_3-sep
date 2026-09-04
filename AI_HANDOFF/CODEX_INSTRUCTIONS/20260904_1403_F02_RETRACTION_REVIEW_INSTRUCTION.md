INSTRUCTION_ID: CODEX-20260904-1403-F02RETRACTION-REVIEW
AUTHOR: CODEX
STATUS: READY_FOR_CLAUDE
TARGET_HANDOFF_ID: HANDOFF-20260904-F02-RETRACTION
TARGET_REPORT_PATH: C:\mlino code\AI_HANDOFF\CLAUDE_REPORTS\20260904_F02_RETRACTION_IMPLEMENTATION_REPORT.md
TARGET_REPORT_SHA256: 78acfe5a0f318d8a2d9fdfcb2443745ebbe5c55a407a796a727cdda693a3aba5
TARGET_ZIP_PATH: (none)
TARGET_ZIP_SHA256: (n/a)
REVIEW_COMPLETED_AT: 2026-09-04T14:03:00
AUTHORIZATION_SCOPE: F02_RETRACTION_REVIEW_APPROVED_NO_CHANGES_REQUIRED_NO_NEW_PHASE

---

# نتیجه‌ی بازبینی مستقل — پیاده‌سازی مسیر RETRACTION برای F-02

**بازبین:** ممد (بازبین مستقل، GLM 5.3 Flash)
**تاریخ بازبینی:** ۲۰۲۶-۰۹-۰۴
**تحویل بازبینی‌شده:** `HANDOFF-20260904-F02-RETRACTION` (اجرا طبق دستور `CODEX-20260904-1341-RETRACTION-F02-AUTH`)
**تعارض منافع:** صفر — کد توسط یونس (Claude) نوشته شده؛ بازبین در تولید آن هیچ نقشی نداشت.

## ۱. Verdict

**تایید می‌شود — بدون عیب مسدودکننده، بدون نیاز به هیچ اصلاح کدی.**

## ۲. شواهد راستی‌آزمایی‌شده‌ی مستقیم

| # | ادعا در گزارش | راستی‌آزمایی مستقل بازبین | نتیجه |
|---|---|---|---|
| ۱ | تطبیق TARGET قبل از اجرا | مقایسه‌ی مستقل `HANDOFF_STATE.md` وقت بازبینی با مقادیر هدر | ✅ |
| ۲ | چک‌سام دو فایل تغییریافته (`89d16c5c...`، `32ad4e0c...`) | محاسبه‌ی مستقیم SHA-256 هر دو فایل | ✅ دقیقاً منطبق |
| ۳ | SHA-256 گزارش (`78acfe5a...`) | محاسبه‌ی مستقیم | ✅ منطبق با `HANDOFF_STATE.md` |
| ۴ | Drift صفر دو فایل منجمد | محاسبه‌ی مستقیم: `types.ts` = `35d21806...`، `schema.prisma` = `84d138c2...` | ✅ منطبق با Manifest مرجع |
| ۵ | ۱۲۶/۱۲۶ تست روی Postgres واقعی | اجرای مستقل `npm test` توسط بازبین | ✅ **13 Suites / 126 Tests passed** — یک اجرا، بدون Retry |
| ۶ | `tsc --noEmit` تمیز | اجرای مستقل | ✅ CLEAN |
| ۷ | صفر Import بین‌Featureای | grep روی `value-engines/` | ✅ |
| ۸ | دو Commit روی origin/main (`30d7a4e` سپس `e3303c8`) | `git ls-remote` مستقل بازبین: `e3303c88683d1157fe9f23ede3cdbe7b869dcd7a` روی `refs/heads/main` | ✅ دقیقاً منطبق با Commit دوم ادعاشده |

## ۳. بازخوانی فنی کد و تست‌ها

1. **منطق RETRACTION صحیح است:** `wasRebooked=true` + Lookup `ACTIVE` → Candidate با `event_type:'RETRACTION'` و `opportunity_correlation_id` هدف، از مسیر استاندارد IC-13. هیچ نوشتن مستقیم Projection رخ نمی‌دهد — قانون از‌پیش‌موجود RETRACTION→EXPIRED (`compute-projection.ts` CR-07 Rule 5) بدون تغییر کار را کامل می‌کند.
2. **`situation_key` روی RETRACTION تنظیم نمی‌شود** — مطابق R5 (فیلد OCCURRENE-only). ✅
3. **شکل کامل Payload** (`evidence_refs`/`materiality_score`/`materiality_basis`/`intended_audience`) در RETRACTION حفظ شده — سازگار با اعتبارسنج ساختاری. ✅
4. **حالت‌های لبه صحیح:**
   - rebook بدون Opportunity فعال → `continue` — هیچ‌چیز ارسال نمی‌شود («نوبت جایگزین‌شده هرگز خودش Opportunity نمی‌سازد»). ✅
   - rebook روی وضعیت از قبل EXPIRED → همان مسیر `continue` — از RETRACTION تکراری جلوگیری می‌کند (علاوه بر idempotency IC-13). ✅
   - مسیر بدون rebook (AMENDMENT/OCCURRENCE) — رفتار قبلی کاملاً حفظ شده؛ ۷ تست قبلی بدون تغییر سبز. ✅
5. **چهار سناریوی الزامی دستور، همگی با دقت پیاده و اثبات شده‌اند** (شامل ناوردای amendsEventId=فاندینگ، شمارش دقیق OCCURRENCE/RETRACTION، تایید Lookup→EXPIRED بعد از RETRACTION، و fail-closed با `OPPORTUNITY_CORRELATION_ID_INVALID`). ✅
6. **دو پیش‌فرض دستور، بررسی‌شده نه فرض‌شده:** تایید بازبین این است که Admission و Projection واقعاً بدون هیچ تغییری RETRACTION را پوشش می‌دادند — گزارش صادقانه‌ای بود که با کد واقعی تطبیق دارد. ✅

## ۴. یافته‌های غیرمسدودکننده (برای آینده)

- **R-1 (INFO):** در RETRACTION، `materiality_score: 0` انتخاب شده — معنایی قابل‌دفاع است (Opportunity بسته‌شده مادیتی ندارد)؛ صرفاً برای شفافیت آینده: اگر روزی Feed بخواهد RETRACTIONها را نمایش دهد، این صفر نباید به‌عنوان «بی‌اهمیتی» تفسیر شود. بدون اقدام.
- **R-2 (پروتکل — بدون تغییر):** R5-Concurrency همچنان OPEN (عمداً)؛ هاردنینگ F-1 بازبینی قبلی (`duplicate correlation_id` در `evaluateAC2FailClosed`) همچنان در نوبت آینده است؛ R4 همچنان BLOCKED؛ RETRACTION برای F-01/F-03 خارج از دامنه و نیازمند تصمیم مالک.

## ۵. دستور به یونس (Claude)

1. **هیچ اصلاح کدی لازم نیست.**
2. **شروع هر کار جدید: مجاز نیست — منتظر بمان** تا مالک محصول فاز بعد را انتخاب کند (گزینه‌های باقی‌مانده: هاردنینگ F-1، Adapter واقعی AC-2، R5-Concurrency، R4، RETRACTION برای F-01/F-03، یا هر کار دیگر).
3. Push این دستور + گزارش بازبینی به Remote، طبق الگوی همیشگی، با Hash واقعی در پاسخ نهایی به کاربر.
4. **شرط توقف:** بعد از Push، کاملاً متوقف شو.

---
*بازبین: ممد (GLM 5.3 Flash) — اولین فاز پس از بازگشت رسمی چرخه‌ی بازبینی مستقل؛ تحویل تمیز.*
